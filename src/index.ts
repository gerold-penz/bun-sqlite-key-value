import type { Database } from "bun:sqlite"
import { serialize, deserialize } from "node:v8"
import type {
    MaxExpiringItems, Options, TtlMs, Record, Key,
    Item, Field, Tag, Value, DbOptions
} from "./interfaces.ts"
import {
    INDEX_OUT_OF_RANGE_ERROR_LABEL, INVALID_COUNT_ERROR_LABEL,
    ITEM_NOT_EXISTS_ERROR_LABEL, NO_ARRAY_ERROR_LABEL
} from "./errors.ts"
import { getDatabase, getStatements } from "./database.ts"


export {
    INDEX_OUT_OF_RANGE_ERROR_LABEL, INVALID_COUNT_ERROR_LABEL,
    ITEM_NOT_EXISTS_ERROR_LABEL, NO_ARRAY_ERROR_LABEL
}


const MIN_UTF8_CHAR: string = String.fromCodePoint(1)
const MAX_UTF8_CHAR: string = String.fromCodePoint(1_114_111)


/**
 * A super fast key-value store with SQLite that uses **bun:sqlite**
 * and v8 as a fast JSON replacement.
 */
export class BunSqliteKeyValue {

    db: Database
    ttlMs: TtlMs
    maxExpiringItemsInDb: MaxExpiringItems
    data = this.getDataObject()
    d = this.data  // Alias for `data`
    private statements  // Database statements


    /**
     * Opens and creates the SQLite database either in memory or on the file system.
     *
     * @param {string} filename
     *  The full path of the SQLite database to open.
     *  Pass an empty string (`""`) or `":memory:"` or `undefined` for an in-memory database.
     * @param {Options} options
     *  Database options
     */
    constructor(filename?: string, options?: Options) {
        // Parse options
        const {
            ttlMs,
            maxExpiringItemsInDb,
            ...otherOptions
        } = options ?? {}
        this.ttlMs = ttlMs
        this.maxExpiringItemsInDb = maxExpiringItemsInDb
        const dbOptions: DbOptions = {
            ...otherOptions,
            strict: true,
            readwrite: otherOptions?.readwrite ?? true,
            create: otherOptions?.create ?? true,
        }

        // Open or create database
        if (filename === undefined || !filename?.length) {
            filename = ":memory:"
        }
        this.db = getDatabase(filename, dbOptions)

        // Prepare and cache statements
        this.statements = getStatements(this.db)

        // Delete expired and old expiring items
        this.deleteExpired()
        this.deleteOldExpiringItems()

    }


    /**
     * Deletes all expired records.
     */
    deleteExpired() {
        this.statements.deleteExpired.run({now: Date.now()})
    }


    /**
     * Deletes one or multiple items.
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#del
     *
     * @param {Key | Key[]} keyOrKeys
     *  {@link Key More informations about `key`.}
     */
    delete(keyOrKeys?: Key | Key[]) {
        if (typeof keyOrKeys === "string") {
            // Delete one
            this.statements.delete.run({key: keyOrKeys})
        } else if (keyOrKeys?.length) {
            // Delete multiple items
            this.db.transaction(() => {
                keyOrKeys.forEach((key) => {
                    this.statements.delete.run({key})
                })
            })()
        } else {
            // Delete all
            this.statements.clear.run()
        }
    }


    // Alias for delete()
    del = this.delete


    /**
     * Deletes all items
     */
    clear() {
        this.delete()
    }


    /**
     * Close database
     *
     * Removes .sqlite-shm and .sqlite-wal files
     */
    close() {
        this.db.close()
    }


    /**
     * Returns the number of all items in the database, including those that have already expired.
     *
     * Use `getCountValid()` if you want to get the number of items that have not yet expired.
     *
     * @returns {number}
     */
    getCount(): number {
        return (this.statements.count.get() as {count: number}).count
    }


    // Alias for getCount()
    count = this.getCount


    // Getter for getCount()
    get length() {
        return this.getCount()
    }


    /**
     * Returns the number of all valid (non-expired) items in the database.
     *
     * Use `getCount()` if you want the fastet possible method.
     *
     * @param {boolean} deleteExpired
     * @returns {number}
     */
    getCountValid(deleteExpired?: boolean): number {

        if (deleteExpired === true) {
            return this.db.transaction(() => {
                this.statements.deleteExpired.run({now: Date.now()})
                return (this.statements.count.get() as {count: number}).count
            })()
        } else {
            return (this.statements.countValid.get({now: Date.now()}) as {count: number}).count
        }
    }


    /**
     * Writes a value into the database and returns the key.
     *
     * @param {Key | undefined} key
     *  {@link Key More informations about `key`.}
     * @param {T} value
     *  {@link Value More informations about `value`.}
     * @param {TtlMs} ttlMs
     * @returns {Key}
     *  Returns the key.
     *
     * @example
     *
     *      import { BunSqliteKeyValue } from "bun-sqlite-key-value"
     *      const store = new BunSqliteKeyValue()
     *      // Stays in database
     *      store.set("myKey1", "my-value")
     *      store.data.myKey2 = "my-value"
     *      store.data["myKey3"] = "my-value"
     *      // Becomes invalid after 30 seconds
     *      store.set("myKey6", "item-with-ttl", 30000)
     *
     */
    set<T = any>(key: Key | undefined, value: T, ttlMs?: TtlMs): Key {
        let expires: number | undefined
        ttlMs = ttlMs ?? this.ttlMs
        if (ttlMs !== undefined && ttlMs > 0) {
            expires = Date.now() + ttlMs
        }
        if (key === undefined) {
            key = crypto.randomUUID()
        }
        this.statements.setItem.run({key, value: serialize(value), expires})
        return key
    }


    // Alias for set()
    setValue = this.set
    put = this.set


    /**
     * Adds a large number of entries to the database and takes only a small fraction
     * of the time that `set()` would take individually.
     *
     * @param {{key: Key, value: T, ttlMs?: TtlMs}[]} items
     */
    setItems<T = any>(items: {key: Key | undefined, value: T, ttlMs?: TtlMs}[]) {
        this.db.transaction(() => {
            items.forEach(({key, value, ttlMs}) => {
                this.set<T>(key, value, ttlMs)
            })
        })()
    }


    /**
     * Reads a value from the database.
     *
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     *
     * @returns {T | undefined}
     *
     * @example
     * import { BunSqliteKeyValue } from "bun-sqlite-key-value"
     * const store = new BunSqliteKeyValue()
     * store.set("myKey", "my-value")
     * store.get("myKey") // --> "my-value"
     * store.data.myKey // --> "my-value"
     * store.data["myKey"] // --> "my-value"
     */
    get<T = any>(key: Key): T | undefined {
        const record = this.statements.getItem.get({key})
        if (!record) return
        const {value, expires} = record
        if (expires) {
            if (expires < Date.now()) {
                this.delete(key)
                return
            }
        }
        return value ? deserialize(value) as T : undefined
    }


    // Alias for `get`
    getValue = this.get


    // Get one item (key, value)
    getItem<T = any>(key: Key): Item<T> | undefined {
        return {
            key,
            value: this.get<T>(key)
        }
    }


    // Get multiple items (key-value array)
    getItems<T = any>(startsWithOrKeys?: string | string[]): Item<T>[] | undefined {
        let records: Record[]
        if (startsWithOrKeys && typeof startsWithOrKeys === "string") {
            const key: Key = startsWithOrKeys
            const gte: string = key + MIN_UTF8_CHAR
            const lt: string = key + MAX_UTF8_CHAR
            records = this.statements.getItemsStartsWith.all({key, gte, lt})
        } else if (startsWithOrKeys) {
            // Filtered items (array with keys)
            records = this.db.transaction(() => {
                return (startsWithOrKeys as Key[]).map((key: Key) => {
                    const record = this.statements.getItem.get({key})
                    return {...record, key}
                })
            })()
        } else {
            // All items
            records = this.statements.getAllItems.all()
        }
        if (!records?.length) return
        const now = Date.now()
        const result: Item<T>[] = []
        const keysToDelete: string[] = []
        for (const record of records) {
            const {key, value, expires} = record
            if (expires && expires < now) {
                // Mark key for deletion
                keysToDelete.push(key)
            } else {
                result.push({
                    key,
                    value: value ? deserialize(value) as T : undefined
                })
            }
        }
        // Delete expired keys
        if (keysToDelete.length === 1) {
            this.delete(keysToDelete[0])
        } else if (keysToDelete.length > 1) {
            this.delete(keysToDelete)
        }
        // Return result
        if (result.length) {
            return result
        }
    }


    // Alias for getItems
    getItemsArray = this.getItems


    // Alias for getItems
    get items() {
        return this.getItems()
    }


    // Get multiple values as array
    getValues<T = any>(startsWithOrKeys?: string | string[]): (T | undefined)[] | undefined {
        return this.getItems<T>(startsWithOrKeys)?.map((result) => result.value)
    }


    // Alias for getValues
    getValuesArray = this.getValues


    // Alias for getValues
    get values() {
        return this.getValues()
    }


    // Get multiple items as object
    getItemsAsObject<T = any>(startsWithOrKeys?: string | string[]): {[key: Key]: T | undefined} | undefined {
        const items = this.getItems(startsWithOrKeys)
        if (!items) return
        return Object.fromEntries(items.map(item => [item.key, item.value as T | undefined]))
    }


    // Alias for getItemsAsObject()
    getItemsObject = this.getItemsAsObject


    // Get multiple items as Map()
    getItemsAsMap<T = any>(startsWithOrKeys?: string | string[]): Map<string, T | undefined> | undefined {
        const items = this.getItems(startsWithOrKeys)
        if (!items) return
        return new Map(items.map(item => [item.key, item.value as T | undefined]))
    }


    // Alias for getItemsAsMap()
    getItemsMap = this.getItemsAsMap


    // Get multiple values as Set()
    getValuesAsSet<T = any>(startsWithOrKeys?: string | string[]): Set<T> | undefined {
        const values = this.getValues(startsWithOrKeys)
        if (!values) return
        return new Set(values)
    }


    // Alias for getValuesAsSet()
    getValuesSet = this.getValuesAsSet


    // Checks if key exists
    has(key: Key): boolean {
        const record = this.statements.getKey.get({key})
        if (!record) return false
        if (record.expires) {
            if (record.expires < Date.now()) {
                this.delete(key)
                return false
            }
        }
        return true
    }


    // Alias for has()
    // Alias inspired by: https://docs.keydb.dev/docs/commands/#exists
    exists = this.has


    // Get multiple keys as array
    getKeys(startsWithOrKeys?: string | string[]): string[] | undefined {
        let records: (Omit<Record, "value"> | undefined)[]
        if (startsWithOrKeys && typeof startsWithOrKeys === "string") {
            const key: Key = startsWithOrKeys
            const gte: string = key + MIN_UTF8_CHAR
            const lt: string = key + MAX_UTF8_CHAR
            records = this.statements.getKeysStartsWith.all({key, gte, lt})
        } else if (startsWithOrKeys) {
            // Filtered items (array with keys)
            records = this.db.transaction(() => {
                return (startsWithOrKeys as Key[]).map((key: Key) => {
                    const record = this.statements.getKey.get({key})
                    return record ? {...record, key} : undefined
                })
            })()
        } else {
            // All items
            records = this.statements.getAllKeys.all()
        }
        if (!records?.length) return
        const now = Date.now()
        const result: string[] = []
        const keysToDelete: string[] = []
        for (const record of records) {
            if (!record) continue
            const {key, expires} = record
            if (expires && expires < now) {
                // Mark key for deletion
                keysToDelete.push(key)
            } else {
                result.push(key)
            }
        }
        // Delete expired keys
        if (keysToDelete.length === 1) {
            this.delete(keysToDelete[0])
        } else if (keysToDelete.length > 1) {
            this.delete(keysToDelete)
        }
        // Return result
        if (result.length) {
            return result
        }
    }


    // Alias for getKeys
    get keys() {
        return this.getKeys()
    }


    getExpiringItemsCount() {
        return this.statements.countExpiring.get()!.count
    }


    // If there are more expiring items in the database than `maxExpiringItemsInDb`,
    // the oldest items are deleted until there are only `maxExpiringItemsInDb` items with
    // an expiration date in the database.
    deleteOldExpiringItems(maxExpiringItemsInDb?: number) {
        let maxExpiringItems: number | undefined = maxExpiringItemsInDb ?? this.maxExpiringItemsInDb
        if (maxExpiringItems === undefined) return

        this.db.transaction(() => {
            const count = this.getExpiringItemsCount()
            if (count <= maxExpiringItems) return

            const limit = count - maxExpiringItems
            this.statements.deleteExpiring.run({limit})
        })()
    }


    // Alias for deleteOldExpiringItems
    deleteOldestExpiringItems = this.deleteOldExpiringItems


    // Proxy for data object
    private getDataObject(): {[key: Key]: any} {
        const self = this
        return new Proxy({}, {

            get(_, property: string) {
                return self.get(property)
            },

            set(_, property: string, value: any) {
                self.set(property, value)
                return true
            },

            has(_, property: string) {
                return self.has(property)
            },

            deleteProperty(_: {}, property: string) {
                self.delete(property)
                return true
            }

        })
    }


    // @remarks
    // Inspired by: https://docs.keydb.dev/docs/commands/#incrby
    incr(key: Key, incrBy: number = 1, ttlMs?: TtlMs): number {
        // @ts-ignore (Transaction returns a number or NaN, not void.)
        return this.db.transaction(() => {
            const newValue = Number(this.get<number>(key) ?? 0) + incrBy
            if (isNaN(newValue)) return NaN
            this.set<number>(key, newValue, ttlMs)
            return newValue
        }).immediate()
    }


    // @remarks
    // Inspired by: https://docs.keydb.dev/docs/commands/#decrby
    decr(key: Key, decrBy: number = 1, ttlMs?: TtlMs): number {
        return this.incr(key, decrBy * -1, ttlMs)
    }


    // If key already exists, this command appends the value at the end of the string.
    // If key does not exist it is created and set as an empty string,
    // so `append()` will be similar to `set()` in this special case.
    // Returns the length of the string after the append operation.
    // @remarks
    // Inspired by: https://docs.keydb.dev/docs/commands/#append
    append(key: Key, value: string, ttlMs?: TtlMs): number {
        // @ts-ignore (Transaction returns a number, not void.)
        return this.db.transaction(() => {
            const newValue = String(this.get<string>(key) ?? "") + value
            this.set<string>(key, newValue, ttlMs)
            return newValue.length
        }).immediate()
    }


    // Atomically sets key to value and returns the old value stored at key.
    // @remarks
    // Inspired by: https://docs.keydb.dev/docs/commands/#getset
    getSet<T = any>(key: Key, value: T, ttlMs?: TtlMs): T | undefined {
        // @ts-ignore (Transaction returns a number, not void.)
        return this.db.transaction(() => {
            const oldValue = this.get<T>(key)
            this.set<T>(key, value, ttlMs)
            return oldValue
        }).immediate()
    }


    // @remarks
    // Inspired by: https://docs.keydb.dev/docs/commands/#randomkey
    getRandomKey(): string | undefined {
        return this.statements.getRandomKey.get({now: Date.now()})?.key ?? undefined
    }


    // Alias for getRandomKey()
    randomKey = this.getRandomKey


    // @remarks
    // Inspired by: https://docs.keydb.dev/docs/commands/#randomkey
    getRandomItem<T = any>(): Item<T> | undefined {
        const record = this.statements.getRandomItem.get({now: Date.now()})
        if (!record) return
        return {
            key: record.key,
            value: record.value ? deserialize(record.value) as T : undefined
        }
    }


    // Alias for getRandomItem()
    randomItem = this.getRandomItem


    // @remarks
    // Inspired by: https://docs.keydb.dev/docs/commands/#randomkey
    getRandomValue<T = any>(): T | undefined {
        const item = this.randomItem<T>()
        if (item) return item.value
    }


    // Alias for getRandomValue()
    randomValue = this.getRandomValue


    // Renames `oldKey` to `newKey`.
    // It returns `false` when `oldKey` does not exist.
    // If `newKey` already exists it is deleted first.
    // @remarks
    // Inspired by: https://docs.keydb.dev/docs/commands/#rename
    rename(oldKey: Key, newKey: Key): boolean {
        // @ts-ignore (Transaction returns boolean, not void.)
        return this.db.transaction(() => {
            if (this.has(oldKey)) {
                this.statements.delete.run({key: newKey})
                this.statements.rename.run({oldKey, newKey})
                return true
            } else {
                return false
            }
        }).immediate()
    }


    // Renews or deletes the TTL of the database row.
    // Returns `true` if the `key` exists.
    // @remarks
    // Inspired by: https://docs.keydb.dev/docs/commands/#touch
    setTtl(key: Key, ttlMs?: TtlMs): boolean {
        let expires: number | undefined
        ttlMs = ttlMs ?? this.ttlMs
        if (ttlMs !== undefined && ttlMs > 0) {
            expires = Date.now() + ttlMs
        }
        return this.statements.setExpires.run({key, expires}).changes === 1
    }


    // Returns how long the data record is still valid (in milliseconds).
    // Returns `undefined` if the key does not exist.
    // @remarks
    // Inspired by: https://docs.keydb.dev/docs/commands/#ttl
    getTtl(key: Key): number | undefined {
        const record = this.statements.getExpires.get({key})
        if (!record) return
        const expires = record?.expires
        if (!expires) return
        const now = Date.now()
        if (expires < now) {
            this.delete(key)
            return
        }
        return expires - now
    }


    //

    /**
     * Hash (Map Object) - Write Value
     *
     * Do not use it with several very large amounts of data or blobs.
     * This is because the entire data record with all fields is always read and written.
     *
     * @category Hash (Map Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {Field} field
     * @param {T} value
     *  {@link Value More informations about `value`.}
     * @param {TtlMs} ttlMs
     * @returns {boolean}
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#hset
     */
    hSet<T = any>(key: Key, field: Field, value: T, ttlMs?: TtlMs): boolean {
        // @ts-ignore (Transaction returns boolean, not void.)
        return this.db.transaction(() => {
            const map = this.get<Map<string, T>>(key) ?? new Map<string, T>()
            const isNewField: boolean = !map.has(field)
            map.set(field, value)
            this.set(key, map, ttlMs)
            return isNewField
        }).immediate()
    }


    /**
     * Hash (Map Object) - Read Value
     *
     * Do not use it with several very large amounts of data or blobs.
     * This is because the entire data record with all fields is always read and written.
     *
     * @category Hash (Map Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {Field} field
     * @returns {T | undefined}
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#hget
     */
    hGet<T = any>(key: Key, field: Field): T | undefined {
        const map = this.get<Map<string, T>>(key)
        if (map === undefined) return
        return map.get(field)
    }


    /**
     * Hash (Map Object) - Write Multiple Values
     *
     * Do not use it with several very large amounts of data or blobs.
     * This is because the entire data record with all fields is always read and written.
     *
     * @category Hash (Map Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {{[p: Field]: T}} fields
     * @param {TtlMs} ttlMs
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#hmset
     */
    hmSet<T = any>(key: Key, fields: {[field: Field]: T}, ttlMs?: TtlMs) {
        this.db.transaction(() => {
            const map = this.get<Map<string, T>>(key) ?? new Map<string, T>()
            Object.entries(fields).forEach(([field, value]) => {
                map.set(field, value)
            })
            this.set(key, map, ttlMs)
        }).immediate()
    }


    /**
     * Hash (Map Object) - Read Multiple Values
     *
     * Do not use it with several very large amounts of data or blobs.
     * This is because the entire data record with all fields is always read and written.
     *
     * @category Hash (Map Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {string[]} fields
     * @returns {{[p: Field]: T | undefined} | undefined}
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#hmget
     */
    hmGet<T = any>(key: Key, fields?: string[]): {[field: Field]: T | undefined} | undefined {
        const map = this.get<Map<string, T>>(key)
        if (map === undefined) return
        const result: {[field: Field]: T | undefined} = {}
        if (fields) {
            fields.forEach((field) => {
                result[field] = map.get(field)
            })
        } else {
            Object.assign(result, Object.fromEntries(map.entries()))
        }
        return result
    }


    /**
     * Hash (Map Object) - Has Field
     *
     * Returns if `field` is an existing field in the hash stored at `key`.
     *
     * Do not use it with several very large amounts of data or blobs.
     * This is because the entire data record with all fields is always read.
     *
     * @category Hash (Map Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {Field} field
     * @returns {boolean | undefined}
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#hexists
     */
    hHasField(key: Key, field: Field): boolean | undefined {
        const map = this.get<Map<string, any>>(key)
        if (map === undefined) return
        return map.has(field)
    }


    // Alias for hHasField()
    hExists = this.hHasField


    /**
     * Hash (Map Object) - Count Fields
     *
     * @category Hash (Map Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @returns {number | undefined}
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#hlen
     */
    hGetCount(key: Key): number | undefined {
        const map = this.get<Map<string, any>>(key)
        if (map === undefined) return
        return map.size
    }


    // Alias for hGetCount()
    hLen = this.hGetCount


    /**
     * Hash (Map Object) - Get All Field Names
     *
     * @category Hash (Map Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @returns {string[] | undefined}
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#hkeys
     */
    hGetFields(key: Key): string[] | undefined {
        const map = this.get<Map<string, any>>(key)
        if (map === undefined) return
        return Array.from(map.keys())
    }


    // Alias for hGetFields()
    hKeys = this.hGetFields


    /**
     * Returns the *values* contained in the hash stored at `key`.
     *
     * Use `hmGet()` to read *field names* and *values*.
     *
     * Do not use the hash functions with several very large amounts of data or blobs.
     * This is because the entire data record with all fields is always read and written.
     * It is better to use `setValues()` and `getValues()` for large amounts of data.
     *
     * @category Hash (Map Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @returns {T[] | undefined}
     *  If the data record (marked with `key`) does not exist, `undefined` is returned.
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#hvals
     *
     * @example
     * ```TypeScript
     * import { BunSqliteKeyValue } from "bun-sqlite-key-value"
     *
     * const store = new BunSqliteKeyValue()
     *
     * store.hmSet("key-1", {
     *     "field-1": "value-1",
     *     "field-2": "value-2"
     * })
     * store.hGetValues("key-1") // --> ["value-1", "value-2"]
     * ```
     */
    hGetValues<T = any>(key: Key): T[] | undefined {
        const map = this.get<Map<string, T>>(key)
        if (map === undefined) return
        return Array.from(map.values())
    }


    // Alias for hGetValues()
    hVals = this.hGetValues


    /**
     *  Hash function: Deletes a field of the map object.
     *
     * @category Hash (Map Object)
     * @param {Key} key - The key of the item.
     *  {@link Key More informations about `key`.}
     * @param {Field} field - The name of the field.
     * @returns {boolean | undefined}
     *  - `undefined` if the key does not exist.
     *  - `true` if the field existed and was deleted.
     *  - `false` if the field did not exist.
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#hdel
     */
    hDelete(key: Key, field: Field): boolean | undefined {
        // @ts-ignore (Transaction returns boolean, not void.)
        return this.db.transaction(() => {
            const map = this.get<Map<string, any>>(key)
            if (map === undefined) return
            const result = map.delete(field)
            this.set(key, map)
            return result
        }).immediate()
    }


    /**
     * @category Hash (Map Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {Field} field
     * @param {number} incrBy
     * @param {TtlMs} ttlMs
     * @returns {number}
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#hincrby
     */
    hIncr(key: Key, field: Field, incrBy: number = 1, ttlMs?: TtlMs): number {
        // @ts-ignore (Transaction returns boolean, not void.)
        return this.db.transaction(() => {
            const map = this.get<Map<string, number>>(key) ?? new Map<string, number>()
            let newValue: number
            try {
                newValue = Number(map.get(field) ?? 0) + incrBy
            } catch (error: any) {
                if (error.toString().includes("TypeError")) return NaN
                throw error
            }
            if (isNaN(newValue)) return NaN
            map.set(field, newValue)
            this.set(key, map, ttlMs)
            return newValue
        }).immediate()
    }


    /**
     * @category Hash (Map Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {Field} field
     * @param {number} decrBy
     * @param {TtlMs} ttlMs
     * @returns {number}
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#hincrby
     */
    hDecr(key: Key, field: Field, decrBy: number = 1, ttlMs?: TtlMs): number {
        return this.hIncr(key, field, decrBy * -1, ttlMs)
    }


    /**
     * Array - Left Push - Adds elements at the begin of the array.
     *
     * @category List (Array Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {T} values
     *  {@link Value More informations about `value`.}
     * @returns {number}
     *  New length of the list.
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#lpush
     */
    lPush<T = any>(key: Key, ...values: T[]): number {
        // @ts-ignore (Transaction returns number, not void.)
        return this.db.transaction(() => {
            const array = this.get<Array<T>>(key) ?? new Array<T>()
            let newLength: number | undefined
            try {
                values.forEach((value) => {
                    newLength = array.unshift(value)
                })
            } catch (error: any) {
                if (error.toString().includes("TypeError")) {
                    throw new Error(NO_ARRAY_ERROR_LABEL + ` Value at "${key.substring(-80)}" is not an array.`)
                }
                throw error
            }
            this.set<Array<T>>(key, array)
            return newLength
        }).immediate()
    }


    /**
     * Array - Right Push - Adds elements at the end of the array.
     *
     * @category List (Array Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {T} values
     *  {@link Value More informations about `value`.}
     * @returns {number}
     *  New length of the list.
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#rpush
     */
    rPush<T = any>(key: Key, ...values: T[]): number {
        // @ts-ignore (Transaction returns number, not void.)
        return this.db.transaction(() => {
            const array = this.get<Array<T>>(key) ?? new Array<T>()
            let newLength: number
            try {
                newLength = array.push(...values)
            } catch (error: any) {
                if (error.toString().includes("TypeError")) {
                    throw new Error(NO_ARRAY_ERROR_LABEL + ` Value at "${key.substring(-80)}" is not an array.`)
                }
                throw error
            }
            this.set<Array<T>>(key, array)
            return newLength
        }).immediate()
    }


    /**
     * Removes and returns the first element of the list stored at key.
     * If `count` is specified, returns `count` number of elements.
     *
     * @category List (Array Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {number} count
     * @returns { T | T[] | undefined}
     *  If `count` is `undefined`, it returns the first element of the list stored at `key`.
     *  If `count` is a positive number, it returns the first `count` elements of the list stored at key.
     *  Returns `undefined` if `key` was not found or the array is empty.
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#lpop
     */
    lPop<T = any>(key: Key, count?: number): T | T[] | undefined {
        // @ts-ignore (Transaction returns array elements, not void.)
        return this.db.transaction(() => {
            const array = this.get<Array<T>>(key)
            if (array === undefined) return
            let result: T | T[]
            try {
                if (count === undefined) {
                    result = array.shift() as T
                } else if (count > 0) {
                    result = array.splice(0, count)
                    if (!result?.length) return
                } else {
                    throw new Error(INVALID_COUNT_ERROR_LABEL + " `count` must be greater then 0.")
                }
            } catch (error: any) {
                if (error.toString().includes("TypeError")) {
                    throw new Error(NO_ARRAY_ERROR_LABEL + ` Value at "${key.substring(-80)}" is not an array.`)
                }
                throw error
            }
            this.set<Array<T>>(key, array)
            return result
        }).immediate()
    }


    /**
     * Removes and returns the last element of the list stored at `key`.
     * If `count` is specified, returns `count` number of elements.
     *
     * @category List (Array Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {number} count
     * @returns {T[] | T | undefined}
     *  If `count` is `undefined`, it returns the last element of the list stored at `key`.
     *  If `count` is a positive number, it returns the last `count` elements of the list stored at key.
     *  Returns `undefined` if `key` was not found or the array is empty.
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#rpop
     */
    rPop<T = any>(key: Key, count?: number): T | T[] | undefined {
        // @ts-ignore (Transaction returns array elements, not void.)
        return this.db.transaction(() => {
            const array = this.get<Array<T>>(key)
            if (array === undefined) return
            let result: T | T[]
            try {
                if (count === undefined) {
                    result = array.pop() as T
                } else if (count > 0) {
                    result = array.splice(count * -1, count)
                    if (!result?.length) return
                    result.reverse()
                } else {
                    throw new Error(INVALID_COUNT_ERROR_LABEL + " `count` must be greater then 0.")
                }
            } catch (error: any) {
                if (error.toString().includes("TypeError")) {
                    throw new Error(NO_ARRAY_ERROR_LABEL + ` Value at "${key.substring(-80)}" is not an array.`)
                }
                throw error
            }
            this.set<Array<T>>(key, array)
            return result
        }).immediate()
    }


    /**
     * Returns the element at `index` in the list stored at `key`.
     *
     * The index is zero-based, so 0 means the first element, 1 the second element and so on.
     * Negative indices can be used to designate elements starting at the tail of the list.
     * Here, -1 means the last element, -2 means the penultimate and so forth.
     *
     * @category List (Array Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {number} index
     * @returns {T | undefined}
     *  When the value at key is not a list, an error is returned.
     *
     * @remarks
     * Inspired by: https://docs.keydb.dev/docs/commands/#lindex
     */
    lIndex<T = any>(key: Key, index: number): T | undefined {
        const array = this.get<Array<T>>(key)
        if (array === undefined) return
        try {
            return array.at(index)
        } catch (error: any) {
            if (error.toString().includes("TypeError")) {
                throw new Error(NO_ARRAY_ERROR_LABEL + ` Value at "${key.substring(-80)}" is not an array.`)
            }
            throw error
        }
    }


    /**
     * Returns the length of the list stored at `key`.
     *
     * If `key` does not exist, it is interpreted as an empty list and 0 is returned.
     * An error is returned when the value stored at `key` is not an array.
     *
     * @category List (Array Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @returns {number}
     *  The length of the list at `key`.
     *
     * @remarks
     * Inspired by: https://www.dragonflydb.io/docs/command-reference/lists/llen
     */
    lLen(key: Key): number {
        const array = this.get<Array<any>>(key)
        if (array === undefined) return 0
        if (Array.isArray(array) === false) {
            throw new Error(NO_ARRAY_ERROR_LABEL + ` Value at "${key.substring(-80)}" is not an array.`)
        }
        return array.length
    }


    /**
     * Updates the list element at `index` to `value`.
     *
     * For more information on the index argument, see `lIndex()`.
     *
     * An error is returned if the key does not exist.
     * An error is returned when the value stored at `key` is not an array.
     * An error is returned for out of range indexes.
     *
     * @category List (Array Object)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {number} index
     * @param {T} value
     *  {@link Value More informations about `value`.}
     * @returns `true` if the `key` exists and the value has been set.
     *
     * @remarks
     * Inspired by: https://www.dragonflydb.io/docs/command-reference/lists/lset
     */
    lSet<T = any>(key: Key, index: number, value: T): true {
        // @ts-ignore (Transaction returns boolean or undefined, not void.)
        return this.db.transaction(() => {
            const array = this.get<Array<T>>(key)
            if (array === undefined) {
                throw new Error(ITEM_NOT_EXISTS_ERROR_LABEL + ` Key "${key.substring(-80)}" not found.`)
            }
            if (Array.isArray(array) === false) {
                throw new Error(NO_ARRAY_ERROR_LABEL + ` Value at "${key.substring(-80)}" is not an array.`)
            }
            const len = array.length
            if (index >= len || index < (len * -1)) {
                throw new Error(INDEX_OUT_OF_RANGE_ERROR_LABEL + ` Array length: ${len}`)
            }
            if (index < 0) {
                array[len + index] = value
            } else {
                array[index] = value
            }
            this.set<Array<T>>(key, array)
            return true
        }).immediate()
    }


    // ToDo: rPopLPush()
    // Inspired by: https://docs.keydb.dev/docs/commands/#rpoplpush


    // ToDo: sAdd()
    // Inspired by: https://docs.keydb.dev/docs/commands/#sadd


    // ToDo: sCard()
    // Inspired by: https://docs.keydb.dev/docs/commands/#scard


    // ToDo: sDiff()
    // Inspired by: https://docs.keydb.dev/docs/commands/#sdiff


    // ToDo: sDiffStore()
    // Inspired by: https://docs.keydb.dev/docs/commands/#sdiffstore


    // ToDo: sInter()
    // Inspired by: https://docs.keydb.dev/docs/commands/#sinter


    // ToDo: sInterStore()
    // Inspired by: https://docs.keydb.dev/docs/commands/#sinterstore


    // ToDo: sIsMember()
    // Inspired by: https://docs.keydb.dev/docs/commands/#sismember


    // ToDo: sMembers() alias for getSet()
    // Inspired by: https://docs.keydb.dev/docs/commands/#smembers


    // ToDo: sMove()
    // Inspired by: https://docs.keydb.dev/docs/commands/#smove


    // ToDo: sPop()
    // Inspired by: https://docs.keydb.dev/docs/commands/#spop


    // ToDo: sRandMember()
    // Inspired by: https://docs.keydb.dev/docs/commands/#srandmember


    // ToDo: sRem()
    // Inspired by: https://docs.keydb.dev/docs/commands/#srem


    // ToDo: sUnion()
    // Inspired by: https://docs.keydb.dev/docs/commands/#sunion


    // ToDo: sUnionStore()
    // Inspired by: https://docs.keydb.dev/docs/commands/#sunionstore


    /**
     * Adds a tag to an item.
     *
     * Raises an error if the item key does not exist.
     *
     * @category Tags (Labels)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {Tag} tag
     * @returns {boolean}
     *  Returns `true` if the tag has been added.
     *  Returns `false` if the tag already exists.
     */
    addTag(key: Key, tag: Tag): boolean {
        try {
            return this.statements.addTag.run({item_key: key, tag}).changes === 1
        } catch (error: any) {
            if (error.toString().includes("FOREIGN KEY constraint failed")) {
                throw new Error(ITEM_NOT_EXISTS_ERROR_LABEL + ` Key "${key.substring(-80)}" not found.`)
            } else {
                throw error
            }
        }
    }


    /**
     * Deletes a tag of an item.
     *
     * @category Tags (Labels)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {Tag} tag
     * @returns {boolean}
     *  Returns `true` if the tag has been deleted.
     *  Returns `false` if the tag or the item does not exist.
     */
    deleteTag(key: Key, tag: Tag): boolean {
        return this.statements.deleteTag.run({key, tag}).changes === 1
    }


    /**
     * Deletes multiple tags or all tags of the item.
     *
     * @category Tags (Labels)
     * @param {Key} key
     *  {@link Key More informations about `key`.}
     * @param {Tag[] | undefined} tags
     *  Deletes all tags within the array.
     *  If `undefined`, all tags of the item are deleted.
     */
    deleteTags(key: Key, tags?: Tag[]) {
        if (tags) {
            this.db.transaction(() => {
                tags.forEach((tag) => this.deleteTag(key, tag))
            })()
        } else {
            this.statements.deleteAllTags.run({key})
        }
    }


    /**
     * Deletes tagged items.
     *
     * @category Tags (Labels)
     * @param {Tag} tag
     */
    deleteTaggedItems(tag: Tag) {
        this.statements.deleteTaggedItems.run({tag})
    }


    /**
     * Returns tagged keys.
     *
     * @category Tags (Labels)
     * @param {Tag} tag
     * @returns {Key[] | undefined}
     */
    getTaggedKeys(tag: Tag): Key[] | undefined {
        const records = this.statements.getTaggedKeys.all({tag})
        if (!records?.length) return
        return records.map(record => record.key)
    }


    /**
     * Returns tagged values.
     *
     * @category Tags (Labels)
     * @param {Tag} tag
     * @returns {(T | undefined)[] | undefined}
     */
    getTaggedValues<T = any>(tag: Tag): (T | undefined)[] | undefined {
        return this.db.transaction(() => {
            const taggedKeys = this.getTaggedKeys(tag)
            if (!taggedKeys) return
            return this.getValues<T>(taggedKeys)
        })()
    }


    /**
     * Returns tagged items.
     *
     * @category Tags (Labels)
     * @param {Tag} tag
     * @returns {Item<T>[] | undefined}
     */
    getTaggedItems<T>(tag: Tag): Item<T>[] | undefined {
        return this.db.transaction(() => {
            const taggedKeys = this.getTaggedKeys(tag)
            if (!taggedKeys) return
            return this.getItems<T>(taggedKeys)
        })()
    }

}


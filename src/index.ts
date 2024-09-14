import { Database, type Statement } from "bun:sqlite"
import { serialize, deserialize } from "node:v8"
import { dirname, resolve } from "node:path"
import { existsSync, mkdirSync } from "node:fs"


/**
 * Key
 */
export type Key = string


/**
 * Field Name
 */
export type Field = string


/**
 * Key value pair
 */
export interface Item<T> {
    key: Key
    value: T | undefined
}


/**
 * Table row (internally used)
 */
export interface Record {
    key: Key
    value: Buffer | null,
    expires: number | null
}


/**
 * Time period in milliseconds before an entry written to the DB becomes invalid.
 *
 * "Time to live" in milliseconds. After this time,
 * the item becomes invalid and is deleted from the database
 * the next time it is accessed or when the application is started.
 * Set the value to 0 if you want to explicitly deactivate the process.
 */
export type TtlMs = number | undefined


/**
 * Specifies the maximum number of expiring entries that may be in the database.
 *
 * If there are more expiring items in the database than `MaxExpiringItems`,
 * the oldest items are deleted until there are only `MaxExpiringItems` items
 * with an expiration date in the database.
 */
export type MaxExpiringItems = number | undefined


/**
 * Database options
 */
export interface Options {
    /**
     * Open the database as read-only (default: false).
     */
    readonly?: boolean
    /**
     * Allow creating a new database (default: true).
     * If the database folder does not exist, it will be created.
     */
    create?: boolean
    /**
     * Open the database as read-write (default: true).
     */
    readwrite?: boolean
    /**
     * Default TTL milliseconds.
     * Standard time period in milliseconds before an entry written to the DB becomes invalid.
     */
    ttlMs?: TtlMs
    /**
     * Default value that specifies the maximum number of
     * expiring items that may be in the database.
     * Is used by the `deleteOldExpiringItems()` method as default value.
     */
    maxExpiringItemsInDb?: MaxExpiringItems
}


/**
 * Internally used database options
 */
interface DbOptions extends Omit<Options, "ttlMs"> {
    strict: boolean
}


const MIN_UTF8_CHAR: string = String.fromCodePoint(1)
const MAX_UTF8_CHAR: string = String.fromCodePoint(1_114_111)

export const INVALID_COUNT_ERROR_LABEL: string = "[INVALID_COUNT_ERROR]"
export const NO_ARRAY_ERROR_LABEL: string = "[NO_ARRAY_ERROR]"


export class BunSqliteKeyValue {

    db: Database
    ttlMs: TtlMs
    maxExpiringItemsInDb: MaxExpiringItems
    data = this.getDataObject()
    d = this.data  // Alias for `data`

    private deleteExpiredStatement: Statement
    private deleteStatement: Statement
    private clearStatement: Statement
    private countStatement: Statement<{count: number}>
    private countValidStatement: Statement<{count: number}>
    private setItemStatement: Statement
    private getItemStatement: Statement<Omit<Record, "key">>
    private getAllItemsStatement: Statement<Record>
    private getItemsStartsWithStatement: Statement<Record>
    private getKeyStatement: Statement<Omit<Record, "key" | "value">>
    private getAllKeysStatement: Statement<Omit<Record, "value">>
    private getKeysStartsWithStatement: Statement<Omit<Record, "value">>
    private countExpiringStatement: Statement<{count: number}>
    private deleteExpiringStatement: Statement
    private getRandomKeyStatement: Statement<Omit<Record, "value" | "expires">>
    private getRandomItemStatement: Statement<Omit<Record, "expires">>
    private renameStatement: Statement
    private setExpiresStatement: Statement
    private getExpiresStatement: Statement<{expires: number}>


    // - `filename`: The full path of the SQLite database to open.
    //    Pass an empty string (`""`) or `":memory:"` or undefined for an in-memory database.
    // - `options`:
    //    - ...
    //    - `ttlMs?`: Standard time period in milliseconds before
    //       an entry written to the DB becomes invalid.
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

        // Create database directory
        if (filename?.length && filename.toLowerCase() !== ":memory:" && dbOptions.create) {
            const dbDir = dirname(resolve(filename))
            if (!existsSync(dbDir)) {
                console.log(`The "${dbDir}" folder is created.`)
                mkdirSync(dbDir, {recursive: true})
            }
        }

        // Open database
        this.db = new Database(filename, dbOptions)
        this.db.run("PRAGMA journal_mode = WAL")

        // Create table and indexes
        this.db.run("CREATE TABLE IF NOT EXISTS items (key TEXT PRIMARY KEY, value BLOB, expires INT)")
        this.db.run("CREATE UNIQUE INDEX IF NOT EXISTS ix_items_key ON items (key)")
        this.db.run("CREATE INDEX IF NOT EXISTS ix_items_expires ON items (expires)")

        // Prepare and cache statements
        this.clearStatement = this.db.query("DELETE FROM items")
        this.deleteStatement = this.db.query("DELETE FROM items WHERE key = $key")
        this.deleteExpiredStatement = this.db.query("DELETE FROM items WHERE expires < $now")

        this.setItemStatement = this.db.query(
            "INSERT OR REPLACE INTO items (key, value, expires) VALUES ($key, $value, $expires)"
        )
        this.countStatement = this.db.query("SELECT COUNT(*) AS count FROM items")
        this.countValidStatement = this.db.query(
            "SELECT COUNT(*) AS count FROM items WHERE expires IS NULL OR expires > $now"
        )

        this.getAllItemsStatement = this.db.query("SELECT key, value, expires FROM items")
        this.getItemStatement = this.db.query("SELECT value, expires FROM items WHERE key = $key")
        this.getItemsStartsWithStatement = this.db.query(
            "SELECT key, value, expires FROM items WHERE key = $key OR key >= $gte AND key < $lt"
        )
        // gte = key + MIN_UTF8_CHAR
        // lt = key + MAX_UTF8_CHAR

        this.getAllKeysStatement = this.db.query("SELECT key, expires FROM items")
        this.getKeyStatement = this.db.query("SELECT expires FROM items WHERE key = $key")
        this.getKeysStartsWithStatement = this.db.query(
            "SELECT key, expires FROM items WHERE key = $key OR key >= $gte AND key < $lt"
        )
        this.countExpiringStatement = this.db.query(
            "SELECT COUNT(*) as count FROM items WHERE expires IS NOT NULL"
        )
        this.deleteExpiringStatement = this.db.query(`
        DELETE FROM items WHERE key IN (
            SELECT key FROM items
            WHERE expires IS NOT NULL
            ORDER BY expires ASC
            LIMIT $limit
        )`)
        this.getRandomKeyStatement = this.db.query(`
        SELECT key FROM items 
        WHERE expires IS NULL OR expires > $now
        ORDER BY RANDOM() 
        LIMIT 1
        `)
        this.getRandomItemStatement = this.db.query(`
        SELECT key, value from items
        WHERE key = (
            SELECT key FROM items 
            WHERE expires IS NULL OR expires > $now
            ORDER BY RANDOM() 
            LIMIT 1
        )`)
        this.renameStatement = this.db.query("UPDATE items SET key = $newKey WHERE key = $oldKey")
        this.setExpiresStatement = this.db.query("UPDATE items SET expires = $expires WHERE key = $key")
        this.getExpiresStatement = this.db.query("SELECT expires FROM items WHERE key = $key")

        // Delete expired and old expiring items
        this.deleteExpired()
        this.deleteOldExpiringItems()
    }


    /**
     * Delete all expired records
     */
    deleteExpired() {
        this.deleteExpiredStatement.run({now: Date.now()})
    }


    /**
     * Delete one or multiple items
     *
     * Inspired by: https://docs.keydb.dev/docs/commands/#del
     *
     * @param {Key | Key[]} keyOrKeys
     */
    delete(keyOrKeys?: Key | Key[]) {
        if (typeof keyOrKeys === "string") {
            // Delete one
            this.deleteStatement.run({key: keyOrKeys})
        } else if (keyOrKeys?.length) {
            // Delete multiple items
            this.db.transaction(() => {
                keyOrKeys.forEach((key) => {
                    this.deleteStatement.run({key})
                })
            })()
        } else {
            // Delete all
            this.clearStatement.run()
        }
    }


    /**
     * Alias for delete()
     */
    del = this.delete


    /**
     * Delete all items
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
        return (this.countStatement.get() as {count: number}).count
    }


    /**
     * Alias for getCount()
     */
    count = this.getCount


    /**
     * Getter for getCount()
     */
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
                this.deleteExpiredStatement.run({now: Date.now()})
                return (this.countStatement.get() as {count: number}).count
            })()
        } else {
            return (this.countValidStatement.get({now: Date.now()}) as {count: number}).count
        }
    }


    set<T = any>(key: Key, value: T, ttlMs?: TtlMs) {
        let expires: number | undefined
        ttlMs = ttlMs ?? this.ttlMs
        if (ttlMs !== undefined && ttlMs > 0) {
            expires = Date.now() + ttlMs
        }
        this.setItemStatement.run({key, value: serialize(value), expires})
    }


    /**
     * Alias for set()
     */
    setValue = this.set
    /**
     * Alias for set()
     */
    put = this.set


    /**
     * Adds a large number of entries to the database and takes only a small fraction
     * of the time that `set()` would take individually.
     *
     * @param {{key: Key, value: T, ttlMs?: TtlMs}[]} items
     */
    setItems<T = any>(items: {key: Key, value: T, ttlMs?: TtlMs}[]) {
        this.db.transaction(() => {
            items.forEach(({key, value, ttlMs}) => {
                this.set<T>(key, value, ttlMs)
            })
        })()
    }


    // Get one value
    get<T = any>(key: Key): T | undefined {
        const record = this.getItemStatement.get({key})
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
            records = this.getItemsStartsWithStatement.all({key, gte, lt})
        } else if (startsWithOrKeys) {
            // Filtered items (array with keys)
            records = this.db.transaction(() => {
                return (startsWithOrKeys as Key[]).map((key: Key) => {
                    const record = this.getItemStatement.get({key})
                    return {...record, key}
                })
            })()
        } else {
            // All items
            records = this.getAllItemsStatement.all()
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
        const record = this.getKeyStatement.get({key})
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
            records = this.getKeysStartsWithStatement.all({key, gte, lt})
        } else if (startsWithOrKeys) {
            // Filtered items (array with keys)
            records = this.db.transaction(() => {
                return (startsWithOrKeys as Key[]).map((key: Key) => {
                    const record = this.getKeyStatement.get({key})
                    return record ? {...record, key} : undefined
                })
            })()
        } else {
            // All items
            records = this.getAllKeysStatement.all()
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
        return this.countExpiringStatement.get()!.count
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
            this.deleteExpiringStatement.run({limit})
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


    // Inspired by: https://docs.keydb.dev/docs/commands/#decrby
    decr(key: Key, decrBy: number = 1, ttlMs?: TtlMs): number {
        return this.incr(key, decrBy * -1, ttlMs)
    }


    // If key already exists, this command appends the value at the end of the string.
    // If key does not exist it is created and set as an empty string,
    // so `append()` will be similar to `set()` in this special case.
    // Returns the length of the string after the append operation.
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
    // Inspired by: https://docs.keydb.dev/docs/commands/#getset
    getSet<T = any>(key: Key, value: T, ttlMs?: TtlMs): T | undefined {
        // @ts-ignore (Transaction returns a number, not void.)
        return this.db.transaction(() => {
            const oldValue = this.get<T>(key)
            this.set<T>(key, value, ttlMs)
            return oldValue
        }).immediate()
    }


    // Inspired by: https://docs.keydb.dev/docs/commands/#randomkey
    getRandomKey(): string | undefined {
        return this.getRandomKeyStatement.get({now: Date.now()})?.key ?? undefined
    }


    // Alias for getRandomKey()
    randomKey = this.getRandomKey


    // Inspired by: https://docs.keydb.dev/docs/commands/#randomkey
    getRandomItem<T = any>(): Item<T> | undefined {
        const record = this.getRandomItemStatement.get({now: Date.now()})
        if (!record) return
        return {
            key: record.key,
            value: record.value ? deserialize(record.value) as T : undefined
        }
    }


    // Alias for getRandomItem()
    randomItem = this.getRandomItem


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
    // Inspired by: https://docs.keydb.dev/docs/commands/#rename
    rename(oldKey: Key, newKey: Key): boolean {
        // @ts-ignore (Transaction returns boolean, not void.)
        return this.db.transaction(() => {
            if (this.has(oldKey)) {
                this.deleteStatement.run({key: newKey})
                this.renameStatement.run({oldKey, newKey})
                return true
            } else {
                return false
            }
        }).immediate()
    }


    // Renews or deletes the TTL of the database row.
    // Returns `true` if the `key` exists.
    // Inspired by: https://docs.keydb.dev/docs/commands/#touch
    setTtl(key: Key, ttlMs?: TtlMs): boolean {
        let expires: number | undefined
        ttlMs = ttlMs ?? this.ttlMs
        if (ttlMs !== undefined && ttlMs > 0) {
            expires = Date.now() + ttlMs
        }
        return this.setExpiresStatement.run({key, expires}).changes === 1
    }


    // Returns how long the data record is still valid (in milliseconds).
    // Returns `undefined` if the key does not exist.
    // Inspired by: https://docs.keydb.dev/docs/commands/#ttl
    getTtl(key: Key): number | undefined {
        const record = this.getExpiresStatement.get({key})
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


    // Do not use it with several very large amounts of data or blobs.
    // This is because the entire data record with all fields is always read and written.
    // Inspired by: https://docs.keydb.dev/docs/commands/#hset
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


    // Do not use it with several very large amounts of data or blobs.
    // This is because the entire data record with all fields is always read and written.
    // Inspired by: https://docs.keydb.dev/docs/commands/#hget
    hGet<T = any>(key: Key, field: Field): T | undefined {
        const map = this.get<Map<string, T>>(key)
        if (map === undefined) return
        return map.get(field)
    }


    // Do not use it with several very large amounts of data or blobs.
    // This is because the entire data record with all fields is always read and written.
    // Inspired by: https://docs.keydb.dev/docs/commands/#hmset
    hmSet<T = any>(key: Key, fields: {[field: Field]: T}, ttlMs?: TtlMs) {
        this.db.transaction(() => {
            const map = this.get<Map<string, T>>(key) ?? new Map<string, T>()
            Object.entries(fields).forEach(([field, value]) => {
                map.set(field, value)
            })
            this.set(key, map, ttlMs)
        }).immediate()
    }


    // Do not use it with several very large amounts of data or blobs.
    // This is because the entire data record with all fields is always read and written.
    // Inspired by: https://docs.keydb.dev/docs/commands/#hmget
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


    // Returns if `field` is an existing field in the hash stored at `key`.
    // Do not use it with several very large amounts of data or blobs.
    // This is because the entire data record with all fields is always read.
    // Inspired by: https://docs.keydb.dev/docs/commands/#hexists
    hHasField(key: Key, field: Field): boolean | undefined {
        const map = this.get<Map<string, any>>(key)
        if (map === undefined) return
        return map.has(field)
    }


    // Alias for hHasField()
    hExists = this.hHasField


    // Inspired by: https://docs.keydb.dev/docs/commands/#hlen
    hGetCount(key: Key): number | undefined {
        const map = this.get<Map<string, any>>(key)
        if (map === undefined) return
        return map.size
    }


    // Alias for hGetCount()
    hLen = this.hGetCount


    // Inspired by: https://docs.keydb.dev/docs/commands/#hkeys
    hGetFields(key: Key): string[] | undefined {
        const map = this.get<Map<string, any>>(key)
        if (map === undefined) return
        return Array.from(map.keys())
    }


    /**
     * Alias for hGetFields()
     */
    hKeys = this.hGetFields


    /**
     * Returns the *values* contained in the hash stored at `key`.
     *
     * @param {Key} key
     * @returns {T[] | undefined}
     *  If the data record (marked with `key`) does not exist, `undefined` is returned.
     *
     * @description
     * Use `hmGet()` to read *field names* and *values*.
     *
     * Do not use the hash functions with several very large amounts of data or blobs.
     * This is because the entire data record with all fields is always read and written.
     * It is better to use `setValues()` and `getValues()` for large amounts of data.
     *
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


    /**
     * Alias for hGetValues()
     */
    hVals = this.hGetValues


    /**
     * Hash function: Delete a field of the map object.
     *
     * @param {Key} key - The key of the item.
     * @param {Field} field - The name of the field.
     * @returns {boolean | undefined}
     *  - `undefined` if the key does not exist.
     *  - `true` if the field existed and was deleted.
     *  - `false` if the field did not exist.
     *
     * @description
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
     * Inspired by: https://docs.keydb.dev/docs/commands/#hincrby
     *
     * @param {Key} key
     * @param {Field} field
     * @param {number} incrBy
     * @param {TtlMs} ttlMs
     * @returns {number}
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
     * Inspired by: https://docs.keydb.dev/docs/commands/#hincrby
     *
     * @param {Key} key
     * @param {Field} field
     * @param {number} decrBy
     * @param {TtlMs} ttlMs
     * @returns {number}
     */
    hDecr(key: Key, field: Field, decrBy: number = 1, ttlMs?: TtlMs): number {
        return this.hIncr(key, field, decrBy * -1, ttlMs)
    }


    /**
     * Array - Left Push - Adds elements at the begin of the array.
     *
     * @param {Key} key
     * @param {T} values
     * @returns {number}
     *  New length of the list.
     *
     * @description
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
     * @param {Key} key
     * @param {T} values
     * @returns {number}
     *  New length of the list.
     *
     * @description
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
     * @param {Key} key
     * @param {number} count
     * @returns { T | T[] | undefined}
     *  If `count` is `undefined`, it returns the first element of the list stored at `key`.
     *  If `count` is a positive number, it returns the first `count` elements of the list stored at key.
     *  Returns `undefined` if `key` was not found or the array is empty.
     *
     * @description
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
     * @param {Key} key
     * @param {number} count
     * @returns {T[] | T | undefined}
     *  If `count` is `undefined`, it returns the last element of the list stored at `key`.
     *  If `count` is a positive number, it returns the last `count` elements of the list stored at key.
     *  Returns `undefined` if `key` was not found or the array is empty.
     *
     * @description
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
     * @param {Key} key
     * @param {number} index
     * @returns {T | undefined}
     *  When the value at key is not a list, an error is returned.
     *
     * @description
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


    // ToDo: lLen()
    // Returns the length of the list stored at `key`.
    // If key does not exist, it is interpreted as an empty list and 0 is returned.
    // An error is returned when the value stored at `key` is not an array. --> `Array.isArray()`
    // Returns: The length of the list.
    // Inspired by: https://docs.keydb.dev/docs/commands/#llen


    // ToDo: lSet()
    // Achtung, wenn ein Index übergeben wird, der nicht im Array enthalten ist, soll ein Fehler ausgelöst werden.
    // Achtung, es können auch negative Werte wie bei `<array>.at()` als Index verwendet werden.
    //
    // function setAt<T = any>(array: Array, index: number, value: T) {
    //     const len = array.length
    //     if (index < 0) {
    //         array[len + index] = value
    //     } else {
    //         array[index] = value
    //     }
    // }
    //
    // Inspired by: https://docs.keydb.dev/docs/commands/#lset


    // ToDo: lRange()
    // Inspired by: https://docs.keydb.dev/docs/commands/#lrange


    // ToDo: lTrim()
    // Inspired by: https://docs.keydb.dev/docs/commands/#ltrim


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


    // ToDo: vielleicht...
    // /**
    //  * Diese Methode wird nach schreibenden Datenbankzugriffen ausgeführt.
    //  *
    //  * Achtung, nicht jede Schreibaktion löst diesen Hook aus. Es werden
    //  * @private
    //  */
    // private onAfterDbWrites() {
    //
    // }

}

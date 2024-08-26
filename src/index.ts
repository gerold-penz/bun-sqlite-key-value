import { Database, type Statement } from "bun:sqlite"
import { serialize, deserialize } from "node:v8"
import { dirname, resolve } from "node:path"
import { existsSync, mkdirSync } from "node:fs"


export interface Item<T> {
    key: string
    value: T | undefined
}


export interface Record {
    key: string
    value: Buffer | null,
    expires: number | null
}


export interface Options {
    readonly?: boolean
    create?: boolean  // Defaults to true
    readwrite?: boolean  // Defaults to true
    ttlMs?: number  // Default TTL milliseconds
}


interface DbOptions extends Omit<Options, "ttlMs"> {
    strict: boolean
}


const MIN_UTF8_CHAR: string = String.fromCodePoint(1)
const MAX_UTF8_CHAR: string = String.fromCodePoint(1_114_111)


export class BunSqliteKeyValue {

    db: Database
    ttlMs: number | undefined
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
    //    - `ttlMs?: boolean`: Standard time period in milliseconds before
    //       an entry written to the DB becomes invalid.
    constructor(filename?: string, options?: Options) {
        // Parse options
        const {
            ttlMs,
            ...otherOptions
        } = options ?? {}
        this.ttlMs = ttlMs
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

        // Delete expired items
        this.deleteExpired()
    }


    // Delete all expired records
    deleteExpired() {
        this.deleteExpiredStatement.run({now: Date.now()})
    }


    // Delete one or multiple items
    delete(keyOrKeys?: string | string[]) {
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


    // Alias for delete
    // Alias inspired by: https://docs.keydb.dev/docs/commands/#del
    del = this.delete


    // Delete all items
    clear() {
        this.delete()
    }


    // Close database
    // Removes .sqlite-shm and .sqlite-wal files
    close() {
        this.db.close()
    }


    // Returns the number of all items in the database, including those that have already expired.
    // Use `getCountValid()` if you want to get the number of items that have not yet expired.
    getCount(): number {
        return (this.countStatement.get() as {count: number}).count
    }


    // Alias for getCount()
    count = this.getCount


    // Getter for getCount()
    get length() {
        return this.getCount()
    }


    // Returns the number of all valid (non-expired) items in the database.
    // Use `getCount()` if you want the fastet possible method.
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


    // @param ttlMs:
    // Time to live in milliseconds.
    // Set ttlMs to 0 if you explicitly want to disable expiration.
    set<T = any>(key: string, value: T, ttlMs?: number) {
        let expires: number | undefined
        ttlMs = ttlMs ?? this.ttlMs
        if (ttlMs !== undefined && ttlMs > 0) {
            expires = Date.now() + ttlMs
        }
        this.setItemStatement.run({key, value: serialize(value), expires})
    }


    // Alias for `set`
    setValue = this.set
    put = this.set


    // Adds a large number of entries to the database and takes only
    // a small fraction of the time that `set()` would take individually.
    setItems<T = any>(items: {key: string, value: T, ttlMs?: number}[]) {
        this.db.transaction(() => {
            items.forEach(({key, value, ttlMs}) => {
                this.set<T>(key, value, ttlMs)
            })
        })()
    }


    // Get one value
    get<T = any>(key: string): T | undefined {
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
    getItem<T = any>(key: string): Item<T> | undefined {
        return {
            key,
            value: this.get<T>(key)
        }
    }


    // Get multiple items (key-value array)
    getItems<T = any>(startsWithOrKeys?: string | string[]): Item<T>[] | undefined {
        let records: Record[]
        if (startsWithOrKeys && typeof startsWithOrKeys === "string") {
            const key: string = startsWithOrKeys
            const gte: string = key + MIN_UTF8_CHAR
            const lt: string = key + MAX_UTF8_CHAR
            records = this.getItemsStartsWithStatement.all({key, gte, lt})
        } else if (startsWithOrKeys) {
            // Filtered items (array with keys)
            records = this.db.transaction(() => {
                return (startsWithOrKeys as string[]).map((key: string) => {
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
    getItemsObject<T = any>(startsWithOrKeys?: string | string[]): {[key: string]: T | undefined} | undefined {
        const items = this.getItems(startsWithOrKeys)
        if (!items) return
        return Object.fromEntries(items.map(item => [item.key, item.value as T | undefined]))
    }


    // Get multiple items as Map()
    getItemsMap<T = any>(startsWithOrKeys?: string | string[]): Map<string, T | undefined> | undefined {
        const items = this.getItems(startsWithOrKeys)
        if (!items) return
        return new Map(items.map(item => [item.key, item.value as T | undefined]))
    }


    // Get multiple values as Set()
    getValuesSet<T = any>(startsWithOrKeys?: string | string[]): Set<T> | undefined {
        const values = this.getValues(startsWithOrKeys)
        if (!values) return
        return new Set(values)
    }


    // Checks if key exists
    has(key: string): boolean {
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
            const key: string = startsWithOrKeys
            const gte: string = key + MIN_UTF8_CHAR
            const lt: string = key + MAX_UTF8_CHAR
            records = this.getKeysStartsWithStatement.all({key, gte, lt})
        } else if (startsWithOrKeys) {
            // Filtered items (array with keys)
            records = this.db.transaction(() => {
                return (startsWithOrKeys as string[]).map((key: string) => {
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
    deleteOldExpiringItems(maxExpiringItemsInDb: number) {
        const count = this.getExpiringItemsCount()
        if (count <= maxExpiringItemsInDb) return

        const limit = count - maxExpiringItemsInDb
        this.deleteExpiringStatement.run({limit})
    }


    // Alias for deleteOldExpiringItems
    deleteOldestExpiringItems = this.deleteOldExpiringItems


    // Proxy for data object
    private getDataObject(): {[key: string]: any} {
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
    incr(key: string, incrBy: number = 1, ttlMs?: number): number {
        // @ts-ignore (Transaction returns a number or NaN, not void.)
        return this.db.transaction(() => {
            const newValue = Number(this.get<number>(key) ?? 0) + incrBy
            if (isNaN(newValue)) return NaN
            this.set<number>(key, newValue, ttlMs)
            return newValue
        }).immediate()
    }


    // Inspired by: https://docs.keydb.dev/docs/commands/#decrby
    decr(key: string, decrBy: number = 1, ttlMs?: number): number {
        return this.incr(key, decrBy * -1, ttlMs)
    }


    // If key already exists, this command appends the value at the end of the string.
    // If key does not exist it is created and set as an empty string,
    // so `append()` will be similar to `set()` in this special case.
    // Returns the length of the string after the append operation.
    // Inspired by: https://docs.keydb.dev/docs/commands/#append
    append(key: string, value: string, ttlMs?: number): number {
        // @ts-ignore (Transaction returns a number, not void.)
        return this.db.transaction(() => {
            const newValue = String(this.get<string>(key) ?? "") + value
            this.set<string>(key, newValue, ttlMs)
            return newValue.length
        }).immediate()
    }


    // Atomically sets key to value and returns the old value stored at key.
    // Inspired by: https://docs.keydb.dev/docs/commands/#getset
    getSet<T = any>(key: string, value: T, ttlMs?: number): T | undefined {
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
    rename(oldKey: string, newKey: string): boolean {
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
    setTtl(key: string, ttlMs?: number): boolean {
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
    getTtl(key: string): number | undefined {
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
    hSet<T = any>(key: string, field: string, value: T, ttlMs?: number): boolean {
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
    hGet<T = any>(key: string, field: string): T | undefined {
        const map = this.get<Map<string, T>>(key)
        if (map === undefined) return
        return map.get(field)
    }


    // Do not use it with several very large amounts of data or blobs.
    // This is because the entire data record with all fields is always read and written.
    // Inspired by: https://docs.keydb.dev/docs/commands/#hmset
    hmSet<T = any>(key: string, fields: {[field: string]: T}, ttlMs?: number) {
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
    hmGet<T = any>(key: string, fields?: string[]): {[field: string]: T | undefined} | undefined {
        const map = this.get<Map<string, T>>(key)
        if (map === undefined) return
        const result: {[field: string]: T | undefined} = {}
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
    hHasField(key: string, field: string): boolean | undefined {
        const map = this.get<Map<string, any>>(key)
        if (map === undefined) return
        return map.has(field)
    }


    // Alias for hHasField()
    hExists = this.hHasField


    // Inspired by: https://docs.keydb.dev/docs/commands/#hlen
    hGetCount(key: string): number | undefined {
        const map = this.get<Map<string, any>>(key)
        if (map === undefined) return
        return map.size
    }


    // Alias for hGetCount()
    hLen = this.hGetCount


    // Inspired by: https://docs.keydb.dev/docs/commands/#hkeys
    hGetFields(key: string): string[] | undefined {
        const map = this.get<Map<string, any>>(key)
        if (map === undefined) return
        return Array.from(map.keys())
    }


    // Alias for hGetFields()
    hKeys = this.hGetFields


    /**
     * Returns the *values* contained in the hash stored at `key`.
     *
     * @param {string} key
     * @returns {T[] | undefined}
     *  - If the data record (marked with `key`) does not exist, `undefined` is returned.
     *
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
    hGetValues<T = any>(key: string): T[] | undefined {
        const map = this.get<Map<string, T>>(key)
        if (map === undefined) return
        return Array.from(map.values())
    }


    // Alias for hGetValues()
    hVals = this.hGetValues


    /**
     * Hash function: Delete a field of the map object.
     *
     * @param {string} key - The key of the item.
     * @param {string} field - The name of the field.
     * @returns {boolean | undefined}
     *  - `undefined` if the key does not exist.
     *  - `true` if the field existed and was deleted.
     *  - `false` if the field did not exist.
     *
     * Inspired by: https://docs.keydb.dev/docs/commands/#hdel
     */
    hDelete(key: string, field: string): boolean | undefined {
        // @ts-ignore (Transaction returns boolean, not void.)
        return this.db.transaction(() => {
            const map = this.get<Map<string, any>>(key)
            if (map === undefined) return
            const result = map.delete(field)
            this.set(key, map)
            return result
        }).immediate()
    }


    // Inspired by: https://docs.keydb.dev/docs/commands/#hincrby
    hIncrBy(key: string, field: string, incrBy: number = 1, ttlMs?: number): number {
        // @ts-ignore (Transaction returns boolean, not void.)
        return this.db.transaction(() => {
            const map = this.get<Map<string, number>>(key) ?? new Map<string, number>()
            const newValue = Number(map.get(field) ?? 0) + incrBy
            if (isNaN(newValue)) return NaN
            map.set(field, newValue)
            this.set(key, map, ttlMs)
            return newValue
        }).immediate()
    }


    // Inspired by: https://docs.keydb.dev/docs/commands/#hincrby
    hDecrBy(key: string, field: string, decrBy: number = 1, ttlMs?: number): number {
        return this.hIncrBy(key, field, decrBy * -1, ttlMs)
    }


    // ToDo: lIndex()
    // Inspired by: https://docs.keydb.dev/docs/commands/#lindex


    // ToDo: lLen()
    // Inspired by: https://docs.keydb.dev/docs/commands/#llen


    // ToDo: lPop()
    // Inspired by: https://docs.keydb.dev/docs/commands/#lpop


    // ToDo: lPush()
    // Inspired by: https://docs.keydb.dev/docs/commands/#lpush


    // ToDo: lRange()
    // Inspired by: https://docs.keydb.dev/docs/commands/#lrange


    // ToDo: lSet()
    // Inspired by: https://docs.keydb.dev/docs/commands/#lset


    // ToDo: lTrim()
    // Inspired by: https://docs.keydb.dev/docs/commands/#ltrim


    // ToDo: rPop()
    // Inspired by: https://docs.keydb.dev/docs/commands/#rpop


    // ToDo: rPopLPush()
    // Inspired by: https://docs.keydb.dev/docs/commands/#rpoplpush


    // ToDo: rPush()
    // Inspired by: https://docs.keydb.dev/docs/commands/#rpush


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


}

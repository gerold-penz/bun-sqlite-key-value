import { Database, type Statement } from "bun:sqlite"
import { serialize, deserialize } from "node:v8"
import { dirname, resolve } from "node:path"
import { existsSync, mkdirSync } from "node:fs"


export interface Item<T> {
    key: string
    value: T | undefined
}


interface Record {
    key: string
    value: Buffer | null,
    expires: number | null
}


interface Options {
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

    private deleteExpiredStatement: Statement
    private deleteStatement: Statement
    private clearStatement: Statement
    private countStatement: Statement<{count: number}>
    private setItemStatement: Statement
    private getItemStatement: Statement<Omit<Record, "key">>
    private getAllItemsStatement: Statement<Record>
    private getItemsStartsWithStatement: Statement<Record>
    private getKeyStatement: Statement<Omit<Record, "key" | "value">>
    private getAllKeysStatement: Statement<Omit<Record, "value">>
    private getKeysStartsWithStatement: Statement<Omit<Record, "value">>
    private countExpiringStatement: Statement<{count: number}>
    private deleteExpiringStatement: Statement


    // - `filename`: The full path of the SQLite database to open.
    //    Pass an empty string (`""`) or `":memory:"` or undefined for an in-memory database.
    // - `options`:
    //    - ...
    //    - `ttlMs?: boolean`: Standard time period in milliseconds before
    //       an entry written to the DB becomes invalid.
    constructor(filename?: string, options?: Options) {
        // Parse options
        const {ttlMs, ...otherOptions} = options ?? {}
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

        this.setItemStatement = this.db.query("INSERT OR REPLACE INTO items (key, value, expires) VALUES ($key, $value, $expires)")
        this.countStatement = this.db.query("SELECT COUNT(*) AS count FROM items")

        this.getAllItemsStatement = this.db.query("SELECT key, value, expires FROM items")
        this.getItemStatement = this.db.query("SELECT value, expires FROM items WHERE key = $key")
        this.getItemsStartsWithStatement = this.db.query("SELECT key, value, expires FROM items WHERE key = $key OR key >= $gte AND key < $lt")

        this.getAllKeysStatement = this.db.query("SELECT key, expires FROM items")
        this.getKeyStatement = this.db.query("SELECT expires FROM items WHERE key = $key")
        this.getKeysStartsWithStatement = this.db.query("SELECT key, expires FROM items WHERE (key = $key OR key >= $gte AND key < $lt)")

        this.countExpiringStatement = this.db.query("SELECT COUNT(*) as count FROM items WHERE expires IS NOT NULL")
        this.deleteExpiringStatement = this.db.query(`
        DELETE FROM items
        WHERE key IN (
            SELECT key FROM items
            WHERE expires IS NOT NULL
            ORDER BY expires ASC
            LIMIT $limit
        )`)

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


    // Delete all items
    clear() {
        this.delete()
    }


    // Explicitly close database
    // Removes .sqlite-shm and .sqlite-wal files
    close() {
        this.db.close()
    }


    // Returns the number of all items, including those that have already expired.
    // First delete the expired items with `deleteExpired()`
    // if you want to get the number of items that have not yet expired.
    getCount(): number {
        return (this.countStatement.get() as {count: number}).count
    }


    // Getter for getCount()
    get length() {
        return this.getCount()
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
            // Filtered items (startsWith)
            //   key = "addresses:"
            //   gte = key + MIN_UTF8_CHAR
            //   "addresses:aaa"
            //   "addresses:xxx"
            // lt = key + MAX_UTF8_CHAR
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
        if (!records.length) return
        const now = Date.now()
        const result: Item<T>[] = []
        for (const record of records) {
            const {key, value, expires} = record
            if (expires && expires < now) {
                this.delete(key)
            } else {
                result.push({
                    key,
                    value: value ? deserialize(value) as T : undefined
                })
            }
        }
        if (result.length) {
            return result
        }
    }


    // Alias for getItems
    getItemsArray = this.getItems


    // Get multiple values as array
    getValues<T = any>(startsWithOrKeys?: string | string[]): (T | undefined)[] | undefined {
        return this.getItems<T>(startsWithOrKeys)?.map((result) => result.value)
    }


    // Alias for getValues
    getValuesArray = this.getValues


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


    // Get multiple keys as array
    getKeys(startsWithOrKeys?: string | string[]): string[] | undefined {
        let records: Omit<Record, "value">[]
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
        for (const record of records) {
            if (!record) continue
            const {key, expires} = record
            if (expires && expires < now) {
                this.delete(key)
            } else {
                result.push(key)
            }
        }
        if (result.length) {
            return result
        }
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


}

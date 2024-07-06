import { Database, type Statement } from "bun:sqlite"
import { serialize, deserialize } from "node:v8"


export interface Item<T> {
    key: string
    value: T | undefined
}


interface RawItem {
    key: string
    value: Buffer | null,
    expires: number | null
}


export class BunSqliteKeyValue {

    db: Database

    ttlMs: number | undefined

    private deleteExpiredStatement: Statement
    private deleteStatement: Statement
    private clearStatement: Statement
    private countStatement: Statement<{count: number}>
    private setItemStatement: Statement
    private getItemStatement: Statement<Omit<RawItem, "key">>
    private getAllItemsStatement: Statement<RawItem>
    private getItemsStartsWithStatement: Statement<RawItem>


    // @param filename: The full path of the SQLite database to open.
    //      Pass an empty string (`""`) or `":memory:"` or undefined for an in-memory database.
    // @param options: defaults to `{readwrite: true, create: true}`.
    constructor(
        filename?: string,
        options: {
            readonly?: boolean
            create?: boolean
            readwrite?: boolean
            safeInteger?: boolean
            strict?: boolean
            ttlMs?: number  // Default TTL milliseconds
        } = {
            readwrite: true,
            create: true
        }
    ) {
        // Options and ttlMs
        const {ttlMs, ...dbOptions} = options
        if (ttlMs !== undefined) {
            this.ttlMs = ttlMs
        }

        // Open database
        this.db = new Database(filename, dbOptions)
        this.db.run("PRAGMA journal_mode = WAL")

        // Create table and indexes
        this.db.run("CREATE TABLE IF NOT EXISTS items (key TEXT PRIMARY KEY, value BLOB, expires INT)")
        this.db.run("CREATE UNIQUE INDEX IF NOT EXISTS ix_items_key ON items (key)")
        this.db.run("CREATE INDEX IF NOT EXISTS ix_items_expires ON items (expires)")

        // Prepare and cache statements
        this.getAllItemsStatement = this.db.query("SELECT key, value, expires FROM items")
        this.clearStatement = this.db.query("DELETE FROM items")
        this.countStatement = this.db.query("SELECT COUNT(*) AS count FROM items")
        this.deleteExpiredStatement = this.db.query("DELETE FROM items WHERE expires < $now")
        this.setItemStatement = this.db.query("INSERT OR REPLACE INTO items (key, value, expires) VALUES ($key, $value, $expires)")
        this.getItemStatement = this.db.query("SELECT value, expires FROM items WHERE key = $key")
        this.getItemsStartsWithStatement = this.db.query("SELECT key, value, expires FROM items WHERE key LIKE $startsWith")
        this.deleteStatement = this.db.query("DELETE FROM items WHERE key = $key")

        // Delete expired items
        this.deleteExpired()
    }


    // Delete all expired records
    deleteExpired() {
        this.deleteExpiredStatement.run({$now: Date.now()})
    }


    delete(key: string) {
        this.deleteStatement.run({$key: key})
    }


    // Delete all items
    clear() {
        this.clearStatement.run()
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
    setValue<T = any>(key: string, value: T, ttlMs?: number) {
        let $expires: number | undefined
        if (ttlMs !== undefined) {
            if (ttlMs > 0) {
                $expires = Date.now() + ttlMs
            }
        } else if (this.ttlMs && this.ttlMs > 0) {
             $expires = Date.now() + this.ttlMs
        }
        const $value = serialize(value)
        this.setItemStatement.run({$key: key, $value, $expires})
    }


    // Alias for `setValue`
    set = this.setValue


    getItem<T = any>(key: string): Item<T> | undefined {
        const record = this.getItemStatement.get({$key: key})
        if (!record) return
        const {value, expires} = record
        if (expires) {
            if (expires < Date.now()) {
                this.delete(key)
                return
            }
        }
        return {
            key,
            value: value ? deserialize(value) as T : undefined
        }
    }


    getValue<T = any>(key: string): T | undefined {
        return this.getItem<T>(key)?.value || undefined
    }


    // Alias for getValue
    get = this.getValue


    getItems<T = any>(startsWithOrKeys?: string | string[]): Item<T>[] | undefined {
        let records: RawItem[]
        if (startsWithOrKeys && typeof startsWithOrKeys === "string") {
            // Filtered items (startsWith)
            records = this.getItemsStartsWithStatement.all({$startsWith: startsWithOrKeys + "%"})
        } else if (startsWithOrKeys) {
            // Filtered items (array with keys)
            records = this.db.transaction(() => {
                return (startsWithOrKeys as string[]).map((key: string) => {
                    const record = this.getItemStatement.get({$key: key})
                    return {...record, key}
                })
            })()
        } else {
            // All items
            records = this.getAllItemsStatement.all()
        }
        if (!records) return
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


    getValues<T = any>(startsWithOrKeys?: string | string[]): (T | undefined)[] | undefined {
        return this.getItems<T>(startsWithOrKeys)?.map((result) => result.value)
    }


    // Alias for getValues
    getValuesArray = this.getValues


    getItemsObject<T = any>(startsWithOrKeys?: string | string[]): {[key: string]: T} | undefined {
        const items = this.getItems(startsWithOrKeys)
        if (!items) return
        const result: {[key: string]: T} = {}
        for (const item of items) {
            result[item.key] = item.value
        }
        return result
    }

}

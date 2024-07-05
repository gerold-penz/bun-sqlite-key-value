import { Database, Statement } from "bun:sqlite"
import { serialize, deserialize } from "v8"


// Returns current time as milliseconds since 1970-01-01T00:00:00Z.
const getNow = () => new Date().getTime()


export interface Item<T> {
    key: string
    value: T
}


export class BunSqliteKeyValue {

    db: Database

    private deleteExpiredStatement: Statement
    private deleteStatement: Statement
    private clearStatement: Statement
    private countStatement: Statement
    private setItemStatement: Statement
    private getItemStatement: Statement
    private getAllItemsStatement: Statement
    private getItemsStatement: Statement


    // @param filename: The full path of the SQLite database to open.
    //      Pass an empty string (`""`) or `":memory:"` or undefined for an in-memory database.
    // @param options: defaults to `{readwrite: true, create: true}`.
    //      If a number, then it's treated as `SQLITE_OPEN_*` constant flags.
    constructor(filename?: string, options?: Object | number) {
        // Open database
        this.db = new Database(filename, options)

        // Create table and index
        this.db.run("CREATE TABLE IF NOT EXISTS items (key TEXT PRIMARY KEY, value BLOB, expires INT)")
        this.db.run("CREATE UNIQUE INDEX IF NOT EXISTS ix_items_key ON items (key)")

        // Prepare cached statements
        this.getAllItemsStatement = this.db.query("SELECT key, value, expires FROM items")
        this.clearStatement = this.db.query("DELETE FROM items")
        this.countStatement = this.db.query("SELECT COUNT(*) AS count FROM items")

        // Prepare dynamic statements
        this.deleteExpiredStatement = this.db.prepare("DELETE FROM items WHERE expires < $now")
        this.setItemStatement = this.db.prepare("INSERT OR REPLACE INTO items (key, value, expires) VALUES ($key, $value, $expires)")
        this.getItemStatement = this.db.prepare("SELECT value, expires FROM items WHERE key = $key")
        this.getItemsStatement = this.db.prepare("SELECT key, value, expires FROM items WHERE key LIKE $startsWith")
        this.deleteStatement = this.db.prepare("DELETE FROM items WHERE key = $key")

        // Delete expired items
        this.deleteExpired()
    }


    // Delete all expired records
    deleteExpired() {
        this.deleteExpiredStatement.run({$now: getNow()})
    }


    delete(key: string) {
        this.deleteStatement.run({$key: key})
    }


    // Delete all items
    clear() {
        this.clearStatement.run()
    }


    // Returns the number of all items, including those that have already expired.
    // First delete the expired items with `deleteExpired()`
    // if you want to get the number of items that have not yet expired.
    getCount(): number {
        return (this.countStatement.get() as {count: number}).count
    }


    // @param ttlMs: Time to live in milliseconds
    setValue<T = any>(key: string, value: T, ttlMs?: number) {
        let $expires: number | undefined
        if (ttlMs) {
            $expires = getNow() + ttlMs
        }
        const $value = serialize(value)
        this.setItemStatement.run({$key: key, $value, $expires})
    }


    // Alias for `setValue`
    set = this.setValue


    getItem<T = any>(key: string): Item<T> | undefined {
        const record = this.getItemStatement.get({$key: key})
        if (!record) return
        const {value, expires} = record as {value: any, expires: number | undefined | null}
        if (expires) {
            if (expires < getNow()) {
                this.delete(key)
                return
            }
        }
        return {
            key,
            value: deserialize(Buffer.from(value)) as T
        }
    }


    getValue<T = any>(key: string): T | undefined {
        return this.getItem<T>(key)?.value || undefined
    }


    // Alias for getValue
    get = this.getValue


    getAllItems<T = any>(): Item<T>[] | undefined {
        const records = this.getAllItemsStatement.all()
        if (!records) return
        const now = getNow()
        const result: Item<T>[] = []
        for (const record of records) {
            const {key, value, expires} = record as {key: string, value: any, expires: number | undefined | null}
            if (expires && expires < now) {
                this.delete(key)
            } else {
                result.push({
                    key,
                    value: deserialize(Buffer.from(value)) as T
                })
            }
        }
        if (result.length) {
            return result
        }
    }


    getAllValues<T = any>(): T[] | undefined {
        return this.getAllItems<T>()?.map((result) => result.value) || undefined
    }


    getItems<T = any>(startsWith: string): Item<T>[] | undefined {
        const records = this.getItemsStatement.all({$startsWith: startsWith + "%"})
        if (!records) return
        const now = getNow()
        const result: Item<T>[] = []
        for (const record of records) {
            const {key, value, expires} = record as {key: string, value: any, expires: number | undefined | null}
            if (expires && expires < now) {
                this.delete(key)
            } else {
                result.push({
                    key,
                    value: deserialize(Buffer.from(value)) as T
                })
            }
        }
        if (result.length) {
            return result
        }
    }


    getValues<T = any>(keyStartsWith: string): T[] | undefined {
        return this.getItems<T>(keyStartsWith)?.map((result) => result.value)
    }


}

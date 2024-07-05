import { Database, Statement } from "bun:sqlite"
import { serialize, deserialize } from "v8"


const getNow = () => new Date().getTime() / 1000


export class BunSqliteKeyValue {

    private db: Database
    private deleteExpiredStatement: Statement
    private getStatement: Statement
    private getAllStatement: Statement
    private getAllStartsWithStatement: Statement
    private setStatement: Statement
    private deleteStatement: Statement
    private clearStatement: Statement


    constructor(path: string = ":memory:") {
        // Open database
        this.db = new Database(path)

        // Create table and index
        this.db.run("CREATE TABLE IF NOT EXISTS items (key TEXT PRIMARY KEY, value BLOB, expires INT)")
        this.db.run("CREATE UNIQUE INDEX IF NOT EXISTS ix_items_key ON items (key)")

        // Prepare statements
        this.deleteExpiredStatement = this.db.prepare("DELETE FROM items WHERE expired < $now")
        this.setStatement = this.db.prepare("INSERT INTO items (key, value, expires) VALUES ($key, $value, $expires)")
        this.getStatement = this.db.prepare("SELECT value, expires FROM items WHERE key = $key")
        this.getAllStatement = this.db.prepare("SELECT key, value, expires FROM items")
        this.getAllStartsWithStatement = this.db.prepare("SELECT key, value, expires FROM items WHERE key LIKE $startsWith")
        this.deleteStatement = this.db.prepare("DELETE FROM items WHERE key = $key")
        this.clearStatement = this.db.prepare("DELETE FROM items")

        // Delete expired items
        this.deleteExpired()
    }

    
    deleteExpired() {
        this.deleteExpiredStatement.run({$now: getNow()})
    }


    set<T = any>(key: string, value: T, expires?: number) {
        const serialized = serialize(value)
        this.setStatement.run({$key: key, $value: serialized, $expires: expires})
    }


    get<T = any>(key: string): {key: string, value: T} | undefined {
        const record = this.getStatement.get({$key: key})
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


    getAll<T = any>(): {key: string, value: T}[] | undefined {
        const records = this.getAllStatement.all()
        if (!records) return
        const now = getNow()
        const result: {key: string, value: T}[] = []
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


    getAllStartsWith<T = any>(keyStartsWith: string): {key: string, value: T}[] | undefined {
        const records = this.getAllStartsWithStatement.all({$keyStartsWith: keyStartsWith + "%"})
        if (!records) return
        const now = new Date().getTime() / 1000
        const result: {key: string, value: T}[] = []
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


    delete(key: string) {
        this.deleteStatement.run({$key: key})
    }


    clear() {
        this.clearStatement.run()
    }


    close(throwOnError?: boolean) {
        this.db.close(throwOnError)
    }


}



// const countries = new BunSqliteKeyValue("countries.sqlite")
// countries.set<string>("Österreich", "Tirol")
// countries.get<string>("Österreich")
// countries.deleteExpired()
// countries.getAll<string>()
// countries.getAllStartsWith("austria:")
// countries.getAllStartsWith("children:gerold_penz")
// countries.close()
//
//
// const districts = new BunSqliteKeyValue("districts.sqlite")
// districts.set<string>("Österreich", "Tirol")
// districts.get<string>("Österreich")
// districts.deleteExpired()
// districts.getAll<string>()
// districts.getAllStartsWith("austria:")
// districts.getAllStartsWith("children:gerold_penz")
// districts.close()
//

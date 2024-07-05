import { beforeAll, afterAll, expect, test } from "bun:test"
import { join } from "node:path"
import { tmpdir } from 'node:os'
import { mkdtemp } from 'node:fs/promises'
import { rm, exists } from "node:fs/promises"
import { BunSqliteKeyValue } from "../src"


const KEY_1: string = "test-key-1"
const KEY_2: string = "test-key-2"
const STRING_VALUE_1: string = "Hello world!"
const STRING_VALUE_2: string = "Hello moon!"

let dbPath: string


beforeAll(async () => {
    const dirname = await mkdtemp(join(tmpdir(), "bun-sqlite-key-value"))
    dbPath = join(dirname, "filesystemtest.sqlite")
    console.log("SQLite database path:", dbPath)
})


test("Insert values", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue(dbPath)

    store.set<string>(KEY_1, STRING_VALUE_1)
    store.set<string>(KEY_2, STRING_VALUE_2)

    store.set<string>("addresses:1:aaa", STRING_VALUE_1)
    store.set<string>("addresses:1:bbb", STRING_VALUE_1)
    store.set<string>("addresses:2:aaa", STRING_VALUE_2)
    store.set<string>("addresses:2:bbb", STRING_VALUE_2)

    store.db.close()
})


test("get()", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue(dbPath)
    expect(store.get<string>(KEY_1)).toEqual(STRING_VALUE_1)
    expect(store.get<string>(KEY_2)).toEqual(STRING_VALUE_2)
})


test("getValues()", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue(dbPath)

    expect(store.getValues("addresses:1:")).toEqual([STRING_VALUE_1, STRING_VALUE_1])
    expect(store.getValues("addresses:2:")).toEqual([STRING_VALUE_2, STRING_VALUE_2])
})


afterAll(async () => {
    // Remove test database
    if (await exists(dbPath)) {
        await rm(dbPath)
    }
})


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

    expect(store.length).toEqual(6)

    store.db.close()
})


test("Get value", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue(dbPath)
    expect(store.get<string>(KEY_1)).toEqual(STRING_VALUE_1)
    expect(store.getValue<string>(KEY_2)).toEqual(STRING_VALUE_2)
})


test("Get values as array", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue(dbPath)

    expect(store.getValues("addresses:1:")).toEqual([STRING_VALUE_1, STRING_VALUE_1])
    expect(store.getValues("addresses:2:")).toEqual([STRING_VALUE_2, STRING_VALUE_2])
})


test("Get items as array (extended tests)", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue(dbPath)

    store.set<string>("a:1:", STRING_VALUE_1)
    store.set<string>("a:1:" + String.fromCodePoint(2), STRING_VALUE_1)
    store.set<string>("a:1:" + String.fromCodePoint(1_000_000), STRING_VALUE_1)
    store.set<string>("a:1:*", STRING_VALUE_1)
    store.set<string>("a:2:a", STRING_VALUE_1)

    // Add many records
    const items = []
    for (let i = 0; i < 1_000; i++) {
        items.push({key: "a:1:" + String(i), value: STRING_VALUE_1})
    }
    store.setItems(items)

    // Tests
    expect(store.getItems("a:1:*")).toHaveLength(1)
    expect(store.getItems("a:1:" + String.fromCodePoint(2))).toHaveLength(1)
    expect(store.getItems("a:1:" + String.fromCodePoint(1_000_000))).toHaveLength(1)
    expect(store.getValues("a:1:")).toHaveLength(1_004)
    expect(store.getValues("a:1:55")).toHaveLength(11)
})


afterAll(async () => {
    // Remove test database
    if (await exists(dbPath)) {
        await rm(dbPath)
    }
})



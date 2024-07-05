import { expect, test } from "bun:test"
import { BunSqliteKeyValue } from "../src"


const KEY_1: string = "test-key-1"
const KEY_2: string = "test-key-2"
const STRING_VALUE_1: string = "Hello world!"
const STRING_VALUE_2: string = "Hello moon!"


test("set() get()", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()
    memDb.set<string>(KEY_1, STRING_VALUE_1)
    expect(memDb.get<string>(KEY_1)).toEqual(STRING_VALUE_1)
})


test("setValue() getValue()", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()
    memDb.setValue<string>(KEY_1, STRING_VALUE_1)
    expect(memDb.getValue<string>(KEY_1)).toEqual(STRING_VALUE_1)
})


test("getItem()", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()
    memDb.set<string>(KEY_1, STRING_VALUE_1)
    const item = memDb.getItem<string>(KEY_1)
    expect(item.key).toEqual(KEY_1)
    expect(item.value).toEqual(STRING_VALUE_1)
})


test("Replace existing item", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()
    // Set
    memDb.set<string>(KEY_1, STRING_VALUE_1)
    expect(memDb.get<string>(KEY_1)).toEqual(STRING_VALUE_1)
    // Replace
    memDb.set<string>(KEY_1, STRING_VALUE_2)
    expect(memDb.get<string>(KEY_1)).toEqual(STRING_VALUE_2)
})


test("Count", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()
    expect(memDb.getCount()).toEqual(0)
    memDb.set<string>(KEY_1, STRING_VALUE_1)
    expect(memDb.getCount()).toEqual(1)
})


test("deleteExpired()", async () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()

    memDb.set<string>(KEY_1, STRING_VALUE_1, 50)
    expect(memDb.getCount()).toEqual(1)

    await Bun.sleep(100)
    memDb.deleteExpired()
    expect(memDb.getCount()).toEqual(0)
})


test("get expired", async () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()

    memDb.set<string>(KEY_1, STRING_VALUE_1, 50)
    expect(memDb.get(KEY_1)).toEqual(STRING_VALUE_1)
    expect(memDb.getCount()).toEqual(1)

    await Bun.sleep(100)
    expect(memDb.get(KEY_1)).toBeUndefined()
    expect(memDb.getCount()).toEqual(0)
})


test("Delete item", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()
    memDb.set<string>(KEY_1, STRING_VALUE_1)
    expect(memDb.get<string>(KEY_1)).toEqual(STRING_VALUE_1)
    memDb.delete(KEY_1)
    expect(memDb.get<string>(KEY_1)).toBeUndefined()
})


test("Delete all items (clear)", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()

    memDb.set<string>(KEY_1, STRING_VALUE_1)
    memDb.set<string>(KEY_2, STRING_VALUE_2)
    expect(memDb.getCount()).toEqual(2)

    memDb.clear()
    expect(memDb.getCount()).toEqual(0)
})


test("Array values", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()

    const value = [1, 2, 3, "A", "B", "C", 0.1, 0.2, 0.3, {a: "A", b: "B"}]
    memDb.set(KEY_1, value)
    const result = memDb.get(KEY_1)
    expect(result).toEqual(value)
})


test("Set() values", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()
    const value = new Set([1, 2, "A", "B", "C"])
    memDb.set(KEY_1, value)
    const result = memDb.get(KEY_1)
    expect(result).toEqual(value)
})


test("Map() values", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()
    const value = new Map<string, any>([["a", 1], ["b", 2]])
    memDb.set(KEY_1, value)
    const result = memDb.get(KEY_1)
    expect(result).toEqual(value)
})


test("getAllItems()", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()
    memDb.set<string>(KEY_1, STRING_VALUE_1)
    memDb.set<string>(KEY_2, STRING_VALUE_2)

    expect(memDb.getAllItems()).toEqual([
        {key: KEY_1, value: STRING_VALUE_1},
        {key: KEY_2, value: STRING_VALUE_2},
    ])
})


test("getAllValues()", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()
    memDb.set<string>(KEY_1, STRING_VALUE_1)
    memDb.set<string>(KEY_2, STRING_VALUE_2)

    expect(memDb.getAllValues()).toEqual([STRING_VALUE_1, STRING_VALUE_2])
})


test("getItems()", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()

    memDb.set<string>("addresses:1:aaa", STRING_VALUE_1)
    memDb.set<string>("addresses:1:bbb", STRING_VALUE_1)
    memDb.set<string>("addresses:2:aaa", STRING_VALUE_2)
    memDb.set<string>("addresses:2:bbb", STRING_VALUE_2)

    expect(memDb.getItems("addresses:1:")).toEqual([
        {key: "addresses:1:aaa", value: STRING_VALUE_1},
        {key: "addresses:1:bbb", value: STRING_VALUE_1},
    ])
    expect(memDb.getItems("addresses:2:")).toEqual([
        {key: "addresses:2:aaa", value: STRING_VALUE_2},
        {key: "addresses:2:bbb", value: STRING_VALUE_2},
    ])
    expect(memDb.getItems("addresses:3:")).toBeUndefined()
})


test("getValues()", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue()

    memDb.set<string>("addresses:1:aaa", STRING_VALUE_1)
    memDb.set<string>("addresses:1:bbb", STRING_VALUE_1)
    memDb.set<string>("addresses:2:aaa", STRING_VALUE_2)
    memDb.set<string>("addresses:2:bbb", STRING_VALUE_2)

    expect(memDb.getValues("addresses:1:")).toEqual([STRING_VALUE_1, STRING_VALUE_1])
    expect(memDb.getValues("addresses:2:")).toEqual([STRING_VALUE_2, STRING_VALUE_2])
})

import { expect, test } from "bun:test"
import { BunSqliteKeyValue } from "../src"


const KEY_1: string = "test-key-1"
const KEY_2: string = "test-key-2"
const STRING_VALUE_1: string = "Hello world!"
const STRING_VALUE_2: string = "Hello moon!"


test("set() get()", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    store.set<string>(KEY_1, STRING_VALUE_1)
    expect(store.get<string>(KEY_1)).toEqual(STRING_VALUE_1)
})


test("setValue() getValue()", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    store.setValue<string>(KEY_1, STRING_VALUE_1)
    expect(store.getValue<string>(KEY_1)).toEqual(STRING_VALUE_1)
})


test("getItem()", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    store.set<string>(KEY_1, STRING_VALUE_1)
    const item = store.getItem<string>(KEY_1)
    expect(item?.key).toEqual(KEY_1)
    expect(item?.value).toEqual(STRING_VALUE_1)
})


test("Replace existing item", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    // Set
    store.set<string>(KEY_1, STRING_VALUE_1)
    expect(store.get<string>(KEY_1)).toEqual(STRING_VALUE_1)
    // Replace
    store.set<string>(KEY_1, STRING_VALUE_2)
    expect(store.get<string>(KEY_1)).toEqual(STRING_VALUE_2)
})


test("Count", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    expect(store.getCount()).toEqual(0)
    store.set<string>(KEY_1, STRING_VALUE_1)
    expect(store.getCount()).toEqual(1)
})


test("deleteExpired()", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, STRING_VALUE_1, 50)
    expect(store.getCount()).toEqual(1)

    await Bun.sleep(100)
    store.deleteExpired()
    expect(store.getCount()).toEqual(0)
})


test("get expired", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, STRING_VALUE_1, 50)
    expect(store.get<string>(KEY_1)).toEqual(STRING_VALUE_1)
    expect(store.getCount()).toEqual(1)

    await Bun.sleep(100)
    expect(store.get(KEY_1)).toBeUndefined()
    expect(store.getCount()).toEqual(0)
})


test("Delete item", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    store.set<string>(KEY_1, STRING_VALUE_1)
    expect(store.get<string>(KEY_1)).toEqual(STRING_VALUE_1)
    store.delete(KEY_1)
    expect(store.get<string>(KEY_1)).toBeUndefined()
})


test("Delete all items (clear)", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, STRING_VALUE_1)
    store.set<string>(KEY_2, STRING_VALUE_2)
    expect(store.getCount()).toEqual(2)

    store.clear()
    expect(store.getCount()).toEqual(0)
})


test("Array values", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    const value = [1, 2, 3, "A", "B", "C", 0.1, 0.2, 0.3, {a: "A", b: "B"}]
    store.set(KEY_1, value)
    const result = store.get(KEY_1)
    expect(result).toEqual(value)
})


test("Set() values", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    const value = new Set([1, 2, "A", "B", "C"])
    store.set(KEY_1, value)
    const result = store.get(KEY_1)
    expect(result).toEqual(value)
})


test("Map() values", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    const value = new Map<string, any>([["a", 1], ["b", 2]])
    store.set(KEY_1, value)
    const result = store.get(KEY_1)
    expect(result).toEqual(value)
})


test("getAllItemsArray()", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    store.set<string>(KEY_1, STRING_VALUE_1)
    store.set<string>(KEY_2, STRING_VALUE_2)

    expect(store.getAllItemsArray()).toEqual([
        {key: KEY_1, value: STRING_VALUE_1},
        {key: KEY_2, value: STRING_VALUE_2},
    ])
})


test("getAllValues()", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    store.set<string>(KEY_1, STRING_VALUE_1)
    store.set<string>(KEY_2, STRING_VALUE_2)

    expect(store.getAllValues()).toEqual([STRING_VALUE_1, STRING_VALUE_2])
})


test("getItemsArray()", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>("addresses:1:aaa", STRING_VALUE_1)
    store.set<string>("addresses:1:bbb", STRING_VALUE_1)
    store.set<string>("addresses:2:aaa", STRING_VALUE_2)
    store.set<string>("addresses:2:bbb", STRING_VALUE_2)

    expect(store.getItemsArray("addresses:1:")).toEqual([
        {key: "addresses:1:aaa", value: STRING_VALUE_1},
        {key: "addresses:1:bbb", value: STRING_VALUE_1},
    ])
    expect(store.getItemsArray("addresses:2:")).toEqual([
        {key: "addresses:2:aaa", value: STRING_VALUE_2},
        {key: "addresses:2:bbb", value: STRING_VALUE_2},
    ])
    expect(store.getItemsArray("addresses:3:")).toBeUndefined()
})


test("getValues()", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>("addresses:1:aaa", STRING_VALUE_1)
    store.set<string>("addresses:1:bbb", STRING_VALUE_1)
    store.set<string>("addresses:2:aaa", STRING_VALUE_2)
    store.set<string>("addresses:2:bbb", STRING_VALUE_2)

    expect(store.getValues("addresses:1:")).toEqual([STRING_VALUE_1, STRING_VALUE_1])
    expect(store.getValues("addresses:2:")).toEqual([STRING_VALUE_2, STRING_VALUE_2])
})

import { expect, test } from "bun:test"
import { BunSqliteKeyValue } from "../src"


const KEY_1: string = "test-key-1"
const KEY_2: string = "test-key-2"
const KEY_3: string = "test-key-3"
const STRING_VALUE_1: string = "Hello world!"
const STRING_VALUE_2: string = "Hello moon!"


test("Set and get value", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, STRING_VALUE_1)
    store.setValue<string>(KEY_2, STRING_VALUE_2)

    expect(store.get<string>(KEY_1)).toEqual(STRING_VALUE_1)
    expect(store.getValue<string>(KEY_2)).toEqual(STRING_VALUE_2)
})


test("Get item", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, STRING_VALUE_1)

    const item = store.getItem<string>(KEY_1)
    expect(item?.key).toEqual(KEY_1)
    expect(item?.value).toEqual(STRING_VALUE_1)
})


test("Replace existing item", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    // Set value
    store.set<string>(KEY_1, STRING_VALUE_1)
    expect(store.get<string>(KEY_1)).toEqual(STRING_VALUE_1)

    // Replace value
    store.set<string>(KEY_1, STRING_VALUE_2)
    expect(store.get<string>(KEY_1)).toEqual(STRING_VALUE_2)
})


test("Count/length", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    store.set<string>(KEY_1, STRING_VALUE_1)
    expect(store.getCount()).toEqual(1)
    expect(store.length).toEqual(1)
})


test("Delete expired items", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, STRING_VALUE_1, 50)
    expect(store.getCount()).toEqual(1)

    await Bun.sleep(100)
    store.deleteExpired()
    expect(store.getCount()).toEqual(0)
})


test("Get expired item", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, STRING_VALUE_1, 50)
    expect(store.get<string>(KEY_1)).toEqual(STRING_VALUE_1)
    expect(store.getCount()).toEqual(1)

    await Bun.sleep(100)
    expect(store.get(KEY_1)).toBeUndefined()
    expect(store.getCount()).toEqual(0)
})


test("Default expiration ttlMs", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue(undefined, {ttlMs: 50})

    store.set<string>(KEY_1, STRING_VALUE_1)
    store.set<string>(KEY_2, STRING_VALUE_2)

    await Bun.sleep(100)
    store.deleteExpired()
    expect(store.length).toEqual(0)
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


test("Store Array values", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    const value = [1, 2, 3, "A", "B", "C", 0.1, 0.2, 0.3, {a: "A", b: "B"}]
    store.set(KEY_1, value)
    const result = store.get(KEY_1)
    expect(result).toEqual(value)
})


test("Store Set() values", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    const value = new Set([1, 2, "A", "B", "C"])
    store.set(KEY_1, value)
    const result = store.get(KEY_1)
    expect(result).toEqual(value)
})


test("Store Map() values", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    const value = new Map<string, any>([["a", 1], ["b", 2]])
    store.set(KEY_1, value)
    const result = store.get(KEY_1)
    expect(result).toEqual(value)
})


test("Get all items as array", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    store.set<string>(KEY_1, STRING_VALUE_1)
    store.set<string>(KEY_2, STRING_VALUE_2)

    expect(store.getItems()).toEqual([
        {key: KEY_1, value: STRING_VALUE_1},
        {key: KEY_2, value: STRING_VALUE_2},
    ])

    expect(store.getItemsArray()).toEqual([
        {key: KEY_1, value: STRING_VALUE_1},
        {key: KEY_2, value: STRING_VALUE_2},
    ])

})


test("Get all values as array", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    store.set<string>(KEY_1, STRING_VALUE_1)
    store.set<string>(KEY_2, STRING_VALUE_2)

    expect(store.getValues()).toEqual([STRING_VALUE_1, STRING_VALUE_2])
    expect(store.getValuesArray()).toEqual([STRING_VALUE_1, STRING_VALUE_2])
})


test("Get items as array", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>("addresses:1:aaa", STRING_VALUE_1)
    store.set<string>("addresses:1:bbb", STRING_VALUE_1)
    store.set<string>("addresses:2:aaa", STRING_VALUE_2)
    store.set<string>("addresses:2:bbb", STRING_VALUE_2)
    store.set("addresses:2:ccc", null)


    expect(store.getItems("addresses:1:")).toEqual([
        {key: "addresses:1:aaa", value: STRING_VALUE_1},
        {key: "addresses:1:bbb", value: STRING_VALUE_1},
    ])
    expect(store.getItemsArray("addresses:1:")).toEqual([
        {key: "addresses:1:aaa", value: STRING_VALUE_1},
        {key: "addresses:1:bbb", value: STRING_VALUE_1},
    ])
    expect(store.getItems(["addresses:1:aaa", "addresses:1:bbb"])).toEqual([
        {key: "addresses:1:aaa", value: STRING_VALUE_1},
        {key: "addresses:1:bbb", value: STRING_VALUE_1},
    ])
    expect(store.getItemsArray(["addresses:1:aaa", "addresses:1:bbb"])).toEqual([
        {key: "addresses:1:aaa", value: STRING_VALUE_1},
        {key: "addresses:1:bbb", value: STRING_VALUE_1},
    ])

    expect(store.getItems("addresses:2:")).toEqual([
        {key: "addresses:2:aaa", value: STRING_VALUE_2},
        {key: "addresses:2:bbb", value: STRING_VALUE_2},
        {key: "addresses:2:ccc", value: null},
    ])
    expect(store.getItems(["addresses:2:aaa", "addresses:2:bbb"])).toEqual([
        {key: "addresses:2:aaa", value: STRING_VALUE_2},
        {key: "addresses:2:bbb", value: STRING_VALUE_2},
    ])
    expect(store.getItemsArray<string | null>("addresses:2:")).toEqual([
        {key: "addresses:2:aaa", value: STRING_VALUE_2},
        {key: "addresses:2:bbb", value: STRING_VALUE_2},
        {key: "addresses:2:ccc", value: null},
    ])
    expect(store.getItemsArray<string | null>(["addresses:2:aaa", "addresses:2:ccc"])).toEqual([
        {key: "addresses:2:aaa", value: STRING_VALUE_2},
        {key: "addresses:2:ccc", value: null},
    ])

    expect(store.getItems("addresses:3:")).toBeUndefined()
    expect(store.getItemsArray("addresses:3:")).toBeUndefined()

    expect(store.getItems(["addresses:3:aaa", "addresses:3:bbb"])).toEqual([
        {key: "addresses:3:aaa", value: undefined},
        {key: "addresses:3:bbb", value: undefined},
    ])
    expect(store.getItemsArray(["addresses:3:aaa", "addresses:3:bbb"])).toEqual([
        {key: "addresses:3:aaa", value: undefined},
        {key: "addresses:3:bbb", value: undefined},
    ])
})


test("Get values as array", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>("addresses:1:aaa", STRING_VALUE_1)
    store.set<string>("addresses:1:bbb", STRING_VALUE_1)
    store.set<string>("addresses:2:aaa", STRING_VALUE_2)
    store.set<string>("addresses:2:bbb", STRING_VALUE_2)
    store.set("addresses:2:ccc", null)

    expect(store.getValues("addresses:1:")).toEqual([STRING_VALUE_1, STRING_VALUE_1])
    expect(store.getValuesArray("addresses:1:")).toEqual([STRING_VALUE_1, STRING_VALUE_1])
    expect(store.getValues(["addresses:1:aaa", "addresses:1:bbb"])).toEqual([STRING_VALUE_1, STRING_VALUE_1])
    expect(store.getValuesArray(["addresses:1:aaa", "addresses:1:bbb"])).toEqual([STRING_VALUE_1, STRING_VALUE_1])

    expect(store.getValues("addresses:2:")).toEqual([STRING_VALUE_2, STRING_VALUE_2, null])
    expect(store.getValuesArray("addresses:2:")).toEqual([STRING_VALUE_2, STRING_VALUE_2, null])
    expect(store.getValues(["addresses:2:aaa", "addresses:2:bbb", "addresses:2:ccc"])).toEqual([STRING_VALUE_2, STRING_VALUE_2, null])
    expect(store.getValuesArray(["addresses:2:aaa", "addresses:2:bbb", "addresses:2:ccc"])).toEqual([STRING_VALUE_2, STRING_VALUE_2, null])

    expect(store.getValues("addresses:3:")).toBeUndefined()
    expect(store.getValuesArray("addresses:3:")).toBeUndefined()
    expect(store.getValues(["addresses:3:aaa", "addresses:3:bbb"])).toEqual([undefined, undefined])
    expect(store.getValuesArray(["addresses:3:aaa", "addresses:3:bbb"])).toEqual([undefined, undefined])

})


test("Get items as Object", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, STRING_VALUE_1)
    store.set<string>(KEY_2, STRING_VALUE_2)
    store.set(KEY_3, null)

    expect(store.getItemsObject([
        KEY_1,
        KEY_2,
        KEY_3,
        "unknown-key"
    ])).toEqual({
        [KEY_1]: STRING_VALUE_1,
        [KEY_2]: STRING_VALUE_2,
        [KEY_3]: null,
        "unknown-key": undefined
    })
})

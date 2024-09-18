import { expect, test } from "bun:test"
import { BunSqliteKeyValue, INVALID_COUNT_ERROR_LABEL, ITEM_NOT_EXISTS, NO_ARRAY_ERROR_LABEL } from "../src"
import { Statement } from "bun:sqlite"
import type { Item } from "../src/interfaces.ts"


const KEY_1: string = "test-key-1"
const KEY_2: string = "test-key-2"
const KEY_3: string = "test-key-3"
const VALUE_1: string = "Hello world 1"
const VALUE_2: string = "Hello moon 2"
const VALUE_3: string = "Hello Tyrol 3"
const FIELD_1: string = "test-field-1"
const FIELD_2: string = "test-field-2"
const FIELD_3: string = "test-field-3"
const TAG_1: string = "test-tag-1"
const TAG_2: string = "test-tag-2"
const TAG_3: string = "test-tag-3"


test("Error labels", () => {
    expect(INVALID_COUNT_ERROR_LABEL).toEqual("[INVALID_COUNT_ERROR]")
    expect(NO_ARRAY_ERROR_LABEL).toEqual("[NO_ARRAY_ERROR]")
})


test("Set and get value", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, VALUE_1)
    store.setValue<string>(KEY_2, VALUE_2)
    store.put<string>(KEY_3, VALUE_3)

    expect(store.get<string>(KEY_1)).toEqual(VALUE_1)
    expect(store.get<string>(KEY_2)).toEqual(VALUE_2)
    expect(store.getValue<string>(KEY_3)).toEqual(VALUE_3)
})


test("Get item", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, VALUE_1)

    const item = store.getItem<string>(KEY_1)
    expect(item?.key).toEqual(KEY_1)
    expect(item?.value).toEqual(VALUE_1)
})


test("Replace existing item", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    // Set value
    store.set<string>(KEY_1, VALUE_1)
    expect(store.get<string>(KEY_1)).toEqual(VALUE_1)

    // Replace value
    store.set<string>(KEY_1, VALUE_2)
    expect(store.get<string>(KEY_1)).toEqual(VALUE_2)
})


test("Count/length", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set(KEY_1, VALUE_1)
    store.set(KEY_2, VALUE_2, 30)

    expect(store.getCount()).toEqual(2)
    expect(store.count()).toEqual(2)
    expect(store.length).toEqual(2)
    expect(store.getCountValid()).toEqual(2)

    await Bun.sleep(40)
    expect(store.getCountValid()).toEqual(1)
    expect(store.getCount()).toEqual(2)

    store.set(KEY_2, VALUE_2, 30)
    await Bun.sleep(40)
    expect(store.getCountValid(true)).toEqual(1)
    expect(store.getCount()).toEqual(1)
})


test("Delete expired items", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, VALUE_1, 30)
    expect(store.getCount()).toEqual(1)

    await Bun.sleep(40)
    store.deleteExpired()
    expect(store.getCount()).toEqual(0)
})


test("Get expired item", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, VALUE_1, 30)
    expect(store.get<string>(KEY_1)).toEqual(VALUE_1)
    expect(store.getCount()).toEqual(1)

    await Bun.sleep(40)
    expect(store.get(KEY_1)).toBeUndefined()
    expect(store.getCount()).toEqual(0)
})


test("Default expiration ttlMs", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue(undefined, {ttlMs: 30})

    store.set<string>(KEY_1, VALUE_1)
    store.set<string>(KEY_2, VALUE_2)
    store.set<string>(KEY_3, VALUE_3, 0) // explicitly disable TTL

    await Bun.sleep(40)
    store.deleteExpired()
    expect(store.length).toEqual(1)
})


test("Caching with implicite TTL", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue(undefined, {ttlMs: 30})

    store.set(KEY_1, VALUE_1)
    store.set(KEY_2, VALUE_2)
    store.set(KEY_3, VALUE_3)
    await Bun.sleep(40)
    expect(store.get(KEY_1)).toBeUndefined()
    expect(store.get(KEY_2)).toBeUndefined()
    expect(store.get(KEY_3)).toBeUndefined()
})


test("Delete one item", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, VALUE_1)
    store.set<string>(KEY_2, VALUE_2)
    store.delete(KEY_1)
    store.del(KEY_2)
    expect(store.get<string>(KEY_1)).toBeUndefined()
    expect(store.get<string>(KEY_2)).toBeUndefined()
})


test("Delete multiple items", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, VALUE_1)
    store.set<string>(KEY_2, VALUE_2)
    store.set<string>(KEY_3, VALUE_3)

    store.delete([KEY_2, KEY_3])
    expect(store.length).toEqual(1)
})


test("Delete all items", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, VALUE_1)
    store.clear()
    expect(store.getCount()).toEqual(0)

    store.set<string>(KEY_1, VALUE_1)
    store.delete()
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


test("Get all items as array", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    store.set<string>(KEY_1, VALUE_1)
    store.set<string>(KEY_2, VALUE_2)

    expect(store.getItems()).toEqual([
        {key: KEY_1, value: VALUE_1},
        {key: KEY_2, value: VALUE_2},
    ])

    expect(store.getItemsArray()).toEqual([
        {key: KEY_1, value: VALUE_1},
        {key: KEY_2, value: VALUE_2},
    ])

    expect(store.items).toEqual([
        {key: KEY_1, value: VALUE_1},
        {key: KEY_2, value: VALUE_2},
    ])

})


test("Get all values as array", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()
    store.set<string>(KEY_1, VALUE_1)
    store.set<string>(KEY_2, VALUE_2)

    expect(store.getValues()).toEqual([VALUE_1, VALUE_2])
    expect(store.getValuesArray()).toEqual([VALUE_1, VALUE_2])
    expect(store.values).toHaveLength(2)
})


test("Get items as array", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>("addresses:1:aaa", VALUE_1)
    store.set<string>("addresses:1:bbb", VALUE_1)

    expect(store.items).toHaveLength(2)

    store.set<string>("addresses:2:aaa", VALUE_2)
    store.set<string>("addresses:2:bbb", VALUE_2)
    store.set("addresses:2:ccc", null)


    expect(store.getItems("addresses:1:")).toEqual([
        {key: "addresses:1:aaa", value: VALUE_1},
        {key: "addresses:1:bbb", value: VALUE_1},
    ])
    expect(store.getItemsArray("addresses:1:")).toEqual([
        {key: "addresses:1:aaa", value: VALUE_1},
        {key: "addresses:1:bbb", value: VALUE_1},
    ])
    expect(store.getItems(["addresses:1:aaa", "addresses:1:bbb"])).toEqual([
        {key: "addresses:1:aaa", value: VALUE_1},
        {key: "addresses:1:bbb", value: VALUE_1},
    ])
    expect(store.getItemsArray(["addresses:1:aaa", "addresses:1:bbb"])).toEqual([
        {key: "addresses:1:aaa", value: VALUE_1},
        {key: "addresses:1:bbb", value: VALUE_1},
    ])

    expect(store.getItems("addresses:2:")).toEqual([
        {key: "addresses:2:aaa", value: VALUE_2},
        {key: "addresses:2:bbb", value: VALUE_2},
        {key: "addresses:2:ccc", value: null},
    ])
    expect(store.getItems(["addresses:2:aaa", "addresses:2:bbb"])).toEqual([
        {key: "addresses:2:aaa", value: VALUE_2},
        {key: "addresses:2:bbb", value: VALUE_2},
    ])
    expect(store.getItemsArray<string | null>("addresses:2:")).toEqual([
        {key: "addresses:2:aaa", value: VALUE_2},
        {key: "addresses:2:bbb", value: VALUE_2},
        {key: "addresses:2:ccc", value: null},
    ])
    expect(store.getItemsArray<string | null>(["addresses:2:aaa", "addresses:2:ccc"])).toEqual([
        {key: "addresses:2:aaa", value: VALUE_2},
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

    store.set<string>("addresses:1:aaa", VALUE_1)
    store.set<string>("addresses:1:bbb", VALUE_1)
    store.set<string>("addresses:2:aaa", VALUE_2)
    store.set<string>("addresses:2:bbb", VALUE_2)
    store.set("addresses:2:ccc", null)

    expect(store.getValues("addresses:1:")).toEqual([VALUE_1, VALUE_1])
    expect(store.getValuesArray("addresses:1:")).toEqual([VALUE_1, VALUE_1])
    expect(store.getValues(["addresses:1:aaa", "addresses:1:bbb"])).toEqual([VALUE_1, VALUE_1])
    expect(store.getValuesArray(["addresses:1:aaa", "addresses:1:bbb"])).toEqual([VALUE_1, VALUE_1])

    expect(store.getValues("addresses:2:")).toEqual([VALUE_2, VALUE_2, null])
    expect(store.getValuesArray("addresses:2:")).toEqual([VALUE_2, VALUE_2, null])
    expect(store.getValues(["addresses:2:aaa", "addresses:2:bbb", "addresses:2:ccc"])).toEqual([VALUE_2, VALUE_2, null])
    expect(store.getValuesArray(["addresses:2:aaa", "addresses:2:bbb", "addresses:2:ccc"])).toEqual([VALUE_2, VALUE_2, null])

    expect(store.getValues("addresses:3:")).toBeUndefined()
    expect(store.getValuesArray("addresses:3:")).toBeUndefined()
    expect(store.getValues(["addresses:3:aaa", "addresses:3:bbb"])).toEqual([undefined, undefined])
    expect(store.getValuesArray(["addresses:3:aaa", "addresses:3:bbb"])).toEqual([undefined, undefined])

})


test("Get items as Object", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, VALUE_1)
    store.set<string>(KEY_2, VALUE_2)
    store.set(KEY_3, null)

    expect(store.getItemsAsObject([
        KEY_1,
        KEY_2,
        KEY_3,
        "unknown-key"
    ])).toEqual({
        [KEY_1]: VALUE_1,
        [KEY_2]: VALUE_2,
        [KEY_3]: null,
        "unknown-key": undefined
    })

    expect(store.getItemsObject([
        KEY_1,
        KEY_2,
        KEY_3,
        "unknown-key"
    ])).toEqual({
        [KEY_1]: VALUE_1,
        [KEY_2]: VALUE_2,
        [KEY_3]: null,
        "unknown-key": undefined
    })
})


test("Get items as Map", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, VALUE_1)
    store.set<string>(KEY_2, VALUE_2)
    store.set(KEY_3, null)

    expect(store.getItemsAsMap([
        KEY_1,
        KEY_2,
        KEY_3,
        "unknown-key"
    ])).toEqual(new Map([
        [KEY_1, VALUE_1],
        [KEY_2, VALUE_2],
        [KEY_3, null],
        ["unknown-key", undefined],
    ]))

    expect(store.getItemsMap([
        KEY_1,
        KEY_2,
        KEY_3,
        "unknown-key"
    ])).toEqual(new Map([
        [KEY_1, VALUE_1],
        [KEY_2, VALUE_2],
        [KEY_3, null],
        ["unknown-key", undefined],
    ]))
})


test("Get values as Set", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, VALUE_1)
    store.set<string>(KEY_2, VALUE_2)
    store.set(KEY_3, null)

    expect(store.getValuesAsSet([
        KEY_1, KEY_2, KEY_3, "unknown-key"
    ])).toEqual(new Set([
        VALUE_1, VALUE_2, null, undefined
    ]))

    expect(store.getValuesSet([
        KEY_1, KEY_2, KEY_3, "unknown-key"
    ])).toEqual(new Set([
        VALUE_1, VALUE_2, null, undefined
    ]))
})


test("Has key", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, VALUE_1, 30)
    expect(store.has(KEY_1)).toEqual(true)
    expect(store.exists(KEY_1)).toEqual(true)

    // Test proxy object
    expect(KEY_1 in store.data).toEqual(true)
    expect(KEY_2 in store.d).toEqual(false)

    expect(store.has(KEY_2)).toEqual(false)
    await Bun.sleep(40)
    expect(store.has(KEY_1)).toEqual(false)
})


test("Get all keys", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set<string>(KEY_1, VALUE_1)
    store.set<string>(KEY_2, VALUE_2, 30)
    store.set<string>(KEY_3, VALUE_3, 30)

    // All keys
    expect(store.getKeys()).toHaveLength(3)
    expect(store.keys).toHaveLength(3)

    await Bun.sleep(40)
    expect(store.getKeys()).toEqual([KEY_1])
})


test("Get keys as array", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set("addresses:1:aaa", VALUE_1)
    store.set("addresses:1:bbb", VALUE_1)
    store.set("addresses:2:aaa", VALUE_2)
    store.set("addresses:2:bbb", VALUE_2)

    expect(store.getKeys("addresses:1:")).toEqual(["addresses:1:aaa", "addresses:1:bbb"])
    expect(store.getKeys(["addresses:1:aaa", "addresses:1:bbb"])).toEqual(["addresses:1:aaa", "addresses:1:bbb"])
    expect(store.getKeys("addresses:2:")).toEqual(["addresses:2:aaa", "addresses:2:bbb"])
    expect(store.getKeys(["addresses:2:aaa", "addresses:2:bbb", "addresses:2:ccc"])).toEqual(["addresses:2:aaa", "addresses:2:bbb"])
})


test("Delete old expiring items", () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue()

    store.set("static:1", VALUE_1)
    store.set("static:2", VALUE_1)
    store.set("dynamic:1", VALUE_1, 400)
    store.set("dynamic:2", VALUE_1, 450)
    store.set("dynamic:3", VALUE_1, 500)
    store.set("dynamic:4", VALUE_1, 550)
    store.set("dynamic:5", VALUE_1, 600)
    store.set("dynamic:6", VALUE_1, 650)

    store.deleteOldExpiringItems(4)
    store.deleteOldestExpiringItems(4)
    expect(store.getKeys("dynamic:")?.length).toEqual(4)

    // Use default values
    const store2: BunSqliteKeyValue = new BunSqliteKeyValue(
        ":memory:",
        {ttlMs: 500, maxExpiringItemsInDb: 4}
    )
    store2.set("static:1", VALUE_1, 0)
    store2.set("static:2", VALUE_1, 0)
    store2.set("dynamic:1", VALUE_1)
    store2.set("dynamic:2", VALUE_1)
    store2.set("dynamic:3", VALUE_1)
    store2.set("dynamic:4", VALUE_1)
    store2.set("dynamic:5", VALUE_1)
    store2.set("dynamic:6", VALUE_1)

    store2.deleteOldExpiringItems()
    expect(store2.getKeys("dynamic:")?.length).toEqual(4)
})


test("Proxy-Object (data, d): set, get and delete values", () => {
    const store = new BunSqliteKeyValue()

    // Key 1
    store.data[KEY_1] = VALUE_1
    expect(store.data[KEY_1]).toEqual(VALUE_1)
    expect(store.d[KEY_1]).toEqual(VALUE_1)

    // Key 2
    store.data.myKey2 = VALUE_2
    expect(store.data.myKey2).toEqual(VALUE_2)
    expect(store.d.myKey2).toEqual(VALUE_2)

    // Delete
    delete store.data[KEY_1]
    expect(store.data[KEY_1]).toBeUndefined()
    expect(store.d[KEY_1]).toBeUndefined()
    delete store.data.myKey2
    expect(store.data.myKey2).toBeUndefined()
    expect(store.d.myKey2).toBeUndefined()
})


test("incr(), decr()", async () => {
    const store = new BunSqliteKeyValue()

    // incr/decr
    const resultArray = [
        store.incr(KEY_1), store.incr(KEY_1),
        store.decr(KEY_1), store.decr(KEY_1),
    ]
    expect(resultArray).toEqual([1, 2, 1, 0])
    store.delete(KEY_1)

    // ttlMs
    store.incr(KEY_1, 1, 30)
    await Bun.sleep(40)
    expect(store.incr(KEY_1, 1)).toEqual(1)
    store.delete(KEY_1)

    // incr/decr
    store.incr(KEY_1, 2)
    expect(store.incr(KEY_1, 2)).toEqual(4)
    expect(store.incr(KEY_1, -2)).toEqual(2)
    expect(store.decr(KEY_1, 1)).toEqual(1)
    expect(store.decr(KEY_1, -1)).toEqual(2)

    // String with number
    store.set(KEY_1, "100")
    expect(store.incr(KEY_1)).toEqual(101)

    // NaN
    const value: string = "I am no number"
    store.set<string>(KEY_1, value)
    expect(store.incr(KEY_1)).toBeNaN()
    expect(store.get<string>(KEY_1)).toEqual(value)
})


test("Append", async () => {
    const store = new BunSqliteKeyValue()

    expect(store.append(KEY_1, VALUE_1)).toEqual(VALUE_1.length)
    expect(store.append(KEY_1, VALUE_2, 30)).toEqual(VALUE_1.length + VALUE_2.length)
    expect(store.get<string>(KEY_1)).toEqual(VALUE_1 + VALUE_2)
    await Bun.sleep(40)
    expect(store.getCountValid()).toEqual(0)

    store.set<number>(KEY_1, 1)
    store.append(KEY_1, " million")
    expect(store.get<string>(KEY_1)).toEqual("1 million")
})


test("getSet()", async () => {
    const store = new BunSqliteKeyValue()

    store.set(KEY_1, VALUE_1)
    expect(store.getSet(KEY_1, VALUE_2)).toEqual(VALUE_1)
    expect(store.get<string>(KEY_1)).toEqual(VALUE_2)
})


test("getRandomKey(), getRandomItem(), getRandomValue", async () => {
    const store = new BunSqliteKeyValue()

    expect(store.getRandomKey()).toBeUndefined()
    expect(store.getRandomItem()).toBeUndefined()
    expect(store.getRandomValue()).toBeUndefined()

    expect(store.randomKey()).toBeUndefined()
    expect(store.randomItem()).toBeUndefined()
    expect(store.randomValue()).toBeUndefined()

    store.setItems([
        {key: KEY_1, value: VALUE_1},
        {key: KEY_2, value: VALUE_2, ttlMs: 30},
    ])

    expect(store.getRandomKey()).toBeOneOf([KEY_1, KEY_2])
    expect(store.getRandomItem()?.key).toBeOneOf([KEY_1, KEY_2])
    expect(store.getRandomItem()?.value).toBeOneOf([VALUE_1, VALUE_2])
    expect(store.getRandomValue()).toBeOneOf([VALUE_1, VALUE_2])

    await Bun.sleep(40)
    expect(store.getRandomKey()).toEqual(KEY_1)
    expect(store.getRandomKey()).toEqual(KEY_1)
    expect(store.getRandomKey()).toEqual(KEY_1)
    expect(store.getRandomItem()?.key).toEqual(KEY_1)
    expect(store.getRandomItem()?.key).toEqual(KEY_1)
    expect(store.getRandomItem()?.key).toEqual(KEY_1)
    expect(store.getRandomValue<string>()).toEqual(VALUE_1)
    expect(store.getRandomValue<string>()).toEqual(VALUE_1)
    expect(store.getRandomValue<string>()).toEqual(VALUE_1)
})


test("rename()", async () => {
    const store = new BunSqliteKeyValue()

    store.set(KEY_1, VALUE_1)
    store.set(KEY_2, VALUE_2)

    expect(store.rename(KEY_3, "new-key")).toBeFalse()
    expect(store.rename(KEY_1, KEY_2)).toBeTrue()
    expect(store.items).toEqual([{key: KEY_2, value: VALUE_1}])
})


test("setTtl()", async () => {
    const store = new BunSqliteKeyValue()

    store.set(KEY_1, VALUE_1, 30000)

    const sqlStatement: Statement<{expires: number}> = store.db.prepare(
        "SELECT expires FROM items WHERE key = $key"
    )

    // Reset TTL
    expect(store.setTtl(KEY_1, 20000)).toBeTrue()
    expect(sqlStatement.get(KEY_1)?.expires).toBeNumber()

    // Key not found
    expect(store.setTtl(KEY_2)).toBeFalse()

    // Delete TTL
    expect(store.setTtl(KEY_1)).toBeTrue()
    expect(sqlStatement.get(KEY_1)?.expires).toBeNull()
})


test("setTtl() with global defined TTL", async () => {
    const store = new BunSqliteKeyValue(":memory:", {ttlMs: 30000})

    store.set(KEY_1, VALUE_1)

    const sqlStatement: Statement<{expires: number}> = store.db.prepare(
        "SELECT expires FROM items WHERE key = $key"
    )

    // Reset TTL
    expect(store.setTtl(KEY_1)).toBeTrue()
    expect(sqlStatement.get(KEY_1)?.expires).toBeNumber()

    // Key not found
    expect(store.setTtl(KEY_2)).toBeFalse()

    // Delete TTL
    expect(store.setTtl(KEY_1, 0)).toBeTrue()
    expect(sqlStatement.get(KEY_1)?.expires).toBeNull()
})


test("getTtl()", async () => {
    const store = new BunSqliteKeyValue()

    store.set(KEY_1, VALUE_1)

    expect(store.getTtl(KEY_1)).toBeUndefined()
    expect(store.getTtl(KEY_2)).toBeUndefined()

    store.setTtl(KEY_1, 20000)
    await Bun.sleep(1)
    expect(store.getTtl(KEY_1)).toBeLessThanOrEqual(19999)
})


test("hSet(), hGet()", async () => {
    const store = new BunSqliteKeyValue()

    store.hSet(KEY_1, FIELD_1, VALUE_1)
    store.hSet(KEY_1, FIELD_2, VALUE_2)

    expect(store.hGet<string>(KEY_1, FIELD_1)).toEqual(VALUE_1)
    expect(store.hGet<string>(KEY_1, FIELD_2)).toEqual(VALUE_2)

    store.hSet(KEY_1, FIELD_2, VALUE_3)
    expect(store.hGet<string>(KEY_1, FIELD_2)).toEqual(VALUE_3)
})


test("hmSet(), hmGet()", async () => {
    const store = new BunSqliteKeyValue()

    // Set multiple fields
    store.hmSet(KEY_1, {
        "field-1": "value-1",
        "field-2": "value-2",
        "field-3": "value-3"
    })

    // Get multiple fields
    expect(store.hmGet(KEY_2, ["field-1"])).toBeUndefined()
    const result = store.hmGet(KEY_1, ["field-1", "field-100"])
    expect(result?.["field-1"]).toEqual("value-1")
    expect(result?.["field-100"]).toBeUndefined()

    // Get all fields
    expect(Object.keys(store.hmGet(KEY_1)!).length).toEqual(3)
})


test("hHasField()", async () => {
    const store = new BunSqliteKeyValue()

    store.hSet(KEY_1, FIELD_1, VALUE_1)

    expect(store.hHasField(KEY_1, FIELD_1)).toBeTrue()
    expect(store.hExists(KEY_2, FIELD_1)).toBeUndefined()
})


test("hGetCount()", async () => {
    const store = new BunSqliteKeyValue()

    expect(store.hGetCount(KEY_1)).toBeUndefined()

    store.set(KEY_1, VALUE_1)
    expect(store.hGetCount(KEY_1)).toBeUndefined()

    store.hSet(KEY_2, FIELD_1, VALUE_1)
    expect(store.hLen(KEY_2)).toEqual(1)
})


test("hGetFields()", async () => {
    const store = new BunSqliteKeyValue()

    store.hSet(KEY_1, FIELD_1, VALUE_1)
    store.hSet(KEY_1, FIELD_2, VALUE_2)
    expect(store.hGetFields(KEY_1)).toEqual([FIELD_1, FIELD_2])
    expect(store.hKeys(KEY_1)).toBeArrayOfSize(2)
})


test("hGetValues()", async () => {
    const store = new BunSqliteKeyValue()

    store.hSet(KEY_1, FIELD_1, VALUE_1)
    store.hSet(KEY_1, FIELD_2, VALUE_2)
    expect(store.hGetValues(KEY_1)).toEqual([VALUE_1, VALUE_2])
    expect(store.hVals(KEY_1)).toBeArrayOfSize(2)
})


test("hDelete()", async () => {
    const store = new BunSqliteKeyValue()

    store.hSet(KEY_1, FIELD_1, VALUE_1)
    store.hSet(KEY_1, FIELD_2, VALUE_2)
    expect(store.hDelete(KEY_2, FIELD_1)).toBeUndefined()
    expect(store.hDelete(KEY_1, FIELD_3)).toBeFalse()
    expect(store.hDelete(KEY_1, FIELD_2)).toBeTrue()
    expect(store.hGetCount(KEY_1)).toEqual(1)
})


test("hIncr(), hDecr()", async () => {
    const store = new BunSqliteKeyValue()

    const resultArray = [
        store.hIncr(KEY_1, FIELD_1), store.hIncr(KEY_1, FIELD_1),
        store.hDecr(KEY_1, FIELD_1), store.hDecr(KEY_1, FIELD_1),
    ]
    expect(resultArray).toEqual([1, 2, 1, 0])
    store.delete(KEY_1)

    store.hIncr(KEY_1, FIELD_1, 2)
    expect(store.hIncr(KEY_1, FIELD_1, 2)).toEqual(4)
    expect(store.hIncr(KEY_1, FIELD_1, -2)).toEqual(2)
    expect(store.hDecr(KEY_1, FIELD_1, 1)).toEqual(1)
    expect(store.hDecr(KEY_1, FIELD_1, -1)).toEqual(2)

    // String with number
    store.hSet(KEY_1, FIELD_1, "100")
    expect(store.hIncr(KEY_1, FIELD_1)).toEqual(101)

    // NaN
    const value: string = "I am no number"

    store.set(KEY_1, value)
    expect(store.hIncr(KEY_1, FIELD_1)).toBeNaN()
    store.delete(KEY_1)

    store.hSet<string>(KEY_1, FIELD_1, value)
    expect(store.hIncr(KEY_1, FIELD_1)).toBeNaN()
    expect(store.hGet<string>(KEY_1, FIELD_1)).toEqual(value)
})


test("lPush(), rPush()", async () => {
    const store = new BunSqliteKeyValue()

    // lPush()
    expect(store.lPush(KEY_1, VALUE_1, VALUE_2)).toEqual(2)
    expect(store.get<Array<string>>(KEY_1)).toEqual([VALUE_2, VALUE_1])
    expect(store.lPush(KEY_1, VALUE_3)).toEqual(3)
    expect(store.get<Array<string>>(KEY_1)).toEqual([VALUE_3, VALUE_2, VALUE_1])

    // Not an array
    store.set(KEY_1, VALUE_1)
    expect(() => {
        store.lPush(KEY_1, VALUE_2)
    }).toThrowError(NO_ARRAY_ERROR_LABEL)

    // rPush()
    expect(store.rPush(KEY_2, VALUE_1, VALUE_2)).toEqual(2)
    expect(store.get<Array<string>>(KEY_2)).toEqual([VALUE_1, VALUE_2])
    expect(store.rPush(KEY_2, VALUE_3)).toEqual(3)
    expect(store.get<Array<string>>(KEY_2)).toEqual([VALUE_1, VALUE_2, VALUE_3])

    // Not an array
    store.set(KEY_2, VALUE_1)
    expect(() => {
        store.rPush(KEY_2, VALUE_2)
    }).toThrowError(NO_ARRAY_ERROR_LABEL)
})


test("lPop(), rPop()", async () => {
    const store = new BunSqliteKeyValue()

    // lPop()
    store.lPush(KEY_1, VALUE_1, VALUE_2, VALUE_3)
    expect(store.lPop(KEY_3)).toBeUndefined()
    expect(() => {
        store.lPop(KEY_1, -1)
    }).toThrowError(INVALID_COUNT_ERROR_LABEL)
    expect(store.lPop<string>(KEY_1)).toEqual(VALUE_3)
    expect(store.lPop<string>(KEY_1, 2)).toEqual([VALUE_2, VALUE_1])
    expect(store.lPop(KEY_1)).toBeUndefined()
    expect(store.lPop(KEY_1, 2)).toBeUndefined()

    // rPop()
    store.rPush(KEY_2, VALUE_1, VALUE_2, VALUE_3)
    expect(store.rPop(KEY_3)).toBeUndefined()
    expect(() => {
        store.rPop(KEY_2, -1)
    }).toThrowError(INVALID_COUNT_ERROR_LABEL)
    expect(store.rPop<string>(KEY_2)).toEqual(VALUE_3)
    expect(store.rPop<string>(KEY_2, 2)).toEqual([VALUE_2, VALUE_1])
    expect(store.rPop(KEY_2)).toBeUndefined()
    expect(store.rPop(KEY_2, 2)).toBeUndefined()
})


test("lIndex()", async () => {
    const store = new BunSqliteKeyValue()

    store.rPush(KEY_1, VALUE_1, VALUE_2, VALUE_3)
    expect(store.lIndex<string>(KEY_1, 0)).toEqual(VALUE_1)
    expect(store.lIndex<string>(KEY_1, -1)).toEqual(VALUE_3)
    expect(store.lIndex<string>(KEY_1, 100)).toBeUndefined()

    store.set(KEY_2, 12345)
    expect(() => {
        store.lIndex(KEY_2, 0)
    }).toThrowError(NO_ARRAY_ERROR_LABEL)
})


test("UUID as key", async () => {
    const store = new BunSqliteKeyValue()

    store.set(KEY_1, VALUE_1)
    expect(store.set(undefined, VALUE_1)).toHaveLength(36)
})


test("Add tags", async () => {
    const store = new BunSqliteKeyValue()

    store.set(KEY_1, VALUE_1)

    expect(store.addTag(KEY_1, TAG_1)).toBeTrue()  // Tag added
    expect(store.addTag(KEY_1, TAG_1)).toBeFalse()  // Tag already exists

    // Item does not exist.
    expect(() => {
        store.addTag(KEY_2, TAG_1)
    }).toThrowError(ITEM_NOT_EXISTS)
})


test("Delete tags", async () => {
    const store = new BunSqliteKeyValue()

    store.set(KEY_1, VALUE_1)
    store.set(KEY_2, VALUE_2)

    // Delete tag
    store.addTag(KEY_1, TAG_1)
    store.addTag(KEY_1, TAG_3)
    expect(store.deleteTag(KEY_1, TAG_1)).toBeTrue()
    expect(store.deleteTag(KEY_1, TAG_1)).toBeFalse()

    // Delete tags (multiple)
    expect(store.addTag(KEY_1, TAG_3)).toBeFalse()
    store.deleteTags(KEY_1, [TAG_2, TAG_3])
    expect(store.addTag(KEY_1, TAG_3)).toBeTrue()

    // Delete tags (all)
    store.addTag(KEY_1, TAG_1)
    store.addTag(KEY_1, TAG_2)
    store.addTag(KEY_1, TAG_3)
    store.deleteTags(KEY_1)
    expect(store.addTag(KEY_1, TAG_1)).toBeTrue()
    expect(store.addTag(KEY_1, TAG_2)).toBeTrue()
    expect(store.addTag(KEY_1, TAG_3)).toBeTrue()
})


test("Delete tagged items", async () => {
    const store = new BunSqliteKeyValue()

    const items: Item<string>[] = [
        {key: KEY_1, value: VALUE_1},
        {key: KEY_2, value: VALUE_2},
        {key: KEY_3, value: VALUE_3},
    ]
    store.setItems(items)

    store.addTag(KEY_1, TAG_1)
    store.addTag(KEY_2, TAG_1)
    store.addTag(KEY_3, TAG_2)

    // Delete tagged items
    store.deleteTaggedItems(TAG_1)
    expect(store.has(KEY_1)).toBeFalse()
    expect(store.has(KEY_2)).toBeFalse()
    expect(store.has(KEY_3)).toBeTrue()
})


test("Get tagged keys", async () => {
    const store = new BunSqliteKeyValue()

    const items: Item<string>[] = [
        {key: KEY_1, value: VALUE_1},
        {key: KEY_2, value: VALUE_2},
        {key: KEY_3, value: VALUE_3},
    ]
    store.setItems(items)

    store.addTag(KEY_1, TAG_1)
    store.addTag(KEY_2, TAG_2)
    store.addTag(KEY_3, TAG_1)

    expect(store.getTaggedKeys(TAG_1)).toEqual([KEY_1, KEY_3])
})


test("Get tagged values", async () => {
    const store = new BunSqliteKeyValue()

    const items: Item<string>[] = [
        {key: KEY_1, value: VALUE_1},
        {key: KEY_2, value: VALUE_2},
        {key: KEY_3, value: VALUE_3},
    ]
    store.setItems(items)

    store.addTag(KEY_1, TAG_1)
    store.addTag(KEY_2, TAG_2)
    store.addTag(KEY_3, TAG_1)

    expect(store.getTaggedValues(TAG_1)).toEqual([items[0].value, items[2].value])
})


test("Get tagged items", async () => {
    const store = new BunSqliteKeyValue()

    const items: Item<string>[] = [
        {key: KEY_1, value: VALUE_1},
        {key: KEY_2, value: VALUE_2},
        {key: KEY_3, value: VALUE_3},
    ]
    store.setItems(items)

    store.addTag(KEY_1, TAG_1)
    store.addTag(KEY_2, TAG_2)
    store.addTag(KEY_3, TAG_1)

    expect(store.getTaggedItems(TAG_1)).toEqual([items[0], items[2]])
})


test("lLen()", async () => {
    const store = new BunSqliteKeyValue()

    const items: Item<any>[] = [
        {key: KEY_1, value: [VALUE_1, VALUE_2]},
        {key: KEY_2, value: VALUE_2},
    ]
    store.setItems(items)

    expect(store.lLen(KEY_1)).toEqual(2)
    expect(() => {
        store.lLen(KEY_2)
    }).toThrowError(NO_ARRAY_ERROR_LABEL)
    expect(store.lLen(KEY_3)).toEqual(0)
})

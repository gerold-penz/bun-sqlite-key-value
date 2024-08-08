import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

store.db.transaction(() => {
    store.set("key1", "100")
    store.set("key2", "200")
    store.set("key3", "300")
})()

store.db.transaction(() => {
    const value1 = store.get("key1")
    const value2 = store.get("key2")
    const value3 = store.get("key3")
    const total = value1 + value2 + value3
    store.set("total1", total)
})()


console.time("No transaction")
const store1 = new BunSqliteKeyValue()
for (const index of Array(5000).keys()) {
    store1.set("item-" + index, "value-" + index)
}
for (const index of Array(5000).keys()) {
    store1.get("item-" + index)
}
console.timeEnd("No transaction")


console.time("With transaction")
const store2 = new BunSqliteKeyValue()
store2.db.transaction(() => {
    for (const index of Array(5000).keys()) {
        store2.set("item-" + index, "value-" + index)
    }
    for (const index of Array(5000).keys()) {
        store2.get("item-" + index)
    }
})()
console.timeEnd("With transaction")



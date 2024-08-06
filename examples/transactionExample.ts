import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()
store.db.transaction(() => {
    const value = (store.get("key") ?? 1000) + 200
    store.set("key", value)
    console.log(value)
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



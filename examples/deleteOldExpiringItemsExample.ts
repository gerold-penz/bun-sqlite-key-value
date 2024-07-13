import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

store.set("static:1", "my-value")
store.set("static:2", "my-value")
store.set("dynamic:1", "my-value", 40)
store.set("dynamic:2", "my-value", 45)
store.set("dynamic:3", "my-value", 50)

store.deleteOldExpiringItems(2)
console.log(store.getKeys("dynamic:"))
// --> [ "dynamic:2", "dynamic:3" ]

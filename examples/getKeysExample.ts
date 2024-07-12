import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

store.set("language:de", "German")
store.set("language:en", "English")
store.set("language:es", "Esperanto")

let keys

keys = store.getKeys()
console.log(keys)  // --> ["language:de", "language:en", "language:es"]

keys = store.getKeys("language:e")
console.log(keys)  // --> ["language:en", "language:es"]

keys = store.getKeys(["language:de", "language:fr"])
console.log(keys)  // --> ["language:de"]

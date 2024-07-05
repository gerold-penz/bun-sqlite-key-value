import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

store.set("my-key", "my-value")

const value = store.get("my-key")
console.log(value)  // --> "my-value"

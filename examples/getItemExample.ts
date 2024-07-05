import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

store.set("my-key", "my-value")

const item = store.getItem("my-key")
console.log(item)  // --> {key: "my-key", value: "my-value"}

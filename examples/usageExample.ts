import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

store.set("foo", {bar: "baz", waldo: [4, 3, 2, 8]})
const value = store.get("foo")

console.log(value)  // -> {bar: "baz", waldo: [ 4, 3, 2, 8 ]}


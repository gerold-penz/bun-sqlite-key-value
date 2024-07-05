import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

store.set("my-key", {foo: "bar", baz: [1, 2, 3, 4]})
const value = store.get("my-key")

console.log(value)  // -> {foo: "bar", baz: [ 1, 2, 3, 4 ]}

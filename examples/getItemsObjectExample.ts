import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

store.set("language:de", "German")
store.set("language:en", "English")
store.set("language:it", "Italian")
store.set("my-null-value", null)

const items1 = store.getItemsObject("language:")
console.log(items1)
// -> {
//   "language:de": "German",
//   "language:en": "English",
//   "language:it": "Italian",
// }

const items2 = store.getItemsObject([
    "language:de",
    "my-null-value",
    "my-unknown-key"
])
console.log(items2)
// -> {
//   "language:de": "German",
//   "my-null-value": null,
//   "unknown-key": undefined,
// }

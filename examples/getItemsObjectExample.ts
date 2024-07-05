import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

store.set("language:de", "German")
store.set("language:en", "English")
store.set("language:it", "Italian")

const items = store.getItemsObject("language:")
console.log(items)
// -> {
//   "language:de": "German",
//   "language:en": "English",
//   "language:it": "Italian",
// }

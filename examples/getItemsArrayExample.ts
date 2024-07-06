import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

store.set("language:de", "German")
store.set("language:en", "English")
store.set("language:it", "Italian")

const items1 = store.getItems("language:")
console.log(items1)
// --> [
//     {key: "language:de", value: "German"},
//     {key: "language:en", value: "English"},
//     {key: "language:it", value: "Italian"}
// ]

const items2 = store.getItems(["language:de", "language:it"])
console.log(items2)
// --> [
//     {key: "language:de", value: "German"},
//     {key: "language:it", value: "Italian"}
// ]

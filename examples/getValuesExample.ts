import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

store.set("language:de", "German")
store.set("language:en", "English")
store.set("language:it", "Italian")

const values = store.getValues("language:")
console.log(values)  // --> [ "German", "English", "Italian" ]


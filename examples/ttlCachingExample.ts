import { BunSqliteKeyValue } from "../src"


const store: BunSqliteKeyValue = new BunSqliteKeyValue(undefined, {ttlMs: 1000})

const KEY = "cache-key"
store.set(KEY, 12345)
await Bun.sleep(500)
console.log(store.get(KEY))  // --> 12345
await Bun.sleep(1000)
console.log(store.get(KEY))  // --> undefined

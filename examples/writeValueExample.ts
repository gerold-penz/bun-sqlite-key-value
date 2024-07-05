import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

// Stays in database
store.set("my-key", "my-value")

// Becomes invalid after 30 seconds
store.set("my-key-2", "item-with-ttl", 30000)

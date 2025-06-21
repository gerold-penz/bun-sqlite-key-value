# Cache Values with TTL

You can specify a caching period when you open the database. 
This period in milliseconds is then added with each write. 
If you read the value within this period, the value is returned. 
If the value is read after this period, `undefined` is returned.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue(":memory:", {ttlMs: 1000})

const KEY = "cache-key"
store.set(KEY, 12345)

await Bun.sleep(500)
console.log(store.get(KEY)) // --> 12345

await Bun.sleep(1000)
console.log(store.get(KEY)) // --> undefined
```

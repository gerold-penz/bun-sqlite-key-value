# Database Transactions

Transactions can be used to combine several database statements. 
These combined database statements are processed much faster than 
if they were executed individually.
The more database statements are combined, the greater the speed advantage.
You can find more infos in the 
[Bun documentation](https://bun.sh/docs/api/sqlite#transactions).

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.db.transaction(() => {
    store.set("key1", "100")
    store.set("key2", "200")
    store.set("key3", "300")
})()

store.db.transaction(() => {
    const value1 = store.get("key1")
    const value2 = store.get("key2")
    const value3 = store.get("key3")
    const total = value1 + value2 + value3
    store.set("total1", total)
})()
```

# Delete Old Expiring Items

```typescript
deleteOldExpiringItems(maxExpiringItemsInDb?: number)
```

If there are more expiring items in the database than `maxExpiringItemsInDb`,
the oldest items are deleted until there are only `maxExpiringItemsInDb` items with
an expiration date in the database.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("static:1", "my-value")
store.set("static:2", "my-value")
store.set("dynamic:1", "my-value", 4000)
store.set("dynamic:2", "my-value", 5000)
store.set("dynamic:3", "my-value", 6000)

store.deleteOldExpiringItems(2)
console.log(store.getKeys("dynamic:"))
// --> [ "dynamic:2", "dynamic:3" ]
```

# Count Valid Items

```typescript
getCountValid(deleteExpired?: boolean): number
```

Returns the number of valid (non-expired) items.
Can also delete the expired items.

## deleteExpired

If `true` is passed, the expired items are deleted first 
before the items are counted.

If the parameter is not specified or `false` is passed, 
then only the items that have no expiration date or 
whose expiration date is in the future are counted.


## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("my-key1", "my-value1")
store.set("my-key2", "my-value2", 100)

store.getCountValid() // --> 2

await Bun.sleep(500)
store.getCountValid() // --> 1
```

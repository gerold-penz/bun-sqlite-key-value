# Count All Items

```typescript
getCount(): number

count() // --> alias for getCount()
length // --> getter method for `getCount()`
```

Returns the number of all items, including those that have already expired.
The fact that possibly expired items are also counted is for reasons of speed.
Use `getCountValid()` if you want to get the number of items that have not yet expired.
If you do not use `ttlMs` (time to live), `getCount()` is faster than `getCountValid()`. 


## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("my-key1", "my-value1")
store.set("my-key2", "my-value2")

store.getCount() // --> 2
store.length // --> 2
```



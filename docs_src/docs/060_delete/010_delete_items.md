# Delete Items

```typescript
delete(keyOrKeys?: string | string[])

clear() // --> delete all items

delete <store>.data.<key>
```

Deletes all items if no parameter was passed.

`key: string`: Deletes the item whose key was passed as a string.

`keys: string[]`: Deletes the items whose keys were passed in an array.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

// Delete all items
store.delete()
store.clear()

// Delete one item
store.delete("myKey")
delete store.data.myKey

// Delete multiple items
store.delete(["key1", "key2"])
```

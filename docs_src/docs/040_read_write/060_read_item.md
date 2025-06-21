# Read Item

Reads the key and the value from the database.

```typescript
getItem(key: string): {key: string, value: any}
```

## key

The key must be a string.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()
store.set("my-key", "my-value")

const item = store.getItem("my-key")
console.log(item)  // --> {key: "my-key", value: "my-value"}
```

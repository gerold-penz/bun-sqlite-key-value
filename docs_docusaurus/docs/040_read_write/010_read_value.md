# Read Value

```typescript
get(key: string): any

data.<key>: any
data[<key>]: any
```

Reads a value from the database.

## key

The key must be a string.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("myKey", "my-value")

store.get("myKey") // --> "my-value"

store.data.myKey // --> "my-value"
store.data["myKey"] // --> "my-value"
```

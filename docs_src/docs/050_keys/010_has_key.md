# Has (key)

```typescript
has(key: string): boolean

exists(key: string) // --> alias for has()

<key> in <store>.data
```

Checks if key exists. Returns `false` if the item is expired.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.has("my-key") // --> false
console.log("my-key" in store.data) // --> false 
```

# Set TTL

```typescript
setTtl(key: string, ttlMs?: number): boolean
```

Renews or deletes the TTL of the database row.
Returns `true` if the `key` exists.

## key

The key must be a string.

## ttlMs (optional)

"Time to live" in milliseconds. After this time, 
the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Uses the global `ttlMs` as default value.
Set the value to 0 if you want to delete the TTL.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("my-key", "my-value", 10000)

// Update TTL
store.setTtl("my-key", 10000) // --> true

// Delete TTL
store.setTtl("my-key", 0) // --> true
```

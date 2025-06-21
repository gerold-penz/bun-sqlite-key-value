# Write Multiple Items

```typescript
setItems(items: {key: string, value: T, ttlMs?: number}[])
```

Adds a large number of items to the database and takes only
a small fraction of the time that `set()` would take individually.


## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

// Add many records
store.setItems([
    {key: "a:1", value: "test-value-1"},
    {key: "a:2", value: "test-value-2"},
])
```

# Usage

Using this key value store is dead simple:
create a new BunSqliteKeyValue instance and you're set.
And if you want to save the data permanently, enter the path to the database.

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

// Use regular methods to write and read values.
store.set("myKey", [1, 2, 3, 4])
store.get("myKey") // --> [ 1, 2, 3, 4 ]

// Or use the `data` proxy for simple write and read access.
store.data.myKey = "Hello world!"
store.data.myKey // --> "Hello World"
```

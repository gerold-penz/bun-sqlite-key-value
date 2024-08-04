**Bun-SQLite-Key-Value** is a super fast key-value store with SQLite 
that uses **bun:sqlite** and v8 as a fast JSON replacement.

[Bun's](https://bun.sh/) lightning-fast 
[SQLite implementation](https://bun.sh/docs/api/sqlite) makes Bun-SQLite-Key-Value 
perfect for a fast storage and cache solution with TTL support.
*You need [Bun](https://bun.sh/) to be able to use this package.*

The ideas for the implementation come from 
[bun-sqlite-cache](https://github.com/notskamr/bun-sqlite-cache) and 
[bun-kv](https://github.com/kirill-dev-pro/bun-kv). Thank you very much!


Link to the [Test-Page](test.md)


## Installation

```bash
bun add bun-sqlite-key-value
```

## Usage

Using this key value store is dead simple:
create a new BunSqliteKeyValue instance and you're set.
And if you want to save the data permanently, enter the path to the database.

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

// Use regular methods to write and read values.
store.set("myKey", [1, 2, 3, 4])
store.get("myKey") // --> [ 1, 2, 3, 4 ]

// Or use the data proxy object.
store.data.myKey = "Hello world!"
store.data.myKey // --> "Hello World"

// Or use the short name for the data proxy object.
store.d.myKey = 123456789
store.d.myKey // --> 123456789
```


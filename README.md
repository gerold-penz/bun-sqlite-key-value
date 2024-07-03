# Bun SQLite Key Value
A key-value store with SQLite that uses bun:sqlite and v8 as a fast Json replacement.

The ideas for the implementation come from 
[bun-sqlite-cache](https://github.com/notskamr/bun-sqlite-cache) and 
[bun-kv](https://github.com/kirill-dev-pro/bun-kv).


## Installation

```bash
bun add bun-sqlite-key-value
```

## Usage

Using this cache is dead simple: simply create a new BunSQLiteCache instance and you're set

```typescript
import { BunSQLiteKeyValue } from "bun-sqlite-key-value";

const store = new BunSQLiteKeyValue();

store.set("foo", {bar: "baz", waldo: [4, 3, 2, 8]});
const value = store.get("foo");

console.log(value) // { bar: "baz", waldo: [4, 3, 2, 8] }
```


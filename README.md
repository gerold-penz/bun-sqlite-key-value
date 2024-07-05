# Bun SQLite Key Value
A key-value store with SQLite that uses bun:sqlite and v8 as a fast JSON replacement.

The ideas for the implementation come from 
[bun-sqlite-cache](https://github.com/notskamr/bun-sqlite-cache) and 
[bun-kv](https://github.com/kirill-dev-pro/bun-kv).


## Installation

```bash
bun add bun-sqlite-key-value
```

## Usage

Using this key value store is dead simple:
simply create a new BunSQLiteKeyValue instance and you're set

```typescript
import { BunSQLiteKeyValue } from "bun-sqlite-key-value";

const store = new BunSQLiteKeyValue();

store.set("foo", {bar: "baz", waldo: [4, 3, 2, 8]});
const value = store.get("foo");

console.log(value) // { bar: "baz", waldo: [4, 3, 2, 8] }
```

## Documentation


### Open Database

```typescript
const store = new BunSQLiteKeyValue([filename], [options])
```

- `filename`:
The full path of the SQLite database to open.
Pass an empty string (`""`) or `":memory:"` or undefined for an in-memory database.

- `options`:
Defaults to `{readwrite: true, create: true}`.
If a number, then it's treated as `SQLITE_OPEN_*` constant flags.


#### Example

```typescript
import { BunSQLiteKeyValue } from "bun-sqlite-key-value";

const store = new BunSQLiteKeyValue();
```

### Write Value

```typescript
store.set<T=any>(key, value)
```

- `T`
can be any data type serializable by v8. 
[Supported data types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types). 

- `key`:
The key must be a string.

- `value`:
The value can be any object that can be serialized with 
[v8](https://github.com/nodejs/node/blob/main/doc/api/v8.md#serialization-api). 
This means that not only simple data types such as JSON are possible, 
but also more complex types such as sets or maps. 
Here you will find a list of
[supported data types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types). 


#### Example

```typescript
import { BunSQLiteKeyValue } from "bun-sqlite-key-value";

const store = new BunSQLiteKeyValue();
store.set<string>("my-key", "my-value")
```

### Read Value

```typescript
store.get<T=any>(key)
```

- `T`
can be any data type serializable by v8. 
[Supported data types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types). 

- `key`:
The key must be a string.


#### Example

```typescript
import { BunSQLiteKeyValue } from "bun-sqlite-key-value";

const store = new BunSQLiteKeyValue();
store.set<string>("my-key", "my-value")

console.log(store.get<string>("my-key"))  // --> "my-value"
```

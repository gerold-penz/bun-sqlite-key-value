# Bun SQLite Key Value

A super fast key-value store with SQLite that uses bun:sqlite 
and v8 as a fast JSON replacement.

[Bun's](https://bun.sh/) lightning-fast 
[SQLite implementation](https://bun.sh/docs/api/sqlite) makes Bun-SQLite-Key-Value 
perfect for a fast storage and cache solution with TTL support.

The ideas for the implementation come from 
[bun-sqlite-cache](https://github.com/notskamr/bun-sqlite-cache) and 
[bun-kv](https://github.com/kirill-dev-pro/bun-kv).


## Installation

```bash
bun add bun-sqlite-key-value
```

## Usage

Using this key value store is dead simple:
simply create a new BunSqliteKeyValue instance and you're set

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("my-key", {foo: "bar", baz: [1, 2, 3, 4]})
const value = store.get("my-key")

console.log(value)  // -> {foo: "bar", baz: [ 1, 2, 3, 4 ]}
```

## Documentation


### Open Database

```typescript
const store = new BunSqliteKeyValue([filename], [options])
```

- `filename`:
The full path of the SQLite database to open.
Pass an empty string (`""`) or `":memory:"` or undefined for an in-memory database.

- `options`:
Defaults to `{readwrite: true, create: true}`.
If a number, then it's treated as `SQLITE_OPEN_*` constant flags.


#### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()
```

### Write Value

```typescript
store.set(key, value, [ttlMs]) or
store.setValue(key, value, [ttlMs])
```

- `key`:
The key must be a string.

- `value`:
The value can be any object that can be serialized with
[v8](https://github.com/nodejs/node/blob/main/doc/api/v8.md#serialization-api).
This means that not only simple data types (string, number) are possible,
but also more complex types such as sets or maps.
You can find a list of the
[supported data types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types) here. 

- `ttlMs` (optional):
"Time to live" in milliseconds. After this time, 
the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.

#### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

// Stays in database
store.set("my-key", "my-value")

// Becomes invalid after 30 seconds
store.set("my-key-2", "item-with-ttl", 30000)

```

### Read Value

```typescript
store.get(key) or
store.getValue(key)
```

- `key`:
The key must be a string.


#### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()
store.set("my-key", "my-value")

const value = store.get("my-key")
console.log(value)  // --> "my-value"
```


### Read Item

```typescript
store.getItem(key)
```

- `key`:
The key must be a string.


#### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()
store.set("my-key", "my-value")

const item = store.getItem("my-key")
console.log(item)  // --> {key: "my-key", value: "my-value"}
```


### Read Values

Returns all values in an array whose keys begin with the passed string.
If you plan the names of the keys well, more complex data can be stored.

```typescript
store.getValues(startsWith)
```

- `startsWith`:
String with which the keys whose values are to be returned begin.
It is advisable to divide keys into ranges using separators.
For example `"language:de"`, `"language:en"`, `"language:it"`.
A search for `"language:"` would return all languages.


#### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("language:de", "German")
store.set("language:en", "English")
store.set("language:it", "Italian")

const values = store.getValues("language:")
console.log(values)  // --> [ "German", "English", "Italian" ]
```


### Read Items

Returns all items (key, value) in an array whose keys begin with the passed string.
If you plan the names of the keys well, more complex data can be stored.

```typescript
store.getItemsArray(startsWith)
```

- `startsWith`:
String with which the keys whose items are to be returned begin.
It is advisable to divide keys into ranges using separators.
For example `"language:de"`, `"language:en"`, `"language:it"`.
A search for `"language:"` would return all languages.


#### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("language:de", "German")
store.set("language:en", "English")
store.set("language:it", "Italian")

const items = store.getItemsArray("language:")
console.log(items)
// --> [
//     {key: "language:de", value: "German"},
//     {key: "language:en", value: "English"},
//     {key: "language:it", value: "Italian"}
// ]
```

### Multiple Databases

It is no problem at all to use several databases and access them at the same time.


#### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"
import { join } from "node:path"
import { exists, mkdir } from "node:fs/promises"


const dbDir = join(__dirname, "databases")
if (!(await exists(dbDir))) {
    await mkdir(dbDir)
}

const settingsPath = join(dbDir, "settings.sqlite")
const languagesPath = join(dbDir, "languages.sqlite")

const settingsStore = new BunSqliteKeyValue(settingsPath)
const languagesStore = new BunSqliteKeyValue(languagesPath)

// Write settings
settingsStore.set("language", "de")
settingsStore.set("page-size", "A4")
settingsStore.set("screen-position", {top: 100, left: 100})
settingsStore.set("window-size", {height: 1000, width: 1000})

// Write languages
languagesStore.set("de", "German")
languagesStore.set("en", "English")
languagesStore.set("it", "Italian")

// Read all settings
const settingItems = settingsStore.getItemsArray()
console.log(settingItems)
// -> [
//   {
//     key: "language",
//     value: "de",
//   }, {
//     key: "page-size",
//     value: "A4",
//   }, {
//     key: "screen-position",
//     value: {
//       top: 100,
//       left: 100,
//     },
//   }, {
//     key: "window-size",
//     value: {
//       height: 1000,
//       width: 1000,
//     },
//   }
// ]


// Read all languages
const languageValues = languagesStore.getValues()
console.log(languageValues)  // -> [ "German", "English", "Italian" ]


// Read current language
const languageKey = settingsStore.get("language")
const currentLanguage = languagesStore.get(languageKey)
console.log(`Current language: "${currentLanguage}"`)  // -> Current language: "German"


// Explicitly close DBs
settingsStore.close()
languagesStore.close()
```

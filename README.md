# Bun SQLite Key Value

A super fast key-value store with SQLite that uses **bun:sqlite** 
and v8 as a fast JSON replacement.

[Bun's](https://bun.sh/) lightning-fast 
[SQLite implementation](https://bun.sh/docs/api/sqlite) makes Bun-SQLite-Key-Value 
perfect for a fast storage and cache solution with TTL support.
*You need [Bun](https://bun.sh/) to be able to use this package.*

Please give this [GitHub project](https://github.com/gerold-penz/bun-sqlite-key-value) 
a ⭐ if this project is useful to you. Thank you very much!
And if you speak German, here is my business homepage:
[GP-Softwaretechnik](https://gp-softwaretechnik.at/)
Maybe you will find something interesting for you there. 😃

The ideas for the implementation come from 
[bun-sqlite-cache](https://github.com/notskamr/bun-sqlite-cache) and 
[bun-kv](https://github.com/kirill-dev-pro/bun-kv). Thank you very much!


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

store.set("my-key", [1, 2, 3, 4])

const value = store.get("my-key")

console.log(value)  // -> [ 1, 2, 3, 4 ]
```

## Documentation


### Open Database

```typescript
const store = new BunSqliteKeyValue([filename], [options])
```

Opens and creates the SQLite database either in memory or on the file system.

#### filename (optional)

The full path of the SQLite database to open.
Pass an empty string (`""`) or `":memory:"` or undefined for an in-memory database.

#### options (optional)

`readonly?: boolean`: 
  Open the database as read-only (default: false).

`create?: boolean`:
  Allow creating a new database (default: true)

`readwrite?: boolean`: 
  Open the database as read-write (default: true)

`ttlMs?: boolean`:
  Standard time period in milliseconds before
  an entry written to the DB becomes invalid.

#### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

// In-memory
const store1 = new BunSqliteKeyValue()
// In-memory with 30 seconds default expiration timeout
const store2 = new BunSqliteKeyValue(undefined, {ttlMs: 30000})
// Store items in file system
const store3 = new BunSqliteKeyValue("./store3.sqlite")
```


### Write Value

```typescript
set(key: string, value: any, [ttlMs: number]): void
```

Writes a value into the database.

#### key

The key must be a string.

#### value

The value can be any object that can be serialized with
[v8](https://github.com/nodejs/node/blob/main/doc/api/v8.md#serialization-api).
This means that not only simple data types (string, number) are possible,
but also more complex types such as sets or maps.
You can find a list of the
[supported data types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types) here. 

#### ttlMs (optional)

"Time to live" in milliseconds. After this time, 
the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Set the value to 0 if you want to explicitly deactivate the process.

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
get(key: string): any
```

Reads a value from the database.

#### key

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

Reads the key and the value from the database.

```typescript
getItem(key: string): {key: string, value: any}
```

#### key

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

```typescript
getValues(startsWithOrKeys: string | string[]): any[]
```

Reads the data from the database and returns an array with the values.

#### startsWithOrKeys

`string`: Returns all values in an array whose keys begin with the passed string.
  If you plan the names of the keys well, more complex data can be stored.
  It is advisable to divide keys into ranges using separators.
  For example `"language:de"`, `"language:en"`, `"language:it"`.
  A search for `"language:"` would return all languages.

`string[]`: Array with keys. The returned array is exactly 
  the same size as the passed array.
  Entries that are not found are returned as `undefined`.
  Only exact matches with the keys are returned.

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

```typescript
getItems(startsWithOrKeys: string | string[]): {key: string, value: any}[]
```
Reads the data from the database and returns entries in an array as key-value pairs.

#### startsWithOrKeys

`string`: Returns all items (key, value) in an array whose keys begin with 
  the passed string.
  If you plan the names of the keys well, more complex data can be stored.
  It is advisable to divide keys into ranges using separators.
  For example `"language:de"`, `"language:en"`, `"language:it"`.
  A search for `"language:"` would return all languages.

`string[]`: Array with keys. The returned array is exactly 
  the same size as the passed array.
  Entries that are not found are returned as `undefined`.
  Only exact matches with the keys are returned.

#### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("language:de", "German")
store.set("language:en", "English")
store.set("language:it", "Italian")

const items = store.getItems("language:")
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
const settingItems = settingsStore.getItems()
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


### Read and write binary files (images)

SQLite has no problem with images and other binaries.
The maximum size of a binary file in SQLite is 2 GB.


#### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

// Read file from filesystem
const sourceFile = Bun.file("<Source File Path>")

// Write ArrayBuffer into database (async !!!)
store.set("my-image", await sourceFile.arrayBuffer())

// Read ArrayBuffer from database
const targetArrayBuffer = store.get("my-image")

// Write target file to filesystem (async !!!)
await Bun.write(Bun.file("<Target File Path>"), targetArrayBuffer)
```

### Cache values with TTL

You can specify a caching period when you open the database. 
This period in milliseconds is then added with each write. 
If you read the value within this period, the value is returned. 
If the value is read after this period, `undefined` is returned.

#### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store: BunSqliteKeyValue = new BunSqliteKeyValue(undefined, {ttlMs: 1000})

const KEY = "cache-key"
store.set(KEY, 12345)
await Bun.sleep(500)
console.log(store.get(KEY))  // --> 12345
await Bun.sleep(1000)
console.log(store.get(KEY))  // --> undefined
```

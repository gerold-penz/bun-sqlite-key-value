# Bun SQLite Key Value

A super fast key-value store with SQLite that uses **bun:sqlite** 
and v8 as a fast JSON replacement.

[Bun's](https://bun.sh/) lightning-fast 
[SQLite implementation](https://bun.sh/docs/api/sqlite) makes Bun-SQLite-Key-Value 
perfect for a fast storage and cache solution with TTL support.
*You need [Bun](https://bun.sh/) to be able to use this package.*

The ideas for the implementation come from 
[bun-sqlite-cache](https://github.com/notskamr/bun-sqlite-cache) and 
[bun-kv](https://github.com/kirill-dev-pro/bun-kv). Thank you very much!


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

## Open Database

```typescript
const store = new BunSqliteKeyValue(filename?, options?)
```

Opens and creates the SQLite database either in memory or on the file system.

### filename (optional)

The full path of the SQLite database to open.
Pass an empty string (`""`) or `":memory:"` or `undefined` for an in-memory database.

### options (optional)

`readonly?: boolean`: 
  Open the database as read-only (default: false).

`create?: boolean`:
  Allow creating a new database (default: true).
  If the database folder does not exist, it will be created.

`readwrite?: boolean`: 
  Open the database as read-write (default: true).

`ttlMs?: boolean`:
  Standard time period in milliseconds before
  an entry written to the DB becomes invalid.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

// In-memory
const store1 = new BunSqliteKeyValue()
// In-memory with 30 seconds default expiration timeout
const store2 = new BunSqliteKeyValue(undefined, {ttlMs: 30000})
// Store items in file system
const store3 = new BunSqliteKeyValue("./store3.sqlite")
```


## Write Value

```typescript
set(key: string, value: any, ttlMs?: number)

data.<key> = <value>
data[<key>] = <value>

d.<key> = <value>
d[<key>] = <value>
```

Writes a value into the database.

### key

The key must be a string.

### value

The value can be any object that can be serialized with
[v8](https://github.com/nodejs/node/blob/main/doc/api/v8.md#serialization-api).
This means that not only simple data types (string, number) are possible,
but also more complex types such as sets or maps.
You can find a list of the
[supported data types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types) here. 

### ttlMs (optional)

"Time to live" in milliseconds. After this time, 
the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Set the value to 0 if you want to explicitly deactivate the process.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

// Stays in database
store.set("myKey1", "my-value")

store.data.myKey2 = "my-value"
store.data["myKey3"] = "my-value"

store.d.myKey4 = "my-value"
store.d["myKey5"] = "my-value"

// Becomes invalid after 30 seconds
store.set("myKey6", "item-with-ttl", 30000)
```


## Read Value

```typescript
get(key: string): any

data.<key>: any
data[<key>]: any

d.<key>: any
d[<key>]: any
```

Reads a value from the database.

### key

The key must be a string.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("myKey", "my-value")

store.get("myKey") // --> "my-value"

store.data.myKey // --> "my-value"
store.data["myKey"] // --> "my-value"

store.d.myKey // --> "my-value"
store.d["myKey"] // --> "my-value"
```


## Read Item

Reads the key and the value from the database.

```typescript
getItem(key: string): {key: string, value: any}
```

### key

The key must be a string.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()
store.set("my-key", "my-value")

const item = store.getItem("my-key")
console.log(item)  // --> {key: "my-key", value: "my-value"}
```


## Write Multiple Items

```typescript
setItems(items: {key: string, value: T, ttlMs?: number}[]) {
```

Adds a large number of items to the database and takes only
a small fraction of the time that `set()` would take individually.


### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

// Add many records
store.setItems([
    {key: "a:1", value: "test-value-1"},
    {key: "a:2", value: "test-value-2"},
])
```


## Read Values

```typescript
getValues(startsWithOrKeys?: string | string[]): any[]

<store>.values
```

Reads the data from the database and returns an array with the values.

### startsWithOrKeys

`undefined`: Returns all values in an array.

`string`: Returns all values in an array whose keys begin with the passed string.
  If you plan the names of the keys well, more complex data can be stored.
  It is advisable to divide keys into ranges using separators.
  For example `"language:de"`, `"language:en"`, `"language:it"`.
  A search for `"language:"` would return all languages.

`string[]`: Array with keys. The returned array is exactly 
  the same size as the passed array.
  Entries that are not found are returned as `undefined`.
  Only exact matches with the keys are returned.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("language:de", "German")
store.set("language:en", "English")
store.set("language:it", "Italian")

store.getValues() // --> [ "German", "English", "Italian" ]
store.getValues("language:") // --> [ "German", "English", "Italian" ]

store.values // --> [ "German", "English", "Italian" ]
```


## Read Items

```typescript
getItems(startsWithOrKeys?: string | string[]): {key: string, value: any}[]

<store>.items
```
Reads the data from the database and returns entries in an array as key-value pairs.

### startsWithOrKeys

`undefined`: Returns all items (key, value) in an array.

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

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("language:de", "German")
store.set("language:en", "English")
store.set("language:it", "Italian")

store.getItems("language:") // --> [
//     {key: "language:de", value: "German"},
//     {key: "language:en", value: "English"},
//     {key: "language:it", value: "Italian"}
// ]

store.items // --> [
//     {key: "language:de", value: "German"},
//     {key: "language:en", value: "English"},
//     {key: "language:it", value: "Italian"}
// ]

```


## Multiple Databases

It is no problem at all to use several databases and access them at the same time.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"
import { join } from "node:path"

const dbDir = join(__dirname, "databases")
const settingsPath = join(dbDir, "settings.sqlite")
const languagesPath = join(dbDir, "languages.sqlite")

const settingsStore = new BunSqliteKeyValue(settingsPath)
const languagesStore = new BunSqliteKeyValue(languagesPath)

// Write settings
settingsStore.set("language", "de")
settingsStore.set("page-size", "A4")
settingsStore.set("screen-position", {top: 100, left: 100})

// Write languages
languagesStore.set("de", "German")
languagesStore.set("en", "English")
languagesStore.set("it", "Italian")

// Read all settings
const settingItems = settingsStore.getItems()
console.log(settingItems) // -> [
//   {key: "language", value: "de"},
//   {key: "page-size", value: "A4"},
//   {key: "screen-position", value: {top: 100, left: 100}},
// ]

// Read all languages
const languageValues = languagesStore.getValues()
console.log(languageValues)  // -> [ "German", "English", "Italian" ]

// Read current language
const languageKey = settingsStore.get("language")
const currentLanguage = languagesStore.get(languageKey)
console.log(`Current language: "${currentLanguage}"`)  // -> Current language: "German"

// Close DBs
settingsStore.close()
languagesStore.close()
```


## Read and Write Binary Files (Images)

SQLite has no problem with images and other binaries.
The maximum size of a binary file is 2 GB.

### Example (async)

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

### Example (sync)

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"
import { readFileSync, writeFileSync } from "node:fs"

const store = new BunSqliteKeyValue()

// Read content from filesystem
const sourceContent = readFileSync("<Source File Path>")

// Write Buffer into database
store.set("my-image", sourceContent)

// Read Buffer from database
const targetBuffer = store.get("my-image")

// Write target file to filesystem
writeFileSync("<Target File Path>", targetBuffer)
```

## Cache Values with TTL

You can specify a caching period when you open the database. 
This period in milliseconds is then added with each write. 
If you read the value within this period, the value is returned. 
If the value is read after this period, `undefined` is returned.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue(undefined, {ttlMs: 1000})

const KEY = "cache-key"
store.set(KEY, 12345)

await Bun.sleep(500)
console.log(store.get(KEY)) // --> 12345

await Bun.sleep(1000)
console.log(store.get(KEY)) // --> undefined
```


## Has (key)

```typescript
has(key: string): boolean

<key> in <store>.data
<key> in <store>.d
```

Checks if key exists. Returns `false` if the item is expired.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.has("my-key") // --> false
console.log("my-key" in store.data) // --> false 
```


## Read Keys

```typescript
getKeys(startsWithOrKeys?: string | string[]): string[]

<store>.keys
```

Reads the keys from the database and returns an array.

### startsWithOrKeys

`undefined`: Returns all keys in an array.

`string`: Returns an array with the keys that begin with the passed string.
  If you plan the names of the keys well, more complex data can be stored.
  It is advisable to divide keys into ranges using separators.
  For example `"language:de"`, `"language:en"`, `"language:it"`.
  A search for `"language:"` would return all languages.

`string[]`: Array with keys. 
  Only exact matches with the keys are returned.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("language:de", "German")
store.set("language:en", "English")
store.set("language:es", "Esperanto")

store.getKeys() // --> ["language:de", "language:en", "language:es"]

store.keys // --> ["language:de", "language:en", "language:es"]

store.getKeys("language:e") // --> ["language:en", "language:es"]

store.getKeys(["language:de", "language:fr"]) // --> ["language:de"]

```


## Delete Items

```typescript
delete()
delete(key: string)
delete(keys: string[])
clear()  // --> alias for `delete()`

delete <store>.data.<key>
delete <store>.d.<key>
```

Deletes all items if no parameter was passed.

`key: string`: Deletes the entry whose key was passed as a string.

`keys: string[]`: Deletes the entries whose keys were passed in an array.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

// Delete all items
store.delete()
store.clear()

// Delete one item
store.delete("myKey")
delete store.data.myKey
delete store.d.myKey

// Delete multiple items
store.delete(["key1", "key2"])
```


## Delete Old Expiring Items

```typescript
deleteOldExpiringItems(maxExpiringItemsInDb: number)
```

If there are more expiring items in the database than `maxExpiringItemsInDb`,
the oldest items are deleted until there are only `maxExpiringItemsInDb` items with
an expiration date in the database.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("static:1", "my-value")
store.set("static:2", "my-value")
store.set("dynamic:1", "my-value", 40)
store.set("dynamic:2", "my-value", 45)
store.set("dynamic:3", "my-value", 50)

store.deleteOldExpiringItems(2)
console.log(store.getKeys("dynamic:"))
// --> [ "dynamic:2", "dynamic:3" ]
```


## Count All Items

```typescript
getCount(): number

length  // --> alias for `getCount()`
```

Returns the number of all items, including those that have already expired.
The fact that possibly expired entries are also counted is for reasons of speed.
Use `getCountValid()` if you want to get the number of items that have not yet expired.
If you do not use `ttlMs` (time to live), `getCount()` is faster than `getCountValid()`. 


### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("my-key1", "my-value1")
store.set("my-key2", "my-value2")

store.getCount() // --> 2
store.length // --> 2
```


## Count Valid Items

```typescript
getCountValid(deleteExpired?: boolean): number
```

Returns the number of valid (non-expired) items.
Can also delete the expired items.

### deleteExpired

If the parameter is not specified or `false` is passed, 
then only the entries that have no expiration date or 
whose expiration date is in the future are counted.

If `true` is passed, the expired entries are deleted first 
before the entries are counted.


### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("my-key1", "my-value1")
store.set("my-key2", "my-value2", 100)

store.getCountValid() // --> 2

await Bun.sleep(500)
store.getCountValid() // --> 1
```

## Increment

```typescript
incr(key: string, incrBy: number = 1, ttlMs?: number): number
```

Increments the saved number by `incrBy` (default = 1), 
saves the new number and returns it.
If the key does not yet exist in the database, 
the value is set to 0 before being incremented by `incrBy`.
If a string is stored in the database that can be converted into a number, 
this is converted first.
If the stored value cannot be converted into a number, `NaN` is returned.


### key

The key must be a string.

### incrBy

The stored number is increased by this value.

### ttlMs (optional)

"Time to live" in milliseconds. After this time, 
the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Set the value to 0 if you want to explicitly deactivate the process.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.incr("my-key") // --> 1
store.incr("my-key") // --> 2
```


## Decrement

```typescript
decr(key: string, decrBy: number = 1, ttlMs?: number): number
```

Decrements the saved number by `decrBy` (default = 1), 
saves the new number and returns it.
If the key does not yet exist in the database, 
the value is set to 0 before being decremented by `decrBy`.
If a string is stored in the database that can be converted into a number, 
this is converted first.
If the stored value cannot be converted into a number, `NaN` is returned.


### key

The key must be a string.

### incrBy

The stored number is decreased by this value.

### ttlMs (optional)

"Time to live" in milliseconds. After this time, 
the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Set the value to 0 if you want to explicitly deactivate the process.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("my-key", 10)
store.decr("my-key") // --> 9
store.decr("my-key") // --> 8
```

## Append

```typescript
append(key: string, value: string, ttlMs?: number): number
```

If key already exists, this command appends the value at the end of the string.
If key does not exist it is created and set as an empty string,
so `append()` will be similar to `set()` in this special case.
Inspired by: https://docs.keydb.dev/docs/commands/#append

Returns the length of the string after the append operation.

### key

The key must be a string.

### value

The string that is appended to the existing string.

### ttlMs (optional)

"Time to live" in milliseconds. After this time, 
the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Set the value to 0 if you want to explicitly deactivate the process.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.append("my-key", "Hello!") // --> 6
store.append("my-key", "World!") // --> 12 
store.get("my-key") // --> "Hello!World!"
```


## All Functions

### Database
- `new BunSqliteKeyValue()` --> Open database
- `close()` --> Close database

### Set value
- `set(key: string, value: any)`
- `setValue(key: string, value: any)` --> alias for set()
- `<store>.data.<key> = <value>`
- `<store>.d.<key> = <value>`

### Set items
- `setItems({key: string, value: any}[])`

### Get value
- `get(key: string): any`
- `getValue(key: string)` --> alias for get()
- `<store>.data.<key>`
- `<store>.d.<key>`
- `getSet(key: string, value: any): any`

### Get item
- `getItem(key: string)` --> Object

### Get items as Array
- `getItems()` --> Array with all items
- `getItems(startsWith: string)` --> Array
- `getItems(keys: string[])` --> Array
- `getItemsArray()` --> alias for getItems()
- `getItemsArray(startsWith: string)` --> alias for getItems()
- `getItemsArray(keys: string[])` --> alias for getItems()
- `items` --> alias for getItems()

### Get items as Object
- `getItemsObject()` --> Object with all items
- `getItemsObject(startsWith: string)` --> Object
- `getItemsObject(keys: string[])` --> Object

### Get items as Map()
- `getItemsMap()` --> Map with all items
- `getItemsMap(startsWith: string)` --> Map
- `getItemsMap(keys: string[])` --> Map

### Get values as Array
- `getValues()` --> Array with all values
- `getValues(startsWith: string)` --> Array
- `getValues(keys: string[])` --> Array
- `getValuesArray()` --> alias for getValues()
- `getValuesArray(startsWith: string)` --> alias for getValues()
- `getValuesArray(keys: string[])` --> alias for getValues()
- `values` --> alias for getValues()

### Get values as Set()
- `getValuesSet()` --> Set with all values
- `getValuesSet(startsWith: string)` --> Set
- `getValuesSet(keys: string[])` --> Set

### Delete
- `delete()` --> Delete all items
- `delete(key: string)` --> Delete item
- `delete(keys: string[])` --> Delete items
- `clear()` --> alias for delete()
- `deleteOldExpiringItems(maxExpiringItemsInDb: number)` --> Delete items
- `delete <store>.data.<key>`
- `delete <store>.d.<key>`

### Count
- `getCount()` --> Number
- `length` --> alias for getCount()
- `getCountValid(deleteExpired?: boolean)` --> Number

### Get keys
- `has(key: string)` --> Boolean
- `getKeys()` --> Array with all Keys
- `getKeys(startsWith: string)` --> Array
- `getKeys(keys: string[])` --> Array
- `keys` --> alias for getKeys()
- `<key> in <store>.data`
- `<key> in <store>.d`

### Math operations
- `incr()` --> Number
- `decr()` --> Number

### String operations
- `append()` --> Number


## SQLite as base for a key value storage

SQLite provides a solid and well-tested foundation.
SQLite reliably takes care of saving and reading data - 
both for short strings and for larger BLOBs. 
It provides a robust foundation on which to build.
Even if SQLite is not fully utilized and no relations between tables are required,
this is not a disadvantage.

Please give this [GitHub project](https://github.com/gerold-penz/bun-sqlite-key-value) 
a ⭐ if this project is useful to you. Thank you very much!
And if you speak German, here is my business homepage:
[GP-Softwaretechnik](https://gp-softwaretechnik.at/)
Maybe you will find something interesting for you there. 😃

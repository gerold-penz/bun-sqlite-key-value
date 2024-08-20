# Bun SQLite Key Value

A super fast key-value store with SQLite that uses **bun:sqlite** 
and v8 as a fast JSON replacement.

[![license](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![npm version](https://img.shields.io/npm/v/bun-sqlite-key-value.svg?style=flat-square)](https://www.npmjs.com/package/bun-sqlite-key-value)
[![npm downloads](https://img.shields.io/npm/dw/bun-sqlite-key-value)](https://www.npmjs.com/package/bun-sqlite-key-value)

[Bun's](https://bun.sh/) lightning-fast 
[SQLite implementation](https://bun.sh/docs/api/sqlite) makes Bun-SQLite-Key-Value 
perfect for a fast and reliable storage and cache solution with TTL support.
*You need [Bun](https://bun.sh/) to be able to use this package.*

The ideas for the implementation come from 
[bun-sqlite-cache](https://github.com/notskamr/bun-sqlite-cache) and 
[bun-kv](https://github.com/kirill-dev-pro/bun-kv). Thank you very much!


## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- Database Usage
  - [Open Database](#open-database)
  - [Close Database](#close-database)
- Write and Read Values
  - [`set()`](#write-value)
  - [`get()`](#read-value)
  - [`getSet()`](#read-and-write-value-in-one-step)
  - [`getValues()`](#read-multiple-values)
  - `getValuesSet()` --> Set with values
- Write and Read Items
  - [`setItems()`](#write-multiple-items)
  - [`getItem()`](#read-item)
  - [`getItems()`](#read-multiple-items)
  - `getItemsObject()` --> Object with items
  - `getItemsMap()` --> Map with items
  - [Read and Write Binary Files (Images)](#read-and-write-binary-files-images)
- Keys
  - [`has()`](#has-key)
  - [`getKeys()`](#read-multiple-keys)
  - [`rename()`](#rename-key)
- Delete Items
  - [`delete()`](#delete-items)
  - [`deleteExpired()`](#delete-expired-items)
  - [`deleteOldExpiringItems()`](#delete-old-expiring-items)
- Count Items
  - [`getCount()`](#count-all-items)
  - [`getCountValid()`](#count-valid-items)
- Expiration/TTL (Time To Live)
  - [Cache Values with TTL](#cache-values-with-ttl)
  - [`setTtl()`](#set-ttl)
  - [`getTtl()`](#get-ttl)
- Random
  - [`getRandomValue()`](#read-random-value)
  - [`getRandomItem()`](#read-random-item)
  - [`getRandomKey()`](#random-key)
- Math
  - [`incr()`](#increment)
  - [`decr()`](#decrement)
- String
  - [`append()`](#append)
- Hash (Map Object)
  - [`hSet()`](#hash-map-object---write-value)
  - [`hGet()`](#hash-map-object---read-value)
  - [`hmSet()`](#hash-map-object---write-multiple-values)
  - [`hmGet()`](#hash-map-object---read-multiple-values)
  - [`hHasField()`](#hash-map-object---has-field)
  - [`hGetCount()`](#hash-map-object---count-fields)
  - [`hGetFields()`](#hash-map-object---get-all-field-names)
  - [`hGetValues()`](#hash-map-object---get-all-values)
  - [`hDelete()`](#hash-map-object---delete-field)
- Extended database topics
  - [Multiple Databases](#multiple-databases)
  - [Database Transactions](#database-transactions)
  - [SQLite as base for a key value storage](#sqlite-as-base-for-a-key-value-storage)


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
const store2 = new BunSqliteKeyValue(":memory:", {ttlMs: 30000})
// Store items in file system
const store3 = new BunSqliteKeyValue("./store3.sqlite")
```


## Close Database

```typescript
close()
```
Closes database and removes *.sqlite-shm* and *.sqlite-wal* files.


## Write Value

```typescript
set(key: string, value: any, ttlMs?: number)

data.<key> = <value>
data[<key>] = <value>
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

// Becomes invalid after 30 seconds
store.set("myKey6", "item-with-ttl", 30000)
```


## Read Value

```typescript
get(key: string): any

data.<key>: any
data[<key>]: any
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
```


## Read and Write Value (in one step)

```typescript
getSet(key: string, value: any, ttlMs?: number)
```

Atomically sets key to value and returns the old value stored at key.
Inspired by: [https://docs.keydb.dev/docs/commands/#getset](https://docs.keydb.dev/docs/commands/#getset)

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

store.set("key-1", "string-value-1")
store.getSet("key-1", "string-value-2")) // --> "string-value-1"
store.get("key-1") // --> "string-value-2"
```


## Read Multiple Values

```typescript
getValues(startsWithOrKeys?: string | string[]): any[]

<store>.values
```

Reads the data from the database and returns an array with the values.

### startsWithOrKeys

`undefined`: Returns an array with all values.

`string`: Returns an array with all values whose keys begin with the passed string.
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


## Read Multiple Items

```typescript
getItems(startsWithOrKeys?: string | string[]): {key: string, value: any}[]

<store>.items
```
Reads the data from the database and returns items in an array as key-value pairs.

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


## Has (key)

```typescript
has(key: string): boolean

exists(key: string) // --> alias for has()

<key> in <store>.data
```

Checks if key exists. Returns `false` if the item is expired.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.has("my-key") // --> false
console.log("my-key" in store.data) // --> false 
```


## Read Multiple Keys

```typescript
getKeys(startsWithOrKeys?: string | string[]): string[]

<store>.keys // --> all keys
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


## Rename Key

```typescript
rename(oldKey: string, newKey: string): boolean
```

Renames `oldKey` to `newKey`.
It returns `false` when `oldKey` does not exist.
If `newKey` already exists it is deleted first.
Inspired by: [https://docs.keydb.dev/docs/commands/#rename](https://docs.keydb.dev/docs/commands/#rename)


## Delete Items

```typescript
delete(keyOrKeys?: string | string[])

clear() // --> delete all items

delete <store>.data.<key>
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

// Delete multiple items
store.delete(["key1", "key2"])
```


## Delete Expired Items

```typescript
deleteExpired()
```

Deletes all expired items. 
These are entries whose TTL (Time to live) has expired.
These entries are not deleted continuously, 
but only when they are accessed directly or when the database is opened.
If you want to delete the expired entries in between, 
you can do this with `deleteExpired()`.


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
store.set("dynamic:1", "my-value", 4000)
store.set("dynamic:2", "my-value", 5000)
store.set("dynamic:3", "my-value", 6000)

store.deleteOldExpiringItems(2)
console.log(store.getKeys("dynamic:"))
// --> [ "dynamic:2", "dynamic:3" ]
```


## Count All Items

```typescript
getCount(): number

count() // --> alias for getCount()
length // --> getter method for `getCount()`
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

If `true` is passed, the expired entries are deleted first 
before the entries are counted.

If the parameter is not specified or `false` is passed, 
then only the entries that have no expiration date or 
whose expiration date is in the future are counted.


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


## Cache Values with TTL

You can specify a caching period when you open the database. 
This period in milliseconds is then added with each write. 
If you read the value within this period, the value is returned. 
If the value is read after this period, `undefined` is returned.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue(":memory:", {ttlMs: 1000})

const KEY = "cache-key"
store.set(KEY, 12345)

await Bun.sleep(500)
console.log(store.get(KEY)) // --> 12345

await Bun.sleep(1000)
console.log(store.get(KEY)) // --> undefined
```


## Set TTL

```typescript
setTtl(key: string, ttlMs?: number): boolean
```

Renews or deletes the TTL of the database row.
Returns `true` if the `key` exists.

### key

The key must be a string.

### ttlMs (optional)

"Time to live" in milliseconds. After this time, 
the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Uses the global `ttlMs` as default value.
Set the value to 0 if you want to delete the TTL.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("my-key", "my-value", 10000)

// Update TTL
store.setTtl("my-key", 10000) // --> true

// Delete TTL
store.setTtl("my-key", 0) // --> true
```


## Get TTL

```typescript
getTtl(key: string): number | undefined
```

Returns how long the data record is still valid (in milliseconds).
Returns `undefined` if the `key` does not exist or no expiration date has been set.

Inspired by: [https://docs.keydb.dev/docs/commands/#ttl](https://docs.keydb.dev/docs/commands/#ttl)

### key

The key must be a string.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("my-key", "my-value", 20000)
await Bun.sleep(1)
store.getTtl("my-key") // --> 19999
```


## Read Random Value

```typescript
getRandomValue(): any // --> random value

randomValue() // --> alias for getRandomValue()
```

Returns a random value or `undefined` if no valid item was found.
Inspired by: [https://docs.keydb.dev/docs/commands/#randomkey](https://docs.keydb.dev/docs/commands/#randomkey)


## Read Random Item

```typescript
getRandomItem() // --> random item

randomItem() // --> alias for getRandomItem()
```

Returns a random item or `undefined` if no valid item was found.
Inspired by: [https://docs.keydb.dev/docs/commands/#randomkey](https://docs.keydb.dev/docs/commands/#randomkey)


## Random Key

```typescript
getRandomKey() // --> random key

randomKey() // --> alias for getRandomKey()
```

Returns a random key or `undefined` if no valid item was found.
Inspired by: [https://docs.keydb.dev/docs/commands/#randomkey](https://docs.keydb.dev/docs/commands/#randomkey)


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
Inspired by: [https://docs.keydb.dev/docs/commands/#append](https://docs.keydb.dev/docs/commands/#append)

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


## Hash (Map Object) - Write Value

```typescript
hSet(key: string, field: string, value: any, ttlMs?: number)
```

First the 
[JavaScript Map Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) 
is read from the database.
If the data record does not yet exist, a new "Map Object" is created.
Then the entry marked with `field` is added to the "Map Object" or overwritten. 
Finally, the modified "Map Object" is written back to the database.

Inspired by: [https://docs.keydb.dev/docs/commands/#hset](https://docs.keydb.dev/docs/commands/#hset)

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

### key

The key must be a string.

### field

The field name must be a string.

### value

The value can be any object that can be serialized with
[v8](https://github.com/nodejs/node/blob/main/doc/api/v8.md#serialization-api).
This means that not only simple data types (string, number) are possible,
but also more complex types such as sets or maps.
You can find a list of the
[supported data types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types) here. 

### ttlMs (optional)

"Time to live" in milliseconds (for the database line, marked with `key`).
After this time, the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Set the value to 0 if you want to explicitly deactivate the process.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hSet("key-1", "field-1", "value-1")
store.hSet("key-1", "field-2", "value-2")

store.get("key-1") // --> Map(2) {
  "name-1": "value-1",
  "name-2": "value-2",
}
```


## Hash (Map Object) - Read Value

```typescript
hGet(key: string, field: string)
```

First the 
[JavaScript Map Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) 
is read from the database.
If the data record (marked with `key`) does not exist, `undefined` is returned.
If the field (marked with `field`) does not exist in the "Map Object", `undefined` is returned.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hget](https://docs.keydb.dev/docs/commands/#hget)

### key

The key must be a string.

### field

The field name must be a string.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hSet("key-1", "field-1", "value-1")

store.hGet("key-1", "field-1") // --> "value-1"
store.hGet("key-1", "field-2") // --> undefined
```


## Hash (Map Object) - Write Multiple Values

```typescript
hmSet(key: string, fields: {[field: string]: T}, ttlMs?: number)
```

Like `hSet()`, with the difference that several fields 
are written to the database in one go.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hmset](https://docs.keydb.dev/docs/commands/#hmset)

### key

The key must be a string.

### fields

Object with field names (keys) and values.

### ttlMs (optional)

"Time to live" in milliseconds (for the database line, marked with `key`).
After this time, the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Set the value to 0 if you want to explicitly deactivate the process.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hmSet("my-key", {
    "field-1": "value-1",
    "field-2": "value-2",
    "field-3": "value-3"
})
```


## Hash (Map Object) - Read Multiple Values

```typescript
hmGet(key: string, fields: fields?: string[])
```

Like `hGet()`, with the difference that several fields are read in one go.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hmget](https://docs.keydb.dev/docs/commands/#hmget)

### key

The key must be a string.

### fields

Array with field names.
If the parameter is not specified, all fields are returned.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hmSet("my-key", {
    "field-1": "value-1",
    "field-2": "value-2"
})

store.hmGet(KEY_1, ["field-1", "field-100"]) // --> {
//   "field-1": "value-1",
//   "field-100": undefined,
// }
```


## Hash (Map Object) - Has Field

```typescript
hHasField(key: string, field: string)
```

Returns if `field` is an existing field in the hash stored at `key`.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hexists](https://docs.keydb.dev/docs/commands/#hexists)

### key

The key must be a string.

### field

The field name must be a string.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hSet("key-1", "field-1", "value-1")

store.hHasField("key-1", "field-1") // --> true
store.hHasField("key-1", "field-1") // --> undefined
```


## Hash (Map Object) - Count Fields

```typescript
hGetCount(key: string)
```

Returns the number of fields contained in the hash stored at `key`.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hlen](https://docs.keydb.dev/docs/commands/#hlen)

### key

The key must be a string.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hGetCount("key-1") // --> undefined
store.hSet("key-1", "field-1", "value-1")
store.hGetCount("key-1") // --> 1
```


## Hash (Map Object) - Get All Field Names

```typescript
hGetFields(key: string)
```

Returns the field names contained in the hash stored at `key`.
Use `hmGet()` to read field names and values.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hkeys](https://docs.keydb.dev/docs/commands/#hkeys)

### key

The key must be a string.

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hmSet("key-1", {
    "field-1": "value-1",
    "field-2": "value-2"
})
store.hGetFields("key-1") // --> ["field-1", "field-2"]
```


## Hash (Map Object) - Get All Values

```typescript
hGetValues(key: string)
```

Returns the values contained in the hash stored at `key`.
Use `hmGet()` to read field names and values.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hvals](https://docs.keydb.dev/docs/commands/#hvals)

### key

The key must be a string.

### Example

```TypeScript#hgetvalues-example.ts
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hmSet("key-1", {
    "field-1": "value-1",
    "field-2": "value-2"
})
store.hGetValues("key-1") // --> ["value-1", "value-2"]
```


## Hash (Map Object) - Delete Field

```typescript
hDelete(key: string, field: string)
```

Deletes a field of the map object.

- Returns `undefined` if the key does not exist.
- Returns `true` if the field existed and was deleted.
- Returns `false` if the field did not exist.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hdel](https://docs.keydb.dev/docs/commands/#hdel)

### key

The key must be a string.

### field

The field name must be a string.


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
console.log(settingItems) // --> [
//   {key: "language", value: "de"},
//   {key: "page-size", value: "A4"},
//   {key: "screen-position", value: {top: 100, left: 100}},
// ]

// Read all languages
const languageValues = languagesStore.getValues()
console.log(languageValues) // --> [ "German", "English", "Italian" ]

// Read current language
const languageKey = settingsStore.get("language")
const currentLanguage = languagesStore.get(languageKey)
console.log(`Current language: "${currentLanguage}"`) // --> Current language: "German"

// Close DBs
settingsStore.close()
languagesStore.close()
```


## Database Transactions

Transactions can be used to combine several database statements. 
These combined database statements are processed much faster than 
if they were executed individually.
The more database statements are combined, the greater the speed advantage.
You can find more infos in the 
[Bun documentation](https://bun.sh/docs/api/sqlite#transactions).

### Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.db.transaction(() => {
    store.set("key1", "100")
    store.set("key2", "200")
    store.set("key3", "300")
})()

store.db.transaction(() => {
    const value1 = store.get("key1")
    const value2 = store.get("key2")
    const value3 = store.get("key3")
    const total = value1 + value2 + value3
    store.set("total1", total)
})()
```


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

# Read Multiple Items

```typescript
getItems(startsWithOrKeys?: string | string[]): {key: string, value: any}[]

<store>.items
```
Reads the data from the database and returns items in an array as key-value pairs.

## startsWithOrKeys

`undefined`: Returns all items (key, value) in an array.

`string`: Returns all items (key, value) in an array whose keys begin with 
  the passed string.
  If you plan the names of the keys well, more complex data can be stored.
  It is advisable to divide keys into ranges using separators.
  For example `"language:de"`, `"language:en"`, `"language:it"`.
  A search for `"language:"` would return all languages.

`string[]`: Array with keys. The returned array is exactly 
  the same size as the passed array.
  Items that are not found are returned as `undefined`.
  Only exact matches with the keys are returned.

## Example

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

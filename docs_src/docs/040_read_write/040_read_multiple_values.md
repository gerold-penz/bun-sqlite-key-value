# Read Multiple Values

```typescript
getValues(startsWithOrKeys?: string | string[]): any[]

<store>.values
```

Reads the data from the database and returns an array with the values.

## startsWithOrKeys

`undefined`: Returns an array with all values.

`string`: Returns an array with all values whose keys begin with the passed string.
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

store.getValues() // --> [ "German", "English", "Italian" ]
store.getValues("language:") // --> [ "German", "English", "Italian" ]

store.values // --> [ "German", "English", "Italian" ]
```

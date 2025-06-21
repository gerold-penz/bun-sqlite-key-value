# Read Multiple Keys

```typescript
getKeys(startsWithOrKeys?: string | string[]): string[]

<store>.keys // --> all keys
```

Reads the keys from the database and returns an array.

## startsWithOrKeys

`undefined`: Returns all keys in an array.

`string`: Returns an array with the keys that begin with the passed string.
  If you plan the names of the keys well, more complex data can be stored.
  It is advisable to divide keys into ranges using separators.
  For example `"language:de"`, `"language:en"`, `"language:it"`.
  A search for `"language:"` would return all languages.

`string[]`: Array with keys. 
  Only exact matches with the keys are returned.

## Example

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

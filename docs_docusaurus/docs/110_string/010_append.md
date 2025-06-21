# Append

```typescript
append(key: string, value: string, ttlMs?: number): number
```

If key already exists, this command appends the value at the end of the string.
If key does not exist it is created and set as an empty string,
so `append()` will be similar to `set()` in this special case.
Inspired by: [https://docs.keydb.dev/docs/commands/#append](https://docs.keydb.dev/docs/commands/#append)

Returns the length of the string after the append operation.

## key

The key must be a string.

## value

The string that is appended to the existing string.

## ttlMs (optional)

"Time to live" in milliseconds. After this time, 
the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Set the value to 0 if you want to explicitly deactivate the process.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.append("my-key", "Hello!") // --> 6
store.append("my-key", "World!") // --> 12 
store.get("my-key") // --> "Hello!World!"
```

# Decrement

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

## key

The key must be a string.

## incrBy

The stored number is decreased by this value.

## ttlMs (optional)

"Time to live" in milliseconds. After this time, 
the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Set the value to 0 if you want to explicitly deactivate the process.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("my-key", 10)
store.decr("my-key") // --> 9
store.decr("my-key") // --> 8
```


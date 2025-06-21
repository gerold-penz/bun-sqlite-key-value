# Read and Write Value (in one step)

```typescript
getSet(key: string, value: any, ttlMs?: number)
```

Atomically sets key to value and returns the old value stored at key.
Inspired by: [https://docs.keydb.dev/docs/commands/#getset](https://docs.keydb.dev/docs/commands/#getset)

## key

The key must be a string.

## value

The value can be any object that can be serialized with
[v8](https://github.com/nodejs/node/blob/main/doc/api/v8.md#serialization-api).
This means that not only simple data types (string, number) are possible,
but also more complex types such as sets or maps.
You can find a list of the
[supported data types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types) here.

## ttlMs (optional)

"Time to live" in milliseconds. After this time,
the item becomes invalid and is deleted from the database
the next time it is accessed or when the application is started.
Set the value to 0 if you want to explicitly deactivate the process.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("key-1", "string-value-1")
store.getSet("key-1", "string-value-2")) // --> "string-value-1"
store.get("key-1") // --> "string-value-2"

# Write Value

```typescript
set(key: string | undefined, value: any, ttlMs?: number): Key

data.<key> = <value>
data[<key>] = <value>
```

Writes a value into the database and returns the key.

## key

The `key` can be a string or `undefined`.
If the `key` is `undefined`, a UUID is used instead.

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

// Stays in database
store.set("myKey1", "my-value")

store.data.myKey2 = "my-value"
store.data["myKey3"] = "my-value"

// Becomes invalid after 30 seconds
store.set("myKey6", "item-with-ttl", 30000)
```

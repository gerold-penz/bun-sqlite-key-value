# Hash - Write Value

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

## key

The key must be a string.

## field

The field name must be a string.

## value

The value can be any object that can be serialized with
[v8](https://github.com/nodejs/node/blob/main/doc/api/v8.md#serialization-api).
This means that not only simple data types (string, number) are possible,
but also more complex types such as sets or maps.
You can find a list of the
[supported data types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types) here. 

## ttlMs (optional)

"Time to live" in milliseconds (for the database line, marked with `key`).
After this time, the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Set the value to 0 if you want to explicitly deactivate the process.

## Example

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

# hmSet() - Write Multiple Values

```typescript
hmSet(key: string, fields: {[field: string]: T}, ttlMs?: number)
```

Like `hSet()`, with the difference that several fields 
are written to the database in one go.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hmset](https://docs.keydb.dev/docs/commands/#hmset)

## key

The key must be a string.

## fields

Object with field names (keys) and values.

## ttlMs (optional)

"Time to live" in milliseconds (for the database line, marked with `key`).
After this time, the item becomes invalid and is deleted from the database 
the next time it is accessed or when the application is started.
Set the value to 0 if you want to explicitly deactivate the process.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hmSet("my-key", {
    "field-1": "value-1",
    "field-2": "value-2",
    "field-3": "value-3"
})
```

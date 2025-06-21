# Hash - Get All Field Names

```typescript
hGetFields(key: string)
```

Returns the field names contained in the hash stored at `key`.
Use `hmGet()` to read field names and values.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hkeys](https://docs.keydb.dev/docs/commands/#hkeys)

## key

The key must be a string.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hmSet("key-1", {
    "field-1": "value-1",
    "field-2": "value-2"
})
store.hGetFields("key-1") // --> ["field-1", "field-2"]
```


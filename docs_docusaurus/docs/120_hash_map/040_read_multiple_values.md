# hmGet() - Read Multiple Values

```typescript
hmGet(key: string, fields: fields?: string[])
```

Like `hGet()`, with the difference that several fields are read in one go.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hmget](https://docs.keydb.dev/docs/commands/#hmget)

## key

The key must be a string.

## fields

Array with field names.
If the parameter is not specified, all fields are returned.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hmSet("my-key", {
    "field-1": "value-1",
    "field-2": "value-2"
})

store.hmGet(KEY_1, ["field-1", "field-100"]) // --> {
//   "field-1": "value-1",
//   "field-100": undefined,
// }
```

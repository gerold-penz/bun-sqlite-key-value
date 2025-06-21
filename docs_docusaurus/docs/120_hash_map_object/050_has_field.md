# Hash - Has Field

```typescript
hHasField(key: string, field: string)
```

Returns if `field` is an existing field in the hash stored at `key`.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hexists](https://docs.keydb.dev/docs/commands/#hexists)

## key

The key must be a string.

## field

The field name must be a string.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hSet("key-1", "field-1", "value-1")

store.hHasField("key-1", "field-1") // --> true
store.hHasField("key-1", "field-1") // --> undefined
```

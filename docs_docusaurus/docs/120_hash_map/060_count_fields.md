# hGetCount() - Count Fields

```typescript
hGetCount(key: string)
```

Returns the number of fields contained in the hash stored at `key`.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hlen](https://docs.keydb.dev/docs/commands/#hlen)

## key

The key must be a string.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hGetCount("key-1") // --> undefined
store.hSet("key-1", "field-1", "value-1")
store.hGetCount("key-1") // --> 1
```

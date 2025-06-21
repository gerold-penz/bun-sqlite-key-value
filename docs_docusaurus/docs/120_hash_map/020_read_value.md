# hGet() - Read Value

```typescript
hGet(key: string, field: string)
```

First the 
[JavaScript Map Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) 
is read from the database.
If the data record (marked with `key`) does not exist, `undefined` is returned.
If the field (marked with `field`) does not exist in the "Map Object", `undefined` is returned.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hget](https://docs.keydb.dev/docs/commands/#hget)

## key

The key must be a string.

## field

The field name must be a string.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.hSet("key-1", "field-1", "value-1")

store.hGet("key-1", "field-1") // --> "value-1"
store.hGet("key-1", "field-2") // --> undefined
```

# Hash - Delete Field

```typescript
hDelete(key: string, field: string)
```

Deletes a field of the map object.

- Returns `undefined` if the key does not exist.
- Returns `true` if the field existed and was deleted.
- Returns `false` if the field did not exist.

> Do not use the hash functions with several very large amounts (megabytes) of data or blobs.
> This is because the entire data record with all fields is always read and written.
> It is better to use `setValues()` and `getValues()` for large amounts of data.

Inspired by: [https://docs.keydb.dev/docs/commands/#hdel](https://docs.keydb.dev/docs/commands/#hdel)

## key

The key must be a string.

## field

The field name must be a string.

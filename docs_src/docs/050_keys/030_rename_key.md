# Rename Key

```typescript
rename(oldKey: string, newKey: string): boolean
```

Renames `oldKey` to `newKey`.
It returns `false` when `oldKey` does not exist.
If `newKey` already exists it is deleted first.
Inspired by: [https://docs.keydb.dev/docs/commands/#rename](https://docs.keydb.dev/docs/commands/#rename)

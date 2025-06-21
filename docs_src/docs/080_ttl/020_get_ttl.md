# Get TTL

```typescript
getTtl(key: string): number | undefined
```

Returns how long the data record is still valid (in milliseconds).
Returns `undefined` if the `key` does not exist or no expiration date has been set.

Inspired by: [https://docs.keydb.dev/docs/commands/#ttl](https://docs.keydb.dev/docs/commands/#ttl)

## key

The key must be a string.

## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

store.set("my-key", "my-value", 20000)
await Bun.sleep(1)
store.getTtl("my-key") // --> 19999
```

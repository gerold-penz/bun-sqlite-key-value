# Open Database

```typescript
const store = new BunSqliteKeyValue(filename?, options?)
```

Opens and creates the SQLite database either in memory or on the file system.

## filename (optional)

The full path of the SQLite database to open.
Pass an empty string (`""`) or `":memory:"` or `undefined` for an in-memory database.

## options (optional)

`readonly?: boolean`: 
  Open the database as read-only (default: false).

`create?: boolean`:
  Allow creating a new database (default: true).
  If the database folder does not exist, it will be created.

`readwrite?: boolean`: 
  Open the database as read-write (default: true).

`ttlMs?: boolean`:
  Default time span in milliseconds before an item 
  written to the DB becomes invalid and is marked for deletion.

`maxExpiringItemsInDb?: number`:
  Default value that specifies the maximum number of 
  expiring items that may be in the database.
  Is used by the `deleteOldExpiringItems()` method as default value.


## Example

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

// In-memory
const store1 = new BunSqliteKeyValue()
// In-memory with 30 seconds default expiration timeout
const store2 = new BunSqliteKeyValue(":memory:", {ttlMs: 30000})
// Store items in file system
const store3 = new BunSqliteKeyValue("./store3.sqlite")
```

# Read and Write Binary Files (Images)

SQLite has no problem with images and other binaries.
The maximum size of a binary file is 2 GB.

## Example (async)

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"

const store = new BunSqliteKeyValue()

// Read file from filesystem
const sourceFile = Bun.file("<Source File Path>")

// Write ArrayBuffer into database (async !!!)
store.set("my-image", await sourceFile.arrayBuffer())

// Read ArrayBuffer from database
const targetArrayBuffer = store.get("my-image")

// Write target file to filesystem (async !!!)
await Bun.write(Bun.file("<Target File Path>"), targetArrayBuffer)
```

## Example (sync)

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"
import { readFileSync, writeFileSync } from "node:fs"

const store = new BunSqliteKeyValue()

// Read content from filesystem
const sourceContent = readFileSync("<Source File Path>")

// Write Buffer into database
store.set("my-image", sourceContent)

// Read Buffer from database
const targetBuffer = store.get("my-image")

// Write target file to filesystem
writeFileSync("<Target File Path>", targetBuffer)
```

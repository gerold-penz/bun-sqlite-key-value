# Bun-SQLite-Key-Value

A super fast key-value store with SQLite that uses **bun:sqlite** 
and v8 as a fast JSON replacement.

[![license](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![npm version](https://img.shields.io/npm/v/bun-sqlite-key-value.svg)](https://www.npmjs.com/package/bun-sqlite-key-value)
[![npm downloads](https://img.shields.io/npm/dw/bun-sqlite-key-value)](https://www.npmjs.com/package/bun-sqlite-key-value)
[![bun:sqlite](https://img.shields.io/badge/bun-%3Asqlite-044a64?style=flat&logo=Bun&logoColor=f6dece&link=https%3A%2F%2Fbun.sh%2Fdocs%2Fapi%2Fsqlite
)](https://bun.sh/docs/api/sqlite)

[Bun's](https://bun.sh/) lightning-fast 
[SQLite implementation](https://bun.sh/docs/api/sqlite) makes Bun-SQLite-Key-Value 
perfect for a fast and reliable storage and cache solution with TTL support.
***You need [Bun](https://bun.sh/) to be able to use this package.***

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"
const myStore = new BunSqliteKeyValue()

// Write value
myStore.set("myKey", 1234)

// Read value
myStore.get("myKey") // --> 1234
```

## Full Documentation

Follow this link to the full 
[documentation of Bun-SQLite-Key-Value](./installation).

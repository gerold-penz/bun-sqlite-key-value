---
slug: /
---

# Bun-SQLite-Key-Value

A superfast key-value store with SQLite that uses **bun:sqlite** 
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

## Installation

```bash
bun add bun-sqlite-key-value
```

## Short Example 

```typescript
import { BunSqliteKeyValue } from "bun-sqlite-key-value"
const myStore = new BunSqliteKeyValue()

// Write value
myStore.set("myKey", 1234)

// Read value
myStore.get("myKey") // --> 1234
```

## Links to Some Entries in the Documentation

- [Usage](/bun-sqlite-key-value/usage/)
- [Open and Close Database](/bun-sqlite-key-value/category/database)
- [Read and Write Values and Items](/bun-sqlite-key-value/category/read-and-write)
- [Read and Write Binary Files (Images)](/bun-sqlite-key-value/read_write/read_write_binary_files_iImages)
- [Keys](/bun-sqlite-key-value/category/keys)
- [Delete Items](/bun-sqlite-key-value/category/delete-items)
- [Count Items](/bun-sqlite-key-value/category/count-items)
- [Cache Values with TTL](/bun-sqlite-key-value/ttl/)
- [Random Values](/bun-sqlite-key-value/category/random)
- [Math](/bun-sqlite-key-value/category/math)
- [String](/bun-sqlite-key-value/category/string)
- [Hash (JavaScript Map)](/bun-sqlite-key-value/category/hash-javascript-map)
- [List (JavaScript Array)](/bun-sqlite-key-value/category/list-javascript-array)
- [Tags (Labels)](/bun-sqlite-key-value/category/tags-labels)
- [Database Transactions](/bun-sqlite-key-value/extended_database_topics/database_transactions)


## GitHub Stars

Please give this [GitHub project](https://github.com/gerold-penz/bun-sqlite-key-value) 
a ⭐ if this project is useful to you. Thank you very much!
And if you speak German, here is my business homepage:
[GP-Softwaretechnik](https://gp-softwaretechnik.at/)
Maybe you will find something interesting for you there. 😃


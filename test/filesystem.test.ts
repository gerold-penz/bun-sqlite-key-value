import { expect, test } from "bun:test"
import { BunSqliteKeyValue } from "../src"
import { join } from "node:path"

const DBPATH = join(__dirname, "filesystemtest.sqlite")
const KEY_1: string = "test-key-1"
const KEY_2: string = "test-key-2"
const STRING_VALUE_1: string = "Hello world!"
const STRING_VALUE_2: string = "Hello moon!"


test("set()", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue(DBPATH)
    memDb.set<string>(KEY_1, STRING_VALUE_1)
    memDb.set<string>(KEY_2, STRING_VALUE_2)
})


test("get()", () => {
    const memDb: BunSqliteKeyValue = new BunSqliteKeyValue(DBPATH)
    expect(memDb.get<string>(KEY_1)).toEqual(STRING_VALUE_1)
    expect(memDb.get<string>(KEY_2)).toEqual(STRING_VALUE_2)
})

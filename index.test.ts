import { beforeAll, expect, test } from "bun:test"
import { BunSqliteKeyValue } from "./index"


let memDb: BunSqliteKeyValue


beforeAll(() => {
    memDb = new BunSqliteKeyValue(":memory:")
    console.log("SERVUS")
})


test("Set and get value", () => {
    const VALUE = "Hello World"
    memDb.set<string>("key", VALUE)
    expect(memDb.get<string>("key")?.value).toEqual(VALUE)
})


import {beforeAll, expect, test} from "bun:test"
import {BunSqliteKeyValue} from "./index"


test("Global Usage Test", () => {
    const memDb = new BunSqliteKeyValue(":memory:")
})

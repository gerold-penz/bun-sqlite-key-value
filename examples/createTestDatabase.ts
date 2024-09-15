import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue("test_database.sqlite")
store.close()


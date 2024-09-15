import { BunSqliteKeyValue } from "../src"
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



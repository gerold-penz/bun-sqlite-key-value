import { BunSqliteKeyValue } from "../src"


const store = new BunSqliteKeyValue()

// Read file from filesystem
const sourceFile = Bun.file("<Source File Path>")

// Write ArrayBuffer into database (async !!!)
store.set("my-image", await sourceFile.arrayBuffer())

// Read ArrayBuffer from database
const targetArrayBuffer = store.get("my-image")

// Write target file to filesystem (async !!!)
await Bun.write(Bun.file("<Target File Path>"), targetArrayBuffer)


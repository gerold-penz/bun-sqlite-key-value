import { afterAll, beforeAll, expect, test } from "bun:test"
import { BunSqliteKeyValue } from "../src"
import { join } from "node:path"
import { tmpdir } from 'node:os'
import { mkdtemp } from 'node:fs/promises'
import { rm, exists } from "node:fs/promises"


let tmpDirname: string
let sourceImagePath: string
let targetImagePath: string
let dbPath: string


beforeAll(async () => {
    sourceImagePath = join(__dirname, "assets", "bun.png")
    tmpDirname = await mkdtemp(join(tmpdir(), "bun-sqlite-key-value"))
    targetImagePath = join(tmpDirname, "bun.png")
    dbPath = join(tmpDirname, "filesystemtest.sqlite")
    console.log(`SQLite database path: "${dbPath}"`)
    console.log(`Source file path: "${sourceImagePath}"`)
    console.log(`Target file path: "${targetImagePath}"`)
})


test("Write an read binary (async)", async () => {
    const store: BunSqliteKeyValue = new BunSqliteKeyValue(dbPath)

    // Read source file from filesystem
    const sourceFile = Bun.file(sourceImagePath)
    console.log("Original file size:", sourceFile.size)

    // Create ArrayBuffer from source file
    const sourceArrayBuffer = await sourceFile.arrayBuffer()
    console.log("Source ArrayBuffer size:", sourceArrayBuffer.byteLength)

    // Write ArrayBuffer into database
    store.set(sourceImagePath, sourceArrayBuffer)

    // Read ArrayBuffer from database
    const targetArrayBuffer = store.get(sourceImagePath)
    console.log("Target ArrayBuffer size:", targetArrayBuffer.byteLength)

    // Write target file to filesystem (into temporary directory)
    await Bun.write(Bun.file(targetImagePath), targetArrayBuffer)

    // Compare source file with target file
    const targetfile = Bun.file(targetImagePath)
    expect(
        await Bun.file(sourceImagePath).arrayBuffer()
    ).toEqual(
        await Bun.file(targetImagePath).arrayBuffer()
    )
})


afterAll(async () => {
    // Remove temp files
    if (await exists(dbPath)) {
        await rm(dbPath)
    }
    if (await exists(targetImagePath)) {
        await rm(targetImagePath)
    }
})

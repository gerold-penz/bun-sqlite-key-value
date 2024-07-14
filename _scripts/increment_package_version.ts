import { $ } from "bun"
import { join } from "node:path"


$.cwd(join(__dirname, ".."))

// Increment version
let version = await $`bun run increment_package_version`.text()
version = version.trim().substring(1)

// Write new version into "jsr.json"
const jsrFile = Bun.file("../jsr.json")
const jsrData = await jsrFile.json()
jsrData.version = version
await Bun.write(jsrFile, JSON.stringify(jsrData, undefined, 2))

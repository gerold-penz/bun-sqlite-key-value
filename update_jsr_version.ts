import { version } from "./package.json"

// Write new version into "jsr.json"
const jsrFile = Bun.file("./jsr.json")
const jsrData = await jsrFile.json()
jsrData.version = version
await Bun.write(jsrFile, JSON.stringify(jsrData, undefined, 2))

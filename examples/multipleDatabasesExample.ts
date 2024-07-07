import { BunSqliteKeyValue } from "../src"
import { join } from "node:path"
import { exists, mkdir } from "node:fs/promises"


const dbDir = join(__dirname, "databases")
if (!(await exists(dbDir))) {
    await mkdir(dbDir)
}

const settingsPath = join(dbDir, "settings.sqlite")
const languagesPath = join(dbDir, "languages.sqlite")

const settingsStore = new BunSqliteKeyValue(settingsPath)
const languagesStore = new BunSqliteKeyValue(languagesPath)

// Write settings
settingsStore.set("language", "de")
settingsStore.set("page-size", "A4")
settingsStore.set("screen-position", {top: 100, left: 100})

// Write languages
languagesStore.set("de", "German")
languagesStore.set("en", "English")
languagesStore.set("it", "Italian")

// Read all settings
const settingItems = settingsStore.getItems()
console.log(settingItems)
// -> [
//   {key: "language", value: "de"},
//   {key: "page-size", value: "A4"},
//   {key: "screen-position", value: {top: 100, left: 100}},
// ]

// Read all languages
const languageValues = languagesStore.getValues()
console.log(languageValues)  // -> [ "German", "English", "Italian" ]

// Read current language
const languageKey = settingsStore.get("language")
const currentLanguage = languagesStore.get(languageKey)
console.log(`Current language: "${currentLanguage}"`)  // -> Current language: "German"

// Explicitly close DBs
settingsStore.close()
languagesStore.close()

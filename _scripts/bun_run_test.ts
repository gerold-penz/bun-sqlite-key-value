import { $ } from "bun"
import { join } from "node:path"

$.cwd(join(__dirname, ".."))
$.env({FORCE_COLOR: "1"})
await $`bun test`

prompt("\nPress ENTER to exit.")

import { $ } from "bun"
import { join } from "node:path"


$.cwd(join(__dirname, ".."))
$.env({FORCE_COLOR: "1"})

try {
    await $`bun run test`
} finally {
    prompt("\nPress ENTER to exit.")
}

import { $ } from "bun"
import { join } from "node:path"


$.cwd(join(__dirname, ".."))

try {
    await $`bun run npm:publish`
    // await $`bun run jsx:publish`
} finally {
    prompt("\nPress ENTER to exit.")
}

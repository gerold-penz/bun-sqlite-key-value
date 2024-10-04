import { $ } from "bun"
import { join } from "node:path"


$.cwd(join(__dirname, ".."))

try {
    await $`bun run typedoc:watch`
} finally {
    prompt("\nPress ENTER to exit.")
}

import { $ } from "bun"
import { join } from "node:path"


$.cwd(join(__dirname, "..", "docs_src"))

try {
    await $`bun run start`
} finally {
    prompt("\nPress ENTER to exit.")
}

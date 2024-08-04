import { $ } from "bun"
import { join } from "node:path"


$.cwd(join(__dirname, ".."))

try {
    await $`bun run typedoc`
} finally {
    prompt("\nPress ENTER to exit.")
}

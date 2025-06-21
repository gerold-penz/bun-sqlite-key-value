import { $ } from "bun"
import { join } from "node:path"


$.cwd(join(__dirname, "..", "docs_docusaurus"))

try {
    await $`bun run build`
} finally {
    prompt("\nPress ENTER to exit.")
}

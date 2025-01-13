import { $ } from "bun"
import { join } from "node:path"


$.cwd(join(__dirname, ".."))
$.env({
    ...process.env,
    "npm_config_registry": "https://registry.npmjs.org/"
})

try {
    await $`bun run npm:publish`
} finally {
    prompt("\nPress ENTER to exit.")
}

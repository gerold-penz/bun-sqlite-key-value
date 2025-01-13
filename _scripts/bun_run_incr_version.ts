import { $ } from "bun"
import { join } from "node:path"


$.cwd(join(__dirname, ".."))
$.env({
    ...process.env,
    "npm_config_registry": "https://registry.npmjs.org/"
})

// Increment version
await $`bun run incr_version`.text()


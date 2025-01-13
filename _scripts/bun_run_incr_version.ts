import { $ } from "bun"
import { join } from "node:path"


$.cwd(join(__dirname, ".."))

// Increment version
await $`bun run incr_version`.text()


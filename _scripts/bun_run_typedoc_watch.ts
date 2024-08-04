import { $ } from "bun"
import { join } from "node:path"


$.cwd(join(__dirname, ".."))

// @ts-ignore
await $`bun run typedoc:watch`

import dts from "bun-plugin-dts"


const result = await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    sourcemap: "external",
    target: "node",
    plugins: [dts()]
})

console.log(result)

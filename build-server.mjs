import { build } from "esbuild";

await build({
  entryPoints: ["server/_core/index.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outdir: "dist",
  external: [
    "./vite",
    "../../vite.config",
  ],
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});

console.log("Server build complete: dist/index.js");

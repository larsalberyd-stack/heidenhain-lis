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
    // Node builtins that shouldn't be bundled
    "node:*",
    "fsevents",
    // Native modules that can't be bundled
    "bcryptjs",
    "mysql2",
  ],
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});

console.log("Server build complete: dist/index.js");

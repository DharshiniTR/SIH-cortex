import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

for (const entry of ["popup", "upload", "background"]) {
  await build({
    entryPoints: [`src/${entry}.ts`],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome114",
    outfile: `dist/${entry}.js`,
    sourcemap: true,
    minify: false,
  });
}

await cp("src/manifest.json", "dist/manifest.json");
await cp("src/popup.html", "dist/popup.html");
await cp("src/upload.html", "dist/upload.html");
await cp("src/styles.css", "dist/styles.css");
// vite.config.js
import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { resolve } from "path";

const BASE_GH_URL = "/comfyui-ghpages/";
export default defineConfig({
  base: BASE_GH_URL,
  server: {
    headers: {
      "Service-Worker-Allowed": "/",
    },
  },
  build: {
    manifest: true,
    assetsDir: "",
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        main: resolve(__dirname, "src/main.ts"),
        sw: resolve(__dirname, "src/sw.ts"),
        playground: resolve(__dirname, "src/extensions/playground.js"),
      },
    },
  },
  plugins: [
    {
      name: "markdown-plugin",
      enforce: "pre",
      async transform(html, id) {
        if (id.includes("index.html")) {
          const markdown = fs.readFileSync("README.md", "utf-8");
          const content = await marked(markdown);
          return html.replace("<!--markdown-content-->", content);
        }
      },
    },
    {
      name: "inject-sw-path",
      async closeBundle() {
        try {
          const manifest = JSON.parse(
            fs.readFileSync(path.resolve("dist/.vite/manifest.json"), "utf-8"),
          );

          const swPath = manifest["src/sw.ts"].file;
          const mainFile = manifest["src/main.ts"].file;
          const mainPath = path.resolve("dist", mainFile);

          let mainContent = fs.readFileSync(mainPath, "utf-8");
          mainContent = mainContent.replace("/src/sw.ts", "/" + swPath);
          fs.writeFileSync(mainPath, mainContent);

          let swContent = fs.readFileSync(path.resolve("dist", swPath), "utf8");
          swContent = swContent.replace("/src/main.ts", BASE_GH_URL + mainPath);
          fs.writeFileSync(path.resolve("dist", swPath), swContent);

          let comfyHtml = fs.readFileSync(
            path.resolve("dist/comfyui/index.html"),
            "utf8",
          );
          comfyHtml = comfyHtml.replace(
            "<head>",
            `<head><script type='module' src='${BASE_GH_URL}${mainFile}'></script>`,
          );
          fs.writeFileSync(path.resolve("dist/comfyui/index.html"), comfyHtml);

          const extFile = manifest["src/extensions/playground.js"];
          if (fs.existsSync(path.resolve("dist/extensions/playground.js"))) {
            fs.copyFileSync(
              path.resolve("dist", extFile.file),
              path.resolve("dist/extensions/playground.js"),
            );
            fs.rmSync(path.resolve("dist", extFile.file));
          }
        } catch (error) {
          console.error("Error injecting SW path:", error);
        }
      },
    },
  ],
});

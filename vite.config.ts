import { defineConfig } from "vite";
import fs from "fs";
import path from "path";
import { Plugin } from "vite";

function findHtmlFiles(dir: string): Record<string, string> {
  const fileList: Record<string, string> = {};
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      Object.assign(fileList, findHtmlFiles(filePath)); // Récursion pour les sous-dossiers
    } else if (path.extname(file) === ".html") {
      const content = fs.readFileSync(filePath, "utf-8");
      fileList[file] = content;
    }
  });

  return fileList;
}

function htmlStringLoader(): Plugin {
  return {
    name: "vite-plugin-html-string-loader",
    config(config) {
      const htmlFiles = findHtmlFiles(path.resolve(__dirname, "src"));
      config.define = {
        ...config.define,
        HTML_TEMPLATES: JSON.stringify(htmlFiles), // Exposez les templates comme une constante
      };
    },
  };
}

export default defineConfig({
  plugins: [htmlStringLoader()],
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        main: "./src/index.html",
        app: "./src/index.ts",
      },
    },
    outDir: "./dist",
  },
});

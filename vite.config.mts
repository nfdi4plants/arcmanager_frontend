import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { quasar, transformAssetUrls } from "@quasar/vite-plugin";
import { nodePolyfills } from "vite-plugin-node-polyfills";

import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/arcmanager/app/",
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    quasar({
      sassVariables: fileURLToPath(
        new URL("./src/quasar-variables.sass", import.meta.url)
      ),
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      fs: "fs",
    },
  },
  define: {
    "process.env": process.env,
  },
});
/*
module.exports = {
  publicPath: process.env.APP_BASE_PATH
}
*/

import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

import fs from "fs"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      fs: 'fs'
    }
  },
  define: {
    'process.env': process.env

  },
  server: {
    https: {
      key: fs.readFileSync("./nfdi4plants.de+5-key.pem"),
      cert: fs.readFileSync("./nfdi4plants.de+5.pem")
    },
  },

})

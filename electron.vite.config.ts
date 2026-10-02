import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  // index: the app's bridge; edit: the text box used to type while NEXUS is the wallpaper
  preload: { plugins: [externalizeDepsPlugin()], build: { rollupOptions: { input: { index: resolve('src/preload/index.ts'), edit: resolve('src/preload/edit.ts') } } } },
  renderer: {
    resolve: { alias: { '@': resolve('src/renderer/src') } },
    plugins: [react()]
  }
})

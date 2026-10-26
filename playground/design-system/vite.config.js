import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// A second codebase with its own `@/`, to check that it never resolves into the app's src.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~tokens': fileURLToPath(new URL('./src/tokens.js', import.meta.url)),
    },
  },
})

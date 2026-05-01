import { defineConfig } from 'vite'

export default defineConfig({
  base: '/coccolith/',
  server: {
    fs: {
      allow: ['..']
    }
  }
})

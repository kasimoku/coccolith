import { defineConfig } from 'vite'

export default defineConfig({
  base: '/coccolith/',
  server: {
    fs: {
      allow: ['..']
    },
    watch: {
      ignored: ['!**/my-3d-parts/**']
    }
  }
})

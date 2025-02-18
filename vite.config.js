import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'


export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  server: {
    allowedHosts: ['a9af-2804-1530-675-3f00-b840-abeb-7c21-72f1.ngrok-free.app']
  }
})
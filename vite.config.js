import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'


export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  server: {
    allowedHosts: ['6150-2804-1530-675-3f00-416c-16fe-b57a-75e7.ngrok-free.app']
  }
})
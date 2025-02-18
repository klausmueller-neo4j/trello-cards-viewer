import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'



const vuetify = createVuetify({
    // Optionally, configure themes or other Vuetify options here.
  })

createApp(App)
  .use(vuetify)
  .mount('#app')

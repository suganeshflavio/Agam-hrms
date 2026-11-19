import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
  console.warn('AGAM HRMS Global Error Handler:', err, info)
}

app.use(createPinia())
app.use(router)

app.mount('#app')

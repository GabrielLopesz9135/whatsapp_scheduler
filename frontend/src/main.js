import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/main.css'
import { useAuthStore } from './stores/authStore'
import { useAppointmentStore } from './stores/appointmentStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Inicializa a autenticação e os ouvintes de WebSocket
const authStore = useAuthStore()
authStore.initAuth()

const appointmentStore = useAppointmentStore()
appointmentStore.initSocketListeners()

app.mount('#app')

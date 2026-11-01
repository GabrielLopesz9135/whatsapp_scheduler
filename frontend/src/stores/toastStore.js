import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])

  function addToast({ type = 'info', title = '', message = '', duration = 5000 }) {
    const id = Date.now() + Math.random().toString(36).substring(2, 9)
    const toast = { id, type, title, message }
    toasts.value.push(toast)

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  function removeToast(id) {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  function success(message, title = 'Sucesso') {
    return addToast({ type: 'success', title, message })
  }

  function error(message, title = 'Erro') {
    return addToast({ type: 'error', title, message, duration: 6000 })
  }

  function info(message, title = 'Informação') {
    return addToast({ type: 'info', title, message })
  }

  function whatsapp(message, title = 'Novo Agendamento via WhatsApp') {
    return addToast({ type: 'whatsapp', title, message, duration: 7000 })
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    whatsapp,
  }
})


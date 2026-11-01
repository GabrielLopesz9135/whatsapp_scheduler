import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { connectSocket, disconnectSocket } from '@/services/socket'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
  )

  const isAuthenticated = computed(() => !!token.value)

  /**
   * Realiza login do administrador, armazena credenciais e inicia o WebSocket.
   * @param {string} email
   * @param {string} password
   */
  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    const data = response.data

    token.value = data.token
    user.value = data.user

    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))

    // Inicializa a conexão autenticada via WebSocket
    connectSocket(data.token)

    return data
  }

  /**
   * Encerra a sessão do administrador e desconecta o WebSocket.
   */
  function logout() {
    token.value = null
    user.value = null

    localStorage.removeItem('token')
    localStorage.removeItem('user')

    disconnectSocket()
  }

  /**
   * Inicializa o estado de autenticação ao carregar a página.
   */
  function initAuth() {
    if (token.value) {
      connectSocket(token.value)
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout,
    initAuth,
  }
})


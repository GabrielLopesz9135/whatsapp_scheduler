import { io } from 'socket.io-client'
import { ref } from 'vue'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3333'

export const isConnected = ref(false)

export const socket = io(WS_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
})

// Listeners globais do ciclo de vida da conexão WebSocket
socket.on('connect', () => {
  isConnected.value = true
  console.log('🟢 [WebSocket] Conectado com sucesso ao servidor Real-Time. Socket ID:', socket.id)
})

socket.on('disconnect', (reason) => {
  isConnected.value = false
  console.log('🔴 [WebSocket] Desconectado do servidor. Motivo:', reason)
})

socket.on('connect_error', (error) => {
  isConnected.value = false
  console.warn('⚠️ [WebSocket] Erro na conexão com o servidor:', error.message)
})

/**
 * Conecta o cliente WebSocket enviando o Bearer Token no handshake de autenticação.
 * @param {string} token - Token JWT
 */
export function connectSocket(token) {
  const currentToken = token || localStorage.getItem('token')
  if (!currentToken) {
    console.warn('⚠️ [WebSocket] Conexão cancelada: nenhum token de autenticação disponível.')
    return
  }

  socket.auth = { token: currentToken }

  if (!socket.connected) {
    socket.connect()
  }
}

/**
 * Desconecta o cliente WebSocket e reseta os estados.
 */
export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect()
  }
  isConnected.value = false
}

export default socket


const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('./env');

let io = null;

/**
 * Inicializa o Socket.io acoplado ao HTTP Server do Express.
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    },
  });

  // Middleware de autenticação no handshake do WebSocket
  io.use((socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

      if (!rawToken) {
        return next(new Error('Autenticação WebSocket falhou: Token não fornecido'));
      }

      const token = rawToken.startsWith('Bearer ')
        ? rawToken.slice(7).trim()
        : rawToken.trim();

      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (err) {
      return next(new Error('Autenticação WebSocket falhou: Token inválido ou expirado'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.io] Cliente conectado: ${socket.id} (Usuário: ${socket.user?.email || 'Admin'})`);

    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket.io] Cliente desconectado: ${socket.id} (Motivo: ${reason})`);
    });
  });

  return io;
}

/**
 * Retorna a instância ativa do Socket.io.
 * @returns {Server}
 */
function getIO() {
  if (!io) {
    console.warn('⚠️ [Socket.io] getIO chamado antes da inicialização do servidor.');
  }
  return io;
}

module.exports = {
  initSocket,
  getIO,
};


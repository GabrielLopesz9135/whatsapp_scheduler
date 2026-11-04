const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { initSocket } = require('./config/socket');

async function bootstrap() {
  try {
    // 1. Conecta ao banco de dados MongoDB
    await connectDatabase();

    // 2. Cria o servidor HTTP acoplado ao Express
    const server = http.createServer(app);

    // 3. Inicializa o Socket.io acoplado ao servidor HTTP
    initSocket(server);

    // 4. Inicia a escuta na porta configurada
    server.listen(env.PORT, () => {
      console.log(`🚀 [Server] Servidor rodando na porta ${env.PORT} em modo ${env.NODE_ENV}`);
      console.log(`🌐 [Server] API: http://localhost:${env.PORT}/api`);
      console.log(`⚡ [Server] WebSocket pronto para conexões.`);
    });

    // Tratamento de desligamento gracioso (Graceful Shutdown)
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 [Server] Recebido sinal ${signal}. Encerrando aplicação graciosamente...`);
      server.close(async () => {
        console.log('🔒 [Server] Servidor HTTP fechado.');
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('💥 [Server] Falha fatal ao inicializar aplicação:', error);
    process.exit(1);
  }
}

bootstrap();

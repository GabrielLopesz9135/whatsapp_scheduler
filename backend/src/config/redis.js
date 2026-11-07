const IORedis = require('ioredis');
const env = require('./env');

/**
 * Configuração da conexão com o Redis para uso pelo BullMQ.
 * Observação: 'maxRetriesPerRequest: null' é um requisito obrigatório do BullMQ.
 */
const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

let redisConnection = null;

/**
 * Retorna uma instância singleton de conexão IORedis.
 */
function getRedisConnection() {
  if (!redisConnection) {
    redisConnection = new IORedis(redisConfig);

    redisConnection.on('connect', () => {
      console.log(`⚡ [Redis] Conectado com sucesso em ${env.REDIS_HOST}:${env.REDIS_PORT}`);
    });

    redisConnection.on('error', (err) => {
      console.error('❌ [Redis] Erro na conexão:', err.message);
    });
  }

  return redisConnection;
}

module.exports = {
  redisConfig,
  getRedisConnection,
};


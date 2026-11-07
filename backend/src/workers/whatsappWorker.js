const { Worker } = require('bullmq');
const { redisConfig } = require('../config/redis');
const botFlowService = require('../services/botFlowService');

const QUEUE_NAME = 'whatsapp-incoming';

let workerInstance = null;

/**
 * Inicializa o Worker consumidor do BullMQ para processar mensagens do WhatsApp da fila Redis.
 * Configurado com concorrência controlada para evitar sobrecarga no banco de dados e APIs externas.
 */
function initWhatsAppWorker() {
  if (workerInstance) {
    return workerInstance;
  }

  workerInstance = new Worker(
    QUEUE_NAME,
    async (job) => {
      // Processa a mensagem através da máquina de estados finitos
      await botFlowService.handleIncomingMessage(job.data);
    },
    {
      connection: redisConfig,
      concurrency: 5, // Processa até 5 mensagens em paralelo por worker
    }
  );

  workerInstance.on('ready', () => {
    console.log(`📥 [BullMQ Worker] Worker ativo e consumindo a fila "${QUEUE_NAME}".`);
  });

  workerInstance.on('completed', (job) => {
    console.log(`✅ [BullMQ Worker] Job ${job.id} processado com sucesso.`);
  });

  workerInstance.on('failed', (job, error) => {
    console.error(
      `❌ [BullMQ Worker] Job ${job?.id} falhou (tentativa ${job?.attemptsMade}):`,
      error.message
    );
  });

  workerInstance.on('error', (error) => {
    console.error('💥 [BullMQ Worker] Erro no ciclo do Worker:', error.message);
  });

  return workerInstance;
}

/**
 * Encerramento gracioso do Worker.
 */
async function closeWhatsAppWorker() {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
    console.log('🔒 [BullMQ Worker] Worker do WhatsApp encerrado graciosamente.');
  }
}

module.exports = {
  initWhatsAppWorker,
  closeWhatsAppWorker,
};


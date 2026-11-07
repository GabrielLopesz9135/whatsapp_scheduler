const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');

const QUEUE_NAME = 'whatsapp-incoming';

/**
 * Fila persistente no Redis para ingestão assíncrona de webhooks do WhatsApp.
 * Oferece retentativas automáticas, backoff exponencial e retenção de jobs.
 */
const whatsappQueue = new Queue(QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3, // Retenta até 3 vezes em caso de falha transitória (ex: oscilação de banco)
    backoff: {
      type: 'exponential',
      delay: 1000, // Espera 1s na 1ª tentativa, 2s na 2ª, 4s na 3ª
    },
    removeOnComplete: {
      count: 100, // Mantém os últimos 100 concluídos no Redis para auditoria
    },
    removeOnFail: {
      count: 500, // Mantém até 500 falhas no Redis para inspeção (Dead-Letter Queue)
    },
  },
});

/**
 * Adiciona um payload de mensagem recebida do webhook na fila.
 * Implementa IDEMPOTÊNCIA usando o ID único da mensagem fornecido pela Meta (wamid).
 * Se a Meta reenviar o mesmo webhook por instabilidade de rede, o BullMQ descarta a duplicata!
 * 
 * @param {Object} webhookPayload - Payload recebido da Meta
 * @returns {Promise<Job>}
 */
async function addIncomingMessageJob(webhookPayload) {
  const messageId = webhookPayload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id;

  const jobOptions = {};
  if (messageId) {
    jobOptions.jobId = `meta-msg-${messageId}`; // Garante idempotência de entrega
  }

  const job = await whatsappQueue.add('process-message', webhookPayload, jobOptions);
  return job;
}

module.exports = {
  whatsappQueue,
  addIncomingMessageJob,
};


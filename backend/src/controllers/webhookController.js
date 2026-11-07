const env = require('../config/env');
const botFlowService = require('../services/botFlowService');
const { addIncomingMessageJob } = require('../queues/whatsappQueue');

/**
 * Validação do Webhook oficial da Meta (GET).
 * O Facebook envia hub.mode, hub.verify_token e hub.challenge para validar a URL do servidor.
 */
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'] || (req.query.hub && req.query.hub.mode);
  const token = req.query['hub.verify_token'] || (req.query.hub && req.query.hub.verify_token);
  const challenge = req.query['hub.challenge'] || (req.query.hub && req.query.hub.challenge);

  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ [Webhook Meta] Verificação inicial de webhook realizada com sucesso!');
    return res.status(200).send(challenge);
  }

  console.warn('❌ [Webhook Meta] Tentativa de validação com verify_token inválido ou ausente.');
  return res.sendStatus(403);
}

/**
 * Recebe notificações de mensagens e status da Meta (POST).
 * Retorna status 200 imediatamente para a Meta e delega o processamento para a fila persistente Redis (BullMQ).
 */
async function handleWebhook(req, res) {
  // 1. Resposta imediata 200 OK para evitar timeout da Meta (requisito oficial: resposta em < 5 segundos)
  res.status(200).send('EVENT_RECEIVED');

  // 2. Ingestão na fila persistente do Redis via BullMQ com fallback de alta disponibilidade
  try {
    await addIncomingMessageJob(req.body);
  } catch (queueError) {
    console.warn('⚠️ [Webhook Meta] Falha ao enfileirar no Redis. Executando fallback em memória:', queueError.message);
    setImmediate(async () => {
      try {
        await botFlowService.handleIncomingMessage(req.body);
      } catch (err) {
        console.error('💥 [Webhook Meta] Falha no processamento por fallback:', err);
      }
    });
  }
}

module.exports = {
  verifyWebhook,
  handleWebhook,
};

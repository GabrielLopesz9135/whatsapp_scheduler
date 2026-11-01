const env = require('../config/env');
const botFlowService = require('../services/botFlowService');

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
 * Retorna status 200 imediatamente para a Meta e processa a lógica de negócio assincronamente.
 */
function handleWebhook(req, res) {
  // Resposta imediata 200 OK para evitar retentativas agressivas da Meta
  res.status(200).send('EVENT_RECEIVED');

  // Processamento assíncrono isolado da máquina de estados do bot
  setImmediate(async () => {
    try {
      await botFlowService.handleIncomingMessage(req.body);
    } catch (error) {
      console.error('💥 [Webhook Meta] Falha ao processar mensagem assíncrona:', error);
    }
  });
}

module.exports = {
  verifyWebhook,
  handleWebhook,
};


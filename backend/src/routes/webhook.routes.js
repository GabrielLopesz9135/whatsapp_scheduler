const { Router } = require('express');
const webhookController = require('../controllers/webhookController');

const router = Router();

// Rotas públicas do Webhook da Meta Cloud API
router.get('/whatsapp', webhookController.verifyWebhook);
router.post('/whatsapp', webhookController.handleWebhook);

module.exports = router;


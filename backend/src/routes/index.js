const { Router } = require('express');
const authRoutes = require('./auth.routes');
const serviceRoutes = require('./service.routes');
const appointmentRoutes = require('./appointment.routes');
// Webhook da Meta desativado: agora o backend utiliza @whiskeysockets/baileys via WebSocket nativo
// const webhookRoutes = require('./webhook.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/services', serviceRoutes);
router.use('/appointments', appointmentRoutes);
// router.use('/webhook', webhookRoutes);

module.exports = router;

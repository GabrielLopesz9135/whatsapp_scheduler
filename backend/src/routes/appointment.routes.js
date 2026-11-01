const { Router } = require('express');
const appointmentController = require('../controllers/appointmentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// Todas as rotas de agendamentos do dashboard exigem autenticação
router.use(authMiddleware);

router.get('/available-slots', appointmentController.getAvailableSlots);
router.get('/', appointmentController.list);
router.post('/', appointmentController.create);
router.patch('/:id/status', appointmentController.updateStatus);

module.exports = router;


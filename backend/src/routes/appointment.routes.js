const { Router } = require('express');
const appointmentController = require('../controllers/appointmentController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const {
  createAppointmentSchema,
  availableSlotsQuerySchema,
  updateStatusSchema,
} = require('../validators/appointment.validator');

const router = Router();

// Todas as rotas de agendamentos do dashboard exigem autenticação
router.use(authMiddleware);

router.get('/available-slots', validate(availableSlotsQuerySchema, 'query'), appointmentController.getAvailableSlots);
router.get('/', appointmentController.list);
router.post('/', validate(createAppointmentSchema), appointmentController.create);
router.patch('/:id/status', validate(updateStatusSchema), appointmentController.updateStatus);

module.exports = router;

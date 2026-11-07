const { Router } = require('express');
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { createServiceSchema, updateServiceSchema } = require('../validators/service.validator');

const router = Router();

// Todas as rotas de serviços exigem autenticação do Dashboard
router.use(authMiddleware);

router.get('/', serviceController.list);
router.post('/', validate(createServiceSchema), serviceController.create);
router.put('/:id', validate(updateServiceSchema), serviceController.update);
router.delete('/:id', serviceController.remove);

module.exports = router;

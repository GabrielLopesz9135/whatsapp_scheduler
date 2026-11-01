const { Router } = require('express');
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// Todas as rotas de serviços exigem autenticação do Dashboard
router.use(authMiddleware);

router.get('/', serviceController.list);
router.post('/', serviceController.create);
router.put('/:id', serviceController.update);
router.delete('/:id', serviceController.remove);

module.exports = router;


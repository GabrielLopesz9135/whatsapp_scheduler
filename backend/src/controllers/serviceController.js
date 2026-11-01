const Service = require('../models/Service');
const { NotFoundError, BadRequestError } = require('../middlewares/errorHandler');

/**
 * Lista todos os serviços cadastrados (ordenados por nome).
 */
async function list(req, res) {
  const { activeOnly } = req.query;
  const filter = {};
  if (activeOnly === 'true') {
    filter.active = true;
  }

  const services = await Service.find(filter).sort({ active: -1, name: 1 });
  return res.status(200).json(services);
}

/**
 * Cria um novo serviço.
 */
async function create(req, res) {
  const { name, description, durationMinutes, price, active } = req.body;

  if (!name || durationMinutes === undefined || price === undefined) {
    throw new BadRequestError('Nome, duração em minutos e preço são obrigatórios.');
  }

  const service = await Service.create({
    name,
    description,
    durationMinutes: Number(durationMinutes),
    price: Number(price),
    active: active !== undefined ? active : true,
  });

  return res.status(201).json(service);
}

/**
 * Atualiza um serviço existente.
 */
async function update(req, res) {
  const { id } = req.params;
  const { name, description, durationMinutes, price, active } = req.body;

  const service = await Service.findById(id);
  if (!service) {
    throw new NotFoundError('Serviço não encontrado.');
  }

  if (name !== undefined) service.name = name;
  if (description !== undefined) service.description = description;
  if (durationMinutes !== undefined) service.durationMinutes = Number(durationMinutes);
  if (price !== undefined) service.price = Number(price);
  if (active !== undefined) service.active = Boolean(active);

  await service.save();

  return res.status(200).json(service);
}

/**
 * Realiza soft delete de um serviço marcando `active: false`.
 */
async function remove(req, res) {
  const { id } = req.params;

  const service = await Service.findById(id);
  if (!service) {
    throw new NotFoundError('Serviço não encontrado.');
  }

  service.active = false;
  await service.save();

  return res.status(200).json({
    message: 'Serviço desativado com sucesso (Soft delete)',
    service,
  });
}

module.exports = {
  list,
  create,
  update,
  remove,
};


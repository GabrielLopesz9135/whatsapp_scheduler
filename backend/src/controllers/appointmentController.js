const appointmentService = require('../services/appointmentService');
const slotService = require('../services/slotService');
const { BadRequestError } = require('../middlewares/errorHandler');

/**
 * Lista agendamentos filtrados por data ou status.
 */
async function list(req, res) {
  const { date, status } = req.query;

  const appointments = await appointmentService.getAppointments({
    date,
    status,
  });

  return res.status(200).json(appointments);
}

/**
 * Consulta horários livres para uma data e serviço específicos.
 */
async function getAvailableSlots(req, res) {
  const { date, serviceId } = req.query;

  if (!date || !serviceId) {
    throw new BadRequestError('Parâmetros "date" (YYYY-MM-DD) e "serviceId" são obrigatórios.');
  }

  const slots = await slotService.getAvailableSlots(date, serviceId);
  return res.status(200).json({ date, serviceId, availableSlots: slots });
}

/**
 * Cria um agendamento manual via Dashboard.
 * Utiliza o mesmo motor com prevenção de Race Conditions do fluxo do WhatsApp.
 */
async function create(req, res) {
  const {
    customerName,
    customerPhone,
    serviceId,
    date,
    startTime,
    origin = 'DASHBOARD',
  } = req.body;

  if (!customerName || !customerPhone || !serviceId || !date || !startTime) {
    throw new BadRequestError(
      'customerName, customerPhone, serviceId, date e startTime são obrigatórios.'
    );
  }

  // Permite receber startTime tanto como "09:00" quanto como Date / ISO string
  let parsedStartTime;
  if (/^\d{2}:\d{2}$/.test(startTime)) {
    parsedStartTime = slotService.createDateFromStrings(date, startTime);
  } else {
    parsedStartTime = new Date(startTime);
  }

  const appointment = await appointmentService.createAppointment({
    customerName,
    customerPhone,
    serviceId,
    date,
    startTime: parsedStartTime,
    origin,
  });

  return res.status(201).json(appointment);
}

/**
 * Atualiza o status do agendamento (CONFIRMED, CANCELLED, COMPLETED).
 */
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    throw new BadRequestError('Campo "status" é obrigatório.');
  }

  const updatedAppointment = await appointmentService.updateAppointmentStatus(id, status);
  return res.status(200).json(updatedAppointment);
}

/**
 * Retorna as métricas e indicadores de desempenho da clínica.
 */
async function getMetrics(req, res) {
  const { date, startDate, endDate } = req.query;
  const metrics = await appointmentService.getMetricsSummary({ date, startDate, endDate });
  return res.status(200).json(metrics);
}

module.exports = {
  list,
  getAvailableSlots,
  create,
  updateStatus,
  getMetrics,
};


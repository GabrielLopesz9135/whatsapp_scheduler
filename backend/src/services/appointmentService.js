const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const { getIO } = require('../config/socket');
const {
  ConflictError,
  NotFoundError,
  BadRequestError,
} = require('../middlewares/errorHandler');

/**
 * Cria um agendamento com defesa contra Race Conditions em duas camadas:
 * 1. Camada de Aplicação: Transação ACID do MongoDB com verificação atômica de overlap.
 * 2. Camada de Banco de Dados: Índice único parcial para startTime com status CONFIRMED.
 * 
 * @param {Object} data
 * @param {string} data.customerName - Nome do cliente
 * @param {string} data.customerPhone - Telefone (WhatsApp)
 * @param {string} data.serviceId - ObjectId do serviço
 * @param {string} data.date - YYYY-MM-DD
 * @param {Date|string} data.startTime - Horário inicial
 * @param {'DASHBOARD'|'WHATSAPP'} data.origin - Origem da criação
 * @returns {Promise<Appointment>}
 */
async function createAppointment({
  customerName,
  customerPhone,
  serviceId,
  date,
  startTime,
  origin,
}) {
  if (!customerName || !customerPhone || !serviceId || !date || !startTime || !origin) {
    throw new BadRequestError('Todos os campos obrigatórios devem ser preenchidos.');
  }

  // Busca o serviço para validar existência e obter durationMinutes
  const service = await Service.findById(serviceId);
  if (!service || !service.active) {
    throw new NotFoundError('Serviço informado não foi encontrado ou está inativo.');
  }

  const start = new Date(startTime);
  if (isNaN(start.getTime())) {
    throw new BadRequestError('startTime inválido.');
  }

  // Calcula endTime = startTime + durationMinutes
  const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

  // Inicia sessão e transação do MongoDB para garantir isolamento ACID
  const session = await mongoose.startSession();
  session.startTransaction();

  let createdId = null;

  try {
    /*
     * CRÍTICO: Consulta com trava de concorrência dentro da transação.
     * Busca se existe qualquer agendamento CONFIRMADO que sobreponha o intervalo desejado:
     * (newStartTime < existing.endTime) && (newEndTime > existing.startTime)
     */
    const conflictingAppointment = await Appointment.findOne({
      status: 'CONFIRMED',
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).session(session);

    if (conflictingAppointment) {
      await session.abortTransaction();
      await session.endSession();
      throw new ConflictError('Horário acabou de ser preenchido');
    }

    // Criação do agendamento atrelada à sessão transacional
    const [created] = await Appointment.create(
      [
        {
          customerName,
          customerPhone,
          serviceId,
          date,
          startTime: start,
          endTime: end,
          status: 'CONFIRMED',
          origin,
        },
      ],
      { session }
    );

    createdId = created._id;

    // Confirma a transação caso não haja conflitos
    await session.commitTransaction();
  } catch (error) {
    // Aborta transação em caso de erro ou violação de integridade
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    await session.endSession();

    // Fallback: Erro 11000 de índice único no MongoDB
    if (error.code === 11000) {
      throw new ConflictError('Horário acabou de ser preenchido');
    }

    throw error;
  } finally {
    if (!session.hasEnded) {
      await session.endSession();
    }
  }

  // Busca o agendamento completo populado para retorno e WebSocket
  const populatedAppointment = await Appointment.findById(createdId).populate('serviceId');

  // Disparo em tempo real via Socket.io para todos os administradores conectados
  try {
    const io = getIO();
    if (io) {
      io.emit('appointment:created', populatedAppointment);
    }
  } catch (socketErr) {
    console.warn('⚠️ [Socket.io] Falha ao emitir evento appointment:created:', socketErr.message);
  }

  // Agenda lembrete prévio no BullMQ (Delayed Job)
  try {
    const { scheduleAppointmentReminder } = require('../queues/reminderQueue');
    await scheduleAppointmentReminder(populatedAppointment);
  } catch (reminderErr) {
    console.warn('⚠️ [AppointmentService] Falha ao agendar lembrete no BullMQ:', reminderErr.message);
  }

  return populatedAppointment;
}

/**
 * Atualiza o status de um agendamento e notifica o Dashboard em tempo real.
 * 
 * @param {string} id - ObjectId do agendamento
 * @param {'CONFIRMED'|'CANCELLED'|'COMPLETED'} status
 * @returns {Promise<Appointment>}
 */
async function updateAppointmentStatus(id, status) {
  const allowedStatuses = ['CONFIRMED', 'CANCELLED', 'COMPLETED'];
  if (!allowedStatuses.includes(status)) {
    throw new BadRequestError(`Status inválido. Permitidos: ${allowedStatuses.join(', ')}`);
  }

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    throw new NotFoundError('Agendamento não encontrado.');
  }

  appointment.status = status;
  await appointment.save();

  const populated = await Appointment.findById(appointment._id).populate('serviceId');

  // Notificação via WebSocket
  try {
    const io = getIO();
    if (io) {
      if (status === 'CANCELLED') {
        io.emit('appointment:cancelled', { id: appointment._id });

        // Cancela o lembrete agendado no BullMQ
        try {
          const { cancelAppointmentReminder } = require('../queues/reminderQueue');
          cancelAppointmentReminder(appointment._id);
        } catch (_) {}
      } else {
        io.emit('appointment:updated', populated);
      }
    }
  } catch (socketErr) {
    console.warn('⚠️ [Socket.io] Falha ao emitir evento de status:', socketErr.message);
  }

  return populated;
}

/**
 * Lista agendamentos por data ou período, populando os dados do serviço.
 * @param {Object} filter
 * @returns {Promise<Appointment[]>}
 */
async function getAppointments(filter = {}) {
  const query = {};

  if (filter.date) {
    query.date = filter.date;
  }

  if (filter.status) {
    query.status = filter.status;
  }

  return Appointment.find(query)
    .populate('serviceId')
    .sort({ startTime: 1 });
}

module.exports = {
  createAppointment,
  updateAppointmentStatus,
  getAppointments,
};


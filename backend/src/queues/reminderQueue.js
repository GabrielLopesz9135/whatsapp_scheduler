const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');
const env = require('../config/env');

const QUEUE_NAME = 'appointment-reminders';

/**
 * Fila BullMQ para orquestração de Lembretes Automáticos Agendados (Delayed Jobs).
 */
const reminderQueue = new Queue(QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
});

/**
 * Agenda um lembrete automático no BullMQ com atraso (delay).
 * O job dorme no Redis e acorda automaticamente no momento exato do disparo.
 * 
 * @param {Object} appointment - Objeto com dados do agendamento
 * @returns {Promise<Job|null>}
 */
async function scheduleAppointmentReminder(appointment) {
  if (!appointment || !appointment.startTime) return null;

  const startTimeDate = new Date(appointment.startTime);
  const reminderHoursMs = env.REMINDER_HOURS_BEFORE * 60 * 60 * 1000;
  const triggerTimeMs = startTimeDate.getTime() - reminderHoursMs;
  const delay = triggerTimeMs - Date.now();

  // Se o agendamento for para daqui a pouco (menos que as X horas de antecedência), não agenda no passado
  if (delay <= 0) {
    console.log(
      `ℹ️ [Reminder Queue] Agendamento ${appointment._id} ocorre em menos de ${env.REMINDER_HOURS_BEFORE}h. Lembrete prévio não agendado.`
    );
    return null;
  }

  const jobId = `reminder-appointment-${appointment._id}`;

  const job = await reminderQueue.add(
    'send-reminder',
    {
      appointmentId: appointment._id.toString(),
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      startTime: appointment.startTime,
      date: appointment.date,
      serviceName: appointment.serviceId?.name || 'Serviço Agendado',
    },
    {
      delay, // Milissegundos que o Redis aguardará antes de liberar o job para o Worker
      jobId, // Idempotência: impede agendamento de lembretes duplicados para a mesma consulta
    }
  );

  console.log(
    `⏰ [Reminder Queue] Lembrete agendado com sucesso (Job: "${job.id}") para disparar em ${Math.round(
      delay / 1000 / 60
    )} minutos.`
  );

  return job;
}

/**
 * Cancela o lembrete de um agendamento (usado quando o cliente ou admin cancela a consulta).
 * 
 * @param {string} appointmentId
 */
async function cancelAppointmentReminder(appointmentId) {
  try {
    const jobId = `reminder-appointment-${appointmentId}`;
    const job = await reminderQueue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`🗑️ [Reminder Queue] Lembrete cancelado para o agendamento ${appointmentId}.`);
      return true;
    }
  } catch (err) {
    console.warn(`⚠️ [Reminder Queue] Falha ao cancelar lembrete do agendamento ${appointmentId}:`, err.message);
  }
  return false;
}

module.exports = {
  reminderQueue,
  scheduleAppointmentReminder,
  cancelAppointmentReminder,
};


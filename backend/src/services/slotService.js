const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { NotFoundError, BadRequestError } = require('../middlewares/errorHandler');

/**
 * Converte string no formato "HH:mm" e data "YYYY-MM-DD" para um objeto Date.
 * Utiliza o padrão ISO UTC para manter consistência absoluta de cálculo temporal.
 * @param {string} dateString - Ex: "2026-11-02"
 * @param {string} timeString - Ex: "09:30"
 * @returns {Date}
 */
function createDateFromStrings(dateString, timeString) {
  return new Date(`${dateString}T${timeString}:00.000Z`);
}

/**
 * Formata um objeto Date para string "HH:mm" em UTC.
 * @param {Date} date
 * @returns {string}
 */
function formatHHmmUTC(date) {
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Motor de Cálculo de Horários Disponíveis.
 * Avalia expediente, duração do serviço e colisões de intervalos com agendamentos existentes.
 * 
 * @param {string} dateString - Data no formato YYYY-MM-DD
 * @param {string} serviceId - ObjectId do serviço
 * @returns {Promise<string[]>} Array de horários livres no formato ["09:00", "09:30", ...]
 */
async function getAvailableSlots(dateString, serviceId) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new BadRequestError('Data inválida. Forneça no formato YYYY-MM-DD.');
  }

  // 1. Busca o serviço para obter a duração
  const service = await Service.findById(serviceId);
  if (!service || !service.active) {
    throw new NotFoundError('Serviço não encontrado ou inativo.');
  }
  const { durationMinutes } = service;

  // 2. Obtém horário de funcionamento do admin (ou fallback padrão)
  const admin = await User.findOne().sort({ createdAt: 1 });
  const businessHours = admin?.businessHours || {
    start: '09:00',
    end: '18:00',
    slotInterval: 15,
  };

  const slotIntervalMinutes = businessHours.slotInterval || 15;

  // 3. Busca agendamentos confirmados para a data especificada
  const existingAppointments = await Appointment.find({
    date: dateString,
    status: 'CONFIRMED',
  }).select('startTime endTime');

  // 4. Monta início e fim do expediente como objetos Date
  const businessStart = createDateFromStrings(dateString, businessHours.start);
  const businessEnd = createDateFromStrings(dateString, businessHours.end);

  const availableSlots = [];
  let currentCandidateStart = new Date(businessStart.getTime());

  // 5. Itera sobre cada horário candidato dentro do expediente
  while (currentCandidateStart.getTime() < businessEnd.getTime()) {
    const currentCandidateEnd = new Date(
      currentCandidateStart.getTime() + durationMinutes * 60 * 1000
    );

    // Se o término do atendimento extrapolar o expediente, interrompe a geração
    if (currentCandidateEnd.getTime() > businessEnd.getTime()) {
      break;
    }

    /*
     * CRÍTICO: Verificação de colisão de intervalo (Overlap)
     * Dois intervalos [A_start, A_end] e [B_start, B_end] colidem se e somente se:
     * (A_start < B_end) && (A_end > B_start)
     *
     * Caso o candidato termine exatamente quando o próximo começa (candidateEnd == existing.startTime),
     * a condição avalia para falso (não há conflito).
     */
    const hasConflict = existingAppointments.some((existing) => {
      const existingStart = new Date(existing.startTime).getTime();
      const existingEnd = new Date(existing.endTime).getTime();

      return (
        currentCandidateStart.getTime() < existingEnd &&
        currentCandidateEnd.getTime() > existingStart
      );
    });

    if (!hasConflict) {
      availableSlots.push(formatHHmmUTC(currentCandidateStart));
    }

    // Avança para o próximo slot candidato pelo intervalo configurado
    currentCandidateStart = new Date(
      currentCandidateStart.getTime() + slotIntervalMinutes * 60 * 1000
    );
  }

  return availableSlots;
}

module.exports = {
  getAvailableSlots,
  createDateFromStrings,
  formatHHmmUTC,
};


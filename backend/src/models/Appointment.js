const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Nome do cliente é obrigatório'],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, 'Telefone do cliente é obrigatório'],
      index: true,
      trim: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Serviço é obrigatório'],
    },
    date: {
      type: String,
      required: [true, 'Data no formato YYYY-MM-DD é obrigatória'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'],
      index: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Horário inicial (startTime) é obrigatório'],
    },
    endTime: {
      type: Date,
      required: [true, 'Horário final (endTime) é obrigatório'],
    },
    status: {
      type: String,
      enum: {
        values: ['CONFIRMED', 'CANCELLED', 'COMPLETED'],
        message: 'Status inválido. Permitidos: CONFIRMED, CANCELLED, COMPLETED',
      },
      default: 'CONFIRMED',
      index: true,
    },
    origin: {
      type: String,
      enum: {
        values: ['DASHBOARD', 'WHATSAPP'],
        message: 'Origem inválida. Permitidos: DASHBOARD, WHATSAPP',
      },
      required: [true, 'Origem do agendamento é obrigatória'],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Índice único parcial para startTime quando status === 'CONFIRMED'.
 * Atua como barreira definitiva no nível do banco de dados para evitar agendamentos
 * simultâneos no mesmo horário inicial.
 */
appointmentSchema.index(
  { startTime: 1 },
  { unique: true, partialFilterExpression: { status: 'CONFIRMED' } }
);

// Índice composto para acelerar buscas por dia e status
appointmentSchema.index({ date: 1, status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;


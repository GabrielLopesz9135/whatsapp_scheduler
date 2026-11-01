const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Número de telefone é obrigatório'],
      unique: true,
      trim: true,
    },
    step: {
      type: String,
      enum: [
        'IDLE',
        'AWAITING_SERVICE',
        'AWAITING_DATE',
        'AWAITING_TIME',
        'AWAITING_CONFIRMATION',
      ],
      default: 'IDLE',
    },
    tempData: {
      customerName: { type: String, default: null },
      selectedServiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
      selectedDate: { type: String, default: null },
      selectedStartTime: { type: String, default: null }, // Armazenado como string ISO
      serviceOptions: [{ type: String }],
      dateOptions: [{ type: String }],
      timeOptions: [{ type: String }],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Índice TTL (Time-To-Live): Limpa automaticamente as sessões inativas
 * após 1800 segundos (30 minutos) da última atualização (updatedAt).
 */
chatSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 1800 });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

module.exports = ChatSession;

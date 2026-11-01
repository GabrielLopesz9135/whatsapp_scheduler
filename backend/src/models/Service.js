const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nome do serviço é obrigatório'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duração em minutos é obrigatória'],
      min: [5, 'A duração mínima é de 5 minutos'],
      max: [480, 'A duração máxima é de 480 minutos'],
    },
    price: {
      type: Number,
      required: [true, 'Preço é obrigatório'],
      min: [0, 'O preço não pode ser negativo'],
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;


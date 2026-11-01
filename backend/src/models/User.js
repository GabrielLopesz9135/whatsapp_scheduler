const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const businessHoursSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      default: '09:00',
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    end: {
      type: String,
      default: '18:00',
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    slotInterval: {
      type: Number,
      default: 15,
      min: 5,
      max: 120,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'E-mail é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Formato de e-mail inválido'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Hash da senha é obrigatório'],
    },
    businessHours: {
      type: businessHoursSchema,
      default: () => ({ start: '09:00', end: '18:00', slotInterval: 15 }),
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compara uma senha em texto puro com o hash armazenado.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Remove o campo passwordHash ao serializar para JSON.
 */
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;


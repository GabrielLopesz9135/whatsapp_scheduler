const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} = require('../middlewares/errorHandler');

/**
 * Registra um novo administrador no sistema.
 */
async function register(req, res) {
  const { name, email, password, businessHours } = req.body;

  if (!name || !email || !password) {
    throw new BadRequestError('Nome, e-mail e senha são obrigatórios.');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ConflictError('Já existe um usuário cadastrado com este e-mail.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    businessHours: businessHours || {
      start: '09:00',
      end: '18:00',
      slotInterval: 15,
    },
  });

  const token = jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return res.status(201).json({
    token,
    user,
  });
}

/**
 * Autentica um administrador existente e retorna o token JWT.
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError('E-mail e senha são obrigatórios.');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new UnauthorizedError('Credenciais inválidas.');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Credenciais inválidas.');
  }

  const token = jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return res.status(200).json({
    token,
    user,
  });
}

module.exports = {
  register,
  login,
};


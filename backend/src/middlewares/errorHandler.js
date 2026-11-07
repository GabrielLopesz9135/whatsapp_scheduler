const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflito de agendamento detectado') {
    super(message, 409);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 404);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Dados inválidos') {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401);
  }
}

/**
 * Middleware centralizado de tratamento de erros com rastreabilidade por Correlation ID.
 */
function errorHandler(err, req, res, next) {
  const correlationId = req.id;
  const log = req.log || logger;

  // Erros operacionais customizados da aplicação (AppError)
  if (err instanceof AppError) {
    log.warn({ err: err.message, statusCode: err.statusCode, correlationId }, `[AppError] ${err.message}`);
    return res.status(err.statusCode).json({
      error: err.message,
      correlationId,
    });
  }

  // Erros de validação do Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    log.warn({ details: messages, correlationId }, '[Mongoose ValidationError]');
    return res.status(400).json({
      error: 'Erro de validação',
      details: messages,
      correlationId,
    });
  }

  if (err.name === 'CastError') {
    log.warn({ path: err.path, correlationId }, '[Mongoose CastError]');
    return res.status(400).json({
      error: `Formato de ID inválido para o campo ${err.path}`,
      correlationId,
    });
  }

  // Erro de Chave Duplicada no MongoDB (índice único de colisão temporal)
  if (err.code === 11000) {
    log.warn({ correlationId }, '[MongoDB DuplicateKey]');
    return res.status(409).json({
      error: 'Horário acabou de ser preenchido por outro cliente (Conflito no banco de dados)',
      correlationId,
    });
  }

  // Erro inesperado 500 (Unhandled Error)
  log.error({ err, correlationId }, '💥 [Unhandled Error] Falha interna não tratada');

  return res.status(500).json({
    error: 'Ocorreu um erro interno no servidor',
    correlationId,
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

module.exports = {
  errorHandler,
  AppError,
  ConflictError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
};

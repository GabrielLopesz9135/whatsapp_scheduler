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
 * Middleware centralizado de tratamento de erros.
 */
function errorHandler(err, req, res, next) {
  // Erros customizados da aplicação
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Erros do Mongoose / MongoDB
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: 'Erro de validação', details: messages });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Formato de ID inválido para o campo ${err.path}` });
  }

  // Erro de Chave Duplicada no MongoDB (ex: índice único de startTime para CONFIRMED)
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Horário acabou de ser preenchido por outro cliente (Conflito no banco de dados)',
    });
  }

  // Log de erros não previstos
  console.error('💥 [Unhandled Error]:', err);

  return res.status(500).json({
    error: 'Ocorreu um erro interno no servidor',
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


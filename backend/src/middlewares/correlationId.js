const { randomUUID } = require('crypto');
const logger = require('../config/logger');

/**
 * Middleware para rastreamento ponta a ponta com Correlation IDs (Request Tracing).
 * Injeta um identificador exclusivo para cada requisição HTTP e cria um logger contextualizado.
 */
function correlationIdMiddleware(req, res, next) {
  // Preserva o correlationId se já foi enviado por um proxy/gateway (Cloudflare, Nginx, etc.)
  const correlationId =
    req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    randomUUID();

  req.id = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  // Anexa um logger filho exclusivo para esta requisição contendo o correlationId em todos os logs
  req.log = logger.child({ correlationId });

  next();
}

module.exports = {
  correlationIdMiddleware,
};


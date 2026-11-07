const pinoHttp = require('pino-http');
const logger = require('../config/logger');

/**
 * Middleware pino-http para logging automático de requisições e respostas HTTP.
 */
const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `[HTTP] ${req.method} ${req.url} - Status ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `[HTTP] ${req.method} ${req.url} - Falha ${res.statusCode}: ${err.message}`;
  },
  // Ignora /health e documentação do Swagger para não sobrecarregar os logs de monitoramento
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url.startsWith('/api/docs'),
  },
});

module.exports = httpLogger;


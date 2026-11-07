const pino = require('pino');
const env = require('./env');

const isProduction = env.NODE_ENV === 'production';

/**
 * Logger estruturado de alto desempenho com Pino.
 * - Em desenvolvimento: formatação visual colorida (pino-pretty).
 * - Em produção: JSON estruturado puro, ideal para agregação em Datadog, Loki, CloudWatch ou ELK.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

module.exports = logger;


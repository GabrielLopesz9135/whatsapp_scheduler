const { z } = require('zod');

/**
 * Middleware genérico para validação de requisições com Schemas do Zod.
 * 
 * @param {z.ZodSchema} schema - Schema de validação do Zod
 * @param {'body'|'query'|'params'} [source='body'] - Propriedade da requisição a ser validada
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // Substitui pelos dados higienizados e tipados pelo Zod
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues || error.errors || [];
        const formattedErrors = issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          error: 'Falha na validação dos dados fornecidos.',
          details: formattedErrors,
          correlationId: req.id,
        });
      }
      return next(error);
    }
  };
}

module.exports = {
  validate,
};

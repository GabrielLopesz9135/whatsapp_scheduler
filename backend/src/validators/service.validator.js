const { z } = require('zod');

const createServiceSchema = z.object({
  name: z
    .string({ required_error: 'Nome do procedimento é obrigatório' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().max(255, 'Descrição deve ter no máximo 255 caracteres').optional(),
  durationMinutes: z.coerce
    .number({ required_error: 'Duração em minutos é obrigatória' })
    .int('Duração deve ser um número inteiro')
    .min(5, 'Duração mínima é de 5 minutos')
    .max(480, 'Duração máxima é de 480 minutos'),
  price: z.coerce
    .number({ required_error: 'Preço é obrigatório' })
    .min(0, 'Preço não pode ser negativo'),
  active: z.boolean().optional(),
});

const updateServiceSchema = createServiceSchema.partial();

module.exports = {
  createServiceSchema,
  updateServiceSchema,
};


const { z } = require('zod');

const loginSchema = z.object({
  email: z
    .string({ required_error: 'E-mail é obrigatório' })
    .email('Formato de e-mail inválido'),
  password: z
    .string({ required_error: 'Senha é obrigatória' })
    .min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z
    .string({ required_error: 'E-mail é obrigatório' })
    .email('Formato de e-mail inválido'),
  password: z
    .string({ required_error: 'Senha é obrigatória' })
    .min(6, 'Senha deve ter no mínimo 6 caracteres'),
  businessHours: z
    .object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inicial deve ser HH:mm').optional(),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário final deve ser HH:mm').optional(),
      slotInterval: z.number().int().min(5).max(120).optional(),
    })
    .optional(),
});

module.exports = {
  loginSchema,
  registerSchema,
};


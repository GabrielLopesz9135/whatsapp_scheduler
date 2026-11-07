const { z } = require('zod');

const createAppointmentSchema = z.object({
  customerName: z
    .string({ required_error: 'Nome do paciente é obrigatório' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres'),
  customerPhone: z
    .string({ required_error: 'Telefone do paciente é obrigatório' })
    .min(8, 'Telefone inválido'),
  serviceId: z
    .string({ required_error: 'serviceId é obrigatório' })
    .regex(/^[0-9a-fA-F]{24}$/, 'serviceId inválido (deve ser um ObjectId)'),
  date: z
    .string({ required_error: 'Data é obrigatória' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  startTime: z
    .string({ required_error: 'startTime é obrigatório' })
    .min(1, 'startTime não pode ser vazio'),
  origin: z.enum(['DASHBOARD', 'WHATSAPP']).optional(),
});

const availableSlotsQuerySchema = z.object({
  date: z
    .string({ required_error: 'Parâmetro "date" é obrigatório' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  serviceId: z
    .string({ required_error: 'Parâmetro "serviceId" é obrigatório' })
    .regex(/^[0-9a-fA-F]{24}$/, 'serviceId inválido (deve ser um ObjectId)'),
});

const updateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED'], {
    errorMap: () => ({ message: 'Status deve ser CONFIRMED, CANCELLED ou COMPLETED' }),
  }),
});

module.exports = {
  createAppointmentSchema,
  availableSlotsQuerySchema,
  updateStatusSchema,
};


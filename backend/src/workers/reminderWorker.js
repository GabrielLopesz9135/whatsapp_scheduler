const { Worker } = require('bullmq');
const { redisConfig } = require('../config/redis');
const env = require('../config/env');
const Appointment = require('../models/Appointment');
const whatsappService = require('../services/whatsappService');

const QUEUE_NAME = 'appointment-reminders';

let reminderWorkerInstance = null;

/**
 * Inicializa o Worker consumidor de lembretes automáticos agendados.
 * 
 * ATENÇÃO: Contém trava de segurança financeira (ENABLE_AUTOMATIC_REMINDERS).
 * Mensagens proativas fora da janela de 24h iniciada pelo cliente geram tarifação
 * de modelo de conversa (Template Utility/Marketing) pela Meta.
 * Por padrão, o envio real fica desativado e apenas registra a simulação em log.
 */
function initReminderWorker() {
  if (reminderWorkerInstance) {
    return reminderWorkerInstance;
  }

  reminderWorkerInstance = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { appointmentId, customerName, customerPhone, startTime, date, serviceName } = job.data;

      // 1. Verifica se o agendamento ainda está ativo no MongoDB
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment || appointment.status !== 'CONFIRMED') {
        console.log(`ℹ️ [Reminder Worker] Agendamento ${appointmentId} cancelado ou inexistente. Lembrete descartado.`);
        return { skipped: true, reason: 'APPOINTMENT_NOT_CONFIRMED' };
      }

      // 2. Trava de Segurança Financeira (Meta Cloud API 24h Window)
      if (!env.ENABLE_AUTOMATIC_REMINDERS) {
        console.log('----------------------------------------------------');
        console.log('🔔 [Reminder Worker] DISPARO DE LEMBRETE AUTOMÁTICO');
        console.log(`   Paciente:     ${customerName} (${customerPhone})`);
        console.log(`   Data/Horário: ${date} às ${new Date(startTime).toISOString().substring(11, 16)}`);
        console.log(`   Procedimento: ${serviceName}`);
        console.log('   STATUS:       🛡️ SIMULAÇÃO DE SEGURANÇA (Sem disparo de rede)');
        console.log('   AVISO:        ENABLE_AUTOMATIC_REMINDERS=false.');
        console.log('                 O envio real está desativado para evitar tarifação');
        console.log('                 de Templates fora da janela de 24h da Meta.');
        console.log('----------------------------------------------------');

        return {
          simulated: true,
          sent: false,
          reason: 'AUTOMATIC_REMINDERS_DISABLED_TO_PREVENT_META_CHARGES',
        };
      }

      // 3. Caso a flag seja ativada conscientemente em produção (com Template cadastrado na Meta):
      const timeFormatted = new Date(startTime).toISOString().substring(11, 16);
      const reminderText =
        `👋 Olá, *${customerName}*! Lembrando do seu agendamento de amanhã:\n\n` +
        `🦷 *Procedimento:* ${serviceName}\n` +
        `📅 *Data:* ${date}\n` +
        `⏰ *Horário:* ${timeFormatted}\n\n` +
        `Te esperamos no consultório da Dra. Meyriellem Damasceno!`;

      await whatsappService.sendText(customerPhone, reminderText);
      console.log(`✅ [Reminder Worker] Lembrete real enviado com sucesso para ${customerPhone}`);

      return { sent: true };
    },
    {
      connection: redisConfig,
      concurrency: 2,
    }
  );

  reminderWorkerInstance.on('ready', () => {
    console.log(`⏰ [BullMQ Worker] Worker de Lembretes ativo na fila "${QUEUE_NAME}".`);
  });

  reminderWorkerInstance.on('completed', (job) => {
    console.log(`✅ [BullMQ Worker] Lembrete do Job ${job.id} processado com sucesso.`);
  });

  reminderWorkerInstance.on('failed', (job, err) => {
    console.error(`❌ [BullMQ Worker] Falha ao processar lembrete do Job ${job?.id}:`, err.message);
  });

  return reminderWorkerInstance;
}

/**
 * Encerramento gracioso do Worker de Lembretes.
 */
async function closeReminderWorker() {
  if (reminderWorkerInstance) {
    await reminderWorkerInstance.close();
    reminderWorkerInstance = null;
    console.log('🔒 [BullMQ Worker] Worker de Lembretes encerrado graciosamente.');
  }
}

module.exports = {
  initReminderWorker,
  closeReminderWorker,
};


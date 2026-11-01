const ChatSession = require('../models/ChatSession');
const Service = require('../models/Service');
const slotService = require('./slotService');
const appointmentService = require('./appointmentService');
const { ConflictError } = require('../middlewares/errorHandler');

/**
 * Envia mensagem pelo WhatsApp resolvendo o serviço sob demanda para evitar dependência circular.
 * @param {string} recipient - JID ou telefone
 * @param {string} text - Conteúdo da mensagem
 */
async function sendWhatsApp(recipient, text) {
  const { sendText } = require('./whatsappService');
  return sendText(recipient, text);
}

/**
 * Converte data YYYY-MM-DD para string legível brasileira (DD/MM/YYYY).
 * @param {string} dateString
 * @returns {string}
 */
function formatDateBR(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Gera os próximos N dias úteis (Segunda a Sábado, excluindo Domingos).
 * @param {number} count
 * @returns {Array<{ dateString: string, displayLabel: string }>}
 */
function getNextBusinessDays(count = 5) {
  const days = [];
  const cursor = new Date();

  // Começa a partir de amanhã para garantir agendamentos futuros
  cursor.setDate(cursor.getDate() + 1);

  const dayNames = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];

  while (days.length < count) {
    const dayOfWeek = cursor.getDay(); // 0 = Domingo
    if (dayOfWeek !== 0) {
      const year = cursor.getFullYear();
      const month = String(cursor.getMonth() + 1).padStart(2, '0');
      const day = String(cursor.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      const displayLabel = `${day}/${month}/${year} (${dayNames[dayOfWeek]})`;

      days.push({
        dateString,
        displayLabel,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

/**
 * Máquina de estados conversacional do WhatsApp com menus em texto numerado.
 * Processa mensagens recebidas pelo Baileys.
 * 
 * @param {Object} params
 * @param {string} params.phone - Telefone limpo (ex: "5511999998888")
 * @param {string} params.customerName - Nome do cliente
 * @param {string} params.text - Mensagem de texto enviada pelo cliente
 * @param {string} params.jid - JID completo do WhatsApp
 */
async function handleIncomingMessage({ phone, customerName, text, jid }) {
  const recipient = jid || phone;
  const normalizedText = text.trim();

  // Busca ou inicializa a sessão do cliente no MongoDB
  let session = await ChatSession.findOne({ phone });
  if (!session) {
    session = await ChatSession.create({
      phone,
      step: 'IDLE',
      tempData: { customerName },
    });
  }

  // Permite digitar "0" ou "cancelar" a qualquer momento para reiniciar o atendimento
  const isResetCommand =
    normalizedText === '0' ||
    /^(cancelar|sair|menu|reiniciar|inicio|início|voltar)$/i.test(normalizedText);

  if (isResetCommand) {
    session.step = 'IDLE';
    session.tempData = { customerName };
    await session.save();

    await sendWhatsApp(recipient, '🔄 Atendimento reiniciado com sucesso!\n');
    // Prossegue imediatamente para o passo IDLE exibindo o menu inicial
  }

  // Máquina de Estados (State Machine)
  switch (session.step) {
    case 'IDLE': {
      const activeServices = await Service.find({ active: true }).sort({ name: 1 });

      if (activeServices.length === 0) {
        await sendWhatsApp(
          recipient,
          `Olá, *${customerName}*! No momento não possuímos serviços disponíveis para agendamento. Por favor, tente novamente mais tarde.`
        );
        return;
      }

      // Salva os IDs dos serviços para mapear o número digitado
      session.tempData.serviceOptions = activeServices.map((s) => s._id.toString());
      session.tempData.customerName = customerName;
      session.step = 'AWAITING_SERVICE';
      await session.save();

      let menuText = `Olá, *${customerName}*! 👋\nSeja bem-vindo ao nosso sistema de agendamento.\n\nPor favor, escolha o serviço desejado digitando o *número* correspondente:\n\n`;

      activeServices.forEach((srv, index) => {
        const priceFormatted = srv.price.toFixed(2).replace('.', ',');
        menuText += `*${index + 1}* - ${srv.name} (${srv.durationMinutes} min) - R$ ${priceFormatted}\n`;
      });

      menuText += `\n_Digite 0 a qualquer momento para reiniciar o atendimento._`;

      await sendWhatsApp(recipient, menuText);
      break;
    }

    case 'AWAITING_SERVICE': {
      const serviceIndex = parseInt(normalizedText, 10);
      const options = session.tempData.serviceOptions || [];

      if (isNaN(serviceIndex) || serviceIndex < 1 || serviceIndex > options.length) {
        const activeServices = await Service.find({ active: true }).sort({ name: 1 });
        let retryMsg = `⚠️ Opção inválida! Por favor, digite o número correspondente ao serviço desejado:\n\n`;

        activeServices.forEach((srv, index) => {
          const priceFormatted = srv.price.toFixed(2).replace('.', ',');
          retryMsg += `*${index + 1}* - ${srv.name} (${srv.durationMinutes} min) - R$ ${priceFormatted}\n`;
        });
        retryMsg += `\n_Digite 0 para reiniciar._`;

        await sendWhatsApp(recipient, retryMsg);
        return;
      }

      const selectedServiceId = options[serviceIndex - 1];
      const service = await Service.findById(selectedServiceId);

      if (!service || !service.active) {
        session.step = 'IDLE';
        await session.save();
        await sendWhatsApp(
          recipient,
          '⚠️ O serviço selecionado não está mais disponível. Reiniciando atendimento...'
        );
        return;
      }

      // Salva o serviço escolhido e gera as datas
      session.tempData.selectedServiceId = service._id;
      const nextDays = getNextBusinessDays(5);
      session.tempData.dateOptions = nextDays.map((d) => d.dateString);
      session.step = 'AWAITING_DATE';
      await session.save();

      let dateMsg = `Ótimo! Você escolheu *${service.name}* (${service.durationMinutes} min).\n\nPara qual data gostaria de agendar? Digite o *número* da opção:\n\n`;

      nextDays.forEach((d, index) => {
        dateMsg += `*${index + 1}* - ${d.displayLabel}\n`;
      });

      dateMsg += `\n_Digite 0 para reiniciar._`;

      await sendWhatsApp(recipient, dateMsg);
      break;
    }

    case 'AWAITING_DATE': {
      const dateIndex = parseInt(normalizedText, 10);
      const dateOptions = session.tempData.dateOptions || [];

      if (isNaN(dateIndex) || dateIndex < 1 || dateIndex > dateOptions.length) {
        let retryMsg = `⚠️ Opção de data inválida! Por favor, digite o número correspondente à data desejada:\n\n`;

        const nextDays = getNextBusinessDays(5);
        nextDays.forEach((d, index) => {
          retryMsg += `*${index + 1}* - ${d.displayLabel}\n`;
        });
        retryMsg += `\n_Digite 0 para reiniciar._`;

        await sendWhatsApp(recipient, retryMsg);
        return;
      }

      const chosenDate = dateOptions[dateIndex - 1];

      // Consulta slots livres através do slotService
      const slots = await slotService.getAvailableSlots(
        chosenDate,
        session.tempData.selectedServiceId
      );

      if (slots.length === 0) {
        let noSlotMsg = `⚠️ Infelizmente não há horários livres para o dia *${formatDateBR(
          chosenDate
        )}*.\n\nPor favor, selecione outra data digitando o número:\n\n`;

        const nextDays = getNextBusinessDays(5);
        nextDays.forEach((d, index) => {
          noSlotMsg += `*${index + 1}* - ${d.displayLabel}\n`;
        });
        noSlotMsg += `\n_Digite 0 para reiniciar._`;

        await sendWhatsApp(recipient, noSlotMsg);
        return;
      }

      session.tempData.selectedDate = chosenDate;
      session.tempData.timeOptions = slots;
      session.step = 'AWAITING_TIME';
      await session.save();

      let slotMsg = `Horários disponíveis para o dia *${formatDateBR(
        chosenDate
      )}*:\nDigite o *número* do horário desejado:\n\n`;

      slots.forEach((slot, index) => {
        slotMsg += `*${index + 1}* - ${slot}\n`;
      });

      slotMsg += `\n_Digite 0 para reiniciar._`;

      await sendWhatsApp(recipient, slotMsg);
      break;
    }

    case 'AWAITING_TIME': {
      const timeIndex = parseInt(normalizedText, 10);
      const timeOptions = session.tempData.timeOptions || [];

      if (isNaN(timeIndex) || timeIndex < 1 || timeIndex > timeOptions.length) {
        let retryMsg = `⚠️ Opção de horário inválida! Por favor, digite o número correspondente a um dos horários livres:\n\n`;

        timeOptions.forEach((slot, index) => {
          retryMsg += `*${index + 1}* - ${slot}\n`;
        });
        retryMsg += `\n_Digite 0 para reiniciar._`;

        await sendWhatsApp(recipient, retryMsg);
        return;
      }

      const chosenTime = timeOptions[timeIndex - 1];
      const startTimeISO = `${session.tempData.selectedDate}T${chosenTime}:00.000Z`;

      session.tempData.selectedStartTime = startTimeISO;
      session.step = 'AWAITING_CONFIRMATION';
      await session.save();

      const service = await Service.findById(session.tempData.selectedServiceId);
      const priceFormatted = (service?.price || 0).toFixed(2).replace('.', ',');

      const summaryMsg =
        `📋 *Resumo do Agendamento*\n\n` +
        `• *Cliente:* ${session.tempData.customerName || customerName}\n` +
        `• *Serviço:* ${service?.name || 'Serviço'}\n` +
        `• *Duração:* ${service?.durationMinutes || 30} min\n` +
        `• *Valor:* R$ ${priceFormatted}\n` +
        `• *Data:* ${formatDateBR(session.tempData.selectedDate)}\n` +
        `• *Horário:* ${chosenTime}\n\n` +
        `Digite *1* para Confirmar ou *2* para Cancelar:`;

      await sendWhatsApp(recipient, summaryMsg);
      break;
    }

    case 'AWAITING_CONFIRMATION': {
      const isConfirm =
        normalizedText === '1' ||
        /^(confirmar|sim|ok|confirmo|positivo)$/i.test(normalizedText);
      const isCancel =
        normalizedText === '2' ||
        /^(cancelar|nao|não|desistir)$/i.test(normalizedText);

      if (isConfirm) {
        try {
          const appointment = await appointmentService.createAppointment({
            customerName: session.tempData.customerName || customerName,
            customerPhone: phone,
            serviceId: session.tempData.selectedServiceId,
            date: session.tempData.selectedDate,
            startTime: new Date(session.tempData.selectedStartTime),
            origin: 'WHATSAPP',
          });

          const timeFormatted = appointment.startTime.toISOString().substring(11, 16);

          await sendWhatsApp(
            recipient,
            `🎉 *Agendamento Confirmado com Sucesso!*\n\n` +
              `Perfeito, *${appointment.customerName}*! Seu horário foi registrado em nosso sistema.\n\n` +
              `📅 *Data:* ${formatDateBR(appointment.date)}\n` +
              `⏰ *Horário:* ${timeFormatted}\n` +
              `✂️ *Serviço:* ${appointment.serviceId?.name || 'Agendamento'}\n\n` +
              `Te esperamos! Se precisar cancelar ou reagendar, basta nos mandar uma mensagem.`
          );

          // Remove a sessão do cliente após conclusão
          await ChatSession.deleteOne({ phone });
        } catch (error) {
          if (error instanceof ConflictError || error.statusCode === 409) {
            // Concorrência detectada: recarrega os horários livres e volta para AWAITING_TIME
            const remainingSlots = await slotService.getAvailableSlots(
              session.tempData.selectedDate,
              session.tempData.selectedServiceId
            );

            if (remainingSlots.length > 0) {
              session.tempData.timeOptions = remainingSlots;
              session.step = 'AWAITING_TIME';
              await session.save();

              let conflictMsg =
                `⚠️ *Atenção:* O horário que você escolheu acabou de ser preenchido por outro cliente!\n\n` +
                `Por favor, escolha outro horário livre digitando o *número* correspondente:\n\n`;

              remainingSlots.forEach((slot, idx) => {
                conflictMsg += `*${idx + 1}* - ${slot}\n`;
              });

              conflictMsg += `\n_Digite 0 para reiniciar._`;

              await sendWhatsApp(recipient, conflictMsg);
            } else {
              const nextDays = getNextBusinessDays(5);
              session.tempData.dateOptions = nextDays.map((d) => d.dateString);
              session.step = 'AWAITING_DATE';
              await session.save();

              let noSlotsMsg =
                `⚠️ O horário foi preenchido e não restam mais vagas para este dia.\n\n` +
                `Por favor, selecione outra data digitando o *número* correspondente:\n\n`;

              nextDays.forEach((d, idx) => {
                noSlotsMsg += `*${idx + 1}* - ${d.displayLabel}\n`;
              });

              noSlotsMsg += `\n_Digite 0 para reiniciar._`;

              await sendWhatsApp(recipient, noSlotsMsg);
            }
          } else {
            console.error('❌ [BotFlow] Erro ao criar agendamento:', error);
            await sendWhatsApp(
              recipient,
              'Desculpe, ocorreu um erro ao registrar seu agendamento. Por favor, tente novamente em alguns instantes digitando 0.'
            );
          }
        }
      } else if (isCancel) {
        await sendWhatsApp(
          recipient,
          '❌ Agendamento cancelado. Se precisar de algo, basta nos enviar uma nova mensagem!'
        );
        await ChatSession.deleteOne({ phone });
      } else {
        await sendWhatsApp(
          recipient,
          'Opção não reconhecida. Por favor, digite *1* para Confirmar ou *2* para Cancelar (ou *0* para reiniciar):'
        );
      }
      break;
    }

    default: {
      session.step = 'IDLE';
      await session.save();
      break;
    }
  }
}

module.exports = {
  handleIncomingMessage,
  formatDateBR,
  getNextBusinessDays,
};

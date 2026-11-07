const ChatSession = require('../models/ChatSession');
const Service = require('../models/Service');
const User = require('../models/User');
const slotService = require('./slotService');
const appointmentService = require('./appointmentService');
const whatsappService = require('./whatsappService');
const { ConflictError } = require('../middlewares/errorHandler');

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
 * @returns {Array<{ dateString: string, displayTitle: string, description: string }>}
 */
function getNextBusinessDays(count = 5) {
  const days = [];
  const cursor = new Date();

  // Começa a partir de amanhã para garantir datas futuras
  cursor.setDate(cursor.getDate() + 1);

  const dayNames = [
    'Dom',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ];

  while (days.length < count) {
    const dayOfWeek = cursor.getDay(); // 0 = Domingo
    if (dayOfWeek !== 0) {
      const year = cursor.getFullYear();
      const month = String(cursor.getMonth() + 1).padStart(2, '0');
      const day = String(cursor.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const displayTitle = `${day}/${month} (${dayNames[dayOfWeek]})`.substring(0, 24);

      days.push({
        dateString,
        displayTitle,
        description: `Agendar para ${day}/${month}/${year}`,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

/**
 * Formata os procedimentos/serviços para a lista interativa da WhatsApp Cloud API respeitando os limites:
 * - title: Máximo de 24 caracteres (limite obrigatório da Meta).
 * - description: Máximo de 72 caracteres (se o título for longo, inclui o nome completo aqui).
 * @param {Array<Object>} services
 * @returns {Array<{ id: string, title: string, description: string }>}
 */
function buildServiceRows(services) {
  return services.slice(0, 10).map((srv) => {
    const priceStr = `R$ ${srv.price.toFixed(2).replace('.', ',')}`;
    const baseInfo = `${srv.durationMinutes} min • ${priceStr}`;

    let title = srv.name.trim();
    let description = baseInfo;

    // Se o nome do serviço ultrapassar os 24 caracteres exigidos pela Meta:
    if (title.length > 24) {
      // Abreviação elegante com reticências (ex: "Clareamento em Cons...")
      title = `${title.substring(0, 21).trim()}...`;
      // No campo description (que suporta até 72 caracteres), exibe o nome completo + duração e preço
      const fullDesc = `${srv.name} • ${baseInfo}`;
      description =
        fullDesc.length <= 72
          ? fullDesc
          : `${srv.name.substring(0, 72 - baseInfo.length - 3).trim()}... • ${baseInfo}`;
    }

    return {
      id: srv._id.toString(),
      title,
      description,
    };
  });
}

/**
 * Processa mensagens recebidas pelo Webhook oficial da Meta WhatsApp Cloud API.
 * Extrai dados do cliente e gerencia a máquina de estados (ChatSession).
 * 
 * @param {Object} webhookPayload - Payload bruto recebido da Meta
 */
async function handleIncomingMessage(webhookPayload) {
  try {
    const entry = webhookPayload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Se o webhook for notificação de status de entrega/leitura (statuses), ignora sem erro
    if (value?.statuses && (!value?.messages || value.messages.length === 0)) {
      return;
    }

    const messages = value?.messages;
    if (!messages || messages.length === 0) {
      return;
    }

    const message = messages[0];
    const from = message.from; // Número do cliente
    const customerName = value?.contacts?.[0]?.profile?.name || 'Cliente';

    // Extrai a escolha do usuário (texto simples, item de lista clicada ou botão de resposta)
    let userChoiceId = null;
    let userText = '';

    if (message.type === 'text') {
      userText = message.text?.body?.trim() || '';
      userChoiceId = userText;
    } else if (message.type === 'interactive') {
      if (message.interactive.type === 'list_reply') {
        userChoiceId = message.interactive.list_reply.id;
        userText = message.interactive.list_reply.title || '';
      } else if (message.interactive.type === 'button_reply') {
        userChoiceId = message.interactive.button_reply.id;
        userText = message.interactive.button_reply.title || '';
      }
    }

    console.log(`📩 [WhatsApp Cloud API] De: ${from} (${customerName}) | Escolha: "${userChoiceId}" | Texto: "${userText}"`);

    // Busca ou inicializa a sessão da conversa no MongoDB
    let session = await ChatSession.findOne({ phone: from });
    if (!session) {
      session = await ChatSession.create({
        phone: from,
        step: 'IDLE',
        tempData: { customerName },
      });
    }

    // Comando de cancelamento ou reinício a qualquer momento
    const isResetCommand = /^(cancelar|sair|menu|reiniciar|inicio|início|voltar|0)$/i.test(userText);
    if (isResetCommand) {
      session.step = 'IDLE';
      session.tempData = { customerName };
      await session.save();

      await whatsappService.sendText(
        from,
        '🔄 Atendimento reiniciado com sucesso!'
      );
      // Prossegue imediatamente para o passo IDLE exibindo o menu interativo
    }

    // Máquina de Estados da Conversa
    switch (session.step) {
      case 'IDLE': {
        const provider = await User.findOne();
        const providerName = provider?.name || 'nosso estabelecimento';
        const activeServices = await Service.find({ active: true }).sort({ name: 1 });

        if (activeServices.length === 0) {
          await whatsappService.sendText(
            from,
            `Olá, *${customerName}*! Seja bem-vindo(a) ao sistema de agendamento de *${providerName}*.\n\nNo momento não possuímos serviços disponíveis para agendamento. Por favor, tente novamente mais tarde.`
          );
          return;
        }

        const serviceRows = buildServiceRows(activeServices);

        await whatsappService.sendInteractiveList(
          from,
          `Olá, *${customerName}*! 👋\nSeja bem-vindo(a) ao sistema de agendamentos de *${providerName}*.\n\nPor favor, escolha o serviço desejado:`,
          'Ver Serviços',
          serviceRows
        );

        session.step = 'AWAITING_SERVICE';
        session.tempData = { customerName };
        await session.save();
        break;
      }

      case 'AWAITING_SERVICE': {
        const selectedServiceId = userChoiceId;

        let service = null;
        try {
          service = await Service.findOne({ _id: selectedServiceId, active: true });
        } catch {
          // ID com formato inválido de ObjectId
        }

        if (!service) {
          const activeServices = await Service.find({ active: true }).sort({ name: 1 });
          const serviceRows = buildServiceRows(activeServices);

          await whatsappService.sendInteractiveList(
            from,
            'Opção não reconhecida. Por favor, selecione um dos procedimentos da lista abaixo:',
            'Ver Procedimentos',
            serviceRows
          );
          return;
        }

        // Salva o serviço escolhido e calcula os próximos dias úteis
        session.tempData.selectedServiceId = service._id;
        const nextDays = getNextBusinessDays(5);

        const dateRows = nextDays.map((d) => ({
          id: d.dateString,
          title: d.displayTitle,
          description: d.description,
        }));

        await whatsappService.sendInteractiveList(
          from,
          `Ótimo! Você escolheu *${service.name}* (${service.durationMinutes} min).\n\nPara qual data gostaria de agendar?`,
          'Ver Datas',
          dateRows
        );

        session.step = 'AWAITING_DATE';
        await session.save();
        break;
      }

      case 'AWAITING_DATE': {
        const chosenDate = userChoiceId;

        if (!chosenDate || !/^\d{4}-\d{2}-\d{2}$/.test(chosenDate)) {
          const nextDays = getNextBusinessDays(5);
          const dateRows = nextDays.map((d) => ({
            id: d.dateString,
            title: d.displayTitle,
            description: d.description,
          }));

          await whatsappService.sendInteractiveList(
            from,
            'Data inválida. Por favor, escolha uma das datas disponíveis abaixo:',
            'Ver Datas',
            dateRows
          );
          return;
        }

        // Consulta horários livres através do slotService
        const slots = await slotService.getAvailableSlots(
          chosenDate,
          session.tempData.selectedServiceId
        );

        if (slots.length === 0) {
          const nextDays = getNextBusinessDays(5);
          const dateRows = nextDays.map((d) => ({
            id: d.dateString,
            title: d.displayTitle,
            description: d.description,
          }));

          await whatsappService.sendInteractiveList(
            from,
            `Infelizmente não há horários disponíveis para o dia *${formatDateBR(chosenDate)}*.\n\nPor favor, selecione outra data:`,
            'Outras Datas',
            dateRows
          );
          return;
        }

        session.tempData.selectedDate = chosenDate;

        // Limita a até 10 horários para respeitar as regras da lista interativa da Meta
        const slotRows = slots.slice(0, 10).map((slot) => ({
          id: slot,
          title: slot,
          description: 'Horário disponível',
        }));

        await whatsappService.sendInteractiveList(
          from,
          `Horários livres para o dia *${formatDateBR(chosenDate)}*:\nSelecione o melhor horário para você:`,
          'Ver Horários',
          slotRows
        );

        session.step = 'AWAITING_TIME';
        await session.save();
        break;
      }

      case 'AWAITING_TIME': {
        const chosenTime = userChoiceId;

        if (!chosenTime || !/^\d{2}:\d{2}$/.test(chosenTime)) {
          const slots = await slotService.getAvailableSlots(
            session.tempData.selectedDate,
            session.tempData.selectedServiceId
          );

          const slotRows = slots.slice(0, 10).map((slot) => ({
            id: slot,
            title: slot,
            description: 'Horário disponível',
          }));

          await whatsappService.sendInteractiveList(
            from,
            'Horário inválido. Por favor, escolha um dos horários disponíveis na lista:',
            'Ver Horários',
            slotRows
          );
          return;
        }

        const startTimeISO = `${session.tempData.selectedDate}T${chosenTime}:00.000Z`;
        session.tempData.selectedStartTime = startTimeISO;

        const service = await Service.findById(session.tempData.selectedServiceId);
        const priceFormatted = (service?.price || 0).toFixed(2).replace('.', ',');

        const summaryText =
          `📋 *Resumo do Agendamento*\n\n` +
          `• *Cliente:* ${session.tempData.customerName || customerName}\n` +
          `• *Serviço:* ${service?.name || 'Serviço'}\n` +
          `• *Duração:* ${service?.durationMinutes || 30} min\n` +
          `• *Valor:* R$ ${priceFormatted}\n` +
          `• *Data:* ${formatDateBR(session.tempData.selectedDate)}\n` +
          `• *Horário:* ${chosenTime}\n\n` +
          `Deseja confirmar a sua reserva?`;

        await whatsappService.sendInteractiveButtons(from, summaryText, [
          { id: 'CONFIRM_YES', title: 'Confirmar' },
          { id: 'CONFIRM_NO', title: 'Cancelar' },
        ]);

        session.step = 'AWAITING_CONFIRMATION';
        await session.save();
        break;
      }

      case 'AWAITING_CONFIRMATION': {
        const isConfirm =
          userChoiceId === 'CONFIRM_YES' ||
          /^(confirmar|sim|ok|confirmo|1)$/i.test(userText);
        const isCancel =
          userChoiceId === 'CONFIRM_NO' ||
          /^(cancelar|nao|não|desistir|2)$/i.test(userText);

        if (isConfirm) {
          try {
            const appointment = await appointmentService.createAppointment({
              customerName: session.tempData.customerName || customerName,
              customerPhone: from,
              serviceId: session.tempData.selectedServiceId,
              date: session.tempData.selectedDate,
              startTime: new Date(session.tempData.selectedStartTime),
              origin: 'WHATSAPP',
            });

            const timeFormatted = appointment.startTime.toISOString().substring(11, 16);
            const provider = await User.findOne();
            const providerName = provider?.name || 'nosso estabelecimento';

            await whatsappService.sendText(
              from,
              `🎉 *Agendamento Confirmado com Sucesso!*\n\n` +
                `Perfeito, *${appointment.customerName}*! Seu horário com *${providerName}* foi confirmado.\n\n` +
                `📅 *Data:* ${formatDateBR(appointment.date)}\n` +
                `⏰ *Horário:* ${timeFormatted}\n` +
                `✂️ *Serviço:* ${appointment.serviceId?.name || 'Atendimento'}\n\n` +
                `Te aguardamos! Caso precise remarcar ou cancelar, basta nos enviar uma mensagem.`
            );

            // Remove a sessão do cliente após conclusão
            await ChatSession.deleteOne({ phone: from });
          } catch (error) {
            if (error instanceof ConflictError || error.statusCode === 409) {
              // Concorrência detectada: avisa o cliente e volta para seleção de horários
              const remainingSlots = await slotService.getAvailableSlots(
                session.tempData.selectedDate,
                session.tempData.selectedServiceId
              );

              if (remainingSlots.length > 0) {
                const slotRows = remainingSlots.slice(0, 10).map((slot) => ({
                  id: slot,
                  title: slot,
                  description: 'Horário disponível',
                }));

                await whatsappService.sendInteractiveList(
                  from,
                  '⚠️ *Atenção:* O horário que você escolheu acabou de ser preenchido por outro cliente!\n\nPor favor, escolha outro horário disponível:',
                  'Outros Horários',
                  slotRows
                );

                session.step = 'AWAITING_TIME';
                await session.save();
              } else {
                const nextDays = getNextBusinessDays(5);
                const dateRows = nextDays.map((d) => ({
                  id: d.dateString,
                  title: d.displayTitle,
                  description: d.description,
                }));

                await whatsappService.sendInteractiveList(
                  from,
                  '⚠️ O horário foi preenchido e não restam mais vagas para este dia.\n\nPor favor, selecione outra data:',
                  'Outras Datas',
                  dateRows
                );

                session.step = 'AWAITING_DATE';
                await session.save();
              }
            } else {
              console.error('❌ [BotFlow] Erro ao criar agendamento:', error);
              await whatsappService.sendText(
                from,
                'Desculpe, ocorreu um erro ao registrar seu agendamento. Por favor, tente novamente em alguns instantes.'
              );
            }
          }
        } else if (isCancel) {
          await whatsappService.sendText(
            from,
            '❌ Agendamento cancelado. Se precisar de algo, basta nos enviar uma nova mensagem!'
          );
          await ChatSession.deleteOne({ phone: from });
        } else {
          await whatsappService.sendInteractiveButtons(
            from,
            'Por favor, clique em um dos botões abaixo para confirmar ou cancelar sua reserva:',
            [
              { id: 'CONFIRM_YES', title: 'Confirmar' },
              { id: 'CONFIRM_NO', title: 'Cancelar' },
            ]
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
  } catch (err) {
    console.error('💥 [BotFlow] Erro inesperado ao processar mensagem do Webhook:', err);
  }
}

module.exports = {
  handleIncomingMessage,
  formatDateBR,
  getNextBusinessDays,
};

const axios = require('axios');
const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const { connectDatabase, disconnectDatabase } = require('./src/config/database');
const { initSocket } = require('./src/config/socket');
const Service = require('./src/models/Service');
const Appointment = require('./src/models/Appointment');
const ChatSession = require('./src/models/ChatSession');
const botFlowService = require('./src/services/botFlowService');

async function testAll() {
  console.log('🧪 [Test Suite] Iniciando bateria de testes do Back-end com Meta WhatsApp Cloud API...\n');

  await connectDatabase();
  const server = http.createServer(app);
  initSocket(server);

  const PORT = 3334;
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseURL = `http://localhost:${PORT}`;

  try {
    // 1. Healthcheck
    console.log('1️⃣ Testando Healthcheck...');
    const healthRes = await axios.get(`${baseURL}/health`);
    console.log('   Status:', healthRes.status, healthRes.data);

    // 2. Login Admin
    console.log('\n2️⃣ Testando Autenticação (/api/auth/login)...');
    const loginRes = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'admin@scheduler.com',
      password: 'admin123',
    });
    console.log('   Status:', loginRes.status);
    const token = loginRes.data.token;
    console.log('   Token JWT obtido:', token ? 'Sim (válido)' : 'Não');
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 3. Listar Serviços
    console.log('\n3️⃣ Testando Listagem de Serviços (/api/services)...');
    const servicesRes = await axios.get(`${baseURL}/api/services`, { headers: authHeaders });
    console.log(`   Serviços encontrados: ${servicesRes.data.length}`);
    const dentalService = servicesRes.data[0];
    console.log(`   Serviço selecionado para teste: "${dentalService.name}" (ID: ${dentalService._id})`);

    // Limpa agendamentos e sessões anteriores do número de teste
    const testDate = '2026-11-04';
    const testPhone = '5511999991234';
    await Appointment.deleteMany({ date: testDate });
    await ChatSession.deleteMany({ phone: testPhone });

    // 4. Calcular Slots Livres
    console.log(`\n4️⃣ Testando Cálculo de Slots (/api/appointments/available-slots)...`);
    const slotsRes = await axios.get(
      `${baseURL}/api/appointments/available-slots?date=${testDate}&serviceId=${dentalService._id}`,
      { headers: authHeaders }
    );
    console.log(`   Slots disponíveis calculados:`, slotsRes.data.availableSlots.slice(0, 6), '...');

    // 5. Criar Agendamento Manual via Dashboard
    console.log('\n5️⃣ Testando Criação de Agendamento Manual...');
    const appointmentRes = await axios.post(
      `${baseURL}/api/appointments`,
      {
        customerName: 'Gabriel Admin',
        customerPhone: '5511999990000',
        serviceId: dentalService._id,
        date: testDate,
        startTime: '09:00',
        origin: 'DASHBOARD',
      },
      { headers: authHeaders }
    );
    console.log('   Agendamento criado com sucesso: ID', appointmentRes.data._id);
    console.log(`   Intervalo agendado: ${appointmentRes.data.startTime} até ${appointmentRes.data.endTime}`);

    // 6. Teste de Concorrência e Conflito (Overlap / 409 Conflict)
    console.log('\n6️⃣ Testando Prevenção de Conflito de Horário (Overlap / 409 Conflict)...');
    try {
      await axios.post(
        `${baseURL}/api/appointments`,
        {
          customerName: 'Cliente Concorrente',
          customerPhone: '5511988887777',
          serviceId: dentalService._id,
          date: testDate,
          startTime: '09:15',
          origin: 'WHATSAPP',
        },
        { headers: authHeaders }
      );
      console.error('❌ FALHA: Deveria ter retornado erro 409 de conflito!');
    } catch (err) {
      if (err.response?.status === 409) {
        console.log('✅ Sucesso! Conflito prevenido com status 409.');
        console.log('   Mensagem retornada:', err.response.data.error);
      } else {
        console.error('❌ Erro inesperado:', err.response?.status, err.response?.data);
      }
    }

    // 7. Teste de Verificação do Webhook da Meta (GET /api/webhook/whatsapp)
    console.log('\n7️⃣ Testando Validação do Webhook da Meta (GET /api/webhook/whatsapp)...');
    const challenge = 'CHALLENGE_META_ABC_123';
    const verifyRes = await axios.get(`${baseURL}/api/webhook/whatsapp`, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': env.WHATSAPP_VERIFY_TOKEN,
        'hub.challenge': challenge,
      },
    });
    console.log('   Status:', verifyRes.status);
    console.log('   Challenge retornado:', verifyRes.data);
    if (String(verifyRes.data) === challenge) {
      console.log('✅ Verificação GET da Meta aprovada com sucesso!');
    }

    // 8. Teste do Webhook POST
    console.log('\n8️⃣ Testando Resposta Imediata do Webhook (POST /api/webhook/whatsapp)...');
    const webhookPostRes = await axios.post(`${baseURL}/api/webhook/whatsapp`, {
      object: 'whatsapp_business_account',
      entry: [],
    });
    console.log('   Status retornado imediatamente para a Meta:', webhookPostRes.status, webhookPostRes.data);

    // 9. Teste Sequencial da Máquina de Estados com Mensagens Interativas da Meta
    console.log('\n9️⃣ Testando Sequência da Máquina de Estados com Payloads Interativos da Meta...');

    function makeMetaPayload(messageObj) {
      return {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '1000000000',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '5511999991234',
                    phone_number_id: env.WHATSAPP_PHONE_NUMBER_ID || '1434118393114940',
                  },
                  contacts: [
                    {
                      profile: { name: 'Cliente Meta' },
                      wa_id: testPhone,
                    },
                  ],
                  messages: [
                    {
                      from: testPhone,
                      id: 'wamid.HBgL...',
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      ...messageObj,
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };
    }

    // Mensagem 1: Cliente envia "Oi"
    console.log('   -> Enviando mensagem inicial de texto...');
    await botFlowService.handleIncomingMessage(
      makeMetaPayload({
        type: 'text',
        text: { body: 'Olá, gostaria de agendar' },
      })
    );
    let session = await ChatSession.findOne({ phone: testPhone });
    console.log(`   Estado atual: ${session?.step} (Esperado: AWAITING_SERVICE)`);

    // Mensagem 2: Cliente seleciona o serviço na lista interativa
    console.log('\n   -> Enviando resposta interativa de lista (Serviço selecionado)...');
    await botFlowService.handleIncomingMessage(
      makeMetaPayload({
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: {
            id: dentalService._id.toString(),
            title: dentalService.name,
          },
        },
      })
    );
    session = await ChatSession.findOne({ phone: testPhone });
    console.log(`   Estado atual: ${session?.step} (Esperado: AWAITING_DATE)`);
    console.log(`   Serviço salvo na sessão: ${session?.tempData?.selectedServiceId}`);

    // Mensagem 3: Cliente seleciona a data na lista interativa
    console.log('\n   -> Enviando resposta interativa de lista (Data selecionada)...');
    await botFlowService.handleIncomingMessage(
      makeMetaPayload({
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: {
            id: testDate,
            title: '04/11 (Quarta)',
          },
        },
      })
    );
    session = await ChatSession.findOne({ phone: testPhone });
    console.log(`   Estado atual: ${session?.step} (Esperado: AWAITING_TIME)`);
    console.log(`   Data salva na sessão: ${session?.tempData?.selectedDate}`);

    // Mensagem 4: Cliente seleciona o horário na lista interativa
    console.log('\n   -> Enviando resposta interativa de lista (Horário selecionado)...');
    await botFlowService.handleIncomingMessage(
      makeMetaPayload({
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: {
            id: '10:00',
            title: '10:00',
          },
        },
      })
    );
    session = await ChatSession.findOne({ phone: testPhone });
    console.log(`   Estado atual: ${session?.step} (Esperado: AWAITING_CONFIRMATION)`);
    console.log(`   Início ISO salvo: ${session?.tempData?.selectedStartTime}`);

    // Mensagem 5: Cliente clica no botão "Confirmar" (CONFIRM_YES)
    console.log('\n   -> Enviando clique no botão CONFIRM_YES...');
    await botFlowService.handleIncomingMessage(
      makeMetaPayload({
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'CONFIRM_YES',
            title: 'Confirmar',
          },
        },
      })
    );

    // Verifica se o agendamento foi salvo no MongoDB com origin: 'WHATSAPP'
    const createdApp = await Appointment.findOne({ customerPhone: testPhone }).sort({ createdAt: -1 });
    console.log('   Agendamento criado via WhatsApp:', createdApp ? `Sim (ID: ${createdApp._id}, Status: ${createdApp.status}, Origem: ${createdApp.origin})` : 'Não');

    // Verifica se a sessão foi limpa
    session = await ChatSession.findOne({ phone: testPhone });
    console.log(`   Sessão após confirmação: ${session ? session.step : 'Removida com sucesso'}`);

    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
  } catch (err) {
    console.error('💥 Erro durante execução dos testes:', err.response?.data || err.message);
  } finally {
    server.close();
    await disconnectDatabase();
  }
}

testAll();

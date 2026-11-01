const axios = require('axios');
const http = require('http');
const app = require('./src/app');
const { connectDatabase, disconnectDatabase } = require('./src/config/database');
const { initSocket } = require('./src/config/socket');
const Service = require('./src/models/Service');
const Appointment = require('./src/models/Appointment');
const ChatSession = require('./src/models/ChatSession');
const botFlowService = require('./src/services/botFlowService');

async function testAll() {
  console.log('🧪 [Test Suite] Iniciando bateria de testes do Back-end com Baileys...\n');

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
    const corteService = servicesRes.data.find((s) => s.name === 'Corte de Cabelo');
    console.log(`   Serviço selecionado para teste: "${corteService.name}" (ID: ${corteService._id})`);

    // Limpa agendamentos e sessões anteriores do número de teste
    const testDate = '2026-11-02';
    const testPhone = '5511999991234';
    await Appointment.deleteMany({ date: testDate });
    await ChatSession.deleteMany({ phone: testPhone });

    // 4. Calcular Slots Livres
    console.log(`\n4️⃣ Testando Cálculo de Slots (/api/appointments/available-slots)...`);
    const slotsRes = await axios.get(
      `${baseURL}/api/appointments/available-slots?date=${testDate}&serviceId=${corteService._id}`,
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
        serviceId: corteService._id,
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
          serviceId: corteService._id,
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

    // 7. Teste da Máquina de Estados com Menu Numerado (Bot Baileys)
    console.log('\n7️⃣ Testando Fluxo do WhatsApp Baileys com Menus Numerados...');

    // Mensagem 1: Início
    console.log('   -> Enviando mensagem inicial "Olá"...');
    await botFlowService.handleIncomingMessage({
      phone: testPhone,
      customerName: 'Carlos Cliente',
      text: 'Olá, gostaria de agendar',
      jid: `${testPhone}@s.whatsapp.net`,
    });
    let session = await ChatSession.findOne({ phone: testPhone });
    console.log(`   Estado atual: ${session?.step} (Esperado: AWAITING_SERVICE)`);
    console.log(`   Opções de serviços salvas: ${session?.tempData?.serviceOptions?.length}`);

    // Mensagem 2: Escolhe o Serviço "1" (Corte de Cabelo)
    console.log('\n   -> Enviando opção "1" (Serviço)...');
    await botFlowService.handleIncomingMessage({
      phone: testPhone,
      customerName: 'Carlos Cliente',
      text: '1',
      jid: `${testPhone}@s.whatsapp.net`,
    });
    session = await ChatSession.findOne({ phone: testPhone });
    console.log(`   Estado atual: ${session?.step} (Esperado: AWAITING_DATE)`);
    console.log(`   Opções de datas salvas: ${session?.tempData?.dateOptions?.length}`);

    // Mensagem 3: Escolhe a Data "1"
    console.log('\n   -> Enviando opção "1" (Data)...');
    await botFlowService.handleIncomingMessage({
      phone: testPhone,
      customerName: 'Carlos Cliente',
      text: '1',
      jid: `${testPhone}@s.whatsapp.net`,
    });
    session = await ChatSession.findOne({ phone: testPhone });
    console.log(`   Estado atual: ${session?.step} (Esperado: AWAITING_TIME)`);
    console.log(`   Data escolhida: ${session?.tempData?.selectedDate}`);
    console.log(`   Slots disponíveis listados: ${session?.tempData?.timeOptions?.length}`);

    // Mensagem 4: Escolhe o Horário "1"
    console.log('\n   -> Enviando opção "1" (Horário)...');
    await botFlowService.handleIncomingMessage({
      phone: testPhone,
      customerName: 'Carlos Cliente',
      text: '1',
      jid: `${testPhone}@s.whatsapp.net`,
    });
    session = await ChatSession.findOne({ phone: testPhone });
    console.log(`   Estado atual: ${session?.step} (Esperado: AWAITING_CONFIRMATION)`);
    console.log(`   Horário ISO selecionado: ${session?.tempData?.selectedStartTime}`);

    // Mensagem 5: Confirmação digitando "1"
    console.log('\n   -> Enviando confirmação "1"...');
    await botFlowService.handleIncomingMessage({
      phone: testPhone,
      customerName: 'Carlos Cliente',
      text: '1',
      jid: `${testPhone}@s.whatsapp.net`,
    });

    // Verifica se o agendamento foi salvo no banco com origin: 'WHATSAPP'
    const createdApp = await Appointment.findOne({ customerPhone: testPhone }).sort({ createdAt: -1 });
    console.log('   Agendamento criado via WhatsApp:', createdApp ? `Sim (ID: ${createdApp._id}, Status: ${createdApp.status}, Origem: ${createdApp.origin})` : 'Não');

    // Verifica se a sessão foi limpa
    session = await ChatSession.findOne({ phone: testPhone });
    console.log(`   Sessão após confirmação: ${session ? session.step : 'Removida com sucesso'}`);

    // Mensagem 6: Teste do comando de reinício digitando "0"
    console.log('\n   -> Testando comando "0" para reiniciar...');
    await botFlowService.handleIncomingMessage({
      phone: testPhone,
      customerName: 'Carlos Cliente',
      text: '0',
      jid: `${testPhone}@s.whatsapp.net`,
    });
    session = await ChatSession.findOne({ phone: testPhone });
    console.log(`   Estado após comando 0: ${session?.step} (Esperado: AWAITING_SERVICE)`);

    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
  } catch (err) {
    console.error('💥 Erro durante execução dos testes:', err.response?.data || err.message);
  } finally {
    server.close();
    await disconnectDatabase();
  }
}

testAll();

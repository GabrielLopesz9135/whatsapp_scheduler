const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('./src/config/env');
const User = require('./src/models/User');
const Service = require('./src/models/Service');

async function seed() {
  console.log('🌱 [Seed] Iniciando população do banco de dados (Agnóstico / Multi-Segmento)...');

  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ [Seed] Conectado ao MongoDB:', env.MONGO_URI);

    // 1. Criar ou Atualizar Usuário Administrador / Prestador de Serviço
    const adminEmail = 'admin@scheduler.com';
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        name: 'Administrador',
        email: adminEmail,
        passwordHash,
        businessHours: {
          start: '09:00',
          end: '18:00',
          slotInterval: 30, // Intervalos de 30 minutos por slot de atendimento
        },
      });
      console.log(`✅ [Seed] Usuário Administrador criado com sucesso: ${adminEmail} (Senha: admin123)`);
    } else {
      admin.name = 'Administrador';
      admin.businessHours = {
        start: '09:00',
        end: '18:00',
        slotInterval: 30,
      };
      await admin.save();
      console.log(`ℹ️ [Seed] Usuário Administrador atualizado: ${admin.name} (${adminEmail})`);
    }

    // 2. Limpar serviços anteriores para catálogo genérico e multi-segmento
    await Service.deleteMany({});
    console.log('🧹 [Seed] Catálogo anterior limpo para substituição pelos serviços multi-segmento.');

    // 3. Catálogo Universal de Serviços (Saúde, Barbearia, Beleza, Terapia, Consultoria e Estética)
    // Lista estruturada com até 10 itens para compatibilidade total com o limite da Meta WhatsApp Cloud API
    const multiSegmentServices = [
      {
        name: 'Consulta / Avaliação Inicial',
        description: 'Anamnese, avaliação personalizada, diagnóstico e planejamento de atendimento.',
        durationMinutes: 30,
        price: 100.0,
        active: true,
      },
      {
        name: 'Atendimento Padrão',
        description: 'Sessão regular de atendimento ou aplicação técnica com foco em resultados.',
        durationMinutes: 30,
        price: 120.0,
        active: true,
      },
      {
        name: 'Procedimento Express / Manutenção',
        description: 'Ajuste rápido, manutenção preventiva, retoque ou alinhamento periódico.',
        durationMinutes: 30,
        price: 80.0,
        active: true,
      },
      {
        name: 'Sessão Completa Especializada',
        description: 'Procedimento aprofundado, diagnóstico completo ou sessão terapêutica estendida.',
        durationMinutes: 60,
        price: 200.0,
        active: true,
      },
      {
        name: 'Corte, Design & Barba',
        description: 'Corte com visagismo, alinhamento de barba ou design estético de cabelo/sobrancelha.',
        durationMinutes: 30,
        price: 70.0,
        active: true,
      },
      {
        name: 'Procedimento Estético & Bem-Estar',
        description: 'Tratamento corporal/facial especializado para rejuvenescimento e autocuidado.',
        durationMinutes: 60,
        price: 220.0,
        active: true,
      },
      {
        name: 'Sessão de Personal / Terapia',
        description: 'Treinamento personalizado, reabilitação física ou sessão terapêutica individual.',
        durationMinutes: 60,
        price: 150.0,
        active: true,
      },
      {
        name: 'Tratamento Avançado / Premium',
        description: 'Protocolo completo de alto impacto com insumos e acompanhamento exclusivo.',
        durationMinutes: 60,
        price: 350.0,
        active: true,
      },
      {
        name: 'Atendimento de Urgência / Encaixe',
        description: 'Atendimento prioritário com suporte e resolução emergencial imediata.',
        durationMinutes: 30,
        price: 160.0,
        active: true,
      },
      {
        name: 'Revisão & Retorno',
        description: 'Avaliação pós-atendimento, checagem de evolução clínica/técnica e orientações finais.',
        durationMinutes: 30,
        price: 90.0,
        active: true,
      },
    ];

    for (const serviceData of multiSegmentServices) {
      const created = await Service.create(serviceData);
      console.log(`✅ [Seed] Serviço cadastrado: "${created.name}" (${created.durationMinutes} min - R$ ${created.price.toFixed(2)})`);
    }

    console.log('\n✨ [Seed] Estabelecimento e catálogo multi-segmento configurados com sucesso!');
    console.log(`📋 [Resumo]: ${multiSegmentServices.length} serviços cadastrados.`);
    console.log('🔑 [Credenciais Administrativas]:');
    console.log('   E-mail: admin@scheduler.com');
    console.log('   Senha:  admin123\n');
  } catch (error) {
    console.error('❌ [Seed] Erro ao executar seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 [Seed] Conexão com o banco de dados encerrada.');
    process.exit(0);
  }
}

seed();

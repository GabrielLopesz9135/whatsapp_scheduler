const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('./src/config/env');
const User = require('./src/models/User');
const Service = require('./src/models/Service');

async function seed() {
  console.log('🌱 [Seed] Iniciando população do banco de dados (Odontologia / Cirurgião-Dentista)...');

  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ [Seed] Conectado ao MongoDB:', env.MONGO_URI);

    // 1. Criar ou Atualizar Usuário Administrador (Dentista)
    const adminEmail = 'admin@scheduler.com';
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        name: 'Dra. Meyriellem Damasceno',
        email: adminEmail,
        passwordHash,
        businessHours: {
          start: '09:00',
          end: '18:00',
          slotInterval: 30, // Intervalos de 30 minutos para consultas odontológicas
        },
      });
      console.log(`✅ [Seed] Dentista Admin criada com sucesso: ${adminEmail} (Senha: admin123)`);
    } else {
      admin.name = 'Dra. Meyriellem Damasceno';
      admin.businessHours = {
        start: '09:00',
        end: '18:00',
        slotInterval: 30,
      };
      await admin.save();
      console.log(`ℹ️ [Seed] Dentista Admin atualizada: ${admin.name} (${adminEmail})`);
    }

    // 2. Limpar serviços anteriores para catálogo exclusivamente odontológico
    await Service.deleteMany({});
    console.log('🧹 [Seed] Catálogo anterior limpo para substituição pelos procedimentos odontológicos.');

    // 3. Procedimentos Típicos de Cirurgião-Dentista Recém-Formado (30min ou 60min)
    // Lista estruturada com até 10 itens para compatibilidade total com o limite da Meta WhatsApp Cloud API
    const dentalServices = [
      {
        name: 'Consulta e Avaliação',
        description: 'Exame clínico minucioso, anamnese, diagnóstico e elaboração do plano de tratamento.',
        durationMinutes: 30,
        price: 100.0,
        active: true,
      },
      {
        name: 'Profilaxia e Limpeza',
        description: 'Remoção de biofilme dental, raspagem simples de tártaro e polimento coronário.',
        durationMinutes: 30,
        price: 150.0,
        active: true,
      },
      {
        name: 'Restauração (1 Face)',
        description: 'Remoção de cárie inicial e restauração estética funcional em resina fotopolimerizável.',
        durationMinutes: 30,
        price: 140.0,
        active: true,
      },
      {
        name: 'Restauração (2+ Faces)',
        description: 'Reconstrução anatômica dental em cavidades médias a profundas com resina composta.',
        durationMinutes: 60,
        price: 220.0,
        active: true,
      },
      {
        name: 'Raspagem Periodontal',
        description: 'Raspagem e alisamento radicular para controle de gengivite e periodontite inicial.',
        durationMinutes: 60,
        price: 180.0,
        active: true,
      },
      {
        name: 'Exodontia Simples',
        description: 'Extração cirúrgica de dente erupcionado ou raiz residual sem osteotomia complexa.',
        durationMinutes: 60,
        price: 200.0,
        active: true,
      },
      {
        name: 'Clareamento Consultório',
        description: 'Sessão clínica de clareamento dental profissional em consultório com barreira fotopolimerizável.',
        durationMinutes: 60,
        price: 380.0,
        active: true,
      },
      {
        name: 'Selante e Flúor',
        description: 'Selamento de fóssulas e fissuras preventivo e aplicação tópica de flúor gel de alta potência.',
        durationMinutes: 30,
        price: 120.0,
        active: true,
      },
      {
        name: 'Urgência Odontológica',
        description: 'Diagnóstico de urgência, capeamento ou abertura coronária para alívio imediato da dor.',
        durationMinutes: 30,
        price: 160.0,
        active: true,
      },
      {
        name: 'Ajuste e Repolimento',
        description: 'Ajuste de oclusão e mordida alta com repolimento de restaurações antigas.',
        durationMinutes: 30,
        price: 90.0,
        active: true,
      },
    ];

    for (const serviceData of dentalServices) {
      const created = await Service.create(serviceData);
      console.log(`✅ [Seed] Procedimento cadastrado: "${created.name}" (${created.durationMinutes} min - R$ ${created.price.toFixed(2)})`);
    }

    console.log('\n✨ [Seed] Consultório odontológico configurado com sucesso!');
    console.log(`📋 [Resumo]: ${dentalServices.length} procedimentos odontológicos criados.`);
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

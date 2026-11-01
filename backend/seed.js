const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('./src/config/env');
const User = require('./src/models/User');
const Service = require('./src/models/Service');

async function seed() {
  console.log('🌱 [Seed] Iniciando população do banco de dados...');

  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ [Seed] Conectado ao MongoDB:', env.MONGO_URI);

    // 1. Criar Usuário Administrador Padrão
    const adminEmail = 'admin@scheduler.com';
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        name: 'Administrador Geral',
        email: adminEmail,
        passwordHash,
        businessHours: {
          start: '09:00',
          end: '18:00',
          slotInterval: 15,
        },
      });
      console.log(`✅ [Seed] Usuário Admin criado com sucesso: ${adminEmail} (Senha: admin123)`);
    } else {
      console.log(`ℹ️ [Seed] Usuário Admin já existente: ${adminEmail}`);
    }

    // 2. Criar Serviços de Exemplo
    const defaultServices = [
      {
        name: 'Corte de Cabelo',
        description: 'Corte moderno ou clássico com tesoura e máquina, finalizado com lavagem.',
        durationMinutes: 30,
        price: 45.0,
        active: true,
      },
      {
        name: 'Barba Terapia',
        description: 'Alinhamento e desenho de barba com toalha quente, navalha e hidratação.',
        durationMinutes: 20,
        price: 35.0,
        active: true,
      },
      {
        name: 'Corte + Barba Completo',
        description: 'Combo completo de cabelo e barba com atendimento premium e relaxamento.',
        durationMinutes: 50,
        price: 75.0,
        active: true,
      },
    ];

    for (const serviceData of defaultServices) {
      const existing = await Service.findOne({ name: serviceData.name });
      if (!existing) {
        const created = await Service.create(serviceData);
        console.log(`✅ [Seed] Serviço criado: "${created.name}" (${created.durationMinutes} min - R$ ${created.price.toFixed(2)})`);
      } else {
        console.log(`ℹ️ [Seed] Serviço já cadastrado: "${existing.name}"`);
      }
    }

    console.log('\n✨ [Seed] Banco de dados populado com sucesso!');
    console.log('📋 [Credenciais para Login]:');
    console.log('   E-mail: admin@scheduler.com');
    console.log('   Senha:  admin123\n');
  } catch (error) {
    console.error('❌ [Seed] Erro ao executar seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 [Seed] Conexão encerrada.');
    process.exit(0);
  }
}

seed();


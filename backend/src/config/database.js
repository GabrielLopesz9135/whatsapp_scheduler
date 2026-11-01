const mongoose = require('mongoose');
const env = require('./env');

/**
 * Estabelece a conexão com o MongoDB utilizando o Mongoose
 * e garante a inicialização de todos os índices necessários.
 */
async function connectDatabase() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ [Database] Conexão com MongoDB estabelecida com sucesso.');

    // Configuração e garantia da criação de índices para evitar conflitos de locks em transações
    const User = require('../models/User');
    const Service = require('../models/Service');
    const Appointment = require('../models/Appointment');
    const ChatSession = require('../models/ChatSession');

    await Promise.all([
      User.init(),
      Service.init(),
      Appointment.init(),
      ChatSession.init(),
    ]);
    console.log('📑 [Database] Índices das coleções sincronizados com sucesso.');
  } catch (error) {
    console.error('❌ [Database] Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  }
}

/**
 * Fecha a conexão de forma graciosa (útil para testes e encerramento).
 */
async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    console.log('ℹ️ [Database] Conexão com MongoDB encerrada.');
  } catch (error) {
    console.error('❌ [Database] Erro ao desconectar do MongoDB:', error.message);
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
};

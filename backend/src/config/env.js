const path = require('path');
const dotenv = require('dotenv');

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3333,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/whatsapp-scheduler',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_key_change_in_prod_998877',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};

// Validação em produção para variáveis críticas
if (env.NODE_ENV === 'production') {
  const requiredVars = ['MONGO_URI', 'JWT_SECRET'];
  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`[Config/Env] Variáveis de ambiente obrigatórias não definidas: ${missing.join(', ')}`);
  }
}

module.exports = env;

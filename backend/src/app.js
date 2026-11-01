require('express-async-errors');
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Configuração de CORS permissivo para Dashboard (suporta localhost, 127.0.0.1 e qualquer porta)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Parser de corpo JSON
app.use(express.json());

// Rota de Healthcheck simples
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralização de rotas sob o prefixo /api
app.use('/api', routes);

// Middleware para tratamento de rotas não encontradas (404)
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// Middleware global de tratamento de erros
app.use(errorHandler);

module.exports = app;


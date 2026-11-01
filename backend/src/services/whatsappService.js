const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

let sock = null;

const AUTH_FOLDER = path.resolve(__dirname, '../../auth_info_baileys');

/**
 * Dispara uma mensagem de texto simples para um contato do WhatsApp.
 * @param {string} jidOrPhone - Número de telefone (ex: "5511999998888") ou JID completo
 * @param {string} text - Conteúdo da mensagem
 */
async function sendText(jidOrPhone, text) {
  if (!sock) {
    console.warn('⚠️ [WhatsApp] Não foi possível enviar mensagem: cliente Baileys não conectado.');
    return;
  }

  // Garante o formato do JID
  const jid = jidOrPhone.includes('@') ? jidOrPhone : `${jidOrPhone}@s.whatsapp.net`;

  try {
    await sock.sendMessage(jid, { text });
  } catch (error) {
    console.error(`❌ [WhatsApp] Erro ao enviar mensagem para ${jid}:`, error.message);
  }
}

/**
 * Inicializa a conexão com o WhatsApp utilizando a biblioteca @whiskeysockets/baileys.
 * Gerencia autenticação multi-arquivo, QR Code no terminal e reconexão automática.
 */
async function initWhatsApp() {
  try {
    console.log('🤖 [WhatsApp/Baileys] Inicializando cliente Baileys...');

    // Carrega o estado de autenticação em arquivos locais
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1015901307],
      isLatest: true,
    }));

    console.log(`📱 [WhatsApp/Baileys] Versão do WhatsApp Web: ${version.join('.')} (Última: ${isLatest})`);

    // Cria o socket do Baileys com logger silencioso para manter o terminal limpo
    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false, // Gerenciamos manualmente com qrcode-terminal
      auth: state,
      browser: ['AutoScheduler', 'Chrome', '1.0.0'],
      syncFullHistory: false,
    });

    // Salva credenciais atualizadas
    sock.ev.on('creds.update', saveCreds);

    // Gerencia eventos de conexão (QR code e status)
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n📲 [WhatsApp] Escaneie o QR Code abaixo com seu WhatsApp para autenticar:\n');
        qrcode.generate(qr, { small: true });
        console.log('💡 Aguardando leitura do QR Code pelo celular...\n');
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(
          `🔌 [WhatsApp] Conexão fechada. Código: ${statusCode || 'N/A'}. Motivo: ${
            lastDisconnect?.error?.message || lastDisconnect?.error || 'Desconhecido'
          }. Tentando reconectar: ${shouldReconnect}`
        );

        if (shouldReconnect) {
          console.log('🔄 [WhatsApp] Reconectando em 5 segundos...');
          setTimeout(() => initWhatsApp(), 5000);
        } else {
          console.log('🔒 [WhatsApp] Dispositivo deslogado. Apague a pasta auth_info_baileys para ler novo QR Code.');
        }
      } else if (connection === 'open') {
        console.log('✅ [WhatsApp] Conectado com sucesso via Baileys! Bot pronto para responder.');
      }
    });

    // Escuta novas mensagens recebidas
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      // Processa apenas notificações de novas mensagens
      if (type !== 'notify') return;

      for (const msg of messages) {
        // Ignora mensagens enviadas pelo próprio bot
        if (msg.key.fromMe) continue;

        // Trata remoteJid e remoteJidAlt
        const rawJid = msg.key.remoteJidAlt || msg.key.remoteJid || '';

        // Ignora mensagens de grupos (@g.us) e atualizações de status
        if (!rawJid || rawJid.endsWith('@g.us') || rawJid === 'status@broadcast') {
          continue;
        }

        // Extrai o telefone limpo sem o sufixo @s.whatsapp.net
        const phone = rawJid.replace('@s.whatsapp.net', '');
        const customerName = msg.pushName || 'Cliente';

        // Extrai o texto da mensagem (conversa direta ou mensagem estendida)
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          '';

        if (!text.trim()) continue;

        console.log(`📩 [WhatsApp Baileys] Mensagem de ${phone} (${customerName}): "${text.trim()}"`);

        // Encaminha para o motor da máquina de estados (carregado sob demanda para evitar dependência circular)
        try {
          const botFlowService = require('./botFlowService');
          await botFlowService.handleIncomingMessage({
            phone,
            customerName,
            text: text.trim(),
            jid: rawJid,
          });
        } catch (botErr) {
          console.error('💥 [WhatsApp] Erro no botFlowService ao processar mensagem:', botErr);
        }
      }
    });
  } catch (err) {
    console.error('❌ [WhatsApp] Falha ao inicializar Baileys:', err);
    setTimeout(() => initWhatsApp(), 5000);
  }
}

module.exports = {
  initWhatsApp,
  sendText,
};

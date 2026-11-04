const axios = require('axios');
const env = require('../config/env');

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * Normaliza o número de telefone do destinatário para o formato aceito pela Meta (apenas dígitos com DDI 55).
 * @param {string} phone
 * @returns {string}
 */
function formatBrPhone(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');

  // Se não possuir o DDI 55 e tiver 10 ou 11 dígitos (DDD + número), adiciona o DDI do Brasil
  if (!clean.startsWith('55') && (clean.length === 10 || clean.length === 11)) {
    clean = `55${clean}`;
  }

  return clean;
}

/**
 * Envia uma requisição genérica para a Meta WhatsApp Cloud API.
 * @param {Object} payload
 */
async function sendToMeta(payload) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_API_TOKEN || env.WHATSAPP_API_TOKEN;

  if (!phoneId || !token) {
    console.warn('⚠️ [WhatsApp Service] WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_API_TOKEN não definidos.');
    return { data: { success: false, error: 'Credenciais ausentes' } };
  }

  const url = `${META_GRAPH_URL}/${phoneId}/messages`;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error('❌ [WhatsApp Service] Erro ao enviar mensagem via Meta API:', JSON.stringify(errorDetails, null, 2));
    return { error: errorDetails };
  }
}

/**
 * Dispara uma mensagem simples de texto.
 * @param {string} to - Número de telefone do destinatário
 * @param {string} bodyText - Conteúdo da mensagem
 */
async function sendText(to, bodyText) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatBrPhone(to),
    type: 'text',
    text: {
      preview_url: false,
      body: bodyText,
    },
  };

  return sendToMeta(payload);
}

/**
 * Dispara uma mensagem interativa com lista de opções (Interactive List Message).
 * @param {string} to - Número do destinatário
 * @param {string} bodyText - Texto explicativo no corpo
 * @param {string} buttonText - Rótulo do botão que abre a lista (máx 20 caracteres)
 * @param {Array<Object>} sectionsOrItems - Array de seções { title, rows } ou array direto de rows [{ id, title, description }]
 */
async function sendInteractiveList(to, bodyText, buttonText, sectionsOrItems = []) {
  // Se receber um array direto de itens, formata em uma seção padrão
  let sections = [];
  if (sectionsOrItems.length > 0 && sectionsOrItems[0].rows) {
    sections = sectionsOrItems;
  } else {
    const rows = sectionsOrItems.slice(0, 10).map((item) => ({
      id: String(item.id),
      title: String(item.title).substring(0, 24), // Limite de 24 caracteres por título na Meta
      description: item.description ? String(item.description).substring(0, 72) : undefined,
    }));

    sections = [
      {
        title: 'Selecione uma opção',
        rows,
      },
    ];
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatBrPhone(to),
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: String(buttonText || 'Ver Opções').substring(0, 20),
        sections,
      },
    },
  };

  return sendToMeta(payload);
}

/**
 * Dispara uma mensagem interativa com botões de resposta rápida (Reply Buttons).
 * Limite da Meta: até 3 botões por mensagem.
 * @param {string} to - Número do destinatário
 * @param {string} bodyText - Texto explicativo no corpo
 * @param {Array<{ id: string, title: string }>} buttons - Lista de até 3 botões
 */
async function sendInteractiveButtons(to, bodyText, buttons = []) {
  const metaButtons = buttons.slice(0, 3).map((btn) => ({
    type: 'reply',
    reply: {
      id: String(btn.id),
      title: String(btn.title).substring(0, 20),
    },
  }));

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatBrPhone(to),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: metaButtons,
      },
    },
  };

  return sendToMeta(payload);
}

module.exports = {
  formatBrPhone,
  sendText,
  sendInteractiveList,
  sendInteractiveButtons,
};

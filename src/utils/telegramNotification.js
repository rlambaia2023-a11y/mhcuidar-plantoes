/**
 * Módulo de Notificações via Telegram
 * Envia avisos com antecedência (24h, 2h) e confirmações de plantão
 * diretamente para o Telegram da Dra. na clínica mhcuidar.
 */

import { generateGoogleCalendarUrl } from './calendarIntegration';

/**
 * Cria a mensagem formatada para o Telegram em Markdown
 */
export function buildTelegramMessage(shift, reminderType = 'manual') {
  const startDate = new Date(shift.start);
  const endDate = new Date(shift.end);

  const formatOptions = {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };

  const dataInicioStr = startDate.toLocaleDateString('pt-BR', formatOptions);
  const horaInicioStr = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dataFimStr = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const horaFimStr = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let headerEmoji = '🩺';
  let alertaTitulo = 'Plantão Confirmado';

  if (reminderType === '24h') {
    headerEmoji = '⏰';
    alertaTitulo = 'Alerta de Plantão (Amanhã!)';
  } else if (reminderType === '2h') {
    headerEmoji = '🚨';
    alertaTitulo = 'Aviso Imediato (Em 2 Horas!)';
  } else if (reminderType === 'manual') {
    headerEmoji = '📋';
    alertaTitulo = 'Novo Plantão Agendado';
  }

  const lines = [
    `${headerEmoji} *mhcuidar | ${alertaTitulo}*`,
    `Olá, Dra.! Seguem os detalhes do seu plantão:`,
    ``,
    `🏥 *Local:* ${shift.location}`,
    `⏱️ *Modalidade:* Plantão de ${shift.shiftType} (${shift.durationHours} horas)`,
    shift.isSN ? `🟡 *Regime:* Sobreaviso / Se Necessário (SN)` : null,
    `🗓️ *Início:* ${dataInicioStr} às ${horaInicioStr}`,
    `🏁 *Término Previsto:* ${dataFimStr} às ${horaFimStr}`,
    ``,
    shift.fatigueAlert ? `${shift.fatigueAlert}\n` : null,
    `✅ *Google Agenda:* Sincronizado com mh.cuidarsaude@gmail.com`,
    `💙 *mhcuidar* — Gestão Médica Inteligente`
  ].filter(line => line !== null);

  return lines.join('\n');
}

/**
 * Envia notificação diretamente para o Telegram usando a API oficial de Bot
 */
export async function sendTelegramNotification(shift, settings, reminderType = 'manual') {
  const botToken = settings.telegramBotToken;
  const chatId = settings.telegramChatId;

  if (!botToken || !chatId) {
    return {
      success: false,
      error: 'Token do Bot ou Chat ID do Telegram não configurados nas configurações.'
    };
  }

  const text = buildTelegramMessage(shift, reminderType);
  const calendarUrl = generateGoogleCalendarUrl(shift);

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📅 Adicionar ao Google Calendar', url: calendarUrl }
        ]
      ]
    }
  };

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!data.ok) {
      return { success: false, error: data.description || 'Erro ao enviar mensagem no Telegram' };
    }

    return { success: true, messageId: data.result.message_id };
  } catch (err) {
    return { success: false, error: err.message || 'Falha de rede ao conectar à API do Telegram' };
  }
}

/**
 * Testa a conexão com o Telegram da Dra.
 */
export async function testTelegramConnection(botToken, chatId) {
  if (!botToken || !chatId) {
    return { success: false, error: 'Preencha o Token do Bot e o Chat ID.' };
  }

  const text = [
    `🩺 *mhcuidar | Teste de Conexão com Telegram*`,
    `Olá, Dra.! O bot de agendamento de plantões da *mhcuidar* está conectado com sucesso!`,
    ``,
    `🔔 Você receberá avisos automatizados com 24h e 2h de antecedência para cada plantão (SN, 12h, 24h, 48h e 72h).`,
    `📧 E-mail vinculado: mh.cuidarsaude@gmail.com`
  ].join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();
    if (!data.ok) {
      return { success: false, error: data.description || 'Erro ao validar credenciais do Telegram' };
    }

    return { success: true, message: 'Mensagem de teste enviada com sucesso no seu Telegram!' };
  } catch (err) {
    return { success: false, error: err.message || 'Falha ao contatar a API do Telegram' };
  }
}

/**
 * Gera link de compartilhamento via Telegram Web/App caso a Dra. não queira configurar Bot Token
 */
export function generateTelegramShareUrl(shift) {
  const text = buildTelegramMessage(shift, 'manual');
  return `https://t.me/share/url?url=${encodeURIComponent('https://calendar.google.com')}&text=${encodeURIComponent(text)}`;
}

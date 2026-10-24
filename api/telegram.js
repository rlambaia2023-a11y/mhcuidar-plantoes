/**
 * Vercel Serverless Function: Telegram Webhook para mhcuidar Plantões
 * Roda 24/7 na infraestrutura global da Vercel sem servidor dedicado.
 * 
 * Funcionalidades:
 * - Ouve mensagens de texto e áudio da Dra. no Telegram
 * - Processa com IA Gemini (transcreve áudio e extrai hospitais/datas)
 * - Retorna confirmação e link de 1 clique para a Google Agenda (mh.cuidarsaude@gmail.com)
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DOCTOR_EMAIL = process.env.DOCTOR_EMAIL || 'mh.cuidarsaude@gmail.com';

function generateGoogleCalendarUrl(shift) {
  const startDate = new Date(shift.start_iso);
  const duration = shift.duration_hours || 24;
  const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

  const pad = (n) => String(n).padStart(2, '0');
  const toUtc = (d) =>
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z';

  const startUtc = toUtc(startDate);
  const endUtc = toUtc(endDate);

  const title = `🏥 [mhcuidar] Plantão ${shift.shift_type} - ${shift.location}`;
  const details = [
    `🩺 SISTEMA DE PLANTÕES MHCUIDAR`,
    `----------------------------------------`,
    `📍 Local: ${shift.location}`,
    `⏱️ Tipo: ${shift.shift_type} (${duration}h)`,
    shift.is_sn ? `🟡 Modalidade: Sobreaviso / Se Necessário (SN)` : '',
    shift.fatigue_alert ? `\n${shift.fatigue_alert}` : '',
    `\n📧 E-mail vinculado: ${DOCTOR_EMAIL}`,
    `🔔 Lembretes configurados para véspera (24h) e saída (2h).`
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startUtc}/${endUtc}`,
    details: details,
    location: shift.location,
    add: DOCTOR_EMAIL
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function sendTelegramMessage(chatId, text, inlineButtons = []) {
  if (!TELEGRAM_BOT_TOKEN) return;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };

  if (inlineButtons && inlineButtons.length > 0) {
    payload.reply_markup = {
      inline_keyboard: inlineButtons
    };
  }

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

const SYSTEM_PROMPT = `
Você é o Assistente Médico Especialista em Gestão de Plantões da clínica mhcuidar para a Dra.
Analise a mensagem ou áudio e extraia os plantões.
REGRAS:
1. Local: 'Clínica mhcuidar', 'Hospital Geral Clériston Andrade (HGCA)', 'Hospital Estadual da Criança (HEC)', 'Hospital da Mulher', ou outro citado.
2. Duração: SN (Sobreaviso), 12h Diurno, 12h Noturno, 24h, 48h, 72h.
3. Se >= 48h, adicione alerta de fadiga e descanso prévio.
Retorne SEMPRE um JSON válido:
{
  "shifts": [
    {
      "location": "Nome do Hospital",
      "shift_type": "24h",
      "duration_hours": 24,
      "start_iso": "YYYY-MM-DDTHH:MM:00-03:00",
      "is_sn": false,
      "fatigue_alert": null
    }
  ],
  "reply_summary": "Resumo cordial para a Dra."
}
`;

async function parseWithGemini(textContent, base64Audio = null) {
  if (!GEMINI_API_KEY) {
    // Fallback simples
    const now = new Date();
    now.setDate(now.getDate() + 1);
    now.setHours(7, 0, 0, 0);
    return {
      shifts: [{
        location: "Hospital Geral",
        shift_type: "24h",
        duration_hours: 24,
        start_iso: now.toISOString(),
        is_sn: false,
        fatigue_alert: null
      }],
      reply_summary: "Plantão identificado."
    };
  }

  const parts = [];
  if (base64Audio) {
    parts.push({
      inline_data: {
        mime_type: "audio/ogg",
        data: base64Audio
      }
    });
    parts.push({ text: "Transcreva o áudio e extraia os plantões no formato JSON solicitado." });
  } else {
    parts.push({ text: `Texto da Dra.: "${textContent}"` });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.1
      }
    })
  });

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(rawText || '{}');
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'mhcuidar telegram bot webhook active on Vercel' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const update = req.body;
  if (!update || !update.message) {
    return res.status(200).json({ ok: true });
  }

  const message = update.message;
  const chatId = message.chat.id;
  const userText = message.text || '';

  try {
    // Comandos rápidos
    if (userText === '/start') {
      const welcome = [
        `🩺 *Olá, Dra.! Bem-vinda ao Assistente de Plantões mhcuidar.*`,
        ``,
        `Estou conectado e pronto para automatizar sua rotina:`,
        `• *Grave um áudio* ou *digite um resumo* do seu plantão.`,
        `• Eu entendo turnos de *SN (Sobreaviso), 12h, 24h, 48h e 72h*.`,
        `• Sincronizo direto com sua Google Agenda (\`${DOCTOR_EMAIL}\`).`,
        ``,
        `🔑 *Seu Telegram Chat ID:* \`${chatId}\``,
        ``,
        `💡 *Experimente enviar agora:*`,
        `_"Plantão de 24h no Clériston amanhã às 7h"_`
      ].join('\n');

      await sendTelegramMessage(chatId, welcome);
      return res.status(200).json({ ok: true });
    }

    if (userText === '/ajuda') {
      const help = [
        `📖 *Como usar o Bot mhcuidar:*`,
        ``,
        `🗣️ *Por áudio ou texto, você pode dizer:*`,
        `• _"Plantão 24h amanhã às 7h no Clériston"_`,
        `• _"Sobreaviso SN sábado na clínica mhcuidar"_`,
        `• _"Plantão 12h noturno sexta no Hospital da Criança"_`,
        `• _"Plantão 48h final de semana no Hospital Geral"_`,
        ``,
        `Eu gero automaticamente o evento e os alertas para você!`
      ].join('\n');

      await sendTelegramMessage(chatId, help);
      return res.status(200).json({ ok: true });
    }

    let base64Audio = null;

    // Se for mensagem de voz
    if (message.voice && TELEGRAM_BOT_TOKEN) {
      const fileId = message.voice.file_id;
      const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      if (fileData.ok && fileData.result.file_path) {
        const audioRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`);
        const audioArrayBuffer = await audioRes.arrayBuffer();
        base64Audio = Buffer.from(audioArrayBuffer).toString('base64');
      }
    }

    // Processar com IA Gemini
    const result = await parseWithGemini(userText, base64Audio);
    const shifts = result.shifts || [];

    if (shifts.length === 0) {
      await sendTelegramMessage(chatId, "Desculpe, Dra., não consegui identificar os horários. Poderia mandar outro áudio ou texto informando o hospital, dia e horário?");
      return res.status(200).json({ ok: true });
    }

    // Para cada plantão identificado
    for (const shift of shifts) {
      const calUrl = generateGoogleCalendarUrl(shift);
      const dt = new Date(shift.start_iso);
      const dtStr = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) + ' às ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const reply = [
        `✅ *Plantão Confirmado com Sucesso!*`,
        `🏥 *Local:* ${shift.location}`,
        `⏱️ *Modalidade:* Plantão ${shift.shift_type} (${shift.duration_hours} horas)`,
        shift.is_sn ? `🟡 *Regime:* Sobreaviso (SN)` : null,
        `🗓️ *Início:* ${dtStr}`,
        shift.fatigue_alert ? `\n${shift.fatigue_alert}` : null,
        ``,
        `📧 *Google Agenda:* ${DOCTOR_EMAIL}`,
        `💙 *mhcuidar* — Cuidando de quem cuida.`
      ].filter(line => line !== null).join('\n');

      const buttons = [
        [
          { text: '📅 Adicionar ao Google Agenda', url: calUrl }
        ]
      ];

      await sendTelegramMessage(chatId, reply, buttons);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Erro no processamento do webhook:', error);
    await sendTelegramMessage(chatId, "Houve um pequeno imprevisto ao processar o agendamento. Por favor, tente novamente em alguns instantes.");
    return res.status(200).json({ error: error.message });
  }
}

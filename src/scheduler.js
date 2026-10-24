// Lembretes automáticos: verifica a cada 5 min e envia WhatsApp nas janelas
// configuradas (ex.: 24h e 2h antes). Também envia resumo diário opcional.
const cron = require('node-cron');
const config = require('./config');
const { Shift } = require('./db');
const { sendWhatsApp, montarLembrete, montarResumoDia } = require('./whatsapp');

function janelas() {
  return (config.get('REMINDER_WINDOWS_MIN', '1440,120') || '')
    .split(',')
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => b - a);
}

async function verificarLembretes() {
  const agora = Date.now();
  const shifts = Shift.all(new Date(agora).toISOString());
  for (const s of shifts) {
    const inicio = new Date(s.inicio).getTime();
    if (inicio <= agora) continue;
    for (const w of janelas()) {
      if (inicio - agora <= w * 60 * 1000 && !Shift.reminderSent(s.id, w)) {
        try {
          await sendWhatsApp(montarLembrete(s, w));
          Shift.markReminderSent(s.id, w);
          console.log(`[lembrete] plantão #${s.id} avisado (${w} min antes)`);
        } catch (e) {
          console.error(`[lembrete] falha plantão #${s.id} (${w} min):`, e.message);
        }
      }
    }
  }
}

async function resumoDiario() {
  const tz = config.get('TIMEZONE', 'America/Sao_Paulo');
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const ini = new Date(agora); ini.setHours(0, 0, 0, 0);
  const fim = new Date(agora); fim.setHours(23, 59, 59, 999);
  const shifts = Shift.all().filter((s) => {
    const t = new Date(s.inicio).getTime();
    return t >= ini.getTime() && t <= fim.getTime();
  });
  try {
    const dataRef = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    await sendWhatsApp(montarResumoDia(shifts, dataRef));
    for (const s of shifts) Shift.markReminderSent(s.id, 0);
    console.log('[resumo] resumo diário enviado');
  } catch (e) {
    console.error('[resumo] falha:', e.message);
  }
}

function iniciar() {
  cron.schedule('*/5 * * * *', verificarLembretes);
  const diario = (config.get('DAILY_SUMMARY_TIME', '') || '').trim();
  const m = diario.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    cron.schedule(`${m[2]} ${m[1]} * * *`, resumoDiario, {
      timezone: config.get('TIMEZONE', 'America/Sao_Paulo'),
    });
    console.log(`[agenda] resumo diário às ${diario}`);
  }
  console.log('[agenda] verificação de lembretes a cada 5 min');
}

module.exports = { iniciar, verificarLembretes, resumoDiario };

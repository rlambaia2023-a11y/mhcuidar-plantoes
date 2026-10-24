// Envio de lembretes por WhatsApp.
// Provedores: callmebot (grátis, ideal p/ uso pessoal), twilio, console (só loga).
const config = require('./config');

async function viaCallMeBot(numero, texto) {
  const apikey = config.get('CALLMEBOT_APIKEY');
  if (!apikey) throw new Error('CALLMEBOT_APIKEY não configurada.');
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(numero)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apikey)}`;
  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok) throw new Error(`CallMeBot HTTP ${res.status}: ${body.slice(0, 200)}`);
  return body.slice(0, 200);
}

async function viaTwilio(numero, texto) {
  const sid = config.get('TWILIO_ACCOUNT_SID');
  const token = config.get('TWILIO_AUTH_TOKEN');
  const from = config.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886');
  if (!sid || !token) throw new Error('Credenciais Twilio não configuradas.');
  const twilio = require('twilio')(sid, token);
  const msg = await twilio.messages.create({
    from,
    to: `whatsapp:+${numero.replace(/\D/g, '')}`,
    body: texto,
  });
  return msg.sid;
}

async function sendWhatsApp(texto, numeroOverride = null) {
  const numero = (numeroOverride || config.get('WHATSAPP_NUMBER') || '').replace(/\D/g, '');
  if (!numero) throw new Error('WHATSAPP_NUMBER não configurado. Ajuste nas Configurações.');
  const provider = config.get('WHATSAPP_PROVIDER', 'callmebot');
  if (provider === 'twilio') return { provider, result: await viaTwilio(numero, texto) };
  if (provider === 'console') {
    console.log('[whatsapp:console]', texto);
    return { provider, result: 'logged' };
  }
  return { provider: 'callmebot', result: await viaCallMeBot(numero, texto) };
}

// Monta a mensagem de lembrete de um plantão (pt-BR).
function montarLembrete(shift, janelaMin) {
  const fmtData = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  };
  const fmtHora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const quando = janelaMin >= 1440
    ? `daqui a ${Math.round(janelaMin / 60)}h`
    : janelaMin >= 60 ? `daqui a ${Math.round(janelaMin / 60)}h` : `em ${janelaMin} min`;
  const tipoLabel = shift.tipo === 'SN' ? 'Sobreaviso (SN)' : `Plantão ${shift.tipo}`;
  const linhas = [
    `⏰ *Lembrete de plantão — mhcuidar*`,
    ``,
    `🩺 ${tipoLabel}`,
    `📅 ${fmtData(shift.inicio)} às ${fmtHora(shift.inicio)} (${quando})`,
    shift.local ? `📍 ${shift.local}` : null,
    `⏳ Término previsto: ${fmtData(shift.fim)} às ${fmtHora(shift.fim)}`,
    shift.observacao ? `📝 ${shift.observacao}` : null,
  ].filter(Boolean);
  return linhas.join('\n');
}

function montarResumoDia(shifts, dataRef) {
  const fmtHora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const linhas = [`☀️ *Resumo do dia — mhcuidar*`, `📅 ${dataRef}`, ``];
  if (!shifts.length) {
    linhas.push('Nenhum plantão hoje. Bom descanso! 🌿');
  } else {
    for (const s of shifts) {
      const tipoLabel = s.tipo === 'SN' ? 'Sobreaviso (SN)' : `Plantão ${s.tipo}`;
      linhas.push(`• ${fmtHora(s.inicio)} — ${tipoLabel}${s.local ? ` @ ${s.local}` : ''}`);
    }
  }
  return linhas.join('\n');
}

module.exports = { sendWhatsApp, montarLembrete, montarResumoDia };

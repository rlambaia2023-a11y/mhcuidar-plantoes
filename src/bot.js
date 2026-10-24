// Bot de conversa do agente próprio: você manda o resumo do plantão no WhatsApp,
// ele entende, mostra o que entendeu e agenda após sua confirmação.
const agente = require('./agente');
const { parse } = require('./parser');
const { Shift } = require('./db');
const gcal = require('./googleCalendar');
const { montarLembrete } = require('./whatsapp');

// confirmações pendentes: remoteJid -> { plantoes, quando }
const pendentes = new Map();

const fmtDT = (iso) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function resumoPlantao(p) {
  const tipo = p.tipo === 'SN' ? 'Sobreaviso (SN)' : `Plantão ${p.tipo}`;
  return `• ${tipo}: ${fmtDT(p.inicio)} → ${fmtDT(p.fim)}${p.local ? ` @ ${p.local}` : ''}`;
}

const AJUDA = `🩺 *mhcuidar • Plantões*

Me mande o resumo do plantão como você quiser. Exemplos:
• "Plantão 24h amanhã às 7h no Hospital São Luiz"
• "Sobreaviso dia 25 no Hospital Albert Einstein"
• "Plantão 12h hoje às 19h na UPA Vila Maria"

Comandos:
• *agenda* — próximos plantões
• *sim* — confirma o agendamento
• *não* — descarta
• *ajuda* — esta mensagem`;

async function listarProximos(sock, jid) {
  const shifts = Shift.all(new Date().toISOString()).slice(0, 10);
  if (!shifts.length) {
    await sock.sendMessage(jid, { text: 'Nenhum plantão futuro agendado. 💚' });
    return;
  }
  const linhas = ['🗓️ *Próximos plantões*', ''];
  for (const s of shifts) {
    const tipo = s.tipo === 'SN' ? 'SN' : s.tipo;
    linhas.push(`• *${tipo}* ${fmtDT(s.inicio)}${s.local ? ` @ ${s.local}` : ''}`);
  }
  await sock.sendMessage(jid, { text: linhas.join('\n') });
}

async function confirmar(sock, jid, remetente) {
  const pend = pendentes.get(remetente);
  if (!pend) {
    await sock.sendMessage(jid, { text: 'Nada pendente de confirmação. Me mande o resumo do plantão! 💚' });
    return;
  }
  pendentes.delete(remetente);
  const criados = [];
  for (const p of pend.plantoes) {
    const s = Shift.create({
      tipo: p.tipo, duracao_horas: p.duracao_horas, inicio: p.inicio, fim: p.fim,
      local: p.local || '', observacao: '', texto_original: p.texto,
    });
    try {
      const eventId = await gcal.createEvent(s);
      if (eventId) Shift.update(s.id, { google_event_id: eventId });
    } catch (e) { console.error('[bot][gcal]', e.message); }
    criados.push(s);
  }
  const linhas = ['✅ *Agendado!*', ''];
  for (const s of criados) linhas.push(resumoPlantao(s));
  linhas.push('', 'Te aviso no WhatsApp antes de cada um. 💚');
  await sock.sendMessage(jid, { text: linhas.join('\n') });
}

async function handleMessage(m, sock) {
  if (!sock) return;
  const jid = m.key.remoteJid;
  if (!jid || jid === 'status@broadcast' || jid.endsWith('@g.us')) return; // ignora status e grupos
  if (m.key.fromMe) return; // ignora o que o próprio agente enviou
  const remetente = m.key.participant || jid;
  if (!agente.ehDono(remetente) && !agente.ehDono(jid)) return; // só obedece à dona

  const texto = agente.textoDe(m);
  if (!texto) return;
  const tn = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  if (/\bajuda\b/.test(tn)) { await sock.sendMessage(jid, { text: AJUDA }); return; }
  if (/\b(agenda|proximos|hoje)\b/.test(tn)) { await listarProximos(sock, jid); return; }
  if (/^\s*sim\b/.test(tn)) { await confirmar(sock, jid, remetente); return; }
  if (/^\s*(nao|não|cancelar)\b/.test(tn)) {
    pendentes.delete(remetente);
    await sock.sendMessage(jid, { text: 'Descartado. 👍' });
    return;
  }

  const plantoes = parse(texto);
  if (!plantoes.length) {
    await sock.sendMessage(jid, { text: 'Não entendi. Tente como no exemplo:\n"Plantão 24h amanhã às 7h no Hospital São Luiz"\n\nOu digite *ajuda*.' });
    return;
  }
  pendentes.set(remetente, { plantoes, quando: Date.now() });
  const linhas = ['📋 *Entendi assim, confere?*', ''];
  for (const p of plantoes) {
    linhas.push(resumoPlantao(p));
    if (p.avisos.length) linhas.push(`  💡 ${p.avisos.join(' ')}`);
  }
  linhas.push('', 'Responda *SIM* para confirmar ou *NÃO* para descartar.');
  await sock.sendMessage(jid, { text: linhas.join('\n') });
}

function iniciar() {
  agente.iniciar(handleMessage);
}

module.exports = { iniciar, handleMessage, AJUDA };

// mhcuidar • Plantões — servidor
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { Shift } = require('./db');
const { parse } = require('./parser');
const gcal = require('./googleCalendar');
const { sendWhatsApp } = require('./whatsapp');
const scheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3003;

// --- estabilidade: o servidor roda solto na VM e pode ser derrubado por
// um reinício da máquina sem deixar rastro. Estas travas garantem que (1)
// toda morte futura deixe um registro, (2) um erro transitório não
// derrube o sistema inteiro e (3) o vigia saiba exatamente qual processo
// encerrar, em vez de procurar por nome.
const PID_FILE = path.join(__dirname, '..', 'data', 'server.pid');
let server = null;
process.on('unhandledRejection', (e) => {
  console.error('[estabilidade] rejeição não tratada (o servidor continua no ar):', e && e.stack ? e.stack : e);
});
process.on('uncaughtException', (e) => {
  console.error('[estabilidade] exceção não capturada — encerrando para o vigia reiniciar:', e && e.stack ? e.stack : e);
  process.exit(1);
});
function encerrarComCalma(sinal) {
  console.log(`[estabilidade] ${sinal} recebido — encerrando com calma.`);
  try { fs.unlinkSync(PID_FILE); } catch {}
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => encerrarComCalma('SIGTERM'));
process.on('SIGINT', () => encerrarComCalma('SIGINT'));

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'mhcuidar-plantoes' }));

// --- interpretação ---
app.post('/api/parse', (req, res) => {
  try {
    const plantoes = parse(req.body.texto || '');
    res.json({ plantoes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- plantões ---
app.get('/api/shifts', (req, res) => {
  const from = req.query.from ? new Date(req.query.from).toISOString() : null;
  res.json({ shifts: Shift.all(from) });
});

app.post('/api/shifts', async (req, res) => {
  try {
    const itens = Array.isArray(req.body) ? req.body : [req.body];
    const criados = [];
    for (const it of itens) {
      const s = Shift.create({
        tipo: it.tipo,
        duracao_horas: it.duracao_horas,
        inicio: it.inicio,
        fim: it.fim,
        local: it.local || '',
        observacao: it.observacao || '',
        texto_original: it.texto || '',
      });
      try {
        const eventId = await gcal.createEvent(s);
        if (eventId) Shift.update(s.id, { google_event_id: eventId });
      } catch (e) {
        console.error('[gcal] falha ao criar evento:', e.message);
      }
      criados.push(Shift.get(s.id));
    }
    res.json({ shifts: criados });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/shifts/:id', async (req, res) => {
  const s = Shift.update(req.params.id, req.body);
  if (!s) return res.status(404).json({ error: 'Plantão não encontrado.' });
  try {
    if (s.google_event_id) await gcal.updateEvent(s.google_event_id, s);
  } catch (e) { console.error('[gcal] falha ao atualizar:', e.message); }
  res.json({ shift: Shift.get(s.id) });
});

app.delete('/api/shifts/:id', async (req, res) => {
  const s = Shift.remove(req.params.id);
  if (!s) return res.status(404).json({ error: 'Plantão não encontrado.' });
  try {
    if (s.google_event_id) await gcal.deleteEvent(s.google_event_id);
  } catch (e) { console.error('[gcal] falha ao excluir evento:', e.message); }
  res.json({ ok: true });
});

// --- configurações ---
app.get('/api/config', (req, res) => res.json(config.getAllEditable()));
app.put('/api/config', (req, res) => {
  res.json(config.saveEditable(req.body || {}));
});

// --- Google Agenda ---
app.get('/api/google/auth', (req, res) => {
  try {
    res.json({ url: gcal.getAuthUrl() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/google/callback', async (req, res) => {
  try {
    await gcal.saveTokenFromCode(req.query.code);
    res.send('<h2 style="font-family:sans-serif">Agenda conectada com sucesso! ✅<br><small>Pode fechar esta aba e voltar ao sistema.</small></h2>');
  } catch (e) {
    res.status(500).send(`<h2 style="font-family:sans-serif">Falha: ${e.message}</h2>`);
  }
});
app.get('/api/google/status', async (req, res) => res.json(await gcal.status()));
app.post('/api/google/disconnect', (req, res) => {
  gcal.disconnect();
  res.json({ ok: true });
});

// --- teste de WhatsApp ---
app.post('/api/test-whatsapp', async (req, res) => {
  try {
    const texto = req.body.texto || '✅ Teste do sistema mhcuidar • Plantões. Se você recebeu, os lembretes estão funcionando!';
    const r = await sendWhatsApp(texto);
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- agente WhatsApp próprio ---
app.get('/api/wa/status', (req, res) => {
  try {
    const agente = require('./agente');
    res.json(agente.status());
  } catch (e) {
    res.json({ estado: 'desconectado', erro: e.message });
  }
});
app.get('/api/wa/qr', (req, res) => {
  const agente = require('./agente');
  const st = agente.status();
  if (st.qrDisponivel) res.sendFile(st.qrPath);
  else res.status(404).json({ error: 'QR não disponível no momento.' });
});
app.post('/api/wa/reconnect', (req, res) => {
  try {
    const agente = require('./agente');
    if (agente.reconnect()) res.json({ ok: true, msg: 'Reconectando — novo QR em instantes.' });
    else res.status(500).json({ error: 'Não foi possível reiniciar a conexão.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/wa/pair-code', async (req, res) => {
  try {
    const agente = require('./agente');
    const code = await agente.requestPairingCode(req.body.numero);
    res.json({ ok: true, code });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

server = app.listen(PORT, () => {
  try { fs.writeFileSync(PID_FILE, String(process.pid)); } catch (e) {
    console.error('[estabilidade] não consegui gravar o pid:', e.message);
  }
  console.log(`mhcuidar • Plantões rodando em http://localhost:${PORT} (pid ${process.pid})`);
  scheduler.iniciar();
  if (config.get('WHATSAPP_PROVIDER', 'agente') === 'agente') {
    console.log('[bot] iniciando agente WhatsApp próprio...');
    require('./bot').iniciar();
  }
});

// mhcuidar • Plantões — servidor
require('dotenv').config();
const express = require('express');
const path = require('path');
const config = require('./config');
const { Shift } = require('./db');
const { parse } = require('./parser');
const gcal = require('./googleCalendar');
const { sendWhatsApp } = require('./whatsapp');
const scheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3003;

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

app.listen(PORT, () => {
  console.log(`mhcuidar • Plantões rodando em http://localhost:${PORT}`);
  scheduler.iniciar();
});

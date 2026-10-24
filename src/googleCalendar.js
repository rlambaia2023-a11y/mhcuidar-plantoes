// Integração com Google Agenda (OAuth2) — conta mh.cuidarsaude@gmail.com.
// Credenciais: env GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI
// ou arquivo credentials.json na raiz. Token salvo em data/token.json (não commitado).
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const config = require('./config');

const TOKEN_PATH = path.join(__dirname, '..', 'data', 'token.json');
const CRED_PATH = path.join(__dirname, '..', 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

function oauthClient() {
  let clientId = config.get('GOOGLE_CLIENT_ID');
  let clientSecret = config.get('GOOGLE_CLIENT_SECRET');
  const redirectUri = config.get('GOOGLE_REDIRECT_URI', 'http://localhost:3003/api/google/callback');
  if ((!clientId || !clientSecret) && fs.existsSync(CRED_PATH)) {
    try {
      const cred = JSON.parse(fs.readFileSync(CRED_PATH, 'utf8'));
      const web = cred.web || cred.installed || {};
      clientId = clientId || web.client_id;
      clientSecret = clientSecret || web.client_secret;
    } catch { /* ignora */ }
  }
  if (!clientId || !clientSecret) {
    throw new Error('Credenciais Google não configuradas. Veja o README (passo Google Agenda).');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getAuthUrl() {
  const o = oauthClient();
  return o.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
}

async function saveTokenFromCode(code) {
  const o = oauthClient();
  const { tokens } = await o.getToken(code);
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  return tokens;
}

function authedClient() {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  const o = oauthClient();
  o.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  return o;
}

function isConnected() {
  return !!authedClient();
}

function disconnect() {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
}

async function status() {
  const auth = authedClient();
  if (!auth) return { connected: false };
  try {
    const cal = google.calendar({ version: 'v3', auth });
    const me = await cal.calendarList.get({ calendarId: 'primary' });
    return { connected: true, email: me.data.id, summary: me.data.summary };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

function eventoDe(shift) {
  const tipoLabel = shift.tipo === 'SN' ? 'Sobreaviso (SN)' : `Plantão ${shift.tipo}`;
  const tz = config.get('TIMEZONE', 'America/Sao_Paulo');
  return {
    summary: `🩺 ${tipoLabel}${shift.local ? ' — ' + shift.local : ''}`,
    location: shift.local || undefined,
    description: [
      shift.observacao || '',
      `Duração: ${shift.duracao_horas}h`,
      shift.texto_original ? `Pedido original: "${shift.texto_original}"` : '',
      'Criado pelo sistema mhcuidar • Plantões',
    ].filter(Boolean).join('\n'),
    start: { dateTime: shift.inicio, timeZone: tz },
    end: { dateTime: shift.fim, timeZone: tz },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 24 * 60 },
        { method: 'popup', minutes: 120 },
      ],
    },
  };
}

async function createEvent(shift) {
  const auth = authedClient();
  if (!auth) return null; // agenda não conectada: só salva local
  const cal = google.calendar({ version: 'v3', auth });
  const res = await cal.events.insert({ calendarId: 'primary', body: eventoDe(shift) });
  return res.data.id;
}

async function deleteEvent(eventId) {
  const auth = authedClient();
  if (!auth || !eventId) return;
  const cal = google.calendar({ version: 'v3', auth });
  await cal.events.delete({ calendarId: 'primary', eventId }).catch(() => {});
}

async function updateEvent(eventId, shift) {
  const auth = authedClient();
  if (!auth || !eventId) return null;
  const cal = google.calendar({ version: 'v3', auth });
  const res = await cal.events.update({ calendarId: 'primary', eventId, body: eventoDe(shift) }).catch(() => null);
  return res ? res.data.id : null;
}

module.exports = { getAuthUrl, saveTokenFromCode, isConnected, disconnect, status, createEvent, deleteEvent, updateEvent };

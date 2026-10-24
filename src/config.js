// Configuração: variáveis de ambiente + data/config.json (o arquivo prevalece).
// Chaves editáveis pela interface web estão em EDITABLE_KEYS.
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'data', 'config.json');

const EDITABLE_KEYS = [
  'WHATSAPP_PROVIDER',
  'WHATSAPP_NUMBER',
  'CALLMEBOT_APIKEY',
  'REMINDER_WINDOWS_MIN',
  'DAILY_SUMMARY_TIME',
  'DEFAULT_START_HOUR',
  'DEFAULT_SHIFT_TYPE',
  'SN_HOURS',
  'KNOWN_PLACES',
  'TIMEZONE',
];

function readFileConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function get(key, fallback = '') {
  const file = readFileConfig();
  if (file[key] !== undefined && file[key] !== '') return String(file[key]);
  if (process.env[key] !== undefined && process.env[key] !== '') return String(process.env[key]);
  return fallback;
}

function getAllEditable() {
  const out = {};
  for (const k of EDITABLE_KEYS) out[k] = get(k);
  return out;
}

function saveEditable(patch) {
  const current = readFileConfig();
  for (const k of EDITABLE_KEYS) {
    if (patch[k] !== undefined) current[k] = String(patch[k]);
  }
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(current, null, 2));
  return getAllEditable();
}

module.exports = { get, getAllEditable, saveEditable, EDITABLE_KEYS };

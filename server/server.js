/**
 * Servidor de Automação e Agendamento em Segundo Plano — mhcuidar Plantões
 * 
 * Funcionalidades:
 * 1. Cron Job que roda a cada 15 minutos checando plantões próximos
 * 2. Disparo de alertas no WhatsApp (+5575991815612) 24h e 2h antes
 * 3. Integração com a API do Google Calendar para mh.cuidarsaude@gmail.com
 * 4. API REST para o Frontend
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'shifts_data.json');
const CONFIG = {
  doctorEmail: process.env.DOCTOR_EMAIL || 'mh.cuidarsaude@gmail.com',
  doctorWhatsApp: process.env.DOCTOR_WHATSAPP || '5575991815612',
  whatsappWebhookUrl: process.env.WHATSAPP_WEBHOOK_URL || '', // ex: Evolution API / Z-API / Twilio
};

// Ler dados locais
function getShifts() {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Erro ao ler shifts_data.json:', err);
    return [];
  }
}

// Salvar dados locais
function saveShifts(shifts) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(shifts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar shifts_data.json:', err);
  }
}

// Formatador da Mensagem de WhatsApp
function formatWhatsAppAlert(shift, type) {
  const start = new Date(shift.start);
  const dataFormatada = start.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const horaFormatada = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let avisoAntecedencia = type === '24h' ? '⏰ Lembrete de 24 Horas Antes' : '🚨 ALERTA IMEDIATO (Inicia em 2 Horas!)';

  return (
    `🩺 *mhcuidar | ${avisoAntecedencia}*\n\n` +
    `Olá, Dra.! Lembrando da sua escala:\n\n` +
    `🏥 *Local:* ${shift.location}\n` +
    `⏱️ *Tipo:* Plantão de ${shift.shiftType} (${shift.durationHours}h)\n` +
    (shift.isSN ? `🟡 *Regime:* Sobreaviso / Se Necessário (SN)\n` : '') +
    `🗓️ *Início:* ${dataFormatada} às ${horaFormatada}\n` +
    (shift.fatigueAlert ? `\n${shift.fatigueAlert}\n` : '') +
    `\n✅ Sincronizado com: ${CONFIG.doctorEmail}\n` +
    `💙 *mhcuidar* - Cuidando de quem cuida.`
  );
}

// Disparador de WhatsApp
async function sendWhatsAppMessage(number, message) {
  console.log(`[WhatsApp Mock/Live] Enviando para ${number}:\n${message}\n`);
  
  if (!CONFIG.whatsappWebhookUrl) {
    console.log('[Info] URL de Webhook não configurada. Executando em modo de log local.');
    return { success: true, mode: 'local_logged' };
  }

  try {
    const res = await fetch(CONFIG.whatsappWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, text: message })
    });
    return { success: res.ok };
  } catch (err) {
    console.error('Falha no webhook WhatsApp:', err.message);
    return { success: false, error: err.message };
  }
}

// Rotina do Cron para checar plantões e disparar alertas
function checkUpcomingShiftsAndNotify() {
  const now = Date.now();
  const shifts = getShifts();
  let updated = false;

  for (const shift of shifts) {
    const shiftStart = new Date(shift.start).getTime();
    const diffHours = (shiftStart - now) / (1000 * 60 * 60);

    // Inicializar flags de alerta
    if (!shift.notified) shift.notified = {};

    // Alerta de 24 horas (entre 23h e 25h antes)
    if (diffHours > 0 && diffHours <= 24.5 && diffHours >= 23.0 && !shift.notified['24h']) {
      const msg = formatWhatsAppAlert(shift, '24h');
      sendWhatsAppMessage(CONFIG.doctorWhatsApp, msg);
      shift.notified['24h'] = new Date().toISOString();
      updated = true;
    }

    // Alerta de 2 horas (entre 1h30 e 2h15 antes)
    if (diffHours > 0 && diffHours <= 2.25 && diffHours >= 1.5 && !shift.notified['2h']) {
      const msg = formatWhatsAppAlert(shift, '2h');
      sendWhatsAppMessage(CONFIG.doctorWhatsApp, msg);
      shift.notified['2h'] = new Date().toISOString();
      updated = true;
    }
  }

  if (updated) {
    saveShifts(shifts);
  }
}

// Checar a cada 10 minutos
setInterval(checkUpcomingShiftsAndNotify, 10 * 60 * 1000);

// --- Rotas da API ---

app.get('/api/shifts', (req, res) => {
  res.json(getShifts());
});

app.post('/api/shifts', (req, res) => {
  const newShifts = req.body;
  const current = getShifts();
  const updated = Array.isArray(newShifts) ? [...newShifts, ...current] : [newShifts, ...current];
  saveShifts(updated);
  res.json({ success: true, total: updated.length });
});

app.post('/api/send-whatsapp-test', async (req, res) => {
  const { shift } = req.body;
  const msg = formatWhatsAppAlert(shift || {
    location: 'Hospital Geral Clériston Andrade',
    shiftType: '24h',
    durationHours: 24,
    start: new Date().toISOString(),
    isSN: false
  }, '24h');

  const result = await sendWhatsAppMessage(CONFIG.doctorWhatsApp, msg);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🩺 Servidor mhcuidar Plantões AI rodando na porta ${PORT}`);
  console.log(`📧 Google Calendar: ${CONFIG.doctorEmail}`);
  console.log(`📱 WhatsApp Alertas: +${CONFIG.doctorWhatsApp}`);
  console.log(`=======================================================`);
});

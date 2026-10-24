/**
 * Módulo de Notificações via WhatsApp
 * Destinatário Oficial: +55 (75) 99181-5612 (Dra. - mhcuidar)
 */

export const DEFAULT_WHATSAPP_NUMBER = '5575991815612';

/**
 * Cria a mensagem de aviso personalizada em português formatada com markdown do WhatsApp
 */
export function buildWhatsAppMessage(shift, reminderType = 'manual') {
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

  let headerIcon = '🩺';
  let alertaTitulo = 'Confirmação de Agendamento';

  if (reminderType === '24h') {
    headerIcon = '⏰';
    alertaTitulo = 'Alerta de Plantão (24 Horas Antes)';
  } else if (reminderType === '2h') {
    headerIcon = '🚨';
    alertaTitulo = 'Aviso Imediato (Começa em 2 Horas!)';
  } else if (reminderType === 'manual') {
    headerIcon = '📋';
    alertaTitulo = 'Escala de Plantão Confirmada';
  }

  const lines = [
    `${headerIcon} *mhcuidar | ${alertaTitulo}*`,
    `Olá, Dra.! Seguem os detalhes da sua escala médica:`,
    ``,
    `🏥 *Local:* ${shift.location}`,
    `⏱️ *Modalidade:* Plantão de ${shift.shiftType} (${shift.durationHours} horas)`,
    shift.isSN ? `🟡 *Regime:* Sobreaviso / Se Necessário (SN)` : null,
    `🗓️ *Início:* ${dataInicioStr} às ${horaInicioStr}`,
    `🏁 *Término Previsto:* ${dataFimStr} às ${horaFimStr}`,
    ``,
    shift.fatigueAlert ? `${shift.fatigueAlert}\n` : null,
    `✅ Sincronizado com: mh.cuidarsaude@gmail.com`,
    `💙 *mhcuidar* - Cuidando de quem cuida.`
  ].filter(line => line !== null);

  return lines.join('\n');
}

/**
 * Gera URL direta para o WhatsApp da Dra.
 */
export function generateWhatsAppLink(shift, phoneNumber = DEFAULT_WHATSAPP_NUMBER, reminderType = 'manual') {
  const text = buildWhatsAppMessage(shift, reminderType);
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Envia notificação por webhook para integrações de backend
 * (Evolution API, Z-API, Twilio ou servidor local)
 */
export async function sendWhatsAppViaWebhook(shift, webhookUrl, phoneNumber = DEFAULT_WHATSAPP_NUMBER) {
  if (!webhookUrl) return { success: false, error: 'URL do Webhook não configurada' };

  try {
    const text = buildWhatsAppMessage(shift, '24h');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: phoneNumber.replace(/\D/g, ''),
        message: text,
        shift
      })
    });

    if (!response.ok) {
      throw new Error(`Falha no envio HTTP: ${response.status}`);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

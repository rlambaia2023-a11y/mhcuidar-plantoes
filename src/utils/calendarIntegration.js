/**
 * Integração com Google Agenda (Google Calendar)
 * Conta de destino: mh.cuidarsaude@gmail.com
 */

/**
 * Formata data no formato ISO comprimido para o Google Calendar (YYYYMMDDTHHMMSSZ)
 */
function toCalendarUtcString(dateObj) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    dateObj.getUTCFullYear() +
    pad(dateObj.getUTCMonth() + 1) +
    pad(dateObj.getUTCDate()) +
    'T' +
    pad(dateObj.getUTCHours()) +
    pad(dateObj.getUTCMinutes()) +
    pad(dateObj.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Gera URL de 1 clique para adicionar o plantão diretamente à Google Agenda da Dra.
 * E-mail: mh.cuidarsaude@gmail.com
 */
export function generateGoogleCalendarUrl(shift) {
  const startDate = new Date(shift.start);
  const endDate = new Date(shift.end);

  const startUtc = toCalendarUtcString(startDate);
  const endUtc = toCalendarUtcString(endDate);

  const title = `🏥 [mhcuidar] Plantão ${shift.shiftType} - ${shift.location}`;
  
  const details = [
    `🩺 SISTEMA DE PLANTÕES MHCUIDAR`,
    `----------------------------------------`,
    `📍 Local: ${shift.location}`,
    `⏱️ Tipo de Plantão: ${shift.shiftType} (${shift.durationHours}h)`,
    shift.isSN ? `🟡 Modalidade: Sobreaviso / Se Necessário (SN)` : '',
    shift.fatigueAlert ? `\n${shift.fatigueAlert}` : '',
    `\n🔔 Lembretes configurados para WhatsApp: +55 (75) 99181-5612`,
    `📧 E-mail vinculado: mh.cuidarsaude@gmail.com`,
    `\nResumo falado/digitado: "${shift.rawSummary || ''}"`
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startUtc}/${endUtc}`,
    details: details,
    location: shift.location,
    add: 'mh.cuidarsaude@gmail.com'
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Gera e faz download de um arquivo .ics (iCalendar) para importação em qualquer celular
 * (iPhone, Android, Outlook, etc.) com alertas configurados de 24h e 2h antes.
 */
export function downloadIcsFile(shift) {
  const startDate = new Date(shift.start);
  const endDate = new Date(shift.end);
  const startUtc = toCalendarUtcString(startDate);
  const endUtc = toCalendarUtcString(endDate);
  const nowUtc = toCalendarUtcString(new Date());

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//mhcuidar//Plantoes AI//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:mhcuidar-${shift.id || Date.now()}@mhcuidar.com.br`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:🏥 [mhcuidar] Plantão ${shift.shiftType} - ${shift.location}`,
    `DESCRIPTION:Plantão médico de ${shift.durationHours}h em ${shift.location}.\\nE-mail: mh.cuidarsaude@gmail.com\\nWhatsApp: +5575991815612`,
    `LOCATION:${shift.location}`,
    'STATUS:CONFIRMED',
    // Alarme de 24 horas antes (-PT24H)
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Lembrete mhcuidar: Seu plantão de ${shift.shiftType} em ${shift.location} começa amanhã!`,
    'END:VALARM',
    // Alarme de 2 horas antes (-PT2H)
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Atenção Dra.! Plantão em ${shift.location} começa em 2 horas!`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `plantao_mhcuidar_${shift.location.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

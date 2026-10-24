/**
 * Motor de Processamento de Linguagem Natural (NLP / IA) para Plantões Médicos
 * Especialmente desenvolvido para a Dra. da clínica mhcuidar.
 * 
 * Suporta entrada por voz ou texto com reconhecimento de:
 * - Plantões de SN (Sobreaviso / Se Necessário)
 * - Plantões de 12h (Diurno e Noturno)
 * - Plantões de 24h
 * - Plantões de 48h
 * - Plantões de 72h
 * - Múltiplos plantões em uma única frase
 * - Datas relativas ("hoje", "amanhã", "próxima sexta", "sábado") e absolutas ("25/10")
 * - Identificação automática de clínicas e hospitais
 */

// Locais e hospitais frequentes (com prioridade para mhcuidar e região)
const KNOWN_LOCATIONS = [
  { name: 'Clínica mhcuidar', patterns: [/mhcuidar/i, /mh cuidar/i, /minha cl[ií]nica/i, /na cl[ií]nica/i] },
  { name: 'Hospital Geral Clériston Andrade (HGCA)', patterns: [/cl[eé]riston/i, /hgca/i] },
  { name: 'Hospital Estadual da Criança (HEC)', patterns: [/hec\b/i, /hospital da crian[cç]a/i, /hospital estadual da crian[cç]a/i] },
  { name: 'Hospital da Mulher', patterns: [/hospital da mulher/i] },
  { name: 'Hospital Geral', patterns: [/hospital geral/i] },
  { name: 'Hospital Unimed', patterns: [/unimed/i] },
  { name: 'UPA 24h', patterns: [/upa/i] },
  { name: 'SAMU', patterns: [/samu/i] },
  { name: 'Hospital Regional', patterns: [/hospital regional/i] },
  { name: 'Hospital Municipal', patterns: [/hospital municipal/i] }
];

const WEEKDAYS = {
  'domingo': 0,
  'segunda': 1,
  'segunda-feira': 1,
  'terça': 2,
  'terca': 2,
  'terça-feira': 2,
  'terca-feira': 2,
  'quarta': 3,
  'quarta-feira': 3,
  'quinta': 4,
  'quinta-feira': 4,
  'sexta': 5,
  'sexta-feira': 5,
  'sábado': 6,
  'sabado': 6
};

/**
 * Normaliza texto removendo acentos excessivos e espaços duplicados
 */
function normalizeText(text) {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Extrai data baseada em referências temporais no texto
 */
function parseDate(text, baseDate = new Date()) {
  const lower = text.toLowerCase();
  const targetDate = new Date(baseDate.getTime());
  targetDate.setHours(7, 0, 0, 0); // Padrão matutino

  // Checar hoje / amanhã / depois de amanhã
  if (/\bhoje\b/i.test(lower)) {
    return targetDate;
  }
  if (/\bdepois de amanh[aã]\b/i.test(lower)) {
    targetDate.setDate(targetDate.getDate() + 2);
    return targetDate;
  }
  if (/\bamanh[aã]\b/i.test(lower)) {
    targetDate.setDate(targetDate.getDate() + 1);
    return targetDate;
  }

  // Checar dia da semana
  for (const [dayName, dayIndex] of Object.entries(WEEKDAYS)) {
    const regex = new RegExp(`\\b${dayName}\\b`, 'i');
    if (regex.test(lower)) {
      const currentDay = baseDate.getDay();
      let diff = dayIndex - currentDay;
      if (diff <= 0) {
        // Se for hoje ou dia passado, assume a próxima ocorrência
        diff += 7;
      }
      targetDate.setDate(baseDate.getDate() + diff);
      return targetDate;
    }
  }

  // Checar data específica: dia DD/MM ou dia DD de [mês]
  const dateMatch = lower.match(/\b(?:dia\s+)?(\d{1,2})(?:\/(\d{1,2})|\s+de\s+([a-zç]+))?\b/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    let month = baseDate.getMonth();
    
    if (dateMatch[2]) {
      month = parseInt(dateMatch[2], 10) - 1;
    } else if (dateMatch[3]) {
      const monthNames = ['janeiro', 'fevereiro', 'março', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const mIdx = monthNames.findIndex(m => dateMatch[3].startsWith(m.slice(0, 3)));
      if (mIdx !== -1) month = mIdx;
    }

    if (day >= 1 && day <= 31) {
      targetDate.setDate(day);
      targetDate.setMonth(month);
      // Se a data já passou no ano atual, projeta para o próximo ano
      if (targetDate < baseDate && targetDate.getDate() !== baseDate.getDate()) {
        targetDate.setFullYear(targetDate.getFullYear() + 1);
      }
      return targetDate;
    }
  }

  // Fallback: amanhã se não detectou
  targetDate.setDate(targetDate.getDate() + 1);
  return targetDate;
}

/**
 * Detecta tipo de plantão, horários de início e término e duração
 */
function parseShiftTypeAndHours(text, startDate) {
  const lower = text.toLowerCase();

  // 1. Sobreaviso / SN
  const isSN = /\b(sn|sobreaviso|se necess[aá]rio)\b/i.test(lower);
  
  // 2. Horas de duração
  let durationHours = 12; // padrão
  let shiftType = '12h Diurno';

  if (isSN) {
    shiftType = 'SN';
    durationHours = 24; // Sobreaviso costuma cobrir 12h ou 24h
  } else if (/\b72\s*(h|horas|hrs)\b/i.test(lower)) {
    shiftType = '72h';
    durationHours = 72;
  } else if (/\b48\s*(h|horas|hrs)\b/i.test(lower)) {
    shiftType = '48h';
    durationHours = 48;
  } else if (/\b24\s*(h|horas|hrs)\b/i.test(lower)) {
    shiftType = '24h';
    durationHours = 24;
  } else if (/\b12\s*(h|horas|hrs)\b/i.test(lower) || /\bplant[aã]o\b/i.test(lower)) {
    if (/\b(noturno|noite|coruj[aã]o)\b/i.test(lower)) {
      shiftType = '12h Noturno';
      durationHours = 12;
    } else {
      shiftType = '12h Diurno';
      durationHours = 12;
    }
  }

  // 3. Determinar horário de início
  let startHour = 7;
  let startMinute = 0;

  // Busca horário explícito: "às 19h", "a partir das 7:00", "das 19:00"
  const timeMatch = lower.match(/(?:[aà]s|das|in[ií]cio|come[cç]ando)\s+(\d{1,2})(?::(\d{2})|h)?/i);
  if (timeMatch) {
    startHour = parseInt(timeMatch[1], 10);
    startMinute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  } else {
    // Se não informou horário mas disse "noite" ou "noturno"
    if (/\b(noturno|noite)\b/i.test(lower)) {
      startHour = 19;
    } else {
      startHour = 7; // Padrão hospitalar matutino
    }
  }

  const start = new Date(startDate.getTime());
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

  return {
    shiftType,
    durationHours,
    start,
    end,
    isSN
  };
}

/**
 * Detecta o local do plantão
 */
function parseLocation(text) {
  // Procura por hospitais conhecidos
  for (const loc of KNOWN_LOCATIONS) {
    for (const pattern of loc.patterns) {
      if (pattern.test(text)) {
        return loc.name;
      }
    }
  }

  // Procura padrões genéricos: "no Hospital X", "na clínica Y"
  const match = text.match(/(?:no|na|em|hospital|cl[ií]nica)\s+([A-ZÀ-Ú][a-zà-ú0-9\s]+?)(?=\s+(?:às|das|dia|sexta|sábado|domingo|segunda|terça|quarta|quinta|12h|24h|48h|72h|sn|amanhã)|$)/i);
  if (match && match[1].trim().length > 2) {
    const loc = match[1].trim();
    return loc.charAt(0).toUpperCase() + loc.slice(1);
  }

  return 'Clínica mhcuidar'; // Default se não mencionado
}

/**
 * Função Principal de Interpretação por IA
 * Aceita uma frase ou texto com um ou múltiplos plantões
 */
export function parseShiftInput(rawInput, baseDate = new Date()) {
  if (!rawInput || typeof rawInput !== 'string') return [];

  const text = normalizeText(rawInput);
  
  // Se contiver múltiplos plantões separados por quebras de linha ou conjunções
  // Ex: "Amanhã 24h no Clériston e sábado 12h diurno na mhcuidar"
  const sentences = text
    .split(/\n|\r|\be\s+(?=amanh[aã]|depois|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|dia|\d{1,2}h|sn|sobreaviso|plant[aã]o)/i)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  const shifts = [];

  for (const sentence of sentences) {
    const shiftDate = parseDate(sentence, baseDate);
    const { shiftType, durationHours, start, end, isSN } = parseShiftTypeAndHours(sentence, shiftDate);
    const location = parseLocation(sentence);

    // Alerta de fadiga para plantões longos
    let fatigueAlert = null;
    if (durationHours >= 48) {
      fatigueAlert = `⚠️ Atenção Médica: Plantão de ${durationHours} horas exige planejamento de descanso e hidratação redobrada!`;
    }

    shifts.push({
      id: 'shift_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: `Plantão ${shiftType} - ${location}`,
      location,
      shiftType,
      durationHours,
      start: start.toISOString(),
      end: end.toISOString(),
      isSN,
      fatigueAlert,
      rawSummary: sentence,
      reminders: {
        whatsapp: true,
        whatsapp24h: true,
        whatsapp2h: true,
        googleCalendar: true
      },
      status: 'scheduled', // 'scheduled', 'in_progress', 'completed'
      createdAt: new Date().toISOString()
    });
  }

  return shifts;
}

/**
 * Formata data e hora amigável em português
 */
export function formatShiftDateTime(isoString) {
  const d = new Date(isoString);
  const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'short' });
  const diaMes = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${diaSemana.toUpperCase()}, ${diaMes} às ${hora}`;
}

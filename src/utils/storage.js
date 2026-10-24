/**
 * Gerenciador de Persistência Local (LocalStorage)
 * Com dados iniciais realistas para a Dra. da mhcuidar
 */

const STORAGE_KEY = 'mhcuidar_plantoes_v1';
const SETTINGS_KEY = 'mhcuidar_settings_v1';

export const DEFAULT_SETTINGS = {
  email: 'mh.cuidarsaude@gmail.com',
  whatsappNumber: '+5575991815612',
  telegramBotToken: '',
  telegramChatId: '',
  notifyTelegram: true,
  notify24h: true,
  notify2h: true,
  webhookUrl: '',
  theme: 'emerald'
};

// Dados de exemplo para inicialização do sistema
function getInitialSampleShifts() {
  const now = new Date();
  
  // Próximo plantão: amanhã às 07:00 (24h no Hospital Geral Clériston Andrade)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

  // Plantão seguinte: terça-feira (12h Diurno na Clínica mhcuidar)
  const shift2 = new Date(now);
  shift2.setDate(shift2.getDate() + 3);
  shift2.setHours(8, 0, 0, 0);
  const shift2End = new Date(shift2.getTime() + 12 * 60 * 60 * 1000);

  // Plantão de Sobreaviso (SN) no próximo fim de semana
  const shift3 = new Date(now);
  shift3.setDate(shift3.getDate() + 7);
  shift3.setHours(19, 0, 0, 0);
  const shift3End = new Date(shift3.getTime() + 24 * 60 * 60 * 1000);

  return [
    {
      id: 'shift_init_1',
      title: 'Plantão 24h - Hospital Geral Clériston Andrade (HGCA)',
      location: 'Hospital Geral Clériston Andrade (HGCA)',
      shiftType: '24h',
      durationHours: 24,
      start: tomorrow.toISOString(),
      end: tomorrowEnd.toISOString(),
      isSN: false,
      fatigueAlert: null,
      rawSummary: 'Plantão de 24h no Clériston amanhã às 7h',
      status: 'scheduled',
      reminders: {
        whatsapp: true,
        whatsapp24h: true,
        whatsapp2h: true,
        googleCalendar: true
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'shift_init_2',
      title: 'Plantão 12h Diurno - Clínica mhcuidar',
      location: 'Clínica mhcuidar',
      shiftType: '12h Diurno',
      durationHours: 12,
      start: shift2.toISOString(),
      end: shift2End.toISOString(),
      isSN: false,
      fatigueAlert: null,
      rawSummary: 'Atendimento e plantão 12h na mhcuidar',
      status: 'scheduled',
      reminders: {
        whatsapp: true,
        whatsapp24h: true,
        whatsapp2h: true,
        googleCalendar: true
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'shift_init_3',
      title: 'Sobreaviso SN 24h - Clínica mhcuidar',
      location: 'Clínica mhcuidar',
      shiftType: 'SN',
      durationHours: 24,
      isSN: true,
      start: shift3.toISOString(),
      end: shift3End.toISOString(),
      fatigueAlert: null,
      rawSummary: 'Plantão de sobreaviso SN no final de semana na clínica',
      status: 'scheduled',
      reminders: {
        whatsapp: true,
        whatsapp24h: true,
        whatsapp2h: true,
        googleCalendar: true
      },
      createdAt: new Date().toISOString()
    }
  ];
}

export function loadShiftsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSampleShifts();
      saveShiftsToStorage(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler plantões do localStorage:', e);
    return getInitialSampleShifts();
  }
}

export function saveShiftsToStorage(shifts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
  } catch (e) {
    console.error('Erro ao salvar plantões no localStorage:', e);
  }
}

export function loadSettingsFromStorage() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettingsToStorage(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Erro ao salvar configurações:', e);
  }
}

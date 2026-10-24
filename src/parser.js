// Interpretador de linguagem natural (pt-BR) para plantões.
// Entrada: "Plantão 24h amanhã às 7h no Hospital São Luiz"
// Saída: [{ tipo, duracao_horas, inicio, fim, local, confianca, avisos, texto }]
//
// Tipos suportados: 12h, 24h, 48h, 72h, SN (sobreaviso).
// Datas: hoje, amanhã, depois de amanhã, dia N, N/M, N de mês, dias da semana
//        (inclusive "próxima segunda" e listas como "segunda, quarta e sexta").
// Hora: às 8h, 8:00, 8h30, 7 da manhã/noite, meio-dia, meia-noite.

const config = require('./config');

const MESES = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const DIAS_SEMANA = [
  { nomes: ['domingo'], dow: 0 },
  { nomes: ['segunda', 'segunda-feira', 'seg'], dow: 1 },
  { nomes: ['terca', 'terca-feira', 'ter'], dow: 2 },
  { nomes: ['quarta', 'quarta-feira', 'qua'], dow: 3 },
  { nomes: ['quinta', 'quinta-feira', 'qui'], dow: 4 },
  { nomes: ['sexta', 'sexta-feira', 'sex'], dow: 5 },
  { nomes: ['sabado'], dow: 6 },
];
const DURACOES = { '12h': 12, '24h': 24, '48h': 48, '72h': 72 };

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tzNow() {
  // "Agora" com os campos de calendário do fuso configurado (padrão: São Paulo),
  // independente do fuso do servidor.
  const tz = config.get('TIMEZONE', 'America/Sao_Paulo');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return new Date(+g('year'), +g('month') - 1, +g('day'), +g('hour') % 24, +g('minute'), +g('second'));
}

function atMidnight(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function fmtLocalISO(d) {
  // YYYY-MM-DDTHH:mm:ss-03:00 (fuso fixo de Brasília; sem horário de verão desde 2019)
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00-03:00`;
}

function proxDiaSemana(ref, dow, pularSemana = false) {
  const base = atMidnight(ref);
  let delta = (dow - base.getDay() + 7) % 7;
  if (delta === 0 && pularSemana) delta = 7;
  return addDays(base, delta);
}

// ---- extração de tipo/duração ----
function extrairTipo(tn) {
  // SN / sobreaviso
  if (/\b(sobreaviso|sobre-aviso|sn)\b/.test(tn)) {
    const horas = parseFloat(config.get('SN_HOURS', '24')) || 24;
    return { tipo: 'SN', duracao_horas: horas, matched: true };
  }
  const m = tn.match(/\b(plantao\s+(de\s+)?)?(12|24|48|72)\s*h(oras?)?\b/);
  if (m) {
    const tipo = `${m[3]}h`;
    return { tipo, duracao_horas: DURACOES[tipo], matched: true };
  }
  if (/\b(12|24|48|72)\s*horas?\b/.test(tn)) {
    const n = tn.match(/\b(12|24|48|72)\s*horas?\b/)[1];
    return { tipo: `${n}h`, duracao_horas: DURACOES[`${n}h`], matched: true };
  }
  return { tipo: null, duracao_horas: null, matched: false };
}

// ---- extração de datas (retorna lista) ----
function extrairDatas(tn, ref) {
  const datas = [];
  const seen = new Set();
  const push = (d) => {
    const k = atMidnight(d).getTime();
    if (!seen.has(k)) { seen.add(k); datas.push(atMidnight(d)); }
  };

  if (/\bdepois\s+de\s+amanha\b/.test(tn)) push(addDays(ref, 2));
  else if (/\bamanha\b/.test(tn)) push(addDays(ref, 1));
  if (/\bhoje\b/.test(tn)) push(ref);

  // dias da semana (com ou sem "proxima")
  for (const { nomes, dow } of DIAS_SEMANA) {
    for (const n of nomes) {
      const reProx = new RegExp(`\\bproxim[ao]\\s+${n}(?:-feira)?\\b`);
      const re = new RegExp(`\\b${n}(?:-feira)?\\b`);
      if (reProx.test(tn)) push(proxDiaSemana(ref, dow, true));
      else if (re.test(tn)) push(proxDiaSemana(ref, dow, false));
    }
  }

  // "dia 12", "dias 12, 13 e 14", "12/10", "12 de outubro", "dia 12 de outubro"
  const reDia = /\bdias?\s+(\d{1,2}(?:\s*,\s*\d{1,2})*(?:\s*e\s*\d{1,2})?)(?:\s*(?:de\s+|\/\s*)?([a-z]+|\d{1,2}))?/g;
  let m;
  while ((m = reDia.exec(tn)) !== null) {
    const dias = m[1].split(/,|\be\b/).map((x) => parseInt(x.trim(), 10)).filter(Boolean);
    let mes = null;
    if (m[2]) {
      const t = m[2].trim();
      mes = MESES[t] || parseInt(t, 10) || null;
    }
    for (const dia of dias) {
      const base = new Date(ref);
      let ano = base.getFullYear();
      let mm = mes || base.getMonth() + 1;
      if (!mes) {
        // sem mês: se o dia já passou neste mês, joga para o próximo
        const candidato = new Date(ano, mm - 1, dia);
        if (atMidnight(candidato) < atMidnight(base)) {
          const prox = new Date(ano, mm, dia); // mês seguinte
          ano = prox.getFullYear(); mm = prox.getMonth() + 1;
        }
      }
      const d = new Date(ano, mm - 1, dia);
      if (!isNaN(d) && d.getDate() === dia) push(d);
    }
  }
  // "25/10" solto
  const reBarra = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
  while ((m = reBarra.exec(tn)) !== null) {
    const d = new Date(ref.getFullYear(), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    if (!isNaN(d)) push(d);
  }

  return datas.sort((a, b) => a - b);
}

// ---- extração de hora ----
function extrairHora(tn) {
  let m;
  if (/\bmeia-noite\b/.test(tn)) return { h: 0, min: 0, matched: true };
  if (/\bmeio-dia\b/.test(tn)) return { h: 12, min: 0, matched: true };
  m = tn.match(/\b(\d{1,2})\s*da\s*manha\b/);
  if (m) return { h: parseInt(m[1], 10) % 12, min: 0, matched: true };
  m = tn.match(/\b(\d{1,2})\s*da\s*(noite|tarde)\b/);
  if (m) { const h = parseInt(m[1], 10); return { h: h < 12 ? h + 12 : h, min: 0, matched: true }; }
  m = tn.match(/\bas\s+(\d{1,2})\s*h\s*(\d{2})?\b/); // às 7h, às 8h30
  if (m) return { h: parseInt(m[1], 10), min: parseInt(m[2] || '0', 10), matched: true };
  m = tn.match(/\bas\s+(\d{1,2}):(\d{2})\b/); // às 8:00
  if (m) return { h: parseInt(m[1], 10), min: parseInt(m[2], 10), matched: true };
  m = tn.match(/\b(\d{1,2})[:h](\d{2})\b/); // 8:00, 8h30 soltos
  if (m) return { h: parseInt(m[1], 10), min: parseInt(m[2], 10), matched: true };
  m = tn.match(/\bas\s+(\d{1,2})\b/); // às 8
  if (m) return { h: parseInt(m[1], 10), min: 0, matched: true };
  return { h: null, min: 0, matched: false };
}

// ---- extração de local ----
// Remove palavra a palavra (preservando acentos e caixa originais) tudo que
// é token de data/hora/tipo, mantendo só o nome do lugar.
const STOP_LOCAL = new Set([
  'amanha', 'hoje', 'dia', 'dias',
  'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo',
  'feira', 'seg', 'ter', 'qua', 'qui', 'sex', 'proxima', 'proximo',
  'plantao', 'plantoes', 'sobreaviso', 'sobre', 'aviso', 'sn',
  'meianoite', 'meiodia', 'manha', 'noite', 'tarde', 'horas', 'hora',
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]);
// Artigos/preposições removidos só das bordas (podem fazer parte do nome: "Hospital das Clínicas").
const BORDA_LOCAL = /^(de|do|da|dos|das|no|na|nos|nas|num|numa|em|e|o|a|os|as|ao|aos|por|para)\s+/i;
const BORDA_LOCAL_FIM = /\s+(de|do|da|dos|das|no|na|nos|nas|num|numa|em|e|o|a|os|as|ao|aos|por|para)$/i;

function limparLocal(s) {
  const ws = (s || '').split(/\s+/);
  const out = [];
  let pularNumeros = false; // após "dia"/"dias", pula os números da data
  for (const w of ws) {
    const n = norm(w).replace(/[^a-z0-9]/g, '');
    if (!n) continue;
    if (n === 'dia' || n === 'dias') { pularNumeros = true; continue; }
    if (pularNumeros && (/^\d{1,2},?$/.test(n) || n === 'e')) continue;
    if (pularNumeros && !/^\d/.test(n)) pularNumeros = false;
    if (STOP_LOCAL.has(n)) continue;
    if (/^\d{1,2}h(\d{2})?$/.test(n)) continue; // 7h, 8h30
    if (/^\d{1,2}:\d{2}$/.test(n)) continue; // 8:00
    if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(w)) continue; // 12/11
    out.push(w);
  }
  let t = out.join(' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.;:!?-]+|[\s,.;:!?-]+$/g, '')
    .trim();
  let prev;
  do { prev = t; t = t.replace(BORDA_LOCAL, '').replace(BORDA_LOCAL_FIM, ''); } while (t !== prev);
  return t.trim();
}

function extrairLocal(original) {
  // 1) após preposição no/na/nos/nas/em
  const m = original.match(/(?:\bno\b|\bna\b|\bnos\b|\bnas\b|\bem\b)\s+([^,.;!?]+)/i);
  if (m) {
    const limpo = limparLocal(m[1]);
    if (limpo.length >= 2) return capLocal(limpo);
  }
  // 2) o que sobrar do texto após remover os tokens conhecidos
  const resto = limparLocal(original).replace(/^(no|na|nos|nas|em|de|do|da)\s+/i, '');
  if (resto.length >= 2) return capLocal(resto);
  return '';
}

function capLocal(s) {
  const conhecidos = (config.get('KNOWN_PLACES', 'Clínica mhcuidar') || '').split(/[;,|]/).map((x) => x.trim()).filter(Boolean);
  const sn = norm(s);
  for (const c of conhecidos) {
    const nc = norm(c);
    if (sn === nc || sn.includes(nc) || (nc.includes(sn) && sn.length > 3)) return c;
  }
  return s;
}

// ---- principal ----
function parse(texto, refDate = null) {
  const original = (texto || '').trim();
  if (!original) return [];
  const tn = norm(original);
  const ref = refDate ? new Date(refDate) : tzNow();

  const tipoInfo = extrairTipo(tn);
  const datas = extrairDatas(tn, ref);
  const horaInfo = extrairHora(tn);
  const local = extrairLocal(original);

  const avisos = [];
  let { tipo, duracao_horas } = tipoInfo;
  if (!tipo) {
    tipo = config.get('DEFAULT_SHIFT_TYPE', '24h');
    duracao_horas = DURACOES[tipo] || 24;
    avisos.push(`Duração não identificada — assumi plantão de ${tipo}.`);
  }
  let { h, min } = horaInfo;
  if (!horaInfo.matched) {
    h = parseInt(config.get('DEFAULT_START_HOUR', '7'), 10) || 7;
    min = 0;
    avisos.push(`Hora não identificada — assumi início às ${String(h).padStart(2, '0')}:00.`);
  }
  const datasFinais = datas.length ? datas : [atMidnight(ref)];
  if (!datas.length) avisos.push('Data não identificada — assumi hoje.');
  if (!local) avisos.push('Local não identificado.');

  const plantoes = datasFinais.map((d) => {
    const inicio = new Date(d);
    inicio.setHours(h, min, 0, 0);
    const fim = new Date(inicio.getTime() + duracao_horas * 3600 * 1000);
    const faltando = [!tipoInfo.matched, !horaInfo.matched, !datas.length, !local].filter(Boolean).length;
    return {
      tipo,
      duracao_horas,
      inicio: fmtLocalISO(inicio),
      fim: fmtLocalISO(fim),
      local,
      confianca: faltando === 0 ? 'alta' : faltando <= 2 ? 'média' : 'baixa',
      avisos,
      texto: original,
    };
  });

  return plantoes;
}

module.exports = { parse, norm };

// Teste rápido: node src/parser.js --test
if (require.main === module && process.argv.includes('--test')) {
  const casos = [
    'Plantão 24h amanhã às 7h no Hospital São Luiz',
    'sobreaviso dia 25 no Hospital Albert Einstein',
    'Plantao 12h hoje as 19h na UPA Vila Maria',
    'SN amanhã na Clínica mhcuidar',
    'plantão 48h dia 12/11 às 8h no Hospital das Clínicas',
    'Plantão de 72 horas dia 5 de novembro no Hospital Sírio',
    'plantão segunda, quarta e sexta às 7h no Hospital X',
    'plantão 24h próxima segunda no Hospital Y',
    '12h hoje 7 da noite na clinica',
    'Plantão no Hospital Z amanhã',
  ];
  // referência fixa: sexta 2026-10-23 10:00
  const ref = new Date(2026, 9, 23, 10, 0, 0);
  for (const c of casos) {
    console.log('IN :', c);
    for (const p of parse(c, ref)) {
      console.log('OUT:', `${p.tipo} | ${p.inicio} → ${p.fim} | ${p.local || '(sem local)'} | ${p.confianca}${p.avisos.length ? ' | ' + p.avisos.join(' ') : ''}`);
    }
    console.log('---');
  }
}

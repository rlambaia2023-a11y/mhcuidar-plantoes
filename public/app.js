// mhcuidar • Plantões AI — Frontend Principal
const $ = (id) => document.getElementById(id);
const api = (m, url, body) =>
  fetch(url, {
    method: m,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  }).then((r) => r.json().then((j) => ({ ok: r.ok, ...j })));

let tipoForcado = null;
let todosPlantoes = [];
let timerInterval = null;

const WHATSAPP_OFICIAL = '5575991815612';
const EMAIL_OFICIAL = 'mh.cuidarsaude@gmail.com';

// ---- Botões de Tipo Rápido ----
document.querySelectorAll('.tipos button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.tipos button').forEach((x) => x.classList.remove('ativo'));
    if (tipoForcado === b.dataset.tipo) {
      tipoForcado = null;
    } else {
      tipoForcado = b.dataset.tipo;
      b.classList.add('ativo');
    }
  };
});

// ---- Sugestões Rápidas Clicáveis ----
document.querySelectorAll('.chip-exemplo').forEach((btn) => {
  btn.onclick = () => {
    $('texto').value = btn.dataset.ex;
    $('btnEntender').click();
  };
});

// ---- Voz (Web Speech API, pt-BR) ----
let rec = null, gravando = false;
$('btnVoz').onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Este navegador não suporta ditado por voz nativo. No celular, recomendamos o Chrome.');
    return;
  }
  if (gravando) {
    rec.stop();
    return;
  }
  rec = new SR();
  rec.lang = 'pt-BR';
  rec.interimResults = true;
  const base = $('texto').value ? $('texto').value.trim() + ' ' : '';

  rec.onresult = (e) => {
    let txt = '';
    for (const r of e.results) txt += r[0].transcript;
    $('texto').value = base + txt;
  };
  rec.onend = () => {
    gravando = false;
    $('btnVoz').classList.remove('gravando');
  };
  rec.onerror = (e) => {
    gravando = false;
    $('btnVoz').classList.remove('gravando');
    console.warn('Erro de fala:', e.error);
  };

  rec.start();
  gravando = true;
  $('btnVoz').classList.add('gravando');
};

// ---- Formatação de Datas ----
const fmtDT = (iso) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  const semana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()];
  return `${semana}, ${p(d.getDate())}/${p(d.getMonth() + 1)} às ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const toInputDT = (iso) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const fromInputDT = (v) => {
  const d = new Date(v);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00-03:00`;
};

// Formato UTC compacto para Google Calendar: YYYYMMDDTHHMMSSZ
function toGcalUtc(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() +
    p(d.getUTCMonth() + 1) +
    p(d.getUTCDate()) +
    'T' +
    p(d.getUTCHours()) +
    p(d.getUTCMinutes()) +
    p(d.getUTCSeconds()) +
    'Z'
  );
}

// Gera link direto para Google Calendar
function gerarLinkGoogleAgenda(s) {
  const startUtc = toGcalUtc(s.inicio);
  const endUtc = toGcalUtc(s.fim);
  const titulo = `🏥 [mhcuidar] Plantão ${s.tipo} - ${s.local || 'Clínica mhcuidar'}`;
  const detalhes = [
    `🩺 SISTEMA DE PLANTÕES MHCUIDAR`,
    `Local: ${s.local || 'Clínica mhcuidar'}`,
    `Tipo: Plantão ${s.tipo} (${s.duracao_horas}h)`,
    `WhatsApp da Dra.: +55 (75) 99181-5612`,
    `E-mail: mh.cuidarsaude@gmail.com`
  ].join('\n');

  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    dates: `${startUtc}/${endUtc}`,
    details: detalhes,
    location: s.local || 'Clínica mhcuidar',
    add: EMAIL_OFICIAL
  });

  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

// Gera mensagem formatada para WhatsApp
function gerarMensagemWhatsApp(s, motivo = 'Lembrete de Plantão') {
  const dIni = fmtDT(s.inicio);
  const dFim = fmtDT(s.fim);
  return [
    `🩺 *mhcuidar | ${motivo}*`,
    `Olá, Dra.! Seguem os detalhes da sua escala médica:`,
    ``,
    `🏥 *Local:* ${s.local || 'Clínica mhcuidar'}`,
    `⏱️ *Modalidade:* Plantão de ${s.tipo} (${s.duracao_horas} horas)`,
    `🗓️ *Início:* ${dIni}`,
    `🏁 *Término Previsto:* ${dFim}`,
    ``,
    `✅ Sincronizado com: ${EMAIL_OFICIAL}`,
    `💙 *mhcuidar* - Cuidando de quem cuida.`
  ].join('\n');
}

function gerarLinkWhatsApp(s) {
  const msg = gerarMensagemWhatsApp(s);
  return `https://wa.me/${WHATSAPP_OFICIAL}?text=${encodeURIComponent(msg)}`;
}

// Baixar arquivo .ics para iPhone / Android
function baixarIcs(s) {
  const startUtc = toGcalUtc(s.inicio);
  const endUtc = toGcalUtc(s.fim);
  const nowUtc = toGcalUtc(new Date().toISOString());

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//mhcuidar//Plantoes AI//PT-BR',
    'BEGIN:VEVENT',
    `UID:mhcuidar-${s.id || Date.now()}@mhcuidar.com.br`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:🏥 [mhcuidar] Plantão ${s.tipo} - ${s.local || 'Clínica mhcuidar'}`,
    `DESCRIPTION:Plantão de ${s.duracao_horas}h em ${s.local || 'mhcuidar'}.\\nWhatsApp: +5575991815612`,
    `LOCATION:${s.local || 'Clínica mhcuidar'}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Lembrete mhcuidar: Plantão amanhã em ${s.local}!`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Plantão começa em 2 horas em ${s.local}!`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plantao_mhcuidar_${(s.local || 'escala').replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ---- Interpretar Texto com IA ----
$('btnEntender').onclick = async () => {
  const texto = $('texto').value.trim();
  if (!texto) {
    alert('Digite ou fale o resumo do plantão primeiro.');
    return;
  }
  $('btnEntender').disabled = true;
  $('btnEntender').textContent = 'Interpreting…';
  const r = await api('POST', '/api/parse', { texto });
  $('btnEntender').disabled = false;
  $('btnEntender').textContent = '✨ Interpretar e Agendar com IA';

  if (!r.ok || !r.plantoes || !r.plantoes.length) {
    alert('Não entendi. Tente algo como: "Plantão 24h amanhã às 7h no Clériston"');
    return;
  }
  renderConfirmacao(r.plantoes);
};

function renderConfirmacao(plantoes) {
  const box = $('confirmacao');
  box.innerHTML = `<h3 style="margin:14px 0 6px;color:#166534">Confere os detalhes abaixo antes de agendar:</h3>`;

  plantoes.forEach((p) => {
    if (tipoForcado) {
      const horas = { '12h': 12, '24h': 24, '48h': 48, '72h': 72, SN: 24 }[tipoForcado];
      p = { ...p, tipo: tipoForcado, duracao_horas: horas };
      const ini = new Date(p.inicio);
      p.fim = fromInputDT(new Date(ini.getTime() + horas * 3600 * 1000).toISOString().slice(0, 16));
    }

    const div = document.createElement('div');
    div.className = 'conf' + (p.confianca === 'baixa' ? ' baixa' : '');
    div.innerHTML = `
      <h3>📋 ${p.tipo === 'SN' ? 'Sobreaviso (SN)' : 'Plantão ' + p.tipo} <small>(${p.confianca || 'alta'})</small></h3>
      <div class="campos">
        <label>Tipo
          <select data-k="tipo">
            ${['12h', '24h', '48h', '72h', 'SN'].map((t) => `<option ${t === p.tipo ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
        <label>Local / Hospital
          <input data-k="local" value="${(p.local || 'Clínica mhcuidar').replace(/"/g, '&quot;')}">
        </label>
        <label>Início
          <input data-k="inicio" type="datetime-local" value="${toInputDT(p.inicio)}">
        </label>
        <label>Término
          <input data-k="fim" type="datetime-local" value="${toInputDT(p.fim)}">
        </label>
      </div>
      ${p.avisos && p.avisos.length ? `<p class="aviso">💡 ${p.avisos.join(' ')}</p>` : ''}
      ${p.duracao_horas >= 48 ? `<p class="aviso" style="color:#c2410c">⚠️ Plantão de ${p.duracao_horas}h exige hidratação e descanso especial.</p>` : ''}
      <div class="botoes">
        <button class="primario" data-a="ok">✓ Confirmar e Salvar</button>
        <button type="button" data-a="no">Descartar</button>
      </div>`;

    const selTipo = div.querySelector('[data-k="tipo"]');
    const inpIni = div.querySelector('[data-k="inicio"]');
    const inpFim = div.querySelector('[data-k="fim"]');

    const recalc = () => {
      const horas = { '12h': 12, '24h': 24, '48h': 48, '72h': 72, SN: 24 }[selTipo.value];
      const ini = new Date(inpIni.value);
      if (!isNaN(ini)) {
        inpFim.value = toInputDT(new Date(ini.getTime() + horas * 3600 * 1000).toISOString());
      }
    };
    selTipo.onchange = recalc;
    inpIni.onchange = recalc;

    div.querySelector('[data-a="ok"]').onclick = async (ev) => {
      ev.target.disabled = true;
      const v = {};
      div.querySelectorAll('[data-k]').forEach((el) => (v[el.dataset.k] = el.value));
      const horas = { '12h': 12, '24h': 24, '48h': 48, '72h': 72, SN: 24 }[v.tipo];

      const r = await api('POST', '/api/shifts', {
        tipo: v.tipo,
        duracao_horas: horas,
        inicio: fromInputDT(v.inicio),
        fim: fromInputDT(v.fim),
        local: v.local.trim() || 'Clínica mhcuidar',
        texto: $('texto').value.trim()
      });

      if (r.ok) {
        div.remove();
        $('texto').value = '';
        tipoForcado = null;
        document.querySelectorAll('.tipos button').forEach((x) => x.classList.remove('ativo'));
        carregar();
      } else {
        alert('Erro ao salvar: ' + (r.error || 'tente novamente'));
      }
    };

    div.querySelector('[data-a="no"]').onclick = () => div.remove();
    box.appendChild(div);
  });

  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---- Carregar Lista e Atualizar Dashboard & Timer ----
async function carregar() {
  const r = await api('GET', '/api/shifts');
  if (!r.ok || !r.shifts) return;

  todosPlantoes = r.shifts;
  renderizarDashboard(todosPlantoes);
  renderizarProximoPlantao(todosPlantoes);
  renderizarLista();
}

// Atualizar Contador Regressivo
function renderizarProximoPlantao(shifts) {
  const now = new Date().getTime();
  const futuros = shifts
    .filter((s) => new Date(s.fim).getTime() > now)
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

  if (!futuros.length) {
    $('bannerLocal').textContent = 'Nenhum plantão agendado para os próximos dias';
    $('bannerHorarios').textContent = 'Fale ou digite acima para agendar em segundos.';
    $('bannerTipo').textContent = 'Livre';
    $('tHoras').textContent = '00';
    $('tMinutos').textContent = '00';
    $('tSegundos').textContent = '00';
    $('bannerAlertaFadiga').style.display = 'none';
    $('btnZapProximo').style.display = 'none';
    $('btnGcalProximo').style.display = 'none';
    return;
  }

  const prox = futuros[0];
  $('bannerLocal').textContent = prox.local || 'Clínica mhcuidar';
  $('bannerHorarios').textContent = `${fmtDT(prox.inicio)} até ${fmtDT(prox.fim)} (${prox.duracao_horas}h)`;
  $('bannerTipo').textContent = prox.tipo;

  if (prox.duracao_horas >= 48) {
    $('bannerAlertaFadiga').style.display = 'block';
    $('bannerAlertaFadiga').textContent = `⚠️ Plantão longo de ${prox.duracao_horas}h detectado. Planeje intervalos para descanso e hidratação.`;
  } else {
    $('bannerAlertaFadiga').style.display = 'none';
  }

  $('btnZapProximo').style.display = 'inline-block';
  $('btnZapProximo').href = gerarLinkWhatsApp(prox);

  $('btnGcalProximo').style.display = 'inline-block';
  $('btnGcalProximo').href = gerarLinkGoogleAgenda(prox);

  if (timerInterval) clearInterval(timerInterval);

  function atualizarTimer() {
    const agora = new Date().getTime();
    const inicio = new Date(prox.inicio).getTime();
    const diff = inicio - agora;

    if (diff <= 0) {
      $('tHoras').textContent = '00';
      $('tMinutos').textContent = '00';
      $('tSegundos').textContent = '00';
      $('bannerHorarios').textContent = '🚨 Plantão em andamento agora!';
      return;
    }

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    $('tHoras').textContent = String(h).padStart(2, '0');
    $('tMinutos').textContent = String(m).padStart(2, '0');
    $('tSegundos').textContent = String(s).padStart(2, '0');
  }

  atualizarTimer();
  timerInterval = setInterval(atualizarTimer, 1000);
}

// Renderizar Estatísticas do Mês
function renderizarDashboard(shifts) {
  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  $('mesAtualBadge').textContent = `${meses[mesAtual]} de ${anoAtual}`;

  const plantoesMes = shifts.filter((s) => {
    const d = new Date(s.inicio);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  const totalHoras = plantoesMes.reduce((acc, cur) => acc + (cur.duracao_horas || 0), 0);
  const count24h = plantoesMes.filter((s) => s.tipo === '24h').length;
  const count12h = plantoesMes.filter((s) => s.tipo.includes('12h')).length;
  const countSN = plantoesMes.filter((s) => s.tipo === 'SN').length;
  const countLong = plantoesMes.filter((s) => s.tipo === '48h' || s.tipo === '72h').length;

  $('statTotalHoras').textContent = totalHoras;
  $('statCount24h').textContent = count24h;
  $('statCount12h').textContent = count12h;
  $('statCountSN').textContent = countSN;
  $('statCountLong').textContent = countLong;

  if (totalHoras > 60) {
    $('alertaSobrecarga').style.display = 'block';
  } else {
    $('alertaSobrecarga').style.display = 'none';
  }
}

// Renderizar Lista Filtrada
function renderizarLista() {
  const box = $('lista');
  const filtro = $('filtroLocal').value;

  let filtrados = todosPlantoes;
  if (filtro === 'mhcuidar') {
    filtrados = filtrados.filter((s) => (s.local || '').toLowerCase().includes('mhcuidar'));
  } else if (filtro === 'hospitais') {
    filtrados = filtrados.filter((s) => !(s.local || '').toLowerCase().includes('mhcuidar'));
  }

  if (!filtrados.length) {
    box.innerHTML = '<p class="vazio">Nenhum plantão encontrado com esse filtro. 💚</p>';
    return;
  }

  box.innerHTML = '';
  filtrados.forEach((s) => {
    const d = document.createElement('div');
    d.className = 'plantao';

    const classeTipo =
      s.tipo === 'SN'
        ? 't-sn'
        : s.tipo === '12h'
        ? 't-12h'
        : s.tipo === '24h'
        ? 't-24h'
        : s.tipo === '48h'
        ? 't-48h'
        : 't-72h';

    d.innerHTML = `
      <div class="plantao-info">
        <div class="plantao-tipo-row">
          <span class="tag-plantao ${classeTipo}">${s.tipo === 'SN' ? 'Sobreaviso (SN)' : 'Plantão ' + s.tipo}</span>
          ${s.duracao_horas >= 48 ? `<span style="font-size:11px;color:#c2410c;font-weight:700">⚠️ Longa Duração</span>` : ''}
        </div>
        <div class="plantao-local">📍 ${s.local || 'Clínica mhcuidar'}</div>
        <div class="plantao-horarios">
          <strong>${fmtDT(s.inicio)}</strong> → ${fmtDT(s.fim)} (${s.duracao_horas}h)
        </div>
        <div class="plantao-sync-meta">
          ${s.google_event_id ? '✓ Sincronizado na Google Agenda' : '📅 Link disponível para a conta mh.cuidarsaude@gmail.com'}
        </div>
      </div>
      <div class="plantao-acoes">
        <a href="${gerarLinkWhatsApp(s)}" target="_blank" class="btn-link-zap" title="Enviar lembrete para WhatsApp +55 (75) 99181-5612">
          📲 WhatsApp
        </a>
        <a href="${gerarLinkGoogleAgenda(s)}" target="_blank" class="btn-link-gcal" title="Salvar na Google Agenda">
          📅 Agenda
        </a>
        <button type="button" class="btn-link-ics" title="Baixar .ICS para celular">
          ⬇ .ICS
        </button>
        <button type="button" class="btn-excluir" title="Excluir plantão">🗑️</button>
      </div>
    `;

    d.querySelector('.btn-link-ics').onclick = () => baixarIcs(s);
    d.querySelector('.btn-excluir').onclick = async () => {
      if (!confirm(`Excluir o plantão de ${s.tipo} em ${s.local}?`)) return;
      await api('DELETE', '/api/shifts/' + s.id);
      carregar();
    };

    box.appendChild(d);
  });
}

$('filtroLocal').onchange = renderizarLista;
$('btnAtualizar').onclick = carregar;

// ---- Agente WhatsApp Próprio (Baileys) ----
async function checarStatusWa() {
  try {
    const wa = await api('GET', '/api/wa/status');
    const badge = $('badgeEstadoWa');
    const imgQr = $('imgQrWa');
    const placeholder = $('qrPlaceholder');

    if (wa.estado === 'conectado') {
      badge.textContent = '🟢 Conectado';
      badge.className = 'tag-estado-wa conectado';
      imgQr.style.display = 'none';
      placeholder.textContent = '✓ WhatsApp da Dra. conectado e ativo! Os lembretes são enviados automaticamente.';
      $('statusWa').innerHTML = '<span>WhatsApp: <strong>✓ Conectado (+55 75 99181-5612)</strong></span>';
    } else if (wa.estado === 'pareando') {
      badge.textContent = '🟡 Aguardando Pareamento';
      badge.className = 'tag-estado-wa pareando';
      if (wa.qrDisponivel) {
        imgQr.src = '/api/wa/qr?t=' + Date.now();
        imgQr.style.display = 'block';
        placeholder.style.display = 'none';
      } else {
        placeholder.textContent = 'Gerando QR code… Aguarde alguns segundos.';
      }
      $('statusWa').innerHTML = '<span>WhatsApp: <strong>🟡 Pareando…</strong></span>';
    } else {
      badge.textContent = '🔴 Desconectado';
      badge.className = 'tag-estado-wa desconectado';
      imgQr.style.display = 'none';
      placeholder.textContent = 'WhatsApp desconectado. Clique em Gerar Novo QR ou use o Código de Pareamento.';
      $('statusWa').innerHTML = '<span>WhatsApp: <strong>🔴 Desconectado</strong></span>';
    }
  } catch (err) {
    console.warn('Erro ao checar status do WhatsApp:', err);
  }
}

// Gerar Código de Pareamento de 8 Dígitos (sem câmera)
$('btnPedirCodigoPair').onclick = async () => {
  const num = $('inputPairNum').value.trim();
  if (!num) {
    alert('Informe o número de telefone com DDD (ex: 5575991815612).');
    return;
  }
  $('btnPedirCodigoPair').disabled = true;
  $('btnPedirCodigoPair').textContent = 'Gerando…';

  const r = await api('POST', '/api/wa/pair-code', { numero: num });
  $('btnPedirCodigoPair').disabled = false;
  $('btnPedirCodigoPair').textContent = 'Gerar Código';

  if (r.ok && r.code) {
    $('boxPairCode').style.display = 'block';
    $('displayPairCode').textContent = r.code;
  } else {
    alert('Não foi possível gerar código agora: ' + (r.error || 'tente escanear o QR'));
  }
};

$('btnReconectarWa').onclick = async () => {
  await api('POST', '/api/wa/reconnect', {});
  setTimeout(checarStatusWa, 2000);
};

// ---- Configurações Gerais ----
async function carregarCfg() {
  const c = await api('GET', '/api/config');
  $('cfgWhats').value = c.WHATSAPP_NUMBER || WHATSAPP_OFICIAL;
  $('cfgProv').value = c.WHATSAPP_PROVIDER || 'agente';
  $('cfgJanelas').value = c.REMINDER_WINDOWS_MIN || '1440,120';
  $('cfgResumo').value = c.DAILY_SUMMARY_TIME || '07:00';

  const g = await api('GET', '/api/google/status');
  $('statusGoogle').innerHTML = g.connected
    ? `<span>Agenda: <strong>✓ ${g.email || EMAIL_OFICIAL}</strong></span>`
    : `<span>Agenda: <strong>${EMAIL_OFICIAL}</strong></span>`;
  $('btnGoogle').textContent = g.connected ? '✓ Google Agenda Conectada' : '🔗 Conectar Google Agenda OAuth2';

  checarStatusWa();
}

$('btnSalvarCfg').onclick = async () => {
  const r = await api('PUT', '/api/config', {
    WHATSAPP_NUMBER: $('cfgWhats').value,
    WHATSAPP_PROVIDER: $('cfgProv').value,
    REMINDER_WINDOWS_MIN: $('cfgJanelas').value,
    DAILY_SUMMARY_TIME: $('cfgResumo').value
  });
  alert(r.ok ? 'Configurações salvas com sucesso! 💚' : 'Erro ao salvar: ' + r.error);
};

$('btnTestarWpp').onclick = async () => {
  const r = await api('POST', '/api/test-whatsapp', {});
  alert(r.ok ? 'Mensagem de teste enviada! Confira seu WhatsApp (+55 75 99181-5612). 📲' : 'Erro: ' + r.error);
};

$('btnGoogle').onclick = async () => {
  const r = await api('GET', '/api/google/auth');
  if (r.ok) {
    window.open(r.url, '_blank', 'width=540,height=660');
  } else {
    alert(
      'Para a sincronização direta via API do Google Cloud, adicione suas credenciais no arquivo .env (veja o README). Você também pode usar o botão "📅 Agenda" em cada plantão para adicionar instantaneamente sem precisar configurar o Google Cloud!'
    );
  }
};

// Inicialização
carregar();
carregarCfg();
setInterval(carregar, 30000);
setInterval(checarStatusWa, 15000);

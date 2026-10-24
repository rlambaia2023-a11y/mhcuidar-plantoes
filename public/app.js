// mhcuidar • Plantões — frontend
const $ = (id) => document.getElementById(id);
const api = (m, url, body) =>
  fetch(url, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    .then((r) => r.json().then((j) => ({ ok: r.ok, ...j })));

let tipoForcado = null;

// ---- botões de tipo rápido ----
document.querySelectorAll('.tipos button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.tipos button').forEach((x) => x.classList.remove('ativo'));
    if (tipoForcado === b.dataset.tipo) { tipoForcado = null; }
    else { tipoForcado = b.dataset.tipo; b.classList.add('ativo'); }
  };
});

// ---- voz (Web Speech API, pt-BR) ----
let rec = null, gravando = false;
$('btnVoz').onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Este navegador não suporta ditado por voz. Use o Chrome no celular ou computador.'); return; }
  if (gravando) { rec.stop(); return; }
  rec = new SR();
  rec.lang = 'pt-BR';
  rec.interimResults = true;
  const base = $('texto').value ? $('texto').value.trim() + ' ' : '';
  rec.onresult = (e) => {
    let txt = '';
    for (const r of e.results) txt += r[0].transcript;
    $('texto').value = base + txt;
  };
  rec.onend = () => { gravando = false; $('btnVoz').classList.remove('gravando'); };
  rec.onerror = (e) => { alert('Não consegui ouvir: ' + e.error); gravando = false; $('btnVoz').classList.remove('gravando'); };
  rec.start();
  gravando = true;
  $('btnVoz').classList.add('gravando');
};

// ---- entender texto ----
const fmtDT = (iso) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toInputDT = (iso) => { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const fromInputDT = (v) => { const d = new Date(v); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00-03:00`; };

$('btnEntender').onclick = async () => {
  const texto = $('texto').value.trim();
  if (!texto) { alert('Digite ou fale o resumo do plantão primeiro.'); return; }
  $('btnEntender').disabled = true;
  $('btnEntender').textContent = 'Entendendo…';
  const r = await api('POST', '/api/parse', { texto });
  $('btnEntender').disabled = false;
  $('btnEntender').textContent = 'Entender e agendar →';
  if (!r.ok || !r.plantoes.length) { alert('Não entendi. Tente algo como: "Plantão 24h amanhã às 7h no Hospital São Luiz"'); return; }
  renderConfirmacao(r.plantoes);
};

function renderConfirmacao(plantoes) {
  const box = $('confirmacao');
  box.innerHTML = `<h3 style="margin:14px 0 4px">Confere pra mim? 👇</h3>`;
  plantoes.forEach((p, i) => {
    if (tipoForcado) {
      const horas = { '12h': 12, '24h': 24, '48h': 48, '72h': 72, SN: 24 }[tipoForcado];
      p = { ...p, tipo: tipoForcado, duracao_horas: horas };
      const ini = new Date(p.inicio);
      p.fim = fromInputDT(new Date(ini.getTime() + horas * 3600 * 1000).toISOString().slice(0, 16));
    }
    const div = document.createElement('div');
    div.className = 'conf' + (p.confianca === 'baixa' ? ' baixa' : '');
    div.innerHTML = `
      <h3>📋 ${p.tipo === 'SN' ? 'Sobreaviso (SN)' : 'Plantão ' + p.tipo} <small style="color:#6b7d73">(${p.confianca})</small></h3>
      <div class="campos">
        <label>Tipo<select data-k="tipo">
          ${['12h', '24h', '48h', '72h', 'SN'].map((t) => `<option ${t === p.tipo ? 'selected' : ''}>${t}</option>`).join('')}
        </select></label>
        <label>Local<input data-k="local" value="${(p.local || '').replace(/"/g, '&quot')}"></label>
        <label>Início<input data-k="inicio" type="datetime-local" value="${toInputDT(p.inicio)}"></label>
        <label>Fim<input data-k="fim" type="datetime-local" value="${toInputDT(p.fim)}"></label>
      </div>
      ${p.avisos.length ? `<p class="aviso">💡 ${p.avisos.join(' ')}</p>` : ''}
      <div class="botoes">
        <button class="primario" data-a="ok">✓ Confirmar e agendar</button>
        <button data-a="no">Descartar</button>
      </div>`;
    const ler = () => {
      const v = {};
      div.querySelectorAll('[data-k]').forEach((el) => (v[el.dataset.k] = el.value));
      const horas = { '12h': 12, '24h': 24, '48h': 48, '72h': 72, SN: 24 }[v.tipo];
      return { tipo: v.tipo, duracao_horas: horas, inicio: fromInputDT(v.inicio), fim: fromInputDT(v.fim), local: v.local.trim(), texto };
    };
    div.querySelector('[data-a="ok"]').onclick = async (ev) => {
      ev.target.disabled = true;
      const r = await api('POST', '/api/shifts', ler());
      if (r.ok) { div.remove(); $('texto').value = ''; tipoForcado = null; document.querySelectorAll('.tipos button').forEach((x) => x.classList.remove('ativo')); carregar(); }
      else alert('Erro: ' + (r.error || 'tente de novo'));
    };
    div.querySelector('[data-a="no"]').onclick = () => div.remove();
    // fim recalcula sozinho quando muda tipo ou início
    const selTipo = div.querySelector('[data-k="tipo"]'), inpIni = div.querySelector('[data-k="inicio"]'), inpFim = div.querySelector('[data-k="fim"]');
    const recalc = () => {
      const horas = { '12h': 12, '24h': 24, '48h': 48, '72h': 72, SN: 24 }[selTipo.value];
      const ini = new Date(inpIni.value);
      if (!isNaN(ini)) inpFim.value = toInputDT(new Date(ini.getTime() + horas * 3600 * 1000).toISOString());
    };
    selTipo.onchange = recalc; inpIni.onchange = recalc;
    box.appendChild(div);
  });
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---- lista ----
async function carregar() {
  const r = await api('GET', '/api/shifts?from=' + encodeURIComponent(new Date().toISOString()));
  const box = $('lista');
  if (!r.ok || !r.shifts.length) { box.innerHTML = '<p class="vazio">Nenhum plantão futuro. Que tal agendar o próximo? 💚</p>'; return; }
  box.innerHTML = '';
  for (const s of r.shifts) {
    const d = document.createElement('div');
    d.className = 'plantao';
    const fim = new Date(s.fim), ini = new Date(s.inicio);
    d.innerHTML = `
      <div class="info">
        <span class="tipo ${s.tipo === 'SN' ? 'sn' : ''}">${s.tipo === 'SN' ? 'SN' : s.tipo}</span><br>
        <strong>${fmtDT(s.inicio)}</strong> → ${fmtDT(s.fim)}<br>
        ${s.local ? `📍 ${s.local}<br>` : ''}<small>${s.google_event_id ? '✓ na Google Agenda' : 'só local'}</small>
      </div>
      <button class="excluir" title="Excluir">🗑️</button>`;
    d.querySelector('.excluir').onclick = async () => {
      if (!confirm('Excluir este plantão?')) return;
      await api('DELETE', '/api/shifts/' + s.id);
      carregar();
    };
    box.appendChild(d);
  }
}
$('btnAtualizar').onclick = carregar;

// ---- config ----
async function carregarCfg() {
  const c = await api('GET', '/api/config');
  $('cfgWhats').value = c.WHATSAPP_NUMBER || '';
  $('cfgProv').value = c.WHATSAPP_PROVIDER || 'callmebot';
  $('cfgKey').value = c.CALLMEBOT_APIKEY || '';
  $('cfgJanelas').value = c.REMINDER_WINDOWS_MIN || '1440,120';
  $('cfgResumo').value = c.DAILY_SUMMARY_TIME || '';
  const g = await api('GET', '/api/google/status');
  $('statusGoogle').textContent = g.connected ? 'agenda: ✓ ' + (g.email || 'conectada') : 'agenda: desconectada';
  $('btnGoogle').textContent = g.connected ? '✓ Agenda conectada' : '🔗 Conectar Google Agenda';
}
$('btnSalvarCfg').onclick = async () => {
  const r = await api('PUT', '/api/config', {
    WHATSAPP_NUMBER: $('cfgWhats').value,
    WHATSAPP_PROVIDER: $('cfgProv').value,
    CALLMEBOT_APIKEY: $('cfgKey').value,
    REMINDER_WINDOWS_MIN: $('cfgJanelas').value,
    DAILY_SUMMARY_TIME: $('cfgResumo').value,
  });
  alert(r.ok ? 'Configurações salvas! 💚' : 'Erro: ' + r.error);
};
$('btnTestarWpp').onclick = async () => {
  const r = await api('POST', '/api/test-whatsapp', {});
  alert(r.ok ? 'Mensagem enviada! Confira seu WhatsApp. 📲' : 'Erro: ' + r.error);
};
$('btnGoogle').onclick = async () => {
  const r = await api('GET', '/api/google/auth');
  if (r.ok) window.open(r.url, '_blank', 'width=520,height=640');
  else alert('Configure as credenciais Google primeiro (veja o README). Detalhe: ' + r.error);
};

carregar(); carregarCfg();
setInterval(carregar, 60000);

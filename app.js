// ============================================================
// Vylo - Chamados: front-end (sem login Google)
// ============================================================

let PAINEL_KEY = sessionStorage.getItem('fs_painel_key') || '';
let CHAMADOS = [];
let COMENTARIOS = [];
let anexosSelecionados = [];
let currentTicketId = null;
let MODO_ATUAL = 'novo'; // 'novo' | 'fila' | 'login' | 'painel' (controla o modal: edicao ou so leitura)
let TAB_FILA = 'ativos'; // 'ativos' | 'resolvidos' | 'todos'

const ANEXO_MAX_MB = 5;
const ANEXO_LABEL_PADRAO = 'Escolher arquivos (até 5MB cada)';
const PRIO_RANK = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };

function $(id) { return document.getElementById(id); }

function semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function prioKey(p) { return semAcento(p); }

// ── Navegação entre views ────────────────────────────────────
function showView(v) {
  MODO_ATUAL = v;
  $('viewNovo').style.display   = v === 'novo'   ? '' : 'none';
  $('viewFila').style.display   = v === 'fila'   ? 'block' : 'none';
  $('viewLogin').style.display  = v === 'login'  ? 'block' : 'none';
  $('viewPainel').style.display = v === 'painel' ? 'block' : 'none';

  const labelNav = $('btnNavLabel');
  const iconNav  = document.querySelector('#btnNav .ti');
  if (v === 'painel' || v === 'login') {
    labelNav.textContent = 'Abrir chamado';
    iconNav.className = 'ti ti-arrow-back';
  } else {
    labelNav.textContent = 'Painel';
    iconNav.className = 'ti ti-lock';
  }

  const labelFila = $('btnFilaLabel');
  const iconFila  = document.querySelector('#btnFila .ti');
  if (v === 'fila') {
    labelFila.textContent = 'Abrir chamado';
    iconFila.className = 'ti ti-arrow-back';
  } else {
    labelFila.textContent = 'Fila de chamados';
    iconFila.className = 'ti ti-list-check';
  }
  window.scrollTo(0, 0);
}

function toggleView() {
  if (MODO_ATUAL === 'painel' || MODO_ATUAL === 'login') { showView('novo'); return; }
  if (PAINEL_KEY) { showView('painel'); reloadPainel(); }
  else { showView('login'); $('pSenha').focus(); }
}

function toggleFila() {
  if (MODO_ATUAL === 'fila') { showView('novo'); return; }
  showView('fila');
  reloadFila();
}

// ── Init ──────────────────────────────────────────────────────
function prazoCurto(horas) {
  if (!horas) return '';
  if (horas < 24) return `até ${horas}h`;
  const dias = Math.round(horas / 24);
  return dias > 1 ? `até ${dias} dias úteis` : `até ${dias} dia útil`;
}

function preencherSelect(id, itens, placeholder) {
  const sel = $(id);
  if (placeholder) {
    const op0 = document.createElement('option');
    op0.value = ''; op0.textContent = placeholder;
    sel.appendChild(op0);
  }
  itens.forEach(s => {
    const op = document.createElement('option');
    op.value = s; op.textContent = s;
    sel.appendChild(op);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  preencherSelect('nSetor', CONFIG.SETORES, 'Selecione o setor');
  preencherSelect('fStatus', CONFIG.STATUS);
  preencherSelect('fSetor', CONFIG.SETORES);
  preencherSelect('gSetor', CONFIG.SETORES);

  // Prioridade: 4 cards com o prazo de cada uma
  $('nPrioGroup').innerHTML = CONFIG.PRIORIDADES.map(p => `
    <label class="prio-opt p-${prioKey(p)}">
      <input type="radio" name="nPrio" value="${p}" ${p === 'Média' ? 'checked' : ''}/>
      <span class="prio-card">
        <span class="prio-name">${p}</span>
        <span class="prio-sla">${prazoCurto(CONFIG.PRAZO_HORAS[p])}</span>
      </span>
    </label>`).join('');

  // Limpa o erro do campo assim que a pessoa volta a digitar
  ['nQuem', 'nEmail', 'nSetor', 'nTit', 'nDesc'].forEach(id => {
    const ev = id === 'nSetor' ? 'change' : 'input';
    $(id).addEventListener(ev, () => setErro(id, ''));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('ovTicket').classList.contains('open')) closeMod();
  });

  showView('novo');
});

function updateAnexosLabel(input) {
  const arquivos = Array.from(input.files || []);
  const grandes = arquivos.filter(f => f.size > ANEXO_MAX_MB * 1024 * 1024);
  if (grandes.length) {
    setNovoMsg(`O arquivo "${grandes[0].name}" passa de ${ANEXO_MAX_MB}MB. Remova ou escolha um menor.`, 'err');
    input.value = '';
    anexosSelecionados = [];
    $('nAnexosLabel').textContent = ANEXO_LABEL_PADRAO;
    return;
  }
  setNovoMsg('');
  anexosSelecionados = arquivos;
  $('nAnexosLabel').textContent = anexosSelecionados.length
    ? (anexosSelecionados.length === 1 ? anexosSelecionados[0].name : `${anexosSelecionados.length} arquivos selecionados`)
    : ANEXO_LABEL_PADRAO;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ── Abrir chamado ─────────────────────────────────────────────
function setErro(id, msg) {
  const campo = $(id);
  const box = $('e' + id.slice(1));
  if (!campo || !box) return;
  box.textContent = msg || '';
  if (msg) campo.setAttribute('aria-invalid', 'true');
  else campo.removeAttribute('aria-invalid');
}

function validarNovo(v) {
  const erros = [];
  if (!v.solicitante) erros.push(['nQuem', 'Digite seu nome para enviar o chamado.']);
  if (!v.email || !/^\S+@\S+\.\S+$/.test(v.email)) erros.push(['nEmail', 'Digite um e-mail válido. É por ele que você recebe as respostas.']);
  if (!v.setor) erros.push(['nSetor', 'Selecione o setor.']);
  if (!v.titulo) erros.push(['nTit', 'Informe um título.']);
  if (!v.descricao) erros.push(['nDesc', 'Descreva o que você precisa.']);
  ['nQuem', 'nEmail', 'nSetor', 'nTit', 'nDesc'].forEach(id => setErro(id, ''));
  erros.forEach(([id, msg]) => setErro(id, msg));
  if (erros.length) $(erros[0][0]).focus();
  return erros.length === 0;
}

async function submitTicket() {
  const v = {
    solicitante: $('nQuem').value.trim(),
    email: $('nEmail').value.trim(),
    setor: $('nSetor').value,
    titulo: $('nTit').value.trim(),
    descricao: $('nDesc').value.trim(),
    prioridade: (document.querySelector('input[name="nPrio"]:checked') || {}).value || 'Média',
  };
  setNovoMsg('');
  if (!validarNovo(v)) return;

  const btn = $('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader-2" aria-hidden="true"></i> Enviando...';

  try {
    const anexos = await Promise.all(anexosSelecionados.map(async f => ({
      filename: f.name, mimeType: f.type, data: await fileToBase64(f)
    })));

    const resp = await apiPost({ action: 'create', ...v, anexos });

    if (resp.ok) {
      $('okId').textContent = resp.id;
      $('formNovo').style.display = 'none';
      $('novoOk').style.display = 'block';
      $('nQuem').value = '';
      $('nEmail').value = '';
      $('nSetor').value = '';
      $('nTit').value = '';
      $('nDesc').value = '';
      $('nAnexos').value = '';
      anexosSelecionados = [];
      $('nAnexosLabel').textContent = ANEXO_LABEL_PADRAO;
      const media = document.querySelector('input[name="nPrio"][value="Média"]');
      if (media) media.checked = true;
      window.scrollTo(0, 0);
    } else {
      setNovoMsg('Erro ao abrir chamado: ' + (resp.error || 'desconhecido'), 'err');
    }
  } catch (err) {
    setNovoMsg('Erro de conexão: ' + err.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-send" aria-hidden="true"></i> Enviar chamado';
  }
}

function novoOutro() {
  $('novoOk').style.display = 'none';
  $('formNovo').style.display = '';
  $('nQuem').focus();
}

function setNovoMsg(msg, tipo) {
  const el = $('novoMsg');
  el.textContent = msg || '';
  el.className = 'form-msg' + (tipo === 'err' ? ' err' : '');
  el.style.display = msg ? 'block' : 'none';
}

// ── Login do painel ──────────────────────────────────────────
async function doLoginPainel() {
  const senha = $('pSenha').value;
  const errBox = $('loginError');
  errBox.style.display = 'none';
  try {
    const resp = await apiPost({ action: 'checkAccess', senha });
    if (resp.ok) {
      PAINEL_KEY = resp.key;
      sessionStorage.setItem('fs_painel_key', PAINEL_KEY);
      $('pSenha').value = '';
      showView('painel');
      reloadPainel();
    } else {
      $('loginErrorMsg').textContent = resp.error || 'Senha incorreta';
      errBox.style.display = 'flex';
    }
  } catch (err) {
    $('loginErrorMsg').textContent = 'Erro de conexão: ' + err.message;
    errBox.style.display = 'flex';
  }
}

function logoutPainel() {
  PAINEL_KEY = '';
  sessionStorage.removeItem('fs_painel_key');
  showView('novo');
}

// ── Utilidades de lista ───────────────────────────────────────
function skeletonList(n) {
  return Array.from({ length: n }, () =>
    '<div class="sk-card"><div class="sk sk-line"></div><div class="sk sk-line short"></div></div>').join('');
}

function msgVazia(icone, titulo, texto) {
  return `<div class="empty"><i class="ti ${icone}" aria-hidden="true"></i><div class="empty-title">${titulo}</div>${texto ? `<p>${texto}</p>` : ''}</div>`;
}

// ── Painel ────────────────────────────────────────────────────
async function reloadPainel() {
  const tlist = $('tlist');
  tlist.innerHTML = skeletonList(4);
  try {
    const resp = await apiGet({ action: 'list', key: PAINEL_KEY });
    if (!resp.ok) {
      if ((resp.error || '').includes('Acesso negado')) { logoutPainel(); return; }
      tlist.innerHTML = msgVazia('ti-alert-circle', escapeHtml(resp.error));
      return;
    }
    CHAMADOS = resp.chamados;
    COMENTARIOS = resp.comentarios || [];
    renderPainel();
  } catch (err) {
    tlist.innerHTML = msgVazia('ti-wifi-off', 'Erro de conexão', escapeHtml(err.message));
  }
}

function isDiaUtil(d) {
  const dia = d.getDay();
  return dia !== 0 && dia !== 6; // 0=domingo, 6=sabado
}

// Soma horas de prazo contando so segunda a sexta: sabado e domingo
// sao pulados inteiros e nao consomem prazo.
function calcularPrazo(dataAbertura, horas) {
  let atual = new Date(dataAbertura);
  let restante = horas;
  while (restante > 0) {
    if (isDiaUtil(atual)) {
      const fimDoDia = new Date(atual);
      fimDoDia.setHours(24, 0, 0, 0);
      const horasAteFimDoDia = (fimDoDia - atual) / 3600000;
      const passo = Math.min(restante, horasAteFimDoDia);
      atual = new Date(atual.getTime() + passo * 3600000);
      restante -= passo;
    } else {
      atual.setHours(24, 0, 0, 0); // pula pro inicio do proximo dia
    }
  }
  return atual;
}

function isEncerrado(t) { return t.status === 'Resolvido' || t.status === 'Cancelado'; }

function isAtrasado(t) {
  if (isEncerrado(t)) return false;
  const horas = CONFIG.PRAZO_HORAS[t.prioridade];
  if (!horas) return false;
  const prazo = calcularPrazo(new Date(t.dataAbertura), horas).getTime();
  return Date.now() > prazo;
}

function prazoLabel(t) {
  const horas = CONFIG.PRAZO_HORAS[t.prioridade];
  if (!horas) return '';
  const prazo = calcularPrazo(new Date(t.dataAbertura), horas);
  return prazo.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Posição na fila: so chamados "Aberto", por prioridade e depois por ordem de abertura.
function ordenarFila(a, b) {
  return (PRIO_RANK[b.prioridade] || 0) - (PRIO_RANK[a.prioridade] || 0) ||
         new Date(a.dataAbertura) - new Date(b.dataAbertura);
}
function posicoesFila() {
  const abertos = CHAMADOS.filter(t => t.status === 'Aberto').sort(ordenarFila);
  const mapa = {};
  abertos.forEach((t, i) => { mapa[t.id] = { pos: i + 1, total: abertos.length }; });
  return mapa;
}

function statusClasse(s) {
  return { 'Aberto': 's-ab', 'Em andamento': 's-en', 'Resolvido': 's-ap', 'Cancelado': 's-ca' }[s] || 's-ab';
}

function renderTicketCards(lista, containerId, mostrarPosicao) {
  const container = $(containerId);
  if (!lista.length) {
    container.innerHTML = msgVazia('ti-inbox', 'Nenhum chamado por aqui', 'Ajuste os filtros ou abra um novo chamado.');
    return;
  }
  const posicoes = mostrarPosicao ? posicoesFila() : {};

  container.innerHTML = lista.map(t => {
    const p = posicoes[t.id];
    return `
    <div class="tcard p-${prioKey(t.prioridade)}" role="button" tabindex="0"
         onclick="openTicket('${escapeHtml(t.id)}')"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openTicket('${escapeHtml(t.id)}')}">
      <div class="tcard-top">
        <div class="tcard-title">${escapeHtml(t.titulo)}</div>
        ${p ? `<span class="sb s-pos">Posição ${p.pos} de ${p.total}</span>` : ''}
        <span class="sb ${statusClasse(t.status)}">${escapeHtml(t.status)}</span>
        ${isAtrasado(t) ? '<span class="sb s-re">Atrasado</span>' : ''}
      </div>
      <div class="tcard-meta">
        <span><i class="ti ti-user" aria-hidden="true"></i>${escapeHtml(t.solicitante)}</span>
        <span><i class="ti ti-building" aria-hidden="true"></i>${escapeHtml(t.setor)}</span>
        <span class="prio-tag prio-${prioKey(t.prioridade)}">${escapeHtml(t.prioridade)}</span>
        <span><i class="ti ti-clock" aria-hidden="true"></i>${fmtData(t.dataAbertura)}</span>
        <span><i class="ti ti-hourglass" aria-hidden="true"></i>Prazo: ${prazoLabel(t)}</span>
        ${t.responsavel ? `<span><i class="ti ti-user-check" aria-hidden="true"></i>${escapeHtml(t.responsavel)}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderPainel() {
  const st = $('fStatus').value;
  const se = $('fSetor').value;
  const bu = $('fBusca').value.toLowerCase();

  const lista = CHAMADOS.filter(t =>
    (!st || t.status === st) &&
    (!se || t.setor === se) &&
    (!bu || t.titulo.toLowerCase().includes(bu))
  );

  const mc = (label, val, cls) => `<div class="mc"><div class="mc-l">${label}</div><div class="mc-v ${cls || ''}">${val}</div></div>`;
  $('mcrow').innerHTML =
    mc('Total', CHAMADOS.length) +
    mc('Abertos', CHAMADOS.filter(t => t.status === 'Aberto').length, 'warn') +
    mc('Em andamento', CHAMADOS.filter(t => t.status === 'Em andamento').length) +
    mc('Resolvidos', CHAMADOS.filter(t => t.status === 'Resolvido').length, 'grn') +
    mc('Urgentes abertos', CHAMADOS.filter(t => t.prioridade === 'Urgente' && !isEncerrado(t)).length, 'red') +
    mc('Atrasados', CHAMADOS.filter(isAtrasado).length, 'red');

  renderTicketCards(lista, 'tlist', false);
}

// ── Fila pública (somente leitura, sem senha) ────────────────────
async function reloadFila() {
  const glist = $('glist');
  glist.innerHTML = skeletonList(4);
  $('gStats').innerHTML = '';
  try {
    const resp = await apiGet({ action: 'listPublic' });
    if (!resp.ok) {
      glist.innerHTML = msgVazia('ti-alert-circle', escapeHtml(resp.error));
      return;
    }
    CHAMADOS = resp.chamados;
    COMENTARIOS = resp.comentarios || [];
    renderFila();
  } catch (err) {
    glist.innerHTML = msgVazia('ti-wifi-off', 'Erro de conexão', escapeHtml(err.message));
  }
}

function setTabFila(tab) {
  TAB_FILA = tab;
  document.querySelectorAll('#gTabs .tab').forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  renderFila();
}

function renderFila() {
  const se = $('gSetor').value;
  const bu = $('gBusca').value.toLowerCase();

  const stat = (label, val, cls) => `<div class="stat"><div class="stat-v ${cls || ''}">${val}</div><div class="stat-l">${label}</div></div>`;
  $('gStats').innerHTML =
    stat('Na fila', CHAMADOS.filter(t => t.status === 'Aberto').length, 'warn') +
    stat('Em andamento', CHAMADOS.filter(t => t.status === 'Em andamento').length) +
    stat('Resolvidos', CHAMADOS.filter(t => t.status === 'Resolvido').length, 'grn') +
    stat('Atrasados', CHAMADOS.filter(isAtrasado).length, 'red');

  let lista = CHAMADOS.filter(t =>
    (TAB_FILA === 'todos' || (TAB_FILA === 'ativos' ? !isEncerrado(t) : t.status === 'Resolvido')) &&
    (!se || t.setor === se) &&
    (!bu || t.titulo.toLowerCase().includes(bu) || t.solicitante.toLowerCase().includes(bu))
  );

  if (TAB_FILA === 'ativos') {
    lista = lista.sort((a, b) => {
      const ea = a.status === 'Em andamento' ? 0 : 1;
      const eb = b.status === 'Em andamento' ? 0 : 1;
      return ea - eb || ordenarFila(a, b);
    });
  } else {
    lista = lista.sort((a, b) => new Date(b.dataAbertura) - new Date(a.dataAbertura));
  }

  renderTicketCards(lista, 'glist', true);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtData(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ── Detalhe do chamado ──────────────────────────────────────────
function stepperHtml(status) {
  if (status === 'Cancelado') return '<div class="cancel-note">Chamado cancelado</div>';
  const etapas = ['Aberto', 'Em andamento', 'Resolvido'];
  const idx = etapas.indexOf(status);
  return '<div class="stepper" aria-label="Andamento do chamado">' + etapas.map((e, i) => {
    const cls = i < idx ? 'done' : (i === idx ? 'now' : '');
    // Resolvido e a etapa final: fica marcada como concluida
    const feito = i < idx || (i === idx && e === 'Resolvido');
    const dot = feito ? '<i class="ti ti-check" aria-hidden="true"></i>' : (i + 1);
    const cls2 = feito ? 'done' : cls;
    return `<div class="step ${cls2}"><span class="step-dot">${dot}</span><span class="step-label">${e}</span></div>` +
      (i < etapas.length - 1 ? `<div class="step-line ${i < idx ? 'done' : ''}"></div>` : '');
  }).join('') + '</div>';
}

function openTicket(id) {
  const t = CHAMADOS.find(x => x.id === id);
  if (!t) return;
  currentTicketId = id;
  const somenteLeitura = MODO_ATUAL === 'fila';
  $('mTitle').textContent = t.id + ' - ' + t.titulo;

  const coments = COMENTARIOS.filter(c => c.chamadoId === id);
  const pos = somenteLeitura ? posicoesFila()[id] : null;

  $('mBody').innerHTML = `
    ${stepperHtml(t.status)}
    ${pos ? `<div class="ir"><span class="il">Posição</span><span>${pos.pos} de ${pos.total} na fila</span></div>` : ''}
    <div class="ir"><span class="il">Solicitante</span><span>${escapeHtml(t.solicitante)}</span></div>
    ${somenteLeitura ? '' : `<div class="ir"><span class="il">E-mail</span><span>${escapeHtml(t.email)}</span></div>`}
    <div class="ir"><span class="il">Setor</span><span>${escapeHtml(t.setor)}</span></div>
    <div class="ir"><span class="il">Prioridade</span><span class="prio-tag prio-${prioKey(t.prioridade)}">${escapeHtml(t.prioridade)}</span></div>
    <div class="ir"><span class="il">Status</span><span>${escapeHtml(t.status)}</span></div>
    <div class="ir"><span class="il">Aberto em</span><span>${fmtData(t.dataAbertura)}</span></div>
    <div class="ir"><span class="il">Prazo</span><span>${prazoLabel(t)} ${isAtrasado(t) ? '<span class="sb s-re">Atrasado</span>' : ''}</span></div>
    <div class="divl"></div>
    <div class="sec-title">Descrição</div>
    <p>${escapeHtml(t.descricao).replace(/\n/g, '<br>')}</p>
    ${t.anexos.length ? `
      <div class="sec-title" style="margin-top:14px">Anexos</div>
      <div class="anexos-list">
        ${t.anexos.map(a => `<a class="anexo-item" href="${escapeHtml(a)}" target="_blank" rel="noopener"><i class="ti ti-paperclip" aria-hidden="true"></i><span>Abrir anexo</span></a>`).join('')}
      </div>` : ''}
    <div class="divl"></div>
    ${somenteLeitura ? '' : `
    <div class="fg">
      <label class="fl" for="dStatus">Status</label>
      <select id="dStatus">${CONFIG.STATUS.map(s => `<option ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
    </div>
    <div class="fg">
      <label class="fl" for="dResp">Responsável</label>
      <select id="dResp">
        <option value="">Nenhum</option>
        ${CONFIG.RESPONSAVEIS.map(r => `<option ${r === t.responsavel ? 'selected' : ''}>${r}</option>`).join('')}
      </select>
    </div>
    <div class="divl"></div>`}
    <div class="sec-title">Comentários</div>
    <div class="chat-wrap">
      ${coments.length ? coments.map(c =>
        `<div class="cm"><div class="ca">${escapeHtml(c.autor)} · ${fmtData(c.data)}</div>${escapeHtml(c.texto)}</div>`).join('') : '<div class="empty" style="padding:16px"><p>Sem comentários ainda.</p></div>'}
    </div>
    ${somenteLeitura ? '' : `
    <div class="chat-input-row">
      <label class="sr-only" for="cAutor">Autor</label>
      <select id="cAutor">${CONFIG.RESPONSAVEIS.map(r => `<option>${r}</option>`).join('')}</select>
      <label class="sr-only" for="cTexto">Comentário</label>
      <input id="cTexto" type="text" placeholder="Escrever comentário" onkeydown="if(event.key==='Enter')addComentario()"/>
      <button class="btn btn-primary btn-sm" onclick="addComentario()" aria-label="Enviar comentário"><i class="ti ti-send" aria-hidden="true"></i></button>
    </div>`}
  `;

  $('mFoot').innerHTML = somenteLeitura
    ? `<button class="btn" onclick="closeMod()">Fechar</button>`
    : `
    <button class="btn" onclick="closeMod()">Fechar</button>
    <button class="btn btn-primary" onclick="salvarStatus()"><i class="ti ti-check" aria-hidden="true"></i> Salvar</button>
  `;

  $('ovTicket').classList.add('open');
}

async function salvarStatus() {
  const status = $('dStatus').value;
  const responsavel = $('dResp').value;
  const resp = await apiPost({ action: 'updateStatus', key: PAINEL_KEY, id: currentTicketId, status, responsavel });
  if (resp.ok) { closeMod(); reloadPainel(); }
  else alert('Erro ao salvar: ' + resp.error);
}

async function addComentario() {
  const autor = $('cAutor').value;
  const texto = $('cTexto').value.trim();
  if (!texto) return;
  const resp = await apiPost({ action: 'addComment', key: PAINEL_KEY, chamadoId: currentTicketId, autor, texto });
  if (resp.ok) {
    COMENTARIOS.push({ id: resp.id, chamadoId: currentTicketId, autor, texto, data: new Date().toISOString() });
    openTicket(currentTicketId);
  } else {
    alert('Erro ao comentar: ' + resp.error);
  }
}

function closeMod() {
  $('ovTicket').classList.remove('open');
  currentTicketId = null;
}

// ── Chamadas à API (Apps Script Web App) ────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function parseApiResponse(res) {
  const texto = await res.text();
  try {
    return JSON.parse(texto);
  } catch (err) {
    const erro = new Error('O servidor não respondeu corretamente (provavelmente anexo grande demais ou o App da Web precisa ser reimplantado). Tente sem anexo ou com um arquivo menor.');
    erro.respostaInvalida = true; // sinaliza que vale a pena tentar de novo
    throw erro;
  }
}

// Tenta de novo automaticamente quando a requisição falha antes de chegar
// no servidor (rede/cold start), comum logo após um redeploy. Não repete
// quando já chegou uma resposta do servidor mas ela veio inválida: nesse
// caso o servidor pode já ter processado (ex.: criado o chamado), e
// repetir arriscaria duplicar.
async function comRetentativa(fn, tentativas = 2, repetirRespostaInvalida = false) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      return await fn();
    } catch (err) {
      const vale = err.message === 'Failed to fetch' || (repetirRespostaInvalida && err.respostaInvalida);
      if (!vale || i === tentativas) throw err;
      await sleep(1200);
    }
  }
}

async function apiPost(body) {
  return comRetentativa(async () => {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS
      body: JSON.stringify(body),
    });
    return parseApiResponse(res);
  }); // só repete falha de rede, evita duplicar chamado/comentário
}

async function apiGet(params) {
  return comRetentativa(async () => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(CONFIG.API_URL + '?' + qs);
    return parseApiResponse(res);
  }, 2, true); // GET é sempre seguro de repetir, pode incluir resposta inválida
}

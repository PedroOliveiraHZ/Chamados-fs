// ============================================================
// Sistema de Chamados — front-end (sem login Google)
// ============================================================

let PAINEL_KEY = sessionStorage.getItem('fs_painel_key') || '';
let CHAMADOS = [];
let COMENTARIOS = [];
let anexosSelecionados = [];
let currentTicketId = null;

// ── Navegação entre views ────────────────────────────────────
function showView(v) {
  document.getElementById('viewNovo').style.display   = v === 'novo'   ? 'block' : 'none';
  document.getElementById('viewLogin').style.display  = v === 'login'  ? 'block' : 'none';
  document.getElementById('viewPainel').style.display = v === 'painel' ? 'block' : 'none';

  const label = document.getElementById('btnNavLabel');
  const icon  = document.querySelector('#btnNav .ti');
  if (v === 'novo') {
    label.textContent = 'Painel';
    icon.className = 'ti ti-lock';
  } else {
    label.textContent = 'Abrir chamado';
    icon.className = 'ti ti-arrow-back';
  }
}

function toggleView() {
  const atual = document.getElementById('viewNovo').style.display !== 'none' ? 'novo' : 'outro';
  if (atual === 'novo') {
    if (PAINEL_KEY) { showView('painel'); reloadPainel(); }
    else { showView('login'); document.getElementById('pSenha').focus(); }
  } else {
    showView('novo');
  }
}

// ── Init ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Preenche selects a partir do config.js
  const selQuem = document.getElementById('nQuem');
  CONFIG.PESSOAS.forEach(p => {
    const op = document.createElement('option');
    op.value = p.nome; op.textContent = p.nome;
    selQuem.appendChild(op);
  });
  const opOutro = document.createElement('option');
  opOutro.value = '__outro__'; opOutro.textContent = 'Outro (não estou na lista)';
  selQuem.appendChild(opOutro);

  const selSetor = document.getElementById('nSetor');
  CONFIG.SETORES.forEach(s => {
    const op = document.createElement('option');
    op.value = s; op.textContent = s;
    selSetor.appendChild(op);
  });

  const selPrio = document.getElementById('nPrio');
  CONFIG.PRIORIDADES.forEach(p => {
    const op = document.createElement('option');
    op.value = p; op.textContent = p;
    selPrio.appendChild(op);
  });

  const fStatus = document.getElementById('fStatus');
  CONFIG.STATUS.forEach(s => {
    const op = document.createElement('option');
    op.value = s; op.textContent = s;
    fStatus.appendChild(op);
  });
  const fSetor = document.getElementById('fSetor');
  CONFIG.SETORES.forEach(s => {
    const op = document.createElement('option');
    op.value = s; op.textContent = s;
    fSetor.appendChild(op);
  });

  showView('novo');
});

function onQuemChange() {
  const nome = document.getElementById('nQuem').value;
  const outroWrap = document.getElementById('nQuemOutroWrap');
  if (nome === '__outro__') {
    outroWrap.style.display = 'block';
    document.getElementById('nQuemOutro').focus();
    return;
  }
  outroWrap.style.display = 'none';
  const pessoa = CONFIG.PESSOAS.find(p => p.nome === nome);
  if (pessoa && pessoa.setor) document.getElementById('nSetor').value = pessoa.setor;
}

function updateAnexosLabel(input) {
  anexosSelecionados = Array.from(input.files || []);
  document.getElementById('nAnexosLabel').textContent =
    anexosSelecionados.length ? `${anexosSelecionados.length} arquivo(s) selecionado(s)` : 'Clique ou arraste arquivos aqui';
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
async function submitTicket() {
  const quemSel = document.getElementById('nQuem').value;
  let solicitante = quemSel;
  if (quemSel === '__outro__') {
    solicitante = document.getElementById('nQuemOutro').value.trim();
    if (!solicitante) {
      setNovoMsg('Digite seu nome.', 'err');
      return;
    }
  }
  const setor = document.getElementById('nSetor').value;
  const titulo = document.getElementById('nTit').value.trim();
  const descricao = document.getElementById('nDesc').value.trim();
  const prioridade = document.getElementById('nPrio').value;

  if (!solicitante || !setor || !titulo || !descricao) {
    setNovoMsg('Preencha quem é você, setor, título e descrição.', 'err');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Enviando...';

  try {
    const anexos = await Promise.all(anexosSelecionados.map(async f => ({
      filename: f.name, mimeType: f.type, data: await fileToBase64(f)
    })));

    const resp = await apiPost({
      action: 'create', solicitante, setor, titulo, descricao, prioridade, anexos
    });

    if (resp.ok) {
      setNovoMsg(`Chamado ${resp.id} aberto com sucesso! Henrique e Rafael foram notificados.`, 'ok');
      document.getElementById('nTit').value = '';
      document.getElementById('nDesc').value = '';
      document.getElementById('nAnexos').value = '';
      document.getElementById('nQuemOutro').value = '';
      anexosSelecionados = [];
      updateAnexosLabel({ files: [] });
    } else {
      setNovoMsg('Erro ao abrir chamado: ' + (resp.error || 'desconhecido'), 'err');
    }
  } catch (err) {
    setNovoMsg('Erro de conexão: ' + err.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-send"></i> Enviar chamado';
  }
}

function setNovoMsg(msg, tipo) {
  const el = document.getElementById('novoMsg');
  el.textContent = msg;
  el.style.padding = '10px 14px';
  el.style.borderRadius = '8px';
  el.style.fontSize = '13px';
  if (tipo === 'ok') { el.style.background = 'var(--success-bg)'; el.style.color = 'var(--success)'; }
  else { el.style.background = 'var(--danger-bg)'; el.style.color = 'var(--danger)'; }
}

// ── Login do painel ──────────────────────────────────────────
async function doLoginPainel() {
  const senha = document.getElementById('pSenha').value;
  const errBox = document.getElementById('loginError');
  errBox.style.display = 'none';
  try {
    const resp = await apiPost({ action: 'checkAccess', senha });
    if (resp.ok) {
      PAINEL_KEY = resp.key;
      sessionStorage.setItem('fs_painel_key', PAINEL_KEY);
      document.getElementById('pSenha').value = '';
      showView('painel');
      reloadPainel();
    } else {
      document.getElementById('loginErrorMsg').textContent = resp.error || 'Senha incorreta';
      errBox.style.display = 'flex';
    }
  } catch (err) {
    document.getElementById('loginErrorMsg').textContent = 'Erro de conexão: ' + err.message;
    errBox.style.display = 'flex';
  }
}

function logoutPainel() {
  PAINEL_KEY = '';
  sessionStorage.removeItem('fs_painel_key');
  showView('novo');
}

// ── Painel ────────────────────────────────────────────────────
async function reloadPainel() {
  const tlist = document.getElementById('tlist');
  tlist.innerHTML = '<div class="empty"><i class="ti ti-loader" style="animation:spin 1s linear infinite"></i><p>Carregando...</p></div>';
  try {
    const resp = await apiGet({ action: 'list', key: PAINEL_KEY });
    if (!resp.ok) {
      if ((resp.error || '').includes('Acesso negado')) { logoutPainel(); return; }
      tlist.innerHTML = `<div class="empty"><p>${resp.error}</p></div>`;
      return;
    }
    CHAMADOS = resp.chamados;
    COMENTARIOS = resp.comentarios || [];
    renderPainel();
  } catch (err) {
    tlist.innerHTML = `<div class="empty"><p>Erro de conexão: ${err.message}</p></div>`;
  }
}

function renderPainel() {
  const st = document.getElementById('fStatus').value;
  const se = document.getElementById('fSetor').value;
  const bu = document.getElementById('fBusca').value.toLowerCase();

  let lista = CHAMADOS.filter(t =>
    (!st || t.status === st) &&
    (!se || t.setor === se) &&
    (!bu || t.titulo.toLowerCase().includes(bu))
  );

  // Métricas
  const mc = (label, val, cls) => `<div class="mc"><div class="mc-l">${label}</div><div class="mc-v ${cls||''}">${val}</div></div>`;
  document.getElementById('mcrow').innerHTML =
    mc('Total', CHAMADOS.length) +
    mc('Abertos', CHAMADOS.filter(t=>t.status==='Aberto').length, 'warn') +
    mc('Em andamento', CHAMADOS.filter(t=>t.status==='Em andamento').length) +
    mc('Resolvidos', CHAMADOS.filter(t=>t.status==='Resolvido').length, 'grn') +
    mc('Urgentes abertos', CHAMADOS.filter(t=>t.prioridade==='Urgente'&&t.status!=='Resolvido'&&t.status!=='Cancelado').length, 'red');

  const tlist = document.getElementById('tlist');
  if (!lista.length) {
    tlist.innerHTML = '<div class="empty"><i class="ti ti-inbox"></i><p>Nenhum chamado encontrado.</p></div>';
    return;
  }

  const statusClass = { 'Aberto':'s-ab', 'Em andamento':'s-en', 'Resolvido':'s-ap', 'Cancelado':'s-re' };
  const prioClass = { 'Baixa':'prio-baixa', 'Média':'prio-média', 'Alta':'prio-alta', 'Urgente':'prio-urgente' };

  tlist.innerHTML = lista.map(t => `
    <div class="tcard" onclick="openTicket('${t.id}')">
      <div class="tcard-top">
        <div class="tcard-title">${escapeHtml(t.titulo)}</div>
        <span class="sb ${statusClass[t.status]||'s-ab'}">${t.status}</span>
      </div>
      <div class="tcard-meta">
        <span><i class="ti ti-user"></i>${escapeHtml(t.solicitante)}</span>
        <span><i class="ti ti-building"></i>${escapeHtml(t.setor)}</span>
        <span class="prio-tag ${prioClass[t.prioridade]||''}">${t.prioridade}</span>
        <span><i class="ti ti-clock"></i>${fmtData(t.dataAbertura)}</span>
        ${t.responsavel ? `<span><i class="ti ti-user-check"></i>${escapeHtml(t.responsavel)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function fmtData(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
}

// ── Detalhe do chamado ──────────────────────────────────────────
function openTicket(id) {
  const t = CHAMADOS.find(x => x.id === id);
  if (!t) return;
  currentTicketId = id;
  document.getElementById('mTitle').textContent = t.id + ' — ' + t.titulo;

  const coments = COMENTARIOS.filter(c => c.chamadoId === id);

  document.getElementById('mBody').innerHTML = `
    <div class="ir"><span class="il">Solicitante</span><span>${escapeHtml(t.solicitante)}</span></div>
    <div class="ir"><span class="il">Setor</span><span>${escapeHtml(t.setor)}</span></div>
    <div class="ir"><span class="il">Prioridade</span><span>${t.prioridade}</span></div>
    <div class="ir"><span class="il">Aberto em</span><span>${fmtData(t.dataAbertura)}</span></div>
    <div class="divl"></div>
    <div class="sec-title">Descrição</div>
    <p>${escapeHtml(t.descricao).replace(/\n/g,'<br>')}</p>
    ${t.anexos.length ? `
      <div class="sec-title" style="margin-top:14px">Anexos</div>
      <div class="anexos-list">
        ${t.anexos.map(a => `<a class="anexo-item" href="${a}" target="_blank"><i class="ti ti-paperclip"></i><span>Abrir anexo</span></a>`).join('')}
      </div>` : ''}
    <div class="divl"></div>
    <div class="fg">
      <label class="fl">Status</label>
      <select id="dStatus">${CONFIG.STATUS.map(s => `<option ${s===t.status?'selected':''}>${s}</option>`).join('')}</select>
    </div>
    <div class="fg">
      <label class="fl">Responsável</label>
      <select id="dResp">
        <option value="">-- nenhum --</option>
        ${CONFIG.RESPONSAVEIS.map(r => `<option ${r===t.responsavel?'selected':''}>${r}</option>`).join('')}
      </select>
    </div>
    <div class="divl"></div>
    <div class="sec-title">Comentários</div>
    <div class="chat-wrap">
      ${coments.length ? coments.map(c => `
        <div class="cm other">
          <div class="ca">${escapeHtml(c.autor)} · ${fmtData(c.data)}</div>
          ${escapeHtml(c.texto)}
        </div>`).join('') : '<div class="empty" style="padding:16px"><p>Sem comentários ainda.</p></div>'}
    </div>
    <div class="chat-input-row">
      <select id="cAutor" style="max-width:140px">${CONFIG.RESPONSAVEIS.map(r=>`<option>${r}</option>`).join('')}</select>
      <input id="cTexto" type="text" placeholder="Escrever comentário..." onkeydown="if(event.key==='Enter')addComentario()"/>
      <button class="btn btn-primary btn-sm" onclick="addComentario()"><i class="ti ti-send"></i></button>
    </div>
  `;

  document.getElementById('mFoot').innerHTML = `
    <button class="btn" onclick="closeMod()">Fechar</button>
    <button class="btn btn-primary" onclick="salvarStatus()"><i class="ti ti-check"></i> Salvar</button>
  `;

  document.getElementById('ovTicket').classList.add('open');
}

async function salvarStatus() {
  const status = document.getElementById('dStatus').value;
  const responsavel = document.getElementById('dResp').value;
  const resp = await apiPost({ action: 'updateStatus', key: PAINEL_KEY, id: currentTicketId, status, responsavel });
  if (resp.ok) { closeMod(); reloadPainel(); }
  else alert('Erro ao salvar: ' + resp.error);
}

async function addComentario() {
  const autor = document.getElementById('cAutor').value;
  const texto = document.getElementById('cTexto').value.trim();
  if (!texto) return;
  const resp = await apiPost({ action: 'addComment', key: PAINEL_KEY, chamadoId: currentTicketId, autor, texto });
  if (resp.ok) {
    COMENTARIOS.push({ id: resp.id, chamadoId: currentTicketId, autor, texto, data: new Date().toISOString() });
    document.getElementById('cTexto').value = '';
    openTicket(currentTicketId);
  } else {
    alert('Erro ao comentar: ' + resp.error);
  }
}

function closeMod() {
  document.getElementById('ovTicket').classList.remove('open');
  currentTicketId = null;
}

// ── Chamadas à API (Apps Script Web App) ────────────────────────
async function apiPost(body) {
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(CONFIG.API_URL + '?' + qs);
  return res.json();
}
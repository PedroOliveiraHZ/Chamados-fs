// ============================================================
//  FORTSUN — Sistema de Chamados
//  Domínio: https://chamados-fs.vercel.app
//  DB: Google Sheets (1x-dNniKp9o-WeFeZoMAKMXeoM0jv2-zQPM4qoIsuBQA)
//  Auth: Google Identity Services (OAuth 2.0)
// ============================================================

const SCOPES    = 'https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

let gapiReady    = false;
let gisReady     = false;
let tokenClient  = null;
let CU           = null;   // usuário logado
let S            = { tickets: [], setores: [] };
let selSubcat    = null;
let editSetorId  = null;

// Cabeçalhos das abas na planilha
const T_HDR = ['id','titulo','categoria','subcategoria','camposExtra','valor','descricao','prioridade','setorId','userId','userNome','status','criadoEm','steps','chat'];
const O_HDR = ['setorId','setorNome','orcamento','gasto','movimentos'];

// ============================================================
//  SUBCATEGORIAS
// ============================================================
const SETORES_CATS = {
  'Financeiro': [
    { id:'boletos',      nome:'Boletos',            icon:'ti-file-invoice',   desc:'Pagamento de boletos',           campos:['vencimento','favorecido','banco'] },
    { id:'ajuda_custos', nome:'Ajuda de Custos',    icon:'ti-credit-card',    desc:'Reembolso via Flash',            campos:['colaborador','tipo_despesa','periodo'] },
    { id:'rescisao',     nome:'Rescisão',            icon:'ti-user-minus',     desc:'Cálculo e pagamento',            campos:['colaborador','data_desligamento','motivo_desl'] },
    { id:'viagem',       nome:'Viagem',              icon:'ti-plane',          desc:'Passagens e hospedagem',         campos:['colaborador','destino','data_ida','data_volta'] },
    { id:'premiacao',    nome:'Premiação',           icon:'ti-trophy',         desc:'Consultor / Supervisor',         campos:['colaborador','cargo_premiado','competencia'] },
    { id:'folha',        nome:'Folha de Pagamento',  icon:'ti-receipt',        desc:'Processamento da folha',         campos:['competencia','tipo_folha'] },
  ],
  'Dados/TI': [
    { id:'dados_colab',  nome:'Dados de colaborador',icon:'ti-user-circle',    desc:'Cadastro e atualização',         campos:['colaborador','tipo_dado'] },
    { id:'rel_pgto',     nome:'Relação de pagamento', icon:'ti-report-money',  desc:'Relatórios e extratos',          campos:['periodo','formato'] },
    { id:'site_camp',    nome:'Site / Apresentação',  icon:'ti-device-desktop',desc:'Campanhas e materiais digitais', campos:['tipo_material','prazo'] },
    { id:'kpi_vendas',   nome:'KPI / Vendas',         icon:'ti-chart-bar',     desc:'Indicadores e faturamento',      campos:['periodo','tipo_relatorio'] },
  ],
  'RH': [
    { id:'contratacao',  nome:'Contratação',          icon:'ti-user-plus',     desc:'Processo seletivo',              campos:['cargo','setor_vaga','prazo'] },
    { id:'treinamento',  nome:'Treinamento',           icon:'ti-school',        desc:'Capacitação de equipe',          campos:['colaborador','tema_treino','data_treino'] },
    { id:'ajuste_proc',  nome:'Ajuste de processo',    icon:'ti-settings',      desc:'Melhoria de processos',          campos:['processo_afetado'] },
    { id:'notion',       nome:'Notion',                icon:'ti-brand-notion',  desc:'Suporte ao uso do Notion',       campos:['colaborador'] },
    { id:'endomkt',      nome:'Endomarketing',          icon:'ti-speakerphone',  desc:'Ideias e ações internas',        campos:['descricao_ideia'] },
    { id:'adv',          nome:'Apoio ADV',              icon:'ti-scale',         desc:'Suporte jurídico',               campos:['assunto_adv'] },
  ],
  'DP': [
    { id:'ajuste_ponto', nome:'Ajuste de ponto',      icon:'ti-clock-edit',    desc:'Correção de marcações',          campos:['colaborador','data_ponto','motivo_ponto'] },
    { id:'desligamento', nome:'Desligamento',          icon:'ti-user-off',      desc:'Processo de demissão',           campos:['colaborador','data_desligamento','motivo_desl'] },
    { id:'duvida_folha', nome:'Dúvida de folha',       icon:'ti-help',          desc:'Esclarecimento de holerite',     campos:['colaborador','competencia'] },
    { id:'envio_cheque', nome:'Envio de cheque',       icon:'ti-writing',       desc:'Emissão / envio de cheque',      campos:['favorecido','valor_cheque','banco'] },
    { id:'consignado',   nome:'Empréstimo consignado', icon:'ti-building-bank', desc:'Solicitação de consignado',      campos:['colaborador','valor_solicitado_emp'] },
  ],
  'Marketing': [
    { id:'material',     nome:'Material',              icon:'ti-file-text',     desc:'Arte e materiais gráficos',      campos:['tipo_material','prazo'] },
    { id:'campanha',     nome:'Campanha',               icon:'ti-speakerphone',  desc:'Campanhas de marketing',         campos:['objetivo','prazo','orcamento_camp'] },
    { id:'confrat',      nome:'Confraternização',       icon:'ti-confetti',      desc:'Eventos internos',               campos:['data_evento','n_pessoas','local'] },
    { id:'evento',       nome:'Evento',                 icon:'ti-calendar-event',desc:'Eventos externos',               campos:['data_evento','n_pessoas','local','tipo_evento'] },
  ],
  'Compliance/Logística': [
    { id:'fardamento',   nome:'Fardamento',             icon:'ti-shirt',         desc:'Uniformes e EPIs',               campos:['colaborador','tamanho','quantidade'] },
    { id:'bolsas',       nome:'Bolsas',                 icon:'ti-briefcase',     desc:'Bolsas e materiais',             campos:['colaborador','tipo_bolsa','quantidade'] },
    { id:'estoque',      nome:'Estoque',                icon:'ti-package',       desc:'Controle de estoque',            campos:['item','quantidade','motivo_estoque'] },
  ],
};

const CAMPOS_DEF = {
  vencimento:           { label:'Data de vencimento',      type:'date' },
  favorecido:           { label:'Favorecido / Empresa',    type:'text',   ph:'Nome completo ou razão social' },
  banco:                { label:'Banco / Dados bancários', type:'text',   ph:'Ex: BB Ag 1234-5' },
  colaborador:          { label:'Nome do colaborador',     type:'text',   ph:'Nome completo' },
  tipo_despesa:         { label:'Tipo de despesa',         type:'select', opts:['Alimentação','Transporte','Hospedagem','Combustível','Material','Outros'] },
  periodo:              { label:'Período de referência',   type:'text',   ph:'Ex: Maio/2025' },
  data_desligamento:    { label:'Data de desligamento',    type:'date' },
  motivo_desl:          { label:'Motivo',                  type:'select', opts:['Sem justa causa','Com justa causa','Pedido de demissão','Acordo','Término de contrato'] },
  destino:              { label:'Destino',                 type:'text',   ph:'Cidade / Estado' },
  data_ida:             { label:'Data de ida',             type:'date' },
  data_volta:           { label:'Data de volta',           type:'date' },
  cargo_premiado:       { label:'Cargo',                   type:'select', opts:['Consultor','Supervisor','Coordenador','Gerente','Outro'] },
  competencia:          { label:'Competência / Mês',       type:'text',   ph:'Ex: Abril/2025' },
  tipo_folha:           { label:'Tipo de folha',           type:'select', opts:['Mensal','13º – 1ª parcela','13º – 2ª parcela','Adiantamento','Férias','Complementar'] },
  tipo_dado:            { label:'Tipo de dado',            type:'select', opts:['Cadastro','Atualização','Exclusão','Relatório','Outro'] },
  formato:              { label:'Formato',                 type:'select', opts:['Excel','PDF','Google Sheets','CSV','Outro'] },
  tipo_material:        { label:'Tipo de material',        type:'select', opts:['Arte gráfica','Apresentação','Vídeo','Post','Banner','Outro'] },
  prazo:                { label:'Prazo desejado',          type:'date' },
  tipo_relatorio:       { label:'Tipo de relatório',       type:'select', opts:['Vendas','Faturamento','KPI','Ranking','Outro'] },
  cargo:                { label:'Cargo da vaga',           type:'text',   ph:'Ex: Consultor de vendas' },
  setor_vaga:           { label:'Setor da vaga',           type:'text',   ph:'Ex: Comercial' },
  tema_treino:          { label:'Tema do treinamento',     type:'text',   ph:'Ex: Atendimento ao cliente' },
  data_treino:          { label:'Data desejada',           type:'date' },
  processo_afetado:     { label:'Processo a ajustar',      type:'text',   ph:'Descreva qual processo' },
  descricao_ideia:      { label:'Descrição da ideia',      type:'text',   ph:'Resuma a ação ou ideia' },
  assunto_adv:          { label:'Assunto',                 type:'text',   ph:'Breve descrição' },
  data_ponto:           { label:'Data(s) do ponto',        type:'text',   ph:'Ex: 05/05/2025' },
  motivo_ponto:         { label:'Motivo do ajuste',        type:'text',   ph:'Explique o motivo' },
  valor_cheque:         { label:'Valor do cheque (R$)',    type:'number', ph:'0,00' },
  valor_solicitado_emp: { label:'Valor solicitado (R$)',   type:'number', ph:'0,00' },
  objetivo:             { label:'Objetivo da campanha',    type:'text',   ph:'Ex: Aumentar vendas' },
  orcamento_camp:       { label:'Orçamento (R$)',          type:'number', ph:'0,00' },
  data_evento:          { label:'Data do evento',          type:'date' },
  n_pessoas:            { label:'Nº estimado de pessoas',  type:'number', ph:'0' },
  local:                { label:'Local',                   type:'text',   ph:'Endereço ou nome do local' },
  tipo_evento:          { label:'Tipo de evento',          type:'select', opts:['Feira','Congresso','Palestra','Lançamento','Patrocínio','Outro'] },
  tamanho:              { label:'Tamanho',                 type:'select', opts:['PP','P','M','G','GG','XGG'] },
  quantidade:           { label:'Quantidade',              type:'number', ph:'0' },
  tipo_bolsa:           { label:'Tipo de bolsa',           type:'select', opts:['Faculdade','Curso técnico','Idioma','Pós-graduação','Outro'] },
  item:                 { label:'Item / produto',          type:'text',   ph:'Descreva o item' },
  motivo_estoque:       { label:'Motivo',                  type:'select', opts:['Reposição','Novo pedido','Inventário','Devolução'] },
};

// ============================================================
//  HELPERS
// ============================================================
const gU   = email => (CONFIG.ALLOWED_USERS || []).find(u => u.email.toLowerCase() === (email || '').toLowerCase());
const gS   = id    => S.setores.find(x => x.id === id);
const gSCfg= id    => (CONFIG.SETORES || []).find(s => s.id === id);
const fm   = v     => 'R$\u00a0' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
const fd   = ts    => new Date(ts).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' });
const esc  = t     => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
const pct  = s     => s.orcamento > 0 ? Math.min(100, Math.round(s.gasto / s.orcamento * 100)) : 0;
const barC = p     => p >= 90 ? '#A32D2D' : p >= 65 ? '#854F0B' : '#3B6D11';
const j    = v     => JSON.stringify(v);
const pj   = v     => { try { return JSON.parse(v); } catch(e) { return v; } };

function sClass(st) {
  if (st === 'Aguardando' || st === 'Em análise') return 's-ag';
  if (st === 'Aprovado')  return 's-ap';
  if (st === 'Recusado')  return 's-re';
  if (st === 'Encerrado') return 's-en';
  return 's-ab';
}
const curStep  = t => (t.steps || []).find(s => s.status === 'pendente') || null;
const subcatOf = t => (SETORES_CATS[t.categoria] || []).find(x => x.id === t.subcategoria) || null;
const nextId   = () => Math.max(0, ...S.tickets.map(t => Number(t.id))) + 1;

// ============================================================
//  INICIALIZAÇÃO — Google APIs
//  O script gapi chama gapiLoaded() via onload no HTML
// ============================================================
function gapiLoaded() {
  gapi.load('client', async () => {
    await gapi.client.init({ discoveryDocs: [DISCOVERY] });
    gapiReady = true;
    maybeInitGIS();
  });
}

// Google Identity Services chama esta função depois de carregado
function onGISLoad() {
  gisReady = true;
  maybeInitGIS();
}

function maybeInitGIS() {
  if (!gapiReady || !gisReady) return;

  if (!CONFIG.GOOGLE_CLIENT_ID || CONFIG.GOOGLE_CLIENT_ID.includes('SEU_CLIENT_ID')) {
    showLoginError('Configure o GOOGLE_CLIENT_ID em config.js antes de usar o sistema.');
    return;
  }

  // Usa OAuth2 implicit flow com openid + email + sheets em UMA única janela
  // Assim não abre popup separado — tudo num clique só
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/spreadsheets',
    ].join(' '),
    callback: onTokenReceived,
    error_callback: err => {
      const msg = err.type === 'popup_closed'
        ? 'Login cancelado. Clique em "Entrar com Google" e conclua a autorização.'
        : 'Erro OAuth: ' + (err.message || err.type || JSON.stringify(err));
      showLoginError(msg);
      setLoading(false);
    },
  });

  // Renderiza botão customizado (não o botão GIS padrão)
  // para evitar o two-tap flow que gera o segundo popup
  const btnContainer = document.getElementById('gSignInBtn');
  if (btnContainer) {
    btnContainer.innerHTML = `
      <button onclick="doGoogleLogin()" style="
        display:flex;align-items:center;gap:12px;
        padding:10px 20px;border-radius:8px;
        border:1px solid #dadce0;background:#fff;
        cursor:pointer;font-size:14px;font-family:inherit;
        color:#3c4043;font-weight:500;width:100%;justify-content:center;
      ">
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.174 0 7.548 0 9s.348 2.826.957 4.039l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
        </svg>
        Entrar com Google
      </button>`;
  }
}

// ============================================================
//  LOGIN — único clique abre janela com tudo junto
// ============================================================
function doGoogleLogin() {
  document.getElementById('loginError').style.display = 'none';
  setLoading(true);
  // prompt: 'select_account' força mostrar a tela de escolha de conta
  // e já inclui o scope do Sheets — tudo em uma janela
  tokenClient.requestAccessToken({ prompt: 'select_account' });
}

// Recebe o token OAuth com openid + sheets
async function onTokenReceived(resp) {
  if (resp.error) {
    const msg = resp.error === 'popup_closed'
      ? 'Login cancelado. Tente novamente.'
      : 'Erro ao autorizar: ' + resp.error + (resp.error_description ? ' — ' + resp.error_description : '');
    showLoginError(msg);
    setLoading(false);
    return;
  }

  // Token já está no gapi.client. Buscar info do usuário via userinfo
  try {
    const userResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + resp.access_token },
    });
    const userInfo = await userResp.json();
    const email    = (userInfo.email || '').toLowerCase();
    const userCfg  = gU(email);

    if (!userCfg) {
      showLoginError(`Acesso não autorizado para ${email}. Contate o administrador.`);
      setLoading(false);
      return;
    }

    CU = {
      ...userCfg,
      email,
      picture: userInfo.picture || '',
      googleName: userInfo.name || userCfg.nome,
    };

    await setupSheets();
    await loadFromSheets();
    launchApp();

  } catch (e) {
    showLoginError('Erro ao carregar dados: ' + e.message);
    setLoading(false);
    console.error(e);
  }
}

function showLoginError(msg) {
  document.getElementById('loginErrorMsg').textContent = msg;
  document.getElementById('loginError').style.display  = 'flex';
  setLoading(false);
}

function setLoading(on) {
  document.getElementById('loginLoading').style.display = on ? 'block' : 'none';
}

function launchApp() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('appView').style.display   = 'flex';
  renderTopbar();
  buildSidebar();
  showPage('tickets');
}

function renderTopbar() {
  document.getElementById('topNm').textContent = CU.nome;
  const av = document.getElementById('topAv');
  const ph = document.getElementById('topPhoto');
  if (CU.picture) {
    ph.src = CU.picture; ph.style.display = 'block'; av.style.display = 'none';
  } else {
    av.textContent = CU.ini; av.style.display = 'flex'; ph.style.display = 'none';
  }
  const setor = gSCfg(CU.setor);
  const sl    = CU.role === 'admin' ? 'Administrador' : CU.role === 'aprovador' ? 'Aprovador' : (setor || { nome: '' }).nome;
  const ts    = document.getElementById('topSetor');
  ts.textContent = sl;
  if (CU.role === 'admin') ts.classList.add('adm'); else ts.classList.remove('adm');
}

function logout() {
  try {
    const token = gapi.client.getToken();
    if (token) {
      google.accounts.oauth2.revoke(token.access_token, () => {});
      gapi.client.setToken(null);
    }
  } catch (e) {}
  CU = null; S = { tickets: [], setores: [] };
  document.getElementById('appView').style.display   = 'none';
  document.getElementById('loginView').style.display = 'block';
  document.getElementById('loginError').style.display = 'none';
  setLoading(false);
}

// ============================================================
//  GOOGLE SHEETS — funções base
// ============================================================
const SID = () => CONFIG.SPREADSHEET_ID;

// GET com retry automático para quota
async function sheetGet(range, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SID(), range,
      });
      return res.result.values || [];
    } catch (e) {
      const isQuota = e.status === 429 || (e.result && e.result.error && e.result.error.code === 429);
      if (isQuota && i < retries - 1) {
        await delay(2000 * (i + 1)); // espera 2s, 4s, 6s
        continue;
      }
      throw e;
    }
  }
}

async function sheetAppend(sheetName, rows) {
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SID(),
    range: sheetName + '!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: rows },
  });
}

async function sheetUpdate(range, rows) {
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: SID(), range,
    valueInputOption: 'RAW',
    resource: { values: rows },
  });
}

async function sheetClearAndWrite(sheetName, headerRow, dataRows) {
  // Limpa a partir da linha 2, preservando o cabeçalho
  await gapi.client.sheets.spreadsheets.values.clear({
    spreadsheetId: SID(), range: sheetName + '!A2:Z9999',
  });
  if (dataRows.length) {
    await sheetAppend(sheetName, dataRows);
  }
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// ============================================================
//  SETUP — cria abas e cabeçalhos se não existirem
// ============================================================
async function setupSheets() {
  sync('Verificando planilha...', 'loading');

  const meta   = await gapi.client.sheets.spreadsheets.get({ spreadsheetId: SID() });
  const sheets = meta.result.sheets.map(s => s.properties.title);

  const toCreate = [];
  if (!sheets.includes('tickets'))    toCreate.push({ addSheet: { properties: { title: 'tickets' } } });
  if (!sheets.includes('orcamentos')) toCreate.push({ addSheet: { properties: { title: 'orcamentos' } } });

  if (toCreate.length) {
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: SID(),
      resource: { requests: toCreate },
    });
    await delay(500);
  }

  // Cabeçalho tickets
  const th = await sheetGet('tickets!A1:Z1');
  if (!th.length || !th[0].length) {
    await sheetUpdate('tickets!A1', [T_HDR]);
  }

  // Cabeçalho + dados iniciais orcamentos
  const oh = await sheetGet('orcamentos!A1:Z1');
  if (!oh.length || !oh[0].length) {
    await sheetUpdate('orcamentos!A1', [O_HDR]);
    const initRows = (CONFIG.SETORES || []).map(s => [s.id, s.nome, s.orcamento, 0, j([])]);
    if (initRows.length) await sheetAppend('orcamentos', initRows);
  }

  sync('', 'hide');
}

// ============================================================
//  LOAD — lê planilha para memória
// ============================================================
async function loadFromSheets() {
  sync('Carregando chamados...', 'loading');

  const [tRows, oRows] = await Promise.all([
    sheetGet('tickets!A2:Z9999'),
    sheetGet('orcamentos!A2:Z'),
  ]);

  S.tickets = tRows.map(row => {
    const t = {};
    T_HDR.forEach((h, i) => { t[h] = row[i] !== undefined ? row[i] : ''; });
    t.id          = Number(t.id);
    t.valor       = Number(t.valor) || 0;
    t.criadoEm    = Number(t.criadoEm) || 0;
    t.steps       = pj(t.steps)       || [];
    t.chat        = pj(t.chat)        || [];
    t.camposExtra  = pj(t.camposExtra)  || {};
    return t;
  }).filter(t => t.id > 0);

  S.setores = oRows.map(row => ({
    id:         row[0] || '',
    nome:       row[1] || '',
    orcamento:  Number(row[2]) || 0,
    gasto:      Number(row[3]) || 0,
    movimentos: pj(row[4]) || [],
  })).filter(s => s.id);

  sync('', 'hide');
}

// ============================================================
//  SAVE
// ============================================================
async function saveTickets() {
  sync('Salvando chamado...', 'loading');
  try {
    const rows = S.tickets.map(t => T_HDR.map(h => {
      const v = t[h];
      return (h === 'steps' || h === 'chat' || h === 'camposExtra') ? j(v) : (v ?? '');
    }));
    await sheetClearAndWrite('tickets', T_HDR, rows);
    sync('Salvo!', 'ok');
  } catch (e) {
    sync('Erro ao salvar: ' + e.message, 'err');
    throw e;
  }
}

async function saveOrcamentos() {
  sync('Salvando orçamentos...', 'loading');
  try {
    const rows = S.setores.map(s => [s.id, s.nome, s.orcamento, s.gasto, j(s.movimentos)]);
    await sheetClearAndWrite('orcamentos', O_HDR, rows);
    sync('Salvo!', 'ok');
  } catch (e) {
    sync('Erro ao salvar orçamentos', 'err');
    throw e;
  }
}

// ============================================================
//  SYNC INDICATOR
// ============================================================
function sync(msg, type) {
  let bar = document.getElementById('syncBar');
  if (type === 'hide') { if (bar) bar.style.opacity = '0'; return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'syncBar'; bar.className = 'sync-bar';
    document.body.appendChild(bar);
  }
  bar.className = 'sync-bar' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
  const iconClass = type === 'ok' ? 'ti-check' : type === 'err' ? 'ti-alert-circle' : 'ti-loader';
  const anim      = type === 'loading' ? 'style="animation:spin 1s linear infinite"' : '';
  bar.innerHTML   = `<i class="ti ${iconClass}" ${anim} aria-hidden="true"></i> ${esc(msg)}`;
  bar.style.opacity = '1';
  if (type !== 'loading') setTimeout(() => { if (bar) bar.style.opacity = '0'; }, 3000);
}

// ============================================================
//  SIDEBAR
// ============================================================
function pendingForMe() {
  return S.tickets.filter(t => {
    const c = curStep(t); if (!c) return false;
    if (c.targetType === 'user'  && c.targetId.toLowerCase() === CU.email.toLowerCase()) return true;
    if (c.targetType === 'setor' && c.targetId === CU.setor && (CU.role === 'aprovador' || CU.role === 'admin')) return true;
    return false;
  });
}

function buildSidebar() {
  const pc = pendingForMe().length;
  let h = `
    <div class="ngrp">Principal</div>
    <div class="ni active" id="nv_tickets" onclick="showPage('tickets')">
      <i class="ti ti-ticket" aria-hidden="true"></i><span>Meus chamados</span></div>
    <div class="ni" id="nv_inbox" onclick="showPage('inbox')">
      <i class="ti ti-inbox" aria-hidden="true"></i><span>Aguardando minha ação</span>
      ${pc ? `<span class="nbadge">${pc}</span>` : ''}</div>`;
  if (CU.role === 'admin') {
    h += `
      <div class="ngrp">Administração</div>
      <div class="ni" id="nv_todos" onclick="showPage('todos')">
        <i class="ti ti-list" aria-hidden="true"></i><span>Todos os chamados</span></div>
      <div class="ngrp">Financeiro</div>
      <div class="ni" id="nv_fin" onclick="showPage('fin')">
        <i class="ti ti-chart-pie" aria-hidden="true"></i><span>Verbas por setor</span></div>
      <div class="ni" id="nv_mov" onclick="showPage('mov')">
        <i class="ti ti-arrows-exchange" aria-hidden="true"></i><span>Movimentações</span></div>`;
  } else {
    h += `
      <div class="ngrp">Financeiro</div>
      <div class="ni" id="nv_meuorc" onclick="showPage('meuorc')">
        <i class="ti ti-chart-bar" aria-hidden="true"></i><span>Minha verba</span></div>`;
  }
  document.getElementById('sidebar').innerHTML = h;
}

// ============================================================
//  ROTEAMENTO
// ============================================================
function showPage(pg) {
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('nv_' + pg); if (el) el.classList.add('active');
  const c  = document.getElementById('content');
  if      (pg === 'tickets') c.innerHTML = renderTickets();
  else if (pg === 'inbox')   c.innerHTML = renderInbox();
  else if (pg === 'todos')   c.innerHTML = renderTodos();
  else if (pg === 'fin')     c.innerHTML = renderFin();
  else if (pg === 'mov')     c.innerHTML = renderMov();
  else if (pg === 'meuorc')  c.innerHTML = renderMeuOrc();
}

// ============================================================
//  PÁGINAS
// ============================================================
function renderTickets() {
  const ts    = S.tickets.filter(t => t.userId.toLowerCase() === CU.email.toLowerCase()).slice().reverse();
  const totAp = ts.filter(t => t.status === 'Aprovado').reduce((a, t) => a + t.valor, 0);
  let h = `<div class="ph">
    <div class="ph-title">Meus chamados</div>
    <button class="btn btn-primary" onclick="openNew()"><i class="ti ti-plus" aria-hidden="true"></i> Novo chamado</button>
  </div>
  <div class="mcrow">
    <div class="mc"><div class="mc-l">Total</div><div class="mc-v">${ts.length}</div></div>
    <div class="mc"><div class="mc-l">Em andamento</div><div class="mc-v">${ts.filter(t => !['Encerrado','Recusado'].includes(t.status)).length}</div></div>
    <div class="mc"><div class="mc-l">Aprovados</div><div class="mc-v grn">${ts.filter(t => t.status === 'Aprovado').length}</div></div>
    <div class="mc"><div class="mc-l">Valor aprovado</div><div class="mc-v grn" style="font-size:15px">${fm(totAp)}</div></div>
  </div><div class="tlist">`;
  if (!ts.length) h += `<div class="empty"><i class="ti ti-ticket" aria-hidden="true"></i><p>Nenhum chamado ainda.</p></div>`;
  else ts.forEach(t => { h += tCard(t); });
  return h + '</div>';
}

function renderInbox() {
  const ts = pendingForMe().slice().reverse();
  let h = `<div class="ph"><div class="ph-title">Aguardando minha ação</div></div><div class="tlist">`;
  if (!ts.length) h += `<div class="empty"><i class="ti ti-check-circle" aria-hidden="true"></i><p>Nenhuma pendência.</p></div>`;
  else ts.forEach(t => { h += tCard(t); });
  return h + '</div>';
}

function renderTodos() {
  const ts = S.tickets.slice().reverse();
  const tV = ts.reduce((a, t) => a + t.valor, 0);
  const tA = ts.filter(t => t.status === 'Aprovado').reduce((a, t) => a + t.valor, 0);
  let h = `<div class="ph">
    <div class="ph-title">Todos os chamados</div>
    <button class="btn btn-sm" onclick="reloadData()"><i class="ti ti-refresh" aria-hidden="true"></i> Atualizar</button>
  </div>
  <div class="mcrow">
    <div class="mc"><div class="mc-l">Total</div><div class="mc-v">${ts.length}</div></div>
    <div class="mc"><div class="mc-l">Pendentes</div><div class="mc-v warn">${ts.filter(t => ['Aguardando','Em análise'].includes(t.status)).length}</div></div>
    <div class="mc"><div class="mc-l">Total solicitado</div><div class="mc-v" style="font-size:15px">${fm(tV)}</div></div>
    <div class="mc"><div class="mc-l">Total aprovado</div><div class="mc-v grn" style="font-size:15px">${fm(tA)}</div></div>
  </div><div class="tlist">`;
  if (!ts.length) h += `<div class="empty"><i class="ti ti-inbox" aria-hidden="true"></i><p>Nenhum chamado.</p></div>`;
  else ts.forEach(t => { h += tCard(t); });
  return h + '</div>';
}

async function reloadData() {
  await loadFromSheets();
  buildSidebar();
  showPage('todos');
}

function renderFin() {
  const tOrc = S.setores.reduce((a, s) => a + s.orcamento, 0);
  const tGas = S.setores.reduce((a, s) => a + s.gasto, 0);
  let h = `<div class="ph"><div class="ph-title">Verbas por setor</div></div>
  <div class="fin-summary">
    <div class="fin-mc"><div class="fin-mc-l">Orçamento total</div><div class="fin-mc-v">${fm(tOrc)}</div></div>
    <div class="fin-mc" style="background:var(--danger-bg)"><div class="fin-mc-l" style="color:var(--danger)">Total gasto</div><div class="fin-mc-v" style="color:var(--danger)">${fm(tGas)}</div></div>
    <div class="fin-mc" style="background:var(--success-bg)"><div class="fin-mc-l" style="color:var(--success)">Disponível</div><div class="fin-mc-v" style="color:var(--success)">${fm(tOrc - tGas)}</div></div>
  </div>`;
  S.setores.forEach(s => {
    const p = pct(s), disp = s.orcamento - s.gasto;
    const dC = disp < 0 ? 'bad' : p >= 65 ? 'warn' : 'ok';
    const ult = (s.movimentos || []).slice(-3).reverse();
    h += `<div class="setor-card">
      <div class="setor-hdr">
        <div class="setor-nome">${s.nome}</div>
        <button class="btn btn-primary btn-sm" onclick="openVerba('${s.id}')"><i class="ti ti-edit" aria-hidden="true"></i> Editar</button>
      </div>
      <div class="setor-stats">
        <div class="sstat"><div class="sstat-l">Orçamento</div><div class="sstat-v">${fm(s.orcamento)}</div></div>
        <div class="sstat"><div class="sstat-l">Gasto</div><div class="sstat-v warn">${fm(s.gasto)}</div></div>
        <div class="sstat"><div class="sstat-l">Disponível</div><div class="sstat-v ${dC}">${fm(disp)}</div></div>
      </div>
      <div class="bbar-bg"><div class="bbar" style="width:${p}%;background:${barC(p)}"></div></div>
      <div class="bbar-label"><span>${p}% utilizado</span><span>${p>=90?'⚠ Crítico':p>=65?'Atenção':'Saudável'}</span></div>
      ${ult.length ? `<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
        ${ult.map(m => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0">
          <span style="color:var(--text-2)">${esc(m.desc)}</span>
          <span style="font-weight:700;color:${m.tipo==='saida'?'#791F1F':'#27500A'}">${m.tipo==='saida'?'−':'+'} ${fm(m.valor)}</span>
        </div>`).join('')}</div>` : ''}
    </div>`;
  });
  return h;
}

function renderMov() {
  let all = [];
  S.setores.forEach(s => { (s.movimentos || []).forEach(m => all.push({ ...m, setorNome: s.nome })); });
  all.sort((a, b) => b.ts - a.ts);
  let h = `<div class="ph"><div class="ph-title">Movimentações financeiras</div></div>`;
  if (!all.length) return h + `<div class="empty"><i class="ti ti-arrows-exchange" aria-hidden="true"></i><p>Nenhuma movimentação.</p></div>`;
  h += `<div class="mov-table">`;
  all.forEach(m => {
    h += `<div class="mov-row">
      <div><div class="mov-row-title">${esc(m.desc)}</div><div class="mov-row-sub">${m.setorNome} · ${fd(m.ts)}</div></div>
      <div class="mov-val ${m.tipo==='saida'?'mov-out':'mov-in'}">${m.tipo==='saida'?'−':'+'} ${fm(m.valor)}</div>
    </div>`;
  });
  return h + '</div>';
}

function renderMeuOrc() {
  const s = S.setores.find(x => x.id === CU.setor);
  if (!s) return `<div class="empty"><i class="ti ti-chart-bar" aria-hidden="true"></i><p>Sem setor definido.</p></div>`;
  const p = pct(s), disp = s.orcamento - s.gasto;
  const dc = disp < 0 ? 'red' : p >= 65 ? 'warn' : 'grn';
  const movs = (s.movimentos || []).slice().reverse();
  let h = `<div class="ph"><div class="ph-title">Verba — ${s.nome}</div></div>
  <div class="mcrow">
    <div class="mc"><div class="mc-l">Orçamento</div><div class="mc-v" style="font-size:16px">${fm(s.orcamento)}</div></div>
    <div class="mc"><div class="mc-l">Gasto</div><div class="mc-v red" style="font-size:16px">${fm(s.gasto)}</div></div>
    <div class="mc"><div class="mc-l">Disponível</div><div class="mc-v ${dc}" style="font-size:16px">${fm(disp)}</div></div>
  </div>
  <div class="setor-card">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px">
      <span style="color:var(--text-2)">Utilização</span><span style="font-weight:700">${p}%</span></div>
    <div class="bbar-bg" style="height:12px"><div class="bbar" style="width:${p}%;background:${barC(p)}"></div></div>
  </div>`;
  if (movs.length) {
    h += `<div style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:10px">Histórico</div><div class="mov-table">`;
    movs.forEach(m => {
      h += `<div class="mov-row">
        <div><div class="mov-row-title">${esc(m.desc)}</div><div class="mov-row-sub">${fd(m.ts)}</div></div>
        <div class="mov-val ${m.tipo==='saida'?'mov-out':'mov-in'}">${m.tipo==='saida'?'−':'+'} ${fm(m.valor)}</div>
      </div>`;
    });
    h += `</div>`;
  } else {
    h += `<div class="empty"><i class="ti ti-arrows-exchange" aria-hidden="true"></i><p>Nenhuma movimentação.</p></div>`;
  }
  return h;
}

// ============================================================
//  TICKET CARD
// ============================================================
function tCard(t) {
  const sCfg = S.setores.find(x => x.id === t.setorId) || gSCfg(t.setorId) || { nome: '—' };
  const cur  = curStep(t);
  const sc   = subcatOf(t);
  const uDest = cur && cur.targetType === 'user'  ? gU(cur.targetId)              : null;
  const sDest = cur && cur.targetType === 'setor' ? S.setores.find(x => x.id === cur.targetId) : null;
  const dest  = cur ? (uDest ? uDest.nome : sDest ? sDest.nome + ' (setor)' : cur.targetId) : null;
  return `<div class="tcard" onclick="openTicket(${t.id})">
    <div class="tcard-top">
      <div class="tcard-title">#${t.id} — ${esc(t.titulo)}</div>
      <span class="sb ${sClass(t.status)}">${t.status}</span>
    </div>
    <div class="tcard-meta">
      <span><i class="ti ti-building" aria-hidden="true"></i> ${sCfg.nome}</span>
      <span><i class="ti ti-tag" aria-hidden="true"></i> ${t.categoria}</span>
      ${sc ? `<span class="subcat-tag"><i class="ti ${sc.icon}" aria-hidden="true" style="font-size:12px"></i> ${sc.nome}</span>` : ''}
      ${t.valor > 0 ? `<span><i class="ti ti-currency-dollar" aria-hidden="true"></i> ${fm(t.valor)}</span>` : ''}
      ${dest ? `<span><i class="ti ti-arrow-right" aria-hidden="true"></i> ${dest}</span>` : ''}
      <span><i class="ti ti-clock" aria-hidden="true"></i> ${fd(t.criadoEm)}</span>
    </div>
  </div>`;
}

// ============================================================
//  MODAL TICKET
// ============================================================
function openTicket(id) {
  const t = S.tickets.find(x => x.id == id); if (!t) return;
  const sCfg  = S.setores.find(x => x.id === t.setorId) || gSCfg(t.setorId) || { nome: '—', orcamento: 0, gasto: 0 };
  const creator = gU(t.userId) || { nome: t.userNome || t.userId };
  const sc      = subcatOf(t);
  const enc     = t.status === 'Encerrado' || t.status === 'Recusado';
  document.getElementById('mTitle').textContent = `#${t.id} — ${t.titulo}`;

  let body = `
    <div class="ir"><span class="il">Status</span><span class="sb ${sClass(t.status)}">${t.status}</span></div>
    <div class="ir"><span class="il">Setor</span><span>${sCfg.nome}</span></div>
    <div class="ir"><span class="il">Solicitante</span><span>${creator.nome}</span></div>
    <div class="ir"><span class="il">Categoria</span><span>${t.categoria}</span></div>
    ${sc ? `<div class="ir"><span class="il">Tipo</span><span style="display:flex;align-items:center;gap:6px"><i class="ti ${sc.icon}" style="color:var(--navy)" aria-hidden="true"></i><strong>${sc.nome}</strong></span></div>` : ''}
    <div class="ir"><span class="il">Prioridade</span><span>${t.prioridade}</span></div>
    <div class="ir"><span class="il">Valor</span><span style="font-weight:700;color:var(--navy)">${fm(t.valor)}</span></div>
    <div class="ir"><span class="il">Aberto em</span><span>${fd(t.criadoEm)}</span></div>`;

  // Campos extras
  if (t.camposExtra && Object.entries(t.camposExtra).some(([, v]) => v)) {
    body += `<div class="detail-card"><div class="detail-card-title">Dados complementares</div>`;
    for (const [k, v] of Object.entries(t.camposExtra)) {
      if (!v) continue;
      const cfg = CAMPOS_DEF[k];
      body += `<div class="ir"><span class="il">${cfg ? cfg.label : k}</span><span>${esc(v)}</span></div>`;
    }
    body += `</div>`;
  }

  // Mini financeiro
  if (t.valor > 0 && sCfg.orcamento !== undefined) {
    const disp = sCfg.orcamento - sCfg.gasto;
    const p    = pct(sCfg);
    body += `<div class="fin-mini">
      <div class="fin-mini-title">Orçamento — ${sCfg.nome}</div>
      <div class="fin-mini-cols">
        <div><div class="fin-col-l">Orçamento</div><div class="fin-col-v">${fm(sCfg.orcamento)}</div></div>
        <div><div class="fin-col-l">Gasto</div><div class="fin-col-v" style="color:#854F0B">${fm(sCfg.gasto)}</div></div>
        <div><div class="fin-col-l">Disponível</div><div class="fin-col-v" style="color:${disp>=t.valor?'#3B6D11':'#A32D2D'}">${fm(disp)}</div></div>
      </div>
      <div class="bbar-bg"><div class="bbar" style="width:${p}%;background:${barC(p)}"></div></div>
    </div>`;
  }

  // Descrição
  body += `<div class="divl"></div><div class="sec-title">Descrição</div>
    <p style="font-size:13px;line-height:1.6;margin-bottom:12px">${esc(t.descricao)}</p>`;

  // Trilha
  body += `<div class="divl"></div><div class="sec-title">Trilha de aprovação</div><div class="trail">`;
  t.steps.forEach((st, i) => {
    const uD = gU(st.targetId);
    const sD = S.setores.find(x => x.id === st.targetId);
    const tgt = st.targetType === 'user' ? (uD || { nome: st.targetId }).nome : (sD || { nome: '?' }).nome + ' (setor)';
    const dc  = st.status === 'aprovado' ? 'td-ok' : st.status === 'recusado' ? 'td-no' : st.status === 'pendente' ? 'td-pe' : 'td-fw';
    const ic  = st.status === 'aprovado' ? 'ti-check' : st.status === 'recusado' ? 'ti-x' : 'ti-clock';
    const sub = st.status === 'aprovado' ? 'Aprovado em ' + fd(st.ts) : st.status === 'recusado' ? 'Recusado em ' + fd(st.ts) : st.status === 'pendente' ? 'Aguardando decisão' : 'Encaminhado';
    body += `<div class="trail-step"><div class="trail-dot ${dc}"><i class="ti ${ic}" aria-hidden="true"></i></div>
      <div class="trail-info"><div class="trail-name">${esc(tgt)}</div>
      <div class="trail-sub">${sub}${st.nota ? ' — ' + esc(st.nota) : ''}</div></div></div>`;
    if (i < t.steps.length - 1) body += `<div class="trail-line"></div>`;
  });

  // Chat
  body += `</div><div class="divl"></div><div class="sec-title">Chat</div>
    <div class="chat-wrap" id="chatW">`;
  (t.chat || []).forEach(m => {
    const mine = m.uid.toLowerCase() === CU.email.toLowerCase();
    body += `<div class="cm ${mine ? 'mine' : 'other'}">
      <div class="ca">${esc(m.autor)} · ${fd(m.ts)}</div>
      <div>${esc(m.txt)}</div>
    </div>`;
  });
  body += `</div>`;

  if (enc) {
    body += `<div class="chat-locked"><i class="ti ti-lock" aria-hidden="true"></i> Chat bloqueado — chamado ${t.status.toLowerCase()}</div>`;
  } else {
    body += `<div class="chat-input-row">
      <input id="chatIn" type="text" placeholder="Mensagem..." onkeydown="if(event.key==='Enter') sendChat(${t.id})"/>
      <button class="btn btn-primary" onclick="sendChat(${t.id})"><i class="ti ti-send" aria-hidden="true"></i></button>
    </div>`;
  }

  document.getElementById('mBody').innerHTML = body;

  // Footer ações
  const cur   = curStep(t);
  const isCur = cur && (
    (cur.targetType === 'user'  && cur.targetId.toLowerCase() === CU.email.toLowerCase()) ||
    (cur.targetType === 'setor' && cur.targetId === CU.setor && (CU.role === 'aprovador' || CU.role === 'admin'))
  );
  let foot = '';
  if (isCur && !enc) {
    foot += `<button class="btn btn-danger"  onclick="decide(${t.id},'recusado')"><i class="ti ti-x" aria-hidden="true"></i> Recusar</button>`;
    foot += `<button class="btn btn-warning" onclick="showFwd(${t.id})"><i class="ti ti-arrow-forward" aria-hidden="true"></i> Encaminhar</button>`;
    foot += `<button class="btn btn-success" onclick="decide(${t.id},'aprovado')"><i class="ti ti-check" aria-hidden="true"></i> Aprovar</button>`;
  }
  if (CU.role === 'admin' && t.status === 'Aprovado') {
    foot += `<button class="btn" onclick="decide(${t.id},'encerrado')"><i class="ti ti-lock" aria-hidden="true"></i> Encerrar</button>`;
  }
  foot += `<button class="btn" onclick="closeMod()">Fechar</button>`;
  document.getElementById('mFoot').innerHTML = foot;
  document.getElementById('ovTicket').classList.add('open');
  const cw = document.getElementById('chatW');
  if (cw) cw.scrollTop = cw.scrollHeight;
}

// ============================================================
//  ENCAMINHAR
// ============================================================
function showFwd(tid) {
  const ex = document.getElementById('fwdBox'); if (ex) ex.remove();
  let opts = '';
  (CONFIG.ALLOWED_USERS || []).filter(u => u.email.toLowerCase() !== CU.email.toLowerCase() && u.role !== 'admin').forEach(u => {
    const sn = gSCfg(u.setor) || { nome: '' };
    opts += `<option value="user:${u.email}">${u.nome} (${sn.nome})</option>`;
  });
  S.setores.forEach(s => { opts += `<option value="setor:${s.id}">Setor: ${s.nome}</option>`; });
  document.getElementById('mBody').insertAdjacentHTML('afterbegin', `
    <div class="fwd-box" id="fwdBox">
      <div class="fwd-title"><i class="ti ti-arrow-forward" aria-hidden="true"></i> Encaminhar chamado</div>
      <div class="fg"><label class="fl">Encaminhar para</label><select id="fwdDest">${opts}</select></div>
      <div class="fg"><label class="fl">Observação (opcional)</label><input id="fwdNota" type="text" placeholder="Motivo..."/></div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary" onclick="doFwd(${tid})"><i class="ti ti-arrow-forward" aria-hidden="true"></i> Confirmar</button>
        <button class="btn" onclick="document.getElementById('fwdBox').remove()">Cancelar</button>
      </div>
    </div>`);
}

async function doFwd(tid) {
  const el = document.getElementById('fwdDest'); if (!el) return;
  const [type, id] = el.value.split(':');
  const nota = (document.getElementById('fwdNota') || { value: '' }).value.trim();
  const t    = S.tickets.find(x => x.id == tid); if (!t) return;
  const cur  = curStep(t); if (cur) cur.status = 'encaminhado';
  t.steps.push({ targetType: type, targetId: id, status: 'pendente', nota, ts: null });
  t.status = 'Em análise';
  const uD = gU(id);
  const sD = S.setores.find(x => x.id === id);
  const dn = type === 'user' ? (uD || { nome: id }).nome : (sD || { nome: id }).nome + ' (setor)';
  t.chat.push({ uid: CU.email, autor: CU.nome, txt: `Encaminhado para ${dn}.${nota ? ' Obs: ' + nota : ''}`, ts: Date.now() });
  await saveTickets();
  closeMod(); buildSidebar(); showPage('inbox');
}

// ============================================================
//  DECIDIR
// ============================================================
async function decide(tid, dec) {
  const t   = S.tickets.find(x => x.id == tid); if (!t) return;
  const cur = curStep(t);
  const s   = S.setores.find(x => x.id === t.setorId);

  if (dec === 'aprovado') {
    if (t.valor > 0 && s) {
      const disp = s.orcamento - s.gasto;
      if (t.valor > disp) {
        alert(`Saldo insuficiente!\nDisponível em ${s.nome}: ${fm(disp)}\nValor solicitado: ${fm(t.valor)}`);
        return;
      }
      s.gasto += t.valor;
      if (!s.movimentos) s.movimentos = [];
      const sc = subcatOf(t);
      s.movimentos.push({
        tipo: 'saida', valor: t.valor,
        desc: (sc ? `[${sc.nome}] ` : '') + `Chamado #${t.id} — ${t.titulo}`,
        ts: Date.now(),
      });
    }
    if (cur) { cur.status = 'aprovado'; cur.ts = Date.now(); }
    if (!t.steps.some(st => st.status === 'pendente')) t.status = 'Aprovado';
    t.chat.push({ uid: CU.email, autor: CU.nome, txt: `Aprovado por ${CU.nome}.${t.valor > 0 ? ` Valor de ${fm(t.valor)} debitado de ${(s || {}).nome || '—'}.` : ''}`, ts: Date.now() });
    await Promise.all([saveTickets(), saveOrcamentos()]);

  } else if (dec === 'recusado') {
    if (cur) { cur.status = 'recusado'; cur.ts = Date.now(); }
    t.status = 'Recusado';
    t.chat.push({ uid: CU.email, autor: CU.nome, txt: `Recusado por ${CU.nome}.`, ts: Date.now() });
    await saveTickets();

  } else if (dec === 'encerrado') {
    t.status = 'Encerrado';
    t.chat.push({ uid: CU.email, autor: CU.nome, txt: `Encerrado por ${CU.nome}.`, ts: Date.now() });
    await saveTickets();
  }

  closeMod(); buildSidebar();
  showPage(CU.role === 'admin' ? 'todos' : 'inbox');
}

// ============================================================
//  CHAT
// ============================================================
async function sendChat(tid) {
  const input = document.getElementById('chatIn'); if (!input) return;
  const txt   = input.value.trim(); if (!txt) return;
  const t     = S.tickets.find(x => x.id == tid); if (!t) return;
  if (t.status === 'Encerrado' || t.status === 'Recusado') return;
  if (!t.chat) t.chat = [];
  t.chat.push({ uid: CU.email, autor: CU.nome, txt, ts: Date.now() });
  await saveTickets();
  input.value = '';
  openTicket(tid);
}

// ============================================================
//  NOVO CHAMADO
// ============================================================
function onDestSetorChange() {
  const cat   = document.getElementById('nCatSetor').value;
  const area  = document.getElementById('subcatArea');
  const grid  = document.getElementById('subcatGrid');
  const extra = document.getElementById('extraFields');
  selSubcat = null; extra.innerHTML = '';
  const subcats = SETORES_CATS[cat] || [];
  if (subcats.length) {
    area.style.display = 'block'; grid.innerHTML = '';
    subcats.forEach(sc => {
      grid.innerHTML += `<button class="scbtn" id="scb_${sc.id}" onclick="selSC('${sc.id}','${cat}')">
        <i class="ti ${sc.icon}" aria-hidden="true"></i>
        <div><div class="scbtn-nm">${sc.nome}</div><div class="scbtn-ds">${sc.desc}</div></div>
      </button>`;
    });
  } else { area.style.display = 'none'; }
}

function selSC(id, cat) {
  selSubcat = id;
  document.querySelectorAll('.scbtn').forEach(b => b.classList.remove('sel'));
  const el = document.getElementById('scb_' + id); if (el) el.classList.add('sel');
  renderExtra(id, cat);
}

function renderExtra(id, cat) {
  const list = SETORES_CATS[cat] || [];
  const sc   = list.find(x => x.id === id);
  if (!sc || !sc.campos.length) { document.getElementById('extraFields').innerHTML = ''; return; }
  let h = `<div class="extra-fields">`;
  sc.campos.forEach((ck, i) => {
    const cfg  = CAMPOS_DEF[ck]; if (!cfg) return;
    const full = sc.campos.length % 2 !== 0 && i === sc.campos.length - 1 ? ' extra-full' : '';
    h += `<div class="fg${full}"><label class="fl">${cfg.label}</label>`;
    if (cfg.type === 'select') {
      h += `<select id="ef_${ck}"><option value="">Selecione...</option>${cfg.opts.map(o => `<option>${o}</option>`).join('')}</select>`;
    } else {
      h += `<input id="ef_${ck}" type="${cfg.type}"${cfg.ph ? ` placeholder="${cfg.ph}"` : ''}/>`;
    }
    h += `</div>`;
  });
  h += `</div>`;
  document.getElementById('extraFields').innerHTML = h;
}

function openNew() {
  const sel = document.getElementById('nDest'); if (!sel) return;
  sel.innerHTML = '';
  (CONFIG.ALLOWED_USERS || []).filter(u => u.email.toLowerCase() !== CU.email.toLowerCase() && u.role !== 'admin').forEach(u => {
    const sn = gSCfg(u.setor) || { nome: '' };
    sel.innerHTML += `<option value="user:${u.email}">${u.nome} (${sn.nome})</option>`;
  });
  S.setores.forEach(s => { sel.innerHTML += `<option value="setor:${s.id}">Setor: ${s.nome}</option>`; });
  selSubcat = null;
  document.getElementById('nCatSetor').value = '';
  document.getElementById('subcatArea').style.display = 'none';
  document.getElementById('extraFields').innerHTML = '';
  document.getElementById('ovNew').classList.add('open');
}

async function submitTicket() {
  const titulo  = document.getElementById('nTit').value.trim();
  const cat     = document.getElementById('nCatSetor').value;
  const destRaw = document.getElementById('nDest').value;
  const valor   = parseFloat(document.getElementById('nVal').value) || 0;
  const desc    = document.getElementById('nDesc').value.trim();
  const prio    = document.getElementById('nPrio').value;
  if (!titulo || !desc) return alert('Preencha o título e a descrição.');
  if (!cat) return alert('Selecione o setor responsável.');
  const subcats = SETORES_CATS[cat] || [];
  if (subcats.length && !selSubcat) return alert('Selecione o tipo de solicitação.');
  const [type, id] = destRaw.split(':');
  const setorId    = CU.setor || 's1';
  let camposExtra  = {};
  if (selSubcat) {
    const list = SETORES_CATS[cat] || [];
    const sc   = list.find(x => x.id === selSubcat);
    if (sc) sc.campos.forEach(ck => {
      const el = document.getElementById('ef_' + ck);
      if (el) camposExtra[ck] = el.value.trim();
    });
  }
  const ticket = {
    id: nextId(), titulo, categoria: cat, subcategoria: selSubcat || '',
    camposExtra, valor, descricao: desc, prioridade: prio,
    setorId, userId: CU.email, userNome: CU.nome,
    status: 'Aguardando', criadoEm: Date.now(),
    steps: [{ targetType: type, targetId: id, status: 'pendente', nota: '', ts: null }],
    chat: [],
  };
  S.tickets.push(ticket);
  await saveTickets();
  closeNew();
  document.getElementById('nTit').value  = '';
  document.getElementById('nDesc').value = '';
  document.getElementById('nVal').value  = '0';
  selSubcat = null;
  buildSidebar();
  showPage('tickets');
}

// ============================================================
//  EDITAR VERBA
// ============================================================
function openVerba(setorId) {
  editSetorId = setorId;
  const s = S.setores.find(x => x.id === setorId); if (!s) return;
  const disp = s.orcamento - s.gasto;
  document.getElementById('vBody').innerHTML = `
    <div style="margin-bottom:14px">
      <div class="ir"><span class="il">Setor</span><span style="font-weight:700;color:var(--navy)">${s.nome}</span></div>
      <div class="ir"><span class="il">Orçamento atual</span><span>${fm(s.orcamento)}</span></div>
      <div class="ir"><span class="il">Gasto</span><span style="color:var(--warning)">${fm(s.gasto)}</span></div>
      <div class="ir"><span class="il">Disponível</span><span style="color:#3B6D11">${fm(disp)}</span></div>
    </div>
    <div class="divl"></div>
    <div class="fg"><label class="fl">Novo orçamento total (R$)</label>
      <input id="vOrc" type="number" value="${s.orcamento}" min="0" step="100"/></div>
    <p style="font-size:12px;color:var(--text-3);margin-top:-8px;margin-bottom:14px">Alterar não apaga o histórico de gastos.</p>
    <div class="divl"></div>
    <div style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:12px">Lançamento manual</div>
    <div class="fg"><label class="fl">Tipo</label>
      <select id="vTipo"><option value="saida">Débito (saída)</option><option value="entrada">Crédito (entrada)</option></select></div>
    <div class="fg"><label class="fl">Valor (R$)</label>
      <input id="vLancVal" type="number" value="0" min="0" step="0.01"/></div>
    <div class="fg"><label class="fl">Descrição</label>
      <input id="vLancDesc" type="text" placeholder="Ex: Ajuste orçamentário Q2"/></div>`;
  document.getElementById('ovVerba').classList.add('open');
}

async function saveVerba() {
  const s = S.setores.find(x => x.id === editSetorId); if (!s) return;
  s.orcamento = parseFloat(document.getElementById('vOrc').value) || 0;
  const tipo  = document.getElementById('vTipo').value;
  const val   = parseFloat(document.getElementById('vLancVal').value) || 0;
  const desc  = document.getElementById('vLancDesc').value.trim();
  if (val > 0 && desc) {
    if (!s.movimentos) s.movimentos = [];
    tipo === 'saida' ? s.gasto += val : s.gasto = Math.max(0, s.gasto - val);
    s.movimentos.push({ tipo, valor: val, desc, ts: Date.now() });
  }
  await saveOrcamentos();
  closeVerba();
  showPage('fin');
}

// ============================================================
//  FECHAR MODAIS
// ============================================================
function closeMod()   { document.getElementById('ovTicket').classList.remove('open'); }
function closeNew()   { document.getElementById('ovNew').classList.remove('open'); }
function closeVerba() { document.getElementById('ovVerba').classList.remove('open'); editSetorId = null; }

document.addEventListener('click', e => {
  ['ovTicket', 'ovNew', 'ovVerba'].forEach(id => {
    const ov = document.getElementById(id);
    if (ov && e.target === ov) ov.classList.remove('open');
  });
});
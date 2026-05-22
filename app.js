// =====================================================================
//  app.js  —  Fortsun Sistema de Chamados  v2.0
//  Melhorias: chamados aceitos, anexos Drive, SLA, dashboard admin,
//             verba por setor (responsável), métricas e relatórios
// =====================================================================

const SCOPES    = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
const DISCOVERY = ['https://sheets.googleapis.com/$discovery/rest?version=v4',
                   'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

let gapiReady   = false;
let gisReady    = false;
let tokenClient = null;
let CU          = null;
let S           = { tickets: [], setores: [], historico: [] };
let selSubcat   = null;
let editSetorId = null;

// ── Cabeçalhos das planilhas ─────────────────────────────────────────
const T_HDR = ['id','titulo','categoria','subcategoria','camposExtra','valor','descricao',
               'prioridade','setorId','userId','userNome','status','criadoEm','steps','chat',
               'anexos','aceitoEm','aceitoPor','slaResposta','slaResolucao','csat'];
const O_HDR = ['setorId','setorNome','orcamento','gasto','movimentos'];
const H_HDR = ['mes','fechadoEm','fechadoPor','snapshot']; // histórico mensal

// ── Categorias e subcategorias ───────────────────────────────────────
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
    { id:'dados_colab',  nome:'Dados de colaborador',icon:'ti-user-circle',   desc:'Cadastro e atualização',         campos:['colaborador','tipo_dado'] },
    { id:'rel_pgto',     nome:'Relação de pagamento', icon:'ti-report-money', desc:'Relatórios e extratos',          campos:['periodo','formato'] },
    { id:'site_camp',    nome:'Site / Apresentação',  icon:'ti-device-desktop',desc:'Campanhas e materiais digitais',campos:['tipo_material','prazo'] },
    { id:'kpi_vendas',   nome:'KPI / Vendas',         icon:'ti-chart-bar',    desc:'Indicadores e faturamento',      campos:['periodo','tipo_relatorio'] },
  ],
  'RH': [
    { id:'contratacao',  nome:'Contratação',          icon:'ti-user-plus',    desc:'Processo seletivo',              campos:['cargo','setor_vaga','prazo'] },
    { id:'treinamento',  nome:'Treinamento',           icon:'ti-school',       desc:'Capacitação de equipe',          campos:['colaborador','tema_treino','data_treino'] },
    { id:'ajuste_proc',  nome:'Ajuste de processo',    icon:'ti-settings',     desc:'Melhoria de processos',          campos:['processo_afetado'] },
    { id:'notion',       nome:'Notion',                icon:'ti-brand-notion', desc:'Suporte ao uso do Notion',       campos:['colaborador'] },
    { id:'endomkt',      nome:'Endomarketing',          icon:'ti-speakerphone', desc:'Ideias e ações internas',        campos:['descricao_ideia'] },
    { id:'adv',          nome:'Apoio ADV',              icon:'ti-scale',        desc:'Suporte jurídico',               campos:['assunto_adv'] },
  ],
  'DP': [
    { id:'ajuste_ponto', nome:'Ajuste de ponto',      icon:'ti-clock-edit',   desc:'Correção de marcações',          campos:['colaborador','data_ponto','motivo_ponto'] },
    { id:'desligamento', nome:'Desligamento',          icon:'ti-user-off',     desc:'Processo de demissão',           campos:['colaborador','data_desligamento','motivo_desl'] },
    { id:'duvida_folha', nome:'Dúvida de folha',       icon:'ti-help',         desc:'Esclarecimento de holerite',     campos:['colaborador','competencia'] },
    { id:'envio_cheque', nome:'Envio de cheque',       icon:'ti-writing',      desc:'Emissão / envio de cheque',      campos:['favorecido','valor_cheque','banco'] },
    { id:'consignado',   nome:'Empréstimo consignado', icon:'ti-building-bank',desc:'Solicitação de consignado',      campos:['colaborador','valor_solicitado_emp'] },
  ],
  'Marketing': [
    { id:'material',     nome:'Material',              icon:'ti-file-text',    desc:'Arte e materiais gráficos',      campos:['tipo_material','prazo'] },
    { id:'campanha',     nome:'Campanha',               icon:'ti-speakerphone', desc:'Campanhas de marketing',         campos:['objetivo','prazo','orcamento_camp'] },
    { id:'confrat',      nome:'Confraternização',       icon:'ti-confetti',     desc:'Eventos internos',               campos:['data_evento','n_pessoas','local'] },
    { id:'evento',       nome:'Evento',                 icon:'ti-calendar-event',desc:'Eventos externos',              campos:['data_evento','n_pessoas','local','tipo_evento'] },
  ],
  'Compliance/Logística': [
    { id:'fardamento',   nome:'Fardamento',             icon:'ti-shirt',        desc:'Uniformes e EPIs',               campos:['colaborador','tamanho','quantidade'] },
    { id:'bolsas',       nome:'Bolsas',                 icon:'ti-briefcase',    desc:'Bolsas e materiais',             campos:['colaborador','tipo_bolsa','quantidade'] },
    { id:'estoque',      nome:'Estoque',                icon:'ti-package',      desc:'Controle de estoque',            campos:['item','quantidade','motivo_estoque'] },
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

// ── Helpers ──────────────────────────────────────────────────────────
const gU    = email => (CONFIG.ALLOWED_USERS||[]).find(u=>u.email.toLowerCase()===(email||'').toLowerCase());
const gS    = id    => S.setores.find(x=>x.id===id);
const gSCfg = id    => (CONFIG.SETORES||[]).find(s=>s.id===id);
const fm    = v     => 'R$\u00a0'+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fd    = ts    => new Date(ts).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const esc   = t     => { const d=document.createElement('div'); d.textContent=t; return d.innerHTML; };
const pct   = s     => s.orcamento>0?Math.min(100,Math.round(s.gasto/s.orcamento*100)):0;
const barC  = p     => p>=90?'#A32D2D':p>=65?'#854F0B':'#3B6D11';
const j     = v     => JSON.stringify(v);
const pj    = v     => { try{return JSON.parse(v);}catch(e){return v;} };
const delay = ms    => new Promise(r=>setTimeout(r,ms));

function sClass(st) {
  if(st==='Aguardando'||st==='Em análise') return 's-ag';
  if(st==='Aprovado')  return 's-ap';
  if(st==='Recusado')  return 's-re';
  if(st==='Encerrado') return 's-en';
  if(st==='Aceito')    return 's-ac';
  return 's-ab';
}
const curStep  = t => (t.steps||[]).find(s=>s.status==='pendente')||null;
const subcatOf = t => (SETORES_CATS[t.categoria]||[]).find(x=>x.id===t.subcategoria)||null;
const nextId   = () => Math.max(0,...S.tickets.map(t=>Number(t.id)))+1;

// ── SLA helpers ──────────────────────────────────────────────────────
function slaStatus(t) {
  const cfg = (CONFIG.SLA||{})[t.prioridade]||{resposta:24,resolucao:72};
  const agora = Date.now();
  const criado = t.criadoEm||agora;
  const horasDecorridas = (agora-criado)/3600000;
  const enc = t.status==='Encerrado'||t.status==='Aprovado'||t.status==='Recusado';
  if(enc) return {label:'Concluído',cls:'sla-ok',icon:'ti-check'};
  if(horasDecorridas>cfg.resolucao) return {label:'SLA Resolução Estourado',cls:'sla-crit',icon:'ti-alert-triangle'};
  if(horasDecorridas>cfg.resposta)  return {label:'SLA Resposta Estourado', cls:'sla-warn',icon:'ti-clock-exclamation'};
  const restam = Math.max(0,cfg.resolucao-horasDecorridas);
  return {label:`${Math.floor(restam)}h restantes`,cls:'sla-ok',icon:'ti-clock'};
}

// ── Google Auth ──────────────────────────────────────────────────────
function gapiLoaded() {
  gapi.load('client', async () => {
    await gapi.client.init({ discoveryDocs: DISCOVERY });
    gapiReady = true; maybeInitGIS();
  });
}
function onGISLoad() { gisReady=true; maybeInitGIS(); }

function maybeInitGIS() {
  if(!gapiReady||!gisReady) return;
  if(!CONFIG.GOOGLE_CLIENT_ID||CONFIG.GOOGLE_CLIENT_ID.includes('SEU_CLIENT_ID')) {
    showLoginError('Configure o GOOGLE_CLIENT_ID em config.js antes de usar o sistema.'); return;
  }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: [
      'openid','email','profile',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ].join(' '),
    callback: onTokenReceived,
    error_callback: err => {
      const msg = err.type==='popup_closed'
        ? 'Login cancelado. Clique em "Entrar com Google" e conclua a autorização.'
        : 'Erro OAuth: '+(err.message||err.type||JSON.stringify(err));
      showLoginError(msg); setLoading(false);
    },
  });
  // Tenta restaurar sessão antes de mostrar o botão
  tryRestoreSession().then(restored => {
    if (restored) return;
    const btnContainer = document.getElementById('gSignInBtn');
    if(btnContainer) {
      btnContainer.innerHTML = `
        <button onclick="doGoogleLogin()" style="display:flex;align-items:center;gap:12px;padding:10px 20px;border-radius:8px;border:1px solid #dadce0;background:#fff;cursor:pointer;font-size:14px;font-family:inherit;color:#3c4043;font-weight:500;width:100%;justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.174 0 7.548 0 9s.348 2.826.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          Entrar com Google
        </button>`;
    }
  });
}

// Restaura sessão salva no sessionStorage sem abrir popup
async function tryRestoreSession() {
  try {
    const token   = sessionStorage.getItem('fs_token');
    const exp     = Number(sessionStorage.getItem('fs_token_exp') || 0);
    const userStr = sessionStorage.getItem('fs_user');
    if (!token || !userStr || Date.now() > exp - 60000) return false;

    const savedUser = JSON.parse(userStr);
    const userCfg   = gU(savedUser.email);
    if (!userCfg) return false;

    gapi.client.setToken({ access_token: token });
    CU = { ...userCfg, ...savedUser };

    setLoading(true);
    await setupSheets();
    await loadFromSheets();
    launchApp();
    setLoading(false);
    return true;
  } catch(e) {
    console.warn('[Session] Restauração falhou:', e);
    ['fs_token','fs_token_exp','fs_user'].forEach(k => sessionStorage.removeItem(k));
    return false;
  }
}

function doGoogleLogin() {
  document.getElementById('loginError').style.display='none';
  setLoading(true);
  tokenClient.requestAccessToken({prompt:'select_account'});
}

async function onTokenReceived(resp) {
  if(resp.error) {
    const msg = resp.error==='popup_closed'
      ? 'Login cancelado. Tente novamente.'
      : 'Erro ao autorizar: '+resp.error+(resp.error_description?' — '+resp.error_description:'');
    showLoginError(msg); setLoading(false); return;
  }
  try {
    const userResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+resp.access_token}});
    const userInfo = await userResp.json();
    const email    = (userInfo.email||'').toLowerCase();
    const userCfg  = gU(email);
    if(!userCfg) { showLoginError(`Acesso não autorizado para ${email}. Contate o administrador.`); setLoading(false); return; }
    CU = { ...userCfg, email, picture: userInfo.picture||'', googleName: userInfo.name||userCfg.nome };

    // Persiste sessão (sobrevive ao F5 dentro da mesma aba/sessão do browser)
    const expiresMs = Date.now() + ((resp.expires_in || 3599) * 1000);
    sessionStorage.setItem('fs_token',     resp.access_token);
    sessionStorage.setItem('fs_token_exp', String(expiresMs));
    sessionStorage.setItem('fs_user',      JSON.stringify(CU));
    gapi.client.setToken({ access_token: resp.access_token });

    await setupSheets();
    await loadFromSheets();
    launchApp();
  } catch(e) {
    showLoginError('Erro ao carregar dados: '+e.message); setLoading(false); console.error(e);
  }
}

function showLoginError(msg) {
  document.getElementById('loginErrorMsg').textContent=msg;
  document.getElementById('loginError').style.display='flex';
  setLoading(false);
}
function setLoading(on) { document.getElementById('loginLoading').style.display=on?'block':'none'; }

function launchApp() {
  document.getElementById('loginView').style.display='none';
  document.getElementById('appView').style.display='flex';
  renderTopbar(); buildSidebar(); showPage('dashboard');
}

function renderTopbar() {
  document.getElementById('topNm').textContent=CU.nome;
  const av=document.getElementById('topAv'), ph=document.getElementById('topPhoto');
  if(CU.picture){ph.src=CU.picture;ph.style.display='block';av.style.display='none';}
  else{av.textContent=CU.ini;av.style.display='flex';ph.style.display='none';}
  const setor=gSCfg(CU.setor);
  const sl=CU.role==='admin'?'Administrador':CU.role==='aprovador'?'Aprovador':(setor||{nome:''}).nome;
  const ts=document.getElementById('topSetor');
  ts.textContent=sl;
  if(CU.role==='admin') ts.classList.add('adm'); else ts.classList.remove('adm');
}

function logout() {
  ['fs_token','fs_token_exp','fs_user'].forEach(k => sessionStorage.removeItem(k));
  try{const token=gapi.client.getToken();if(token){google.accounts.oauth2.revoke(token.access_token,()=>{});gapi.client.setToken(null);}}catch(e){}
  CU=null; S={tickets:[],setores:[]};
  document.getElementById('appView').style.display='none';
  document.getElementById('loginView').style.display='block';
  document.getElementById('loginError').style.display='none';
  setLoading(false);
}

// ── Sheets API ────────────────────────────────────────────────────────
const SID = () => CONFIG.SPREADSHEET_ID;

async function sheetGet(range,retries=3) {
  for(let i=0;i<retries;i++){
    try{
      const res=await gapi.client.sheets.spreadsheets.values.get({spreadsheetId:SID(),range});
      return res.result.values||[];
    }catch(e){
      const isQuota=e.status===429||(e.result&&e.result.error&&e.result.error.code===429);
      if(isQuota&&i<retries-1){await delay(2000*(i+1));continue;}
      throw e;
    }
  }
}
async function sheetAppend(sheetName,rows) {
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId:SID(),range:sheetName+'!A1',
    valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',
    resource:{values:rows},
  });
}
async function sheetUpdate(range,rows) {
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId:SID(),range,valueInputOption:'RAW',resource:{values:rows},
  });
}
async function sheetClearAndWrite(sheetName,headerRow,dataRows) {
  await gapi.client.sheets.spreadsheets.values.clear({spreadsheetId:SID(),range:sheetName+'!A2:Z9999'});
  if(dataRows.length) await sheetAppend(sheetName,dataRows);
}

async function setupSheets() {
  sync('Verificando planilha...','loading');
  const meta=await gapi.client.sheets.spreadsheets.get({spreadsheetId:SID()});
  const sheets=meta.result.sheets.map(s=>s.properties.title);
  const toCreate=[];
  if(!sheets.includes('tickets'))             toCreate.push({addSheet:{properties:{title:'tickets'}}});
  if(!sheets.includes('orcamentos'))          toCreate.push({addSheet:{properties:{title:'orcamentos'}}});
  if(!sheets.includes('historico_orcamentos'))toCreate.push({addSheet:{properties:{title:'historico_orcamentos'}}});
  if(toCreate.length){
    await gapi.client.sheets.spreadsheets.batchUpdate({spreadsheetId:SID(),resource:{requests:toCreate}});
    await delay(500);
  }
  const th=await sheetGet('tickets!A1:Z1');
  if(!th.length||!th[0].length) await sheetUpdate('tickets!A1',[T_HDR]);
  const oh=await sheetGet('orcamentos!A1:Z1');
  if(!oh.length||!oh[0].length){
    await sheetUpdate('orcamentos!A1',[O_HDR]);
    const initRows=(CONFIG.SETORES||[]).map(s=>[s.id,s.nome,s.orcamento,0,j([])]);
    if(initRows.length) await sheetAppend('orcamentos',initRows);
  }
  const hh=await sheetGet('historico_orcamentos!A1:Z1');
  if(!hh.length||!hh[0].length){
    await sheetUpdate('historico_orcamentos!A1',[H_HDR]);
  }
  sync('','hide');
}

async function loadFromSheets() {
  sync('Carregando chamados...','loading');
  const [tRows,oRows,hRows]=await Promise.all([
    sheetGet('tickets!A2:Z9999'),
    sheetGet('orcamentos!A2:Z'),
    sheetGet('historico_orcamentos!A2:Z9999'),
  ]);
  S.tickets=tRows.map(row=>{
    const t={};
    T_HDR.forEach((h,i)=>{t[h]=row[i]!==undefined?row[i]:'';});
    t.id=Number(t.id); t.valor=Number(t.valor)||0; t.criadoEm=Number(t.criadoEm)||0;
    t.steps=pj(t.steps)||[]; t.chat=pj(t.chat)||[];
    t.camposExtra=pj(t.camposExtra)||{};
    t.anexos=pj(t.anexos)||[];
    t.aceitoEm=Number(t.aceitoEm)||0;
    t.csat=Number(t.csat)||0;
    return t;
  }).filter(t=>t.id>0);
  S.setores=oRows.map(row=>({
    id:row[0]||'',nome:row[1]||'',
    orcamento:Number(row[2])||0,gasto:Number(row[3])||0,
    movimentos:pj(row[4])||[],
  })).filter(s=>s.id);
  S.historico=hRows.map(row=>({
    mes:      row[0]||'',
    fechadoEm:Number(row[1])||0,
    fechadoPor:row[2]||'',
    snapshot: pj(row[3])||[],
  })).filter(h=>h.mes);
  sync('','hide');
}

async function saveTickets() {
  sync('Salvando chamado...','loading');
  try{
    const rows=S.tickets.map(t=>T_HDR.map(h=>{
      const v=t[h];
      return(['steps','chat','camposExtra','anexos'].includes(h))?j(v):(v??'');
    }));
    await sheetClearAndWrite('tickets',T_HDR,rows);
    sync('Salvo!','ok');
  }catch(e){sync('Erro ao salvar: '+e.message,'err');throw e;}
}
async function saveOrcamentos() {
  sync('Salvando orçamentos...','loading');
  try{
    const rows=S.setores.map(s=>[s.id,s.nome,s.orcamento,s.gasto,j(s.movimentos)]);
    await sheetClearAndWrite('orcamentos',O_HDR,rows);
    sync('Salvo!','ok');
  }catch(e){sync('Erro ao salvar orçamentos','err');throw e;}
}

async function saveHistorico() {
  try{
    const rows=S.historico.map(h=>[h.mes,h.fechadoEm,h.fechadoPor,j(h.snapshot)]);
    await sheetClearAndWrite('historico_orcamentos',H_HDR,rows);
  }catch(e){console.error('Erro ao salvar histórico:',e);}
}

async function fecharMes() {
  // Determina o nome do mês atual
  const agora   = new Date();
  const nomeMes = agora.toLocaleString('pt-BR',{month:'long',year:'numeric'});
  const jaFechou = S.historico.some(h=>h.mes===nomeMes);
  if(jaFechou){
    alert(`O mês "${nomeMes}" já foi fechado.`);
    return;
  }
  const confirma = confirm(
    `Fechar o mês de ${nomeMes}?\n\n` +
    `Isso irá:\n` +
    `• Salvar um snapshot dos gastos atuais no histórico\n` +
    `• Zerar os gastos e movimentações de todos os setores\n` +
    `• Os orçamentos (limites) NÃO serão alterados\n\n` +
    `Essa ação não pode ser desfeita.`
  );
  if(!confirma) return;

  sync('Fechando mês...','loading');

  // Snapshot do mês
  const snapshot = S.setores.map(s=>({
    id:         s.id,
    nome:       s.nome,
    orcamento:  s.orcamento,
    gasto:      s.gasto,
    movimentos: s.movimentos||[],
  }));

  S.historico.push({
    mes:       nomeMes,
    fechadoEm: Date.now(),
    fechadoPor: CU.email,
    snapshot,
  });

  // Zera gastos e movimentações (mantém orçamento)
  S.setores.forEach(s=>{ s.gasto=0; s.movimentos=[]; });

  await Promise.all([saveOrcamentos(), saveHistorico()]);
  sync('Mês fechado com sucesso!','ok');
  showPage('fin');
}

function renderHistoricoOrcamentos() {
  if(!S.historico.length) return '';
  let h=`<div class="divl" style="margin:24px 0 16px"></div>
    <div class="ph" style="margin-bottom:12px">
      <div style="font-size:16px;font-weight:700;color:var(--navy)">
        <i class="ti ti-history" aria-hidden="true"></i> Histórico mensal
      </div>
    </div>`;
  const meses=[...S.historico].reverse();
  meses.forEach(m=>{
    const tOrc=m.snapshot.reduce((a,s)=>a+s.orcamento,0);
    const tGas=m.snapshot.reduce((a,s)=>a+s.gasto,0);
    const pct2=tOrc>0?Math.min(100,Math.round(tGas/tOrc*100)):0;
    h+=`<div class="setor-card" style="margin-bottom:10px">
      <div class="setor-hdr">
        <div>
          <div class="setor-nome" style="text-transform:capitalize">${m.mes}</div>
          <div style="font-size:11px;color:var(--text-3);margin-top:2px">
            Fechado em ${fd(m.fechadoEm)} por ${esc((gU(m.fechadoPor)||{nome:m.fechadoPor}).nome)}
          </div>
        </div>
        <button class="btn btn-sm" onclick="toggleHistMes('hm_${m.mes.replace(/\s/g,'_')}')">
          <i class="ti ti-chevron-down" aria-hidden="true"></i> Detalhar
        </button>
      </div>
      <div class="setor-stats">
        <div class="sstat"><div class="sstat-l">Orçamento</div><div class="sstat-v">${fm(tOrc)}</div></div>
        <div class="sstat"><div class="sstat-l">Gasto total</div><div class="sstat-v warn">${fm(tGas)}</div></div>
        <div class="sstat"><div class="sstat-l">Utilização</div><div class="sstat-v">${pct2}%</div></div>
      </div>
      <div class="bbar-bg"><div class="bbar" style="width:${pct2}%;background:${barC(pct2)}"></div></div>
      <div id="hm_${m.mes.replace(/\s/g,'_')}" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
        ${m.snapshot.map(s=>{
          const p2=s.orcamento>0?Math.min(100,Math.round(s.gasto/s.orcamento*100)):0;
          const disp=s.orcamento-s.gasto;
          return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:var(--navy);margin-bottom:4px">
              <span>${esc(s.nome)}</span>
              <span style="font-size:12px;color:var(--text-2)">${fm(s.gasto)} / ${fm(s.orcamento)}</span>
            </div>
            <div class="bbar-bg" style="height:6px"><div class="bbar" style="width:${p2}%;background:${barC(p2)}"></div></div>
            ${(s.movimentos||[]).length?`<div style="margin-top:6px">${(s.movimentos||[]).slice(-5).reverse().map(mv=>
              `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;color:var(--text-2)">
                <span>${esc(mv.desc)}</span>
                <span style="font-weight:700;color:${mv.tipo==='saida'?'#791F1F':'#27500A'}">${mv.tipo==='saida'?'−':'+'} ${fm(mv.valor)}</span>
              </div>`).join('')}</div>`:''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  });
  return h;
}

function toggleHistMes(id) {
  const el=document.getElementById(id); if(!el) return;
  el.style.display=el.style.display==='none'?'block':'none';
}

// ── Google Drive – upload de anexo ───────────────────────────────────
async function ensureDriveScope() {
  // Verifica se o token atual já inclui o escopo drive.file
  // Força re-consentimento se não incluir
  return new Promise((resolve, reject) => {
    tokenClient.requestAccessToken({
      prompt: '',          // sem prompt se já tiver sessão
      hint: CU.email,
      callback: (resp) => {
        if (resp.error) reject(new Error('Re-auth falhou: ' + resp.error));
        else resolve(resp);
      },
    });
  });
}

async function uploadFileToDrive(file) {
  // Sempre pega o token mais recente (pode ter sido renovado)
  let token = gapi.client.getToken();
  if (!token) throw new Error('Sem token OAuth — faça login novamente.');

  // Diagnóstico: loga os escopos do token atual
  console.log('[Drive] Token access_token (primeiros 30 chars):', token.access_token.slice(0,30));

  const hasDriveScope = await checkTokenHasDriveScope(token.access_token);
  if (!hasDriveScope) {
    console.warn('[Drive] Token sem escopo drive.file — forçando re-consentimento...');
    sync('Autorizando acesso ao Drive...', 'loading');
    try {
      await ensureDriveScope();
      token = gapi.client.getToken(); // token atualizado
    } catch(e) {
      throw new Error('Não foi possível autorizar o Drive. Faça logout e login novamente.');
    }
  }

  const parents = CONFIG.DRIVE_FOLDER_ID && !CONFIG.DRIVE_FOLDER_ID.includes('SEU_')
    ? [CONFIG.DRIVE_FOLDER_ID] : [];

  const meta = { name: file.name, mimeType: file.type || 'application/octet-stream' };
  if (parents.length) meta.parents = parents;

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', file);

  const resp = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType',
    { method: 'POST', headers: { Authorization: 'Bearer ' + token.access_token }, body: form }
  );

  if (!resp.ok) {
    const errBody = await resp.text();
    console.error('[Drive] Erro no upload:', resp.status, errBody);
    throw new Error(`Falha no upload (${resp.status}): ${errBody}`);
  }

  const data = await resp.json();
  console.log('[Drive] Upload OK:', data);

  // Pequena pausa antes de aplicar permissões (arquivo precisa estar indexado)
  await delay(1200);

  // Tornar público para visualização (não-crítico: falha silenciosa)
  try {
    const tk = gapi.client.getToken();
    const permResp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${data.id}/permissions`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      }
    );
    if (!permResp.ok) {
      const permErr = await permResp.text();
      console.warn('[Drive] Permissão pública falhou (arquivo ainda acessível via domínio):', permErr);
    } else {
      console.log('[Drive] Permissão pública aplicada.');
    }
  } catch(e) {
    console.warn('[Drive] Erro ao aplicar permissão:', e);
  }

  // URL de visualização direta como fallback
  const viewUrl = data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`;
  return { id: data.id, nome: data.name, url: viewUrl, tipo: data.mimeType };
}

async function checkTokenHasDriveScope(accessToken) {
  try {
    const r = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    const info = await r.json();
    console.log('[Drive] Token scopes:', info.scope);
    return (info.scope || '').includes('drive');
  } catch(e) {
    console.warn('[Drive] Não foi possível verificar escopos:', e);
    return true; // tenta mesmo assim
  }
}

// ── Sync bar ─────────────────────────────────────────────────────────
function sync(msg,type) {
  let bar=document.getElementById('syncBar');
  if(type==='hide'){if(bar)bar.style.opacity='0';return;}
  if(!bar){bar=document.createElement('div');bar.id='syncBar';bar.className='sync-bar';document.body.appendChild(bar);}
  bar.className='sync-bar'+(type==='ok'?' ok':type==='err'?' err':'');
  const iconClass=type==='ok'?'ti-check':type==='err'?'ti-alert-circle':'ti-loader';
  const anim=type==='loading'?'style="animation:spin 1s linear infinite"':'';
  bar.innerHTML=`<i class="ti ${iconClass}" ${anim} aria-hidden="true"></i> ${esc(msg)}`;
  bar.style.opacity='1';
  if(type!=='loading') setTimeout(()=>{if(bar)bar.style.opacity='0';},3000);
}

// ── Sidebar e navegação ───────────────────────────────────────────────
function pendingForMe() {
  // Tickets onde o passo atual me aguarda
  return S.tickets.filter(t=>{
    const c=curStep(t); if(!c) return false;
    if(c.targetType==='user'  && c.targetId.toLowerCase()===CU.email.toLowerCase()) return true;
    if(c.targetType==='setor' && c.targetId===CU.setor && (CU.role==='aprovador'||CU.role==='admin')) return true;
    return false;
  });
}

function involvedInTicket(t) {
  // Participei da trilha (criei, fui destinatário em algum step, ou encaminhei)
  const myEmail = CU.email.toLowerCase();
  if(t.userId.toLowerCase() === myEmail) return true;
  if((t.aceitoPor||'').toLowerCase() === myEmail) return true;
  return (t.steps||[]).some(s => s.targetId.toLowerCase() === myEmail);
}

function acceptedByMe() {
  // Tickets que já passaram por mim (aprovei, encaminhei ou participei)
  return S.tickets.filter(t => involvedInTicket(t));
}

function buildSidebar() {
  const pc=pendingForMe().length;
  const ac=acceptedByMe().length;
  let h=`
    <div class="ngrp">Principal</div>
    <div class="ni" id="nv_dashboard" onclick="showPage('dashboard')">
      <i class="ti ti-dashboard" aria-hidden="true"></i><span>Dashboard</span></div>
    <div class="ni" id="nv_tickets" onclick="showPage('tickets')">
      <i class="ti ti-ticket" aria-hidden="true"></i><span>Meus chamados</span></div>
    <div class="ni" id="nv_inbox" onclick="showPage('inbox')">
      <i class="ti ti-inbox" aria-hidden="true"></i><span>Aguardando minha ação</span>
      ${pc?`<span class="nbadge">${pc}</span>`:''}</div>
    <div class="ni" id="nv_aceitos" onclick="showPage('aceitos')">
      <i class="ti ti-checks" aria-hidden="true"></i><span>Chamados aceitos</span>
      ${ac?`<span class="nbadge nbadge-green">${ac}</span>`:''}</div>`;
  if(CU.role==='admin') {
    h+=`
      <div class="ngrp">Administração</div>
      <div class="ni" id="nv_todos" onclick="showPage('todos')">
        <i class="ti ti-list" aria-hidden="true"></i><span>Todos os chamados</span></div>
      <div class="ni" id="nv_relatorios" onclick="showPage('relatorios')">
        <i class="ti ti-chart-dots" aria-hidden="true"></i><span>Métricas e Relatórios</span></div>
      <div class="ngrp">Financeiro</div>
      <div class="ni" id="nv_fin" onclick="showPage('fin')">
        <i class="ti ti-chart-pie" aria-hidden="true"></i><span>Verbas por setor</span></div>
      <div class="ni" id="nv_mov" onclick="showPage('mov')">
        <i class="ti ti-arrows-exchange" aria-hidden="true"></i><span>Movimentações</span></div>
      <div class="ni" id="nv_histfin" onclick="showPage('histfin')">
        <i class="ti ti-history" aria-hidden="true"></i><span>Histórico mensal</span></div>`;
  } else {
    h+=`
      <div class="ngrp">Financeiro</div>
      <div class="ni" id="nv_meuorc" onclick="showPage('meuorc')">
        <i class="ti ti-chart-bar" aria-hidden="true"></i><span>Minha verba</span></div>`;
  }
  document.getElementById('sidebar').innerHTML=h;
}

function showPage(pg) {
  // Bloqueia páginas exclusivas de admin para outros roles
  const adminOnly = ['todos','relatorios','fin','mov','histfin'];
  if(adminOnly.includes(pg) && CU.role !== 'admin') { pg = 'dashboard'; }

  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  const el=document.getElementById('nv_'+pg); if(el) el.classList.add('active');
  const c=document.getElementById('content');
  if     (pg==='dashboard')  c.innerHTML=renderDashboard();
  else if(pg==='tickets')    c.innerHTML=renderTickets();
  else if(pg==='inbox')      c.innerHTML=renderInbox();
  else if(pg==='aceitos')    c.innerHTML=renderAceitos();
  else if(pg==='todos')      c.innerHTML=renderTodos();
  else if(pg==='relatorios') { c.innerHTML=renderRelatorios(); initCharts(); }
  else if(pg==='fin')        c.innerHTML=renderFin();
  else if(pg==='mov')        c.innerHTML=renderMov();
  else if(pg==='histfin')    c.innerHTML=renderHistoricoPage();
  else if(pg==='meuorc')     c.innerHTML=renderMeuOrc();
}

// ── Dashboard ────────────────────────────────────────────────────────
function renderDashboard() {
  const all  = CU.role==='admin' ? S.tickets : S.tickets.filter(t=>t.userId.toLowerCase()===CU.email.toLowerCase()||pendingForMe().includes(t)||acceptedByMe().includes(t));
  const open = all.filter(t=>!['Encerrado','Recusado'].includes(t.status));
  const sla  = open.filter(t=>{ const s=slaStatus(t); return s.cls==='sla-crit'||s.cls==='sla-warn'; });
  const pend = pendingForMe();
  const ace  = acceptedByMe();

  let h=`<div class="ph"><div class="ph-title">Dashboard</div>
    <button class="btn btn-sm" onclick="reloadData()"><i class="ti ti-refresh" aria-hidden="true"></i> Atualizar</button>
  </div>
  <div class="dash-grid">
    <div class="dash-card dash-blue">
      <div class="dash-icon"><i class="ti ti-ticket" aria-hidden="true"></i></div>
      <div class="dash-val">${all.length}</div>
      <div class="dash-lbl">Total de chamados</div>
    </div>
    <div class="dash-card dash-orange">
      <div class="dash-icon"><i class="ti ti-clock" aria-hidden="true"></i></div>
      <div class="dash-val">${open.length}</div>
      <div class="dash-lbl">Em aberto</div>
    </div>
    <div class="dash-card dash-red">
      <div class="dash-icon"><i class="ti ti-alert-triangle" aria-hidden="true"></i></div>
      <div class="dash-val">${sla.length}</div>
      <div class="dash-lbl">SLA em risco</div>
    </div>
    <div class="dash-card dash-green">
      <div class="dash-icon"><i class="ti ti-inbox" aria-hidden="true"></i></div>
      <div class="dash-val">${pend.length}</div>
      <div class="dash-lbl">Aguardando minha ação</div>
    </div>
  </div>`;

  // Chamados pendentes para mim
  if(pend.length) {
    h+=`<div class="dash-section-title"><i class="ti ti-bell-ringing" aria-hidden="true"></i> Requer sua ação agora</div><div class="tlist">`;
    pend.slice(0,5).forEach(t=>{h+=tCard(t);});
    h+=`</div>`;
    if(pend.length>5) h+=`<div style="text-align:center;padding:12px"><button class="btn btn-sm" onclick="showPage('inbox')">Ver todos (${pend.length})</button></div>`;
  }

  // SLA em risco
  if(sla.length&&CU.role==='admin') {
    h+=`<div class="dash-section-title"><i class="ti ti-alert-triangle" aria-hidden="true" style="color:var(--danger)"></i> SLA em risco</div><div class="tlist">`;
    sla.slice(0,5).forEach(t=>{h+=tCard(t);});
    h+=`</div>`;
  }

  return h;
}

// ── Meus Chamados ─────────────────────────────────────────────────────
function renderTickets() {
  const ts=S.tickets.filter(t=>t.userId.toLowerCase()===CU.email.toLowerCase()).slice().reverse();
  const totAp=ts.filter(t=>t.status==='Aprovado').reduce((a,t)=>a+t.valor,0);
  let h=`<div class="ph">
    <div class="ph-title">Meus chamados</div>
    <button class="btn btn-primary" onclick="openNew()"><i class="ti ti-plus" aria-hidden="true"></i> Novo chamado</button>
  </div>
  <div class="mcrow">
    <div class="mc"><div class="mc-l">Total</div><div class="mc-v">${ts.length}</div></div>
    <div class="mc"><div class="mc-l">Em andamento</div><div class="mc-v">${ts.filter(t=>!['Encerrado','Recusado'].includes(t.status)).length}</div></div>
    <div class="mc"><div class="mc-l">Aprovados</div><div class="mc-v grn">${ts.filter(t=>t.status==='Aprovado').length}</div></div>
    <div class="mc"><div class="mc-l">Valor aprovado</div><div class="mc-v grn" style="font-size:15px">${fm(totAp)}</div></div>
  </div><div class="tlist">`;
  if(!ts.length) h+=`<div class="empty"><i class="ti ti-ticket" aria-hidden="true"></i><p>Nenhum chamado ainda.</p></div>`;
  else ts.forEach(t=>{h+=tCard(t);});
  return h+'</div>';
}

// ── Inbox ─────────────────────────────────────────────────────────────
function renderInbox() {
  const ts=pendingForMe().slice().reverse();
  let h=`<div class="ph"><div class="ph-title">Aguardando minha ação</div></div><div class="tlist">`;
  if(!ts.length) h+=`<div class="empty"><i class="ti ti-check-circle" aria-hidden="true"></i><p>Nenhuma pendência.</p></div>`;
  else ts.forEach(t=>{h+=tCard(t);});
  return h+'</div>';
}

// ── Chamados Aceitos ──────────────────────────────────────────────────
function renderAceitos() {
  const ts=acceptedByMe().slice().reverse();
  let h=`<div class="ph"><div class="ph-title">Chamados que participei</div></div><div class="tlist">`;
  if(!ts.length) h+=`<div class="empty"><i class="ti ti-checks" aria-hidden="true"></i><p>Nenhum chamado ainda.</p><p style="font-size:12px;color:var(--text-3)">Chamados que você criou, encaminhou ou aprovou aparecem aqui.</p></div>`;
  else ts.forEach(t=>{h+=tCard(t);});
  return h+'</div>';
}

// ── Todos os Chamados (admin) ─────────────────────────────────────────
function renderTodos() {
  const ts=S.tickets.slice().reverse();
  const tV=ts.reduce((a,t)=>a+t.valor,0);
  const tA=ts.filter(t=>t.status==='Aprovado').reduce((a,t)=>a+t.valor,0);

  // Filtros
  let h=`<div class="ph">
    <div class="ph-title">Todos os chamados</div>
    <button class="btn btn-sm" onclick="reloadData()"><i class="ti ti-refresh" aria-hidden="true"></i> Atualizar</button>
  </div>
  <div class="filter-bar">
    <select id="fStatus" onchange="applyFilters()"><option value="">Todos os status</option>
      <option>Aguardando</option><option>Em análise</option><option>Aceito</option>
      <option>Aprovado</option><option>Recusado</option><option>Encerrado</option></select>
    <select id="fCat" onchange="applyFilters()"><option value="">Todas as categorias</option>
      ${Object.keys(SETORES_CATS).map(c=>`<option>${c}</option>`).join('')}</select>
    <select id="fPrio" onchange="applyFilters()"><option value="">Todas as prioridades</option>
      <option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option></select>
    <input id="fSearch" type="text" placeholder="Buscar por título, ID ou usuário..." oninput="applyFilters()" style="flex:1;min-width:180px"/>
  </div>
  <div class="mcrow">
    <div class="mc"><div class="mc-l">Total</div><div class="mc-v">${ts.length}</div></div>
    <div class="mc"><div class="mc-l">Pendentes</div><div class="mc-v warn">${ts.filter(t=>['Aguardando','Em análise'].includes(t.status)).length}</div></div>
    <div class="mc"><div class="mc-l">Total solicitado</div><div class="mc-v" style="font-size:15px">${fm(tV)}</div></div>
    <div class="mc"><div class="mc-l">Total aprovado</div><div class="mc-v grn" style="font-size:15px">${fm(tA)}</div></div>
  </div>
  <div class="tlist" id="todosList">`;
  if(!ts.length) h+=`<div class="empty"><i class="ti ti-inbox" aria-hidden="true"></i><p>Nenhum chamado.</p></div>`;
  else ts.forEach(t=>{h+=tCard(t);});
  return h+'</div>';
}

function applyFilters() {
  const status  = document.getElementById('fStatus')?.value||'';
  const cat     = document.getElementById('fCat')?.value||'';
  const prio    = document.getElementById('fPrio')?.value||'';
  const search  = (document.getElementById('fSearch')?.value||'').toLowerCase();
  let ts = S.tickets.slice().reverse();
  if(status)  ts=ts.filter(t=>t.status===status);
  if(cat)     ts=ts.filter(t=>t.categoria===cat);
  if(prio)    ts=ts.filter(t=>t.prioridade===prio);
  if(search)  ts=ts.filter(t=>t.titulo.toLowerCase().includes(search)||String(t.id).includes(search)||t.userNome.toLowerCase().includes(search));
  const list=document.getElementById('todosList');
  if(!list) return;
  if(!ts.length) { list.innerHTML=`<div class="empty"><i class="ti ti-search" aria-hidden="true"></i><p>Nenhum resultado.</p></div>`; return; }
  list.innerHTML=ts.map(t=>tCard(t)).join('');
}

async function reloadData() {
  await loadFromSheets(); buildSidebar(); showPage('todos');
}

// ── Relatórios e Métricas ─────────────────────────────────────────────
function renderRelatorios() {
  const all = S.tickets;
  const enc = all.filter(t=>t.status==='Encerrado'||t.status==='Aprovado');
  const csat= enc.filter(t=>t.csat>0);
  const avgCsat = csat.length ? (csat.reduce((a,t)=>a+t.csat,0)/csat.length).toFixed(1) : '—';

  // TMA: tempo médio de atendimento (aceito até encerrado)
  const comTma = enc.filter(t=>t.aceitoEm&&t.criadoEm);
  const tma    = comTma.length ? Math.round(comTma.reduce((a,t)=>a+(t.aceitoEm-t.criadoEm),0)/comTma.length/3600000) : 0;

  // Distribuição por categoria
  const catCount = {};
  all.forEach(t=>{ catCount[t.categoria]=(catCount[t.categoria]||0)+1; });

  // Distribuição por status
  const stCount = {};
  all.forEach(t=>{ stCount[t.status]=(stCount[t.status]||0)+1; });

  // Distribuição por prioridade
  const prioCount = {};
  all.forEach(t=>{ prioCount[t.prioridade]=(prioCount[t.prioridade]||0)+1; });

  // Volume últimos 7 dias
  const dias=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const label=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
    const ini=new Date(d); ini.setHours(0,0,0,0);
    const fim=new Date(d); fim.setHours(23,59,59,999);
    const count=all.filter(t=>t.criadoEm>=ini.getTime()&&t.criadoEm<=fim.getTime()).length;
    dias.push({label,count});
  }

  const slaOk  = all.filter(t=>slaStatus(t).cls==='sla-ok').length;
  const slaWarn= all.filter(t=>slaStatus(t).cls==='sla-warn').length;
  const slaCrit= all.filter(t=>slaStatus(t).cls==='sla-crit').length;

  return `<div class="ph"><div class="ph-title">Métricas e Relatórios</div></div>
  <div class="mcrow">
    <div class="mc"><div class="mc-l">Total chamados</div><div class="mc-v">${all.length}</div></div>
    <div class="mc"><div class="mc-l">Resolvidos</div><div class="mc-v grn">${enc.length}</div></div>
    <div class="mc"><div class="mc-l">TMA</div><div class="mc-v" style="font-size:15px">${tma}h</div></div>
    <div class="mc"><div class="mc-l">CSAT médio</div><div class="mc-v grn">${avgCsat}${avgCsat!=='—'?'/5':''}</div></div>
  </div>
  <div class="rel-grid">
    <div class="rel-card">
      <div class="rel-card-title">Volume por dia (últimos 7 dias)</div>
      <canvas id="chartDias" height="160"></canvas>
    </div>
    <div class="rel-card">
      <div class="rel-card-title">Chamados por categoria</div>
      <canvas id="chartCat" height="160"></canvas>
    </div>
    <div class="rel-card">
      <div class="rel-card-title">Status atual</div>
      <canvas id="chartStatus" height="160"></canvas>
    </div>
    <div class="rel-card">
      <div class="rel-card-title">SLA</div>
      <div class="sla-pills">
        <div class="sla-pill ok"><i class="ti ti-check" aria-hidden="true"></i> ${slaOk} no prazo</div>
        <div class="sla-pill warn"><i class="ti ti-clock-exclamation" aria-hidden="true"></i> ${slaWarn} em alerta</div>
        <div class="sla-pill crit"><i class="ti ti-alert-triangle" aria-hidden="true"></i> ${slaCrit} estourado</div>
      </div>
      <div class="rel-card-title" style="margin-top:16px">Por prioridade</div>
      ${Object.entries(prioCount).map(([p,c])=>`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span class="prio-tag prio-${p.toLowerCase()}">${p}</span>
          <div style="flex:1;margin:0 10px;background:var(--border);border-radius:4px;height:8px">
            <div style="width:${Math.round(c/all.length*100)}%;background:var(--navy);border-radius:4px;height:8px"></div>
          </div>
          <span style="font-size:13px;font-weight:700;color:var(--navy)">${c}</span>
        </div>`).join('')}
    </div>
  </div>
  <script id="relChartData" type="application/json">${JSON.stringify({dias,catCount,stCount})}</script>`;
}

function initCharts() {
  const el=document.getElementById('relChartData'); if(!el) return;
  const {dias,catCount,stCount}=JSON.parse(el.textContent);
  if(!window.Chart) { loadChartJs(()=>drawCharts(dias,catCount,stCount)); }
  else drawCharts(dias,catCount,stCount);
}

function loadChartJs(cb) {
  const s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  s.onload=cb; document.head.appendChild(s);
}

function drawCharts(dias,catCount,stCount) {
  const navy='#1B3A6B', sky='#3B82F6', green='#3B6D11', red='#A32D2D', orange='#854F0B', gray='#94a3b8';
  const palette=[navy,sky,green,red,orange,gray,'#6366f1','#ec4899'];

  // Volume por dia
  new Chart(document.getElementById('chartDias'),{type:'bar',data:{
    labels:dias.map(d=>d.label),
    datasets:[{label:'Chamados',data:dias.map(d=>d.count),backgroundColor:sky,borderRadius:6}]
  },options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}});

  // Por categoria
  const catLabels=Object.keys(catCount), catVals=Object.values(catCount);
  new Chart(document.getElementById('chartCat'),{type:'doughnut',data:{
    labels:catLabels,datasets:[{data:catVals,backgroundColor:palette.slice(0,catLabels.length)}]
  },options:{plugins:{legend:{position:'bottom'}}}});

  // Por status
  const stLabels=Object.keys(stCount), stVals=Object.values(stCount);
  const stColors=stLabels.map(s=>s==='Aprovado'?green:s==='Recusado'?red:s==='Encerrado'?gray:s==='Em análise'?orange:sky);
  new Chart(document.getElementById('chartStatus'),{type:'bar',data:{
    labels:stLabels,datasets:[{data:stVals,backgroundColor:stColors,borderRadius:6}]
  },options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}});
}

// ── Verbas Setores ────────────────────────────────────────────────────
function renderFin() {
  const tOrc=S.setores.reduce((a,s)=>a+s.orcamento,0);
  const tGas=S.setores.reduce((a,s)=>a+s.gasto,0);
  // Calcula o mês atual para mostrar no cabeçalho
  const mesAtual = new Date().toLocaleString('pt-BR',{month:'long',year:'numeric'});
  let h=`<div class="ph">
    <div>
      <div class="ph-title">Verbas por setor</div>
      <div style="font-size:12px;color:var(--text-3);margin-top:2px;text-transform:capitalize">${mesAtual}</div>
    </div>
    <button class="btn btn-warning" onclick="fecharMes()">
      <i class="ti ti-lock-open" aria-hidden="true"></i> Fechar mês
    </button>
  </div>
  <div class="fin-summary">
    <div class="fin-mc"><div class="fin-mc-l">Orçamento total</div><div class="fin-mc-v">${fm(tOrc)}</div></div>
    <div class="fin-mc" style="background:var(--danger-bg)"><div class="fin-mc-l" style="color:var(--danger)">Total gasto</div><div class="fin-mc-v" style="color:var(--danger)">${fm(tGas)}</div></div>
    <div class="fin-mc" style="background:var(--success-bg)"><div class="fin-mc-l" style="color:var(--success)">Disponível</div><div class="fin-mc-v" style="color:var(--success)">${fm(tOrc-tGas)}</div></div>
  </div>`;
  S.setores.forEach(s=>{
    const p=pct(s), disp=s.orcamento-s.gasto;
    const dC=disp<0?'bad':p>=65?'warn':'ok';
    const ult=(s.movimentos||[]).slice(-3).reverse();
    h+=`<div class="setor-card">
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
      ${ult.length?`<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
        ${ult.map(m=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0">
          <span style="color:var(--text-2)">${esc(m.desc)}</span>
          <span style="font-weight:700;color:${m.tipo==='saida'?'#791F1F':'#27500A'}">${m.tipo==='saida'?'−':'+'} ${fm(m.valor)}</span>
        </div>`).join('')}</div>`:''}
    </div>`;
  });
  // Histórico de meses anteriores
  h += renderHistoricoOrcamentos();
  return h;
}

function renderHistoricoPage() {
  let h=`<div class="ph"><div class="ph-title">Histórico mensal de verbas</div></div>`;
  if(!S.historico.length){
    return h+`<div class="empty"><i class="ti ti-history" aria-hidden="true"></i><p>Nenhum mês fechado ainda.</p><p style="font-size:12px;color:var(--text-3)">Use "Fechar mês" na página de Verbas por setor ao final de cada mês.</p></div>`;
  }
  h+=renderHistoricoOrcamentos();
  return h;
}

function renderMov() {
  let all=[];
  S.setores.forEach(s=>{(s.movimentos||[]).forEach(m=>all.push({...m,setorNome:s.nome}));});
  all.sort((a,b)=>b.ts-a.ts);
  let h=`<div class="ph"><div class="ph-title">Movimentações financeiras</div></div>`;
  if(!all.length) return h+`<div class="empty"><i class="ti ti-arrows-exchange" aria-hidden="true"></i><p>Nenhuma movimentação.</p></div>`;
  h+=`<div class="mov-table">`;
  all.forEach(m=>{
    h+=`<div class="mov-row">
      <div><div class="mov-row-title">${esc(m.desc)}</div><div class="mov-row-sub">${m.setorNome} · ${fd(m.ts)}</div></div>
      <div class="mov-val ${m.tipo==='saida'?'mov-out':'mov-in'}">${m.tipo==='saida'?'−':'+'} ${fm(m.valor)}</div>
    </div>`;
  });
  return h+'</div>';
}

function renderMeuOrc() {
  const s=S.setores.find(x=>x.id===CU.setor);
  if(!s) return `<div class="empty"><i class="ti ti-chart-bar" aria-hidden="true"></i><p>Sem setor definido.</p></div>`;
  const p=pct(s), disp=s.orcamento-s.gasto;
  const dc=disp<0?'red':p>=65?'warn':'grn';
  const movs=(s.movimentos||[]).slice().reverse();
  let h=`<div class="ph"><div class="ph-title">Verba — ${s.nome}</div></div>
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
  if(movs.length){
    h+=`<div style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:10px">Histórico</div><div class="mov-table">`;
    movs.forEach(m=>{
      h+=`<div class="mov-row">
        <div><div class="mov-row-title">${esc(m.desc)}</div><div class="mov-row-sub">${fd(m.ts)}</div></div>
        <div class="mov-val ${m.tipo==='saida'?'mov-out':'mov-in'}">${m.tipo==='saida'?'−':'+'} ${fm(m.valor)}</div>
      </div>`;
    });
    h+=`</div>`;
  } else {
    h+=`<div class="empty"><i class="ti ti-arrows-exchange" aria-hidden="true"></i><p>Nenhuma movimentação.</p></div>`;
  }
  return h;
}

// ── Card de chamado ───────────────────────────────────────────────────
function tCard(t) {
  const sCfg=S.setores.find(x=>x.id===t.setorId)||gSCfg(t.setorId)||{nome:'—'};
  const cur=curStep(t);
  const sc=subcatOf(t);
  const uDest=cur&&cur.targetType==='user' ?gU(cur.targetId):null;
  const sDest=cur&&cur.targetType==='setor'?S.setores.find(x=>x.id===cur.targetId):null;
  const dest=cur?(uDest?uDest.nome:sDest?sDest.nome+' (setor)':cur.targetId):null;
  const sla=slaStatus(t);
  const hasAnexos=(t.anexos||[]).length>0;
  return `<div class="tcard" onclick="openTicket(${t.id})">
    <div class="tcard-top">
      <div class="tcard-title">#${t.id} — ${esc(t.titulo)}</div>
      <div style="display:flex;gap:6px;align-items:center">
        <span class="sb ${sClass(t.status)}">${t.status}</span>
        <span class="sla-tag ${sla.cls}"><i class="ti ${sla.icon}" aria-hidden="true"></i> ${sla.label}</span>
      </div>
    </div>
    <div class="tcard-meta">
      <span><i class="ti ti-building" aria-hidden="true"></i> ${sCfg.nome}</span>
      <span><i class="ti ti-tag" aria-hidden="true"></i> ${t.categoria}</span>
      ${sc?`<span class="subcat-tag"><i class="ti ${sc.icon}" aria-hidden="true" style="font-size:12px"></i> ${sc.nome}</span>`:''}
      ${t.valor>0?`<span><i class="ti ti-currency-dollar" aria-hidden="true"></i> ${fm(t.valor)}</span>`:''}
      ${dest?`<span><i class="ti ti-arrow-right" aria-hidden="true"></i> ${dest}</span>`:''}
      ${hasAnexos?`<span><i class="ti ti-paperclip" aria-hidden="true"></i> ${t.anexos.length} anexo(s)</span>`:''}
      <span class="prio-tag prio-${t.prioridade.toLowerCase()}">${t.prioridade}</span>
      <span><i class="ti ti-clock" aria-hidden="true"></i> ${fd(t.criadoEm)}</span>
    </div>
  </div>`;
}

// ── Abrir chamado (modal) ─────────────────────────────────────────────
function openTicket(id) {
  const t=S.tickets.find(x=>x.id==id); if(!t) return;
  const sCfg=S.setores.find(x=>x.id===t.setorId)||gSCfg(t.setorId)||{nome:'—',orcamento:0,gasto:0};
  const creator=gU(t.userId)||{nome:t.userNome||t.userId};
  const sc=subcatOf(t);
  const enc=t.status==='Encerrado'||t.status==='Recusado';
  const sla=slaStatus(t);
  document.getElementById('mTitle').textContent=`#${t.id} — ${t.titulo}`;

  let body=`
    <div class="ir"><span class="il">Status</span><span class="sb ${sClass(t.status)}">${t.status}</span></div>
    <div class="ir"><span class="il">SLA</span><span class="sla-tag ${sla.cls}"><i class="ti ${sla.icon}" aria-hidden="true"></i> ${sla.label}</span></div>
    <div class="ir"><span class="il">Setor</span><span>${sCfg.nome}</span></div>
    <div class="ir"><span class="il">Solicitante</span><span>${creator.nome}</span></div>
    <div class="ir"><span class="il">Categoria</span><span>${t.categoria}</span></div>
    ${sc?`<div class="ir"><span class="il">Tipo</span><span style="display:flex;align-items:center;gap:6px"><i class="ti ${sc.icon}" style="color:var(--navy)" aria-hidden="true"></i><strong>${sc.nome}</strong></span></div>`:''}
    <div class="ir"><span class="il">Prioridade</span><span class="prio-tag prio-${t.prioridade.toLowerCase()}">${t.prioridade}</span></div>
    <div class="ir"><span class="il">Valor</span><span style="font-weight:700;color:var(--navy)">${fm(t.valor)}</span></div>
    <div class="ir"><span class="il">Aberto em</span><span>${fd(t.criadoEm)}</span></div>
    ${t.aceitoEm?`<div class="ir"><span class="il">Aceito em</span><span>${fd(t.aceitoEm)} por ${esc((gU(t.aceitoPor)||{nome:t.aceitoPor}).nome)}</span></div>`:''}`;

  // Campos extras
  if(t.camposExtra&&Object.entries(t.camposExtra).some(([,v])=>v)){
    body+=`<div class="detail-card"><div class="detail-card-title">Dados complementares</div>`;
    for(const [k,v] of Object.entries(t.camposExtra)){
      if(!v) continue;
      const cfg=CAMPOS_DEF[k];
      body+=`<div class="ir"><span class="il">${cfg?cfg.label:k}</span><span>${esc(v)}</span></div>`;
    }
    body+=`</div>`;
  }

  // Orçamento mini
  if(t.valor>0&&sCfg.orcamento!==undefined){
    const disp=sCfg.orcamento-sCfg.gasto, p=pct(sCfg);
    body+=`<div class="fin-mini">
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
  body+=`<div class="divl"></div><div class="sec-title">Descrição</div>
    <p style="font-size:13px;line-height:1.6;margin-bottom:12px">${esc(t.descricao)}</p>`;

  // Trilha de aprovação
  body+=`<div class="divl"></div><div class="sec-title">Trilha de aprovação</div><div class="trail">`;
  t.steps.forEach((st,i)=>{
    const uD=gU(st.targetId); const sD=S.setores.find(x=>x.id===st.targetId);
    const tgt=st.targetType==='user'?(uD||{nome:st.targetId}).nome:(sD||{nome:'?'}).nome+' (setor)';
    const dc=st.status==='aprovado'?'td-ok':st.status==='recusado'?'td-no':st.status==='pendente'?'td-pe':'td-fw';
    const ic=st.status==='aprovado'?'ti-check':st.status==='recusado'?'ti-x':'ti-clock';
    const sub=st.status==='aprovado'?'Aprovado em '+fd(st.ts):st.status==='recusado'?'Recusado em '+fd(st.ts):st.status==='pendente'?'Aguardando decisão':'Encaminhado';
    body+=`<div class="trail-step"><div class="trail-dot ${dc}"><i class="ti ${ic}" aria-hidden="true"></i></div>
      <div class="trail-info"><div class="trail-name">${esc(tgt)}</div>
      <div class="trail-sub">${sub}${st.nota?' — '+esc(st.nota):''}</div></div></div>`;
    if(i<t.steps.length-1) body+=`<div class="trail-line"></div>`;
  });
  body+=`</div>`;

  // Anexos
  body+=`<div class="divl"></div><div class="sec-title">Anexos</div>`;
  const anexos=t.anexos||[];
  if(anexos.length){
    body+=`<div class="anexos-list">`;
    anexos.forEach(a=>{
      const isImg=a.tipo&&a.tipo.startsWith('image/');
      body+=`<a class="anexo-item" href="${a.url}" target="_blank" rel="noopener">
        <i class="ti ${isImg?'ti-photo':'ti-file'}" aria-hidden="true"></i>
        <span>${esc(a.nome)}</span>
        <i class="ti ti-external-link" aria-hidden="true" style="font-size:11px;opacity:.6"></i>
      </a>`;
    });
    body+=`</div>`;
  } else {
    body+=`<div style="font-size:13px;color:var(--text-3);margin-bottom:12px" data-no-anexo="1">Nenhum anexo.</div>`;
  }
  if(!enc){
    body+=`<div class="anexo-upload">
      <label class="btn btn-sm" for="anexoFile_${t.id}" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">
        <i class="ti ti-upload" aria-hidden="true"></i> Enviar arquivo
      </label>
      <input id="anexoFile_${t.id}" type="file" multiple style="display:none" onchange="uploadAnexo(${t.id},this)"/>
      <span id="uploadStatus_${t.id}" style="font-size:12px;color:var(--text-3)"></span>
    </div>`;
  }

  // Chat
  body+=`<div class="divl"></div><div class="sec-title">Chat</div>
    <div class="chat-wrap" id="chatW">`;
  (t.chat||[]).forEach(m=>{
    const mine=m.uid.toLowerCase()===CU.email.toLowerCase();
    const hasFile=m.fileUrl;
    body+=`<div class="cm ${mine?'mine':'other'}">
      <div class="ca">${esc(m.autor)} · ${fd(m.ts)}</div>
      ${hasFile?`<a class="chat-file-link" href="${m.fileUrl}" target="_blank" rel="noopener"><i class="ti ti-paperclip" aria-hidden="true"></i> ${esc(m.fileName||'Arquivo')}</a>`:''}
      ${m.txt?`<div>${esc(m.txt)}</div>`:''}
    </div>`;
  });
  body+=`</div>`;

  if(enc){
    body+=`<div class="chat-locked"><i class="ti ti-lock" aria-hidden="true"></i> Chat bloqueado — chamado ${t.status.toLowerCase()}</div>`;
    // CSAT se foi o criador
    if(t.userId.toLowerCase()===CU.email.toLowerCase()&&!t.csat){
      body+=`<div class="csat-box">
        <div class="csat-title">Como você avalia o atendimento?</div>
        <div class="csat-stars">${[1,2,3,4,5].map(n=>`<button class="csat-star" onclick="submitCsat(${t.id},${n})"><i class="ti ti-star" aria-hidden="true"></i></button>`).join('')}</div>
      </div>`;
    } else if(t.csat){
      body+=`<div class="csat-box"><div class="csat-title">Sua avaliação: ${'★'.repeat(t.csat)}${'☆'.repeat(5-t.csat)}</div></div>`;
    }
  } else {
    body+=`<div class="chat-input-row">
      <input id="chatIn" type="text" placeholder="Mensagem..." onkeydown="if(event.key==='Enter') sendChat(${t.id})"/>
      <label for="chatFileIn_${t.id}" class="btn" style="padding:0 10px;cursor:pointer;display:flex;align-items:center" title="Enviar arquivo no chat">
        <i class="ti ti-paperclip" aria-hidden="true"></i>
      </label>
      <input id="chatFileIn_${t.id}" type="file" style="display:none" onchange="sendChatFile(${t.id},this)"/>
      <button class="btn btn-primary" onclick="sendChat(${t.id})"><i class="ti ti-send" aria-hidden="true"></i></button>
    </div>`;
  }

  document.getElementById('mBody').innerHTML=body;

  // Botões de ação
  const cur2=curStep(t);
  const isCur=cur2&&(
    (cur2.targetType==='user'  && cur2.targetId.toLowerCase()===CU.email.toLowerCase())||
    (cur2.targetType==='setor' && cur2.targetId===CU.setor && (CU.role==='aprovador'||CU.role==='admin'))
  );
  let foot='';
  if(isCur&&!enc){
    foot+=`<button class="btn btn-danger"  onclick="decide(${t.id},'recusado')"><i class="ti ti-x" aria-hidden="true"></i> Recusar</button>`;
    foot+=`<button class="btn btn-warning" onclick="showFwd(${t.id})"><i class="ti ti-arrow-forward" aria-hidden="true"></i> Encaminhar</button>`;
    foot+=`<button class="btn btn-success" onclick="decide(${t.id},'aprovado')"><i class="ti ti-check" aria-hidden="true"></i> Aprovar</button>`;
  }
  if(CU.role==='admin'&&t.status==='Aprovado'){
    foot+=`<button class="btn" onclick="decide(${t.id},'encerrado')"><i class="ti ti-lock" aria-hidden="true"></i> Encerrar</button>`;
  }
  foot+=`<button class="btn" onclick="closeMod()">Fechar</button>`;
  document.getElementById('mFoot').innerHTML=foot;
  document.getElementById('ovTicket').classList.add('open');
  const cw=document.getElementById('chatW');
  if(cw) cw.scrollTop=cw.scrollHeight;
  startChatPolling(id);
}

// ── Upload de anexo (aba anexos do chamado) ───────────────────────────
async function uploadAnexo(tid, input) {
  const t=S.tickets.find(x=>x.id==tid); if(!t) return;
  const statusEl=document.getElementById('uploadStatus_'+tid);
  const files = Array.from(input.files);
  if(!files.length) return;
  if(statusEl) statusEl.textContent='Enviando ' + files.length + ' arquivo(s)...';
  try{
    for(const file of files){
      const driveFile=await uploadFileToDrive(file);
      if(!t.anexos) t.anexos=[];
      t.anexos.push(driveFile);
      // Adiciona o item na lista de anexos sem fechar o modal
      let anexosList = document.querySelector('.anexos-list');
      if(!anexosList) {
        // Cria a lista se não existir ainda
        const sec = document.createElement('div');
        sec.className = 'anexos-list';
        const noAnexo = document.querySelector('[data-no-anexo]');
        if(noAnexo) noAnexo.replaceWith(sec);
        anexosList = sec;
      }
      const isImg = driveFile.tipo && driveFile.tipo.startsWith('image/');
      const a = document.createElement('a');
      a.className = 'anexo-item'; a.href = driveFile.url; a.target = '_blank'; a.rel = 'noopener';
      a.innerHTML = `<i class="ti ${isImg?'ti-photo':'ti-file'}" aria-hidden="true"></i><span>${esc(driveFile.nome)}</span><i class="ti ti-external-link" aria-hidden="true" style="font-size:11px;opacity:.6"></i>`;
      anexosList.appendChild(a);
    }
    await saveTickets();
    if(statusEl) { statusEl.textContent = 'Enviado com sucesso!'; setTimeout(()=>{ if(statusEl) statusEl.textContent=''; }, 3000); }
  }catch(e){
    if(statusEl) statusEl.textContent='Erro: '+e.message;
    console.error(e);
  }
}

// ── Upload de arquivo no chat ─────────────────────────────────────────
async function sendChatFile(tid, input) {
  const t=S.tickets.find(x=>x.id==tid); if(!t) return;
  const file=input.files[0]; if(!file) return;
  try{
    sync('Enviando arquivo...','loading');
    const driveFile=await uploadFileToDrive(file);
    if(!t.chat) t.chat=[];
    t.chat.push({uid:CU.email,autor:CU.nome,txt:'',fileUrl:driveFile.url,fileName:driveFile.nome,ts:Date.now()});
    refreshChatInModal(t);
    await saveTickets();
    // Atualiza também a lista de anexos sem fechar modal
    const anexosList = document.querySelector('.anexos-list');
    if(anexosList) {
      const a = document.createElement('a');
      a.className = 'anexo-item'; a.href = driveFile.url; a.target = '_blank'; a.rel = 'noopener';
      a.innerHTML = `<i class="ti ti-paperclip" aria-hidden="true"></i><span>${esc(driveFile.nome)}</span>`;
      anexosList.appendChild(a);
    }
  }catch(e){
    sync('Erro no upload: '+e.message,'err');
    console.error(e);
  }
}

// ── CSAT ──────────────────────────────────────────────────────────────
async function submitCsat(tid, nota) {
  const t=S.tickets.find(x=>x.id==tid); if(!t) return;
  t.csat=nota;
  await saveTickets();
  openTicket(tid);
}

// ── Encaminhar ────────────────────────────────────────────────────────
function showFwd(tid) {
  const ex=document.getElementById('fwdBox'); if(ex) ex.remove();
  let opts='';
  (CONFIG.ALLOWED_USERS||[]).filter(u=>u.email.toLowerCase()!==CU.email.toLowerCase()&&u.role!=='admin').forEach(u=>{
    const sn=gSCfg(u.setor)||{nome:''};
    opts+=`<option value="user:${u.email}">${u.nome} (${sn.nome})</option>`;
  });
  S.setores.forEach(s=>{opts+=`<option value="setor:${s.id}">Setor: ${s.nome}</option>`;});
  document.getElementById('mBody').insertAdjacentHTML('afterbegin',`
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
  const el=document.getElementById('fwdDest'); if(!el) return;
  const [type,id]=el.value.split(':');
  const nota=(document.getElementById('fwdNota')||{value:''}).value.trim();
  const t=S.tickets.find(x=>x.id==tid); if(!t) return;
  const cur=curStep(t); if(cur) cur.status='encaminhado';
  t.steps.push({targetType:type,targetId:id,status:'pendente',nota,ts:null});
  t.status='Em análise';
  const uD=gU(id); const sD=S.setores.find(x=>x.id===id);
  const dn=type==='user'?(uD||{nome:id}).nome:(sD||{nome:id}).nome+' (setor)';
  t.chat.push({uid:CU.email,autor:CU.nome,txt:`Encaminhado para ${dn}.${nota?' Obs: '+nota:''}`,ts:Date.now()});
  await saveTickets();
  closeMod(); buildSidebar(); showPage('inbox');
}

// ── Decisão (aprovar / recusar / encerrar) ────────────────────────────
async function decide(tid,dec) {
  const t=S.tickets.find(x=>x.id==tid); if(!t) return;
  const cur=curStep(t);
  const s=S.setores.find(x=>x.id===t.setorId);

  if(dec==='aprovado'){
    if(t.valor>0&&s){
      const disp=s.orcamento-s.gasto;
      if(t.valor>disp){ alert(`Saldo insuficiente!\nDisponível em ${s.nome}: ${fm(disp)}\nValor solicitado: ${fm(t.valor)}`); return; }
      s.gasto+=t.valor;
      if(!s.movimentos) s.movimentos=[];
      const sc=subcatOf(t);
      s.movimentos.push({tipo:'saida',valor:t.valor,desc:(sc?`[${sc.nome}] `:'')+`Chamado #${t.id} — ${t.titulo}`,ts:Date.now()});
    }
    if(cur){cur.status='aprovado';cur.ts=Date.now();}
    if(!t.steps.some(st=>st.status==='pendente')) t.status='Aprovado';
    // Registrar aceite
    if(!t.aceitoEm){ t.aceitoEm=Date.now(); t.aceitoPor=CU.email; }
    t.chat.push({uid:CU.email,autor:CU.nome,txt:`Aprovado por ${CU.nome}.${t.valor>0?` Valor de ${fm(t.valor)} debitado de ${(s||{}).nome||'—'}.`:''}`,ts:Date.now()});
    await Promise.all([saveTickets(),saveOrcamentos()]);

  } else if(dec==='recusado'){
    if(cur){cur.status='recusado';cur.ts=Date.now();}
    t.status='Recusado';
    t.chat.push({uid:CU.email,autor:CU.nome,txt:`Recusado por ${CU.nome}.`,ts:Date.now()});
    await saveTickets();

  } else if(dec==='encerrado'){
    t.status='Encerrado';
    t.chat.push({uid:CU.email,autor:CU.nome,txt:`Encerrado por ${CU.nome}.`,ts:Date.now()});
    await saveTickets();
  }
  closeMod(); buildSidebar();
  showPage(CU.role==='admin'?'todos':'inbox');
}

// ── Chat ──────────────────────────────────────────────────────────────
async function sendChat(tid) {
  const input=document.getElementById('chatIn'); if(!input) return;
  const txt=input.value.trim(); if(!txt) return;
  const t=S.tickets.find(x=>x.id==tid); if(!t) return;
  if(t.status==='Encerrado'||t.status==='Recusado') return;
  if(!t.chat) t.chat=[];
  t.chat.push({uid:CU.email,autor:CU.nome,txt,ts:Date.now()});
  input.value='';
  // Atualiza o chat na tela imediatamente sem fechar o modal
  refreshChatInModal(t);
  await saveTickets();
}

// Atualiza só o chat dentro do modal aberto (sem fechar)
function refreshChatInModal(t) {
  const chatW = document.getElementById('chatW');
  if (!chatW) return;
  chatW.innerHTML = '';
  (t.chat || []).forEach(m => {
    const mine = m.uid.toLowerCase() === CU.email.toLowerCase();
    const div  = document.createElement('div');
    div.className = 'cm ' + (mine ? 'mine' : 'other');
    let inner = `<div class="ca">${esc(m.autor)} · ${fd(m.ts)}</div>`;
    if (m.fileUrl) inner += `<a class="chat-file-link" href="${m.fileUrl}" target="_blank" rel="noopener"><i class="ti ti-paperclip" aria-hidden="true"></i> ${esc(m.fileName||'Arquivo')}</a>`;
    if (m.txt)     inner += `<div>${esc(m.txt)}</div>`;
    div.innerHTML = inner;
    chatW.appendChild(div);
  });
  chatW.scrollTop = chatW.scrollHeight;
}

// ── Polling automático do chat ────────────────────────────────────
let _chatPollInterval = null;
let _chatPollTid      = null;

function startChatPolling(tid) {
  stopChatPolling();
  _chatPollTid = tid;

  // Guarda o timestamp da última mensagem conhecida para detectar novidades
  const localTicket = S.tickets.find(x => x.id == tid);
  let lastKnownMsgTs = localTicket && localTicket.chat && localTicket.chat.length
    ? Math.max(...localTicket.chat.map(m => m.ts || 0))
    : 0;

  _chatPollInterval = setInterval(async () => {
    if (!document.getElementById('ovTicket').classList.contains('open')) {
      stopChatPolling(); return;
    }
    try {
      // Busca todas as linhas mas só processa a do ticket aberto
      const rows = await sheetGet('tickets!A2:Z9999');
      const myRow = rows.find(row => Number(row[0]) === Number(_chatPollTid));
      if (!myRow) return;

      const fresh = {};
      T_HDR.forEach((h, i) => { fresh[h] = myRow[i] !== undefined ? myRow[i] : ''; });
      fresh.id        = Number(fresh.id);
      fresh.chat      = pj(fresh.chat)      || [];
      fresh.anexos    = pj(fresh.anexos)    || [];
      fresh.steps     = pj(fresh.steps)     || [];
      fresh.camposExtra = pj(fresh.camposExtra) || {};
      fresh.valor     = Number(fresh.valor)     || 0;
      fresh.criadoEm  = Number(fresh.criadoEm)  || 0;
      fresh.aceitoEm  = Number(fresh.aceitoEm)  || 0;
      fresh.csat      = Number(fresh.csat)      || 0;

      // Detecta mensagens novas pelo timestamp
      const newestTs = fresh.chat.length
        ? Math.max(...fresh.chat.map(m => m.ts || 0))
        : 0;

      if (newestTs > lastKnownMsgTs) {
        lastKnownMsgTs = newestTs;
        // Atualiza S.tickets em memória
        const idx = S.tickets.findIndex(x => x.id == _chatPollTid);
        if (idx >= 0) S.tickets[idx] = fresh;
        // Redesenha o chat
        refreshChatInModal(fresh);
        // Atualiza badge do sidebar silenciosamente
        buildSidebar();
      }
    } catch(e) {
      // silencioso
    }
  }, 8000); // a cada 8 segundos — mais responsivo
}

function stopChatPolling() {
  if (_chatPollInterval) { clearInterval(_chatPollInterval); _chatPollInterval = null; }
  _chatPollTid = null;
}

// ── Novo chamado ──────────────────────────────────────────────────────
function onDestSetorChange() {
  const cat=document.getElementById('nCatSetor').value;
  const area=document.getElementById('subcatArea');
  const grid=document.getElementById('subcatGrid');
  const extra=document.getElementById('extraFields');
  selSubcat=null; extra.innerHTML='';
  const subcats=SETORES_CATS[cat]||[];
  if(subcats.length){
    area.style.display='block'; grid.innerHTML='';
    subcats.forEach(sc=>{
      grid.innerHTML+=`<button class="scbtn" id="scb_${sc.id}" onclick="selSC('${sc.id}','${cat}')">
        <i class="ti ${sc.icon}" aria-hidden="true"></i>
        <div><div class="scbtn-nm">${sc.nome}</div><div class="scbtn-ds">${sc.desc}</div></div>
      </button>`;
    });
  } else { area.style.display='none'; }
}

function selSC(id,cat){
  selSubcat=id;
  document.querySelectorAll('.scbtn').forEach(b=>b.classList.remove('sel'));
  const el=document.getElementById('scb_'+id); if(el) el.classList.add('sel');
  renderExtra(id,cat);
}

function renderExtra(id,cat){
  const list=SETORES_CATS[cat]||[]; const sc=list.find(x=>x.id===id);
  if(!sc||!sc.campos.length){document.getElementById('extraFields').innerHTML='';return;}
  let h=`<div class="extra-fields">`;
  sc.campos.forEach((ck,i)=>{
    const cfg=CAMPOS_DEF[ck]; if(!cfg) return;
    const full=sc.campos.length%2!==0&&i===sc.campos.length-1?' extra-full':'';
    h+=`<div class="fg${full}"><label class="fl">${cfg.label}</label>`;
    if(cfg.type==='select'){
      h+=`<select id="ef_${ck}"><option value="">Selecione...</option>${cfg.opts.map(o=>`<option>${o}</option>`).join('')}</select>`;
    } else {
      h+=`<input id="ef_${ck}" type="${cfg.type}"${cfg.ph?` placeholder="${cfg.ph}"`:''}/>`; 
    }
    h+=`</div>`;
  });
  h+=`</div>`;
  document.getElementById('extraFields').innerHTML=h;
}

function openNew(){
  const sel=document.getElementById('nDest'); if(!sel) return;
  sel.innerHTML='';
  (CONFIG.ALLOWED_USERS||[]).filter(u=>u.email.toLowerCase()!==CU.email.toLowerCase()&&u.role!=='admin').forEach(u=>{
    const sn=gSCfg(u.setor)||{nome:''};
    sel.innerHTML+=`<option value="user:${u.email}">${u.nome} (${sn.nome})</option>`;
  });
  S.setores.forEach(s=>{sel.innerHTML+=`<option value="setor:${s.id}">Setor: ${s.nome}</option>`;});
  selSubcat=null;
  document.getElementById('nCatSetor').value='';
  document.getElementById('subcatArea').style.display='none';
  document.getElementById('extraFields').innerHTML='';
  document.getElementById('ovNew').classList.add('open');
}

async function submitTicket(){
  const titulo=document.getElementById('nTit').value.trim();
  const cat=document.getElementById('nCatSetor').value;
  const destRaw=document.getElementById('nDest').value;
  const valor=parseFloat(document.getElementById('nVal').value)||0;
  const desc=document.getElementById('nDesc').value.trim();
  const prio=document.getElementById('nPrio').value;
  if(!titulo||!desc) return alert('Preencha o título e a descrição.');
  if(!cat) return alert('Selecione o setor responsável.');
  const subcats=SETORES_CATS[cat]||[];
  if(subcats.length&&!selSubcat) return alert('Selecione o tipo de solicitação.');
  const [type,id]=destRaw.split(':');
  const setorId=CU.setor||'s1';
  let camposExtra={};
  if(selSubcat){
    const list=SETORES_CATS[cat]||[]; const sc=list.find(x=>x.id===selSubcat);
    if(sc) sc.campos.forEach(ck=>{
      const el=document.getElementById('ef_'+ck);
      if(el) camposExtra[ck]=el.value.trim();
    });
  }
  const slaConf=(CONFIG.SLA||{})[prio]||{resposta:24,resolucao:72};
  const ticket={
    id:nextId(),titulo,categoria:cat,subcategoria:selSubcat||'',
    camposExtra,valor,descricao:desc,prioridade:prio,
    setorId,userId:CU.email,userNome:CU.nome,
    status:'Aguardando',criadoEm:Date.now(),
    steps:[{targetType:type,targetId:id,status:'pendente',nota:'',ts:null}],
    chat:[],anexos:[],aceitoEm:0,aceitoPor:'',
    slaResposta:slaConf.resposta,slaResolucao:slaConf.resolucao,csat:0,
  };

  // Upload de anexos enviados junto ao chamado
  const fileInput = document.getElementById('nAnexos');
  if(fileInput && fileInput.files.length > 0) {
    const submitBtn = document.getElementById('submitBtn');
    if(submitBtn) { submitBtn.disabled=true; submitBtn.innerHTML='<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Enviando...'; }
    sync('Enviando anexos...','loading');
    for(const file of Array.from(fileInput.files)){
      try{
        const driveFile = await uploadFileToDrive(file);
        ticket.anexos.push(driveFile);
      }catch(e){
        console.warn('Falha no upload de anexo:', e.message);
      }
    }
  }

  S.tickets.push(ticket);
  await saveTickets();
  closeNew();
  document.getElementById('nTit').value='';
  document.getElementById('nDesc').value='';
  document.getElementById('nVal').value='0';
  selSubcat=null;
  buildSidebar(); showPage('tickets');
}

// ── Verba ─────────────────────────────────────────────────────────────
function openVerba(setorId){
  editSetorId=setorId;
  const s=S.setores.find(x=>x.id===setorId); if(!s) return;
  const disp=s.orcamento-s.gasto;
  document.getElementById('vBody').innerHTML=`
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

async function saveVerba(){
  const s=S.setores.find(x=>x.id===editSetorId); if(!s) return;
  s.orcamento=parseFloat(document.getElementById('vOrc').value)||0;
  const tipo=document.getElementById('vTipo').value;
  const val=parseFloat(document.getElementById('vLancVal').value)||0;
  const desc=document.getElementById('vLancDesc').value.trim();
  if(val>0&&desc){
    if(!s.movimentos) s.movimentos=[];
    tipo==='saida'?s.gasto+=val:s.gasto=Math.max(0,s.gasto-val);
    s.movimentos.push({tipo,valor:val,desc,ts:Date.now()});
  }
  await saveOrcamentos();
  closeVerba(); showPage('fin');
}

// ── Fechar modais ─────────────────────────────────────────────────────
function updateAnexosLabel(input) {
  const label = document.getElementById('nAnexosLabel');
  if(!label) return;
  const count = input.files.length;
  label.textContent = count === 0
    ? 'Clique ou arraste arquivos aqui'
    : count === 1
      ? input.files[0].name
      : `${count} arquivos selecionados`;
}

function closeMod()   { document.getElementById('ovTicket').classList.remove('open'); stopChatPolling(); }
function closeNew()   { document.getElementById('ovNew').classList.remove('open'); }
function closeVerba() { document.getElementById('ovVerba').classList.remove('open'); editSetorId=null; }

document.addEventListener('click',e=>{
  ['ovTicket','ovNew','ovVerba'].forEach(id=>{
    const ov=document.getElementById(id);
    if(ov&&e.target===ov) ov.classList.remove('open');
  });
});
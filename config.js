// ============================================================
//  FORTSUN — Configuração
//  Preencha com suas credenciais do Google Cloud Console
// ============================================================

const CONFIG = {
  // Client ID do OAuth 2.0 (Google Cloud Console)
  GOOGLE_CLIENT_ID: 'SEU_CLIENT_ID.apps.googleusercontent.com',

  // ID da planilha Google Sheets
  // URL da planilha: https://docs.google.com/spreadsheets/d/ESTE_ID_AQUI/edit
  SPREADSHEET_ID: 'ID_DA_SUA_PLANILHA',

  // E-mails autorizados a usar o sistema
  // Usuários não listados serão bloqueados mesmo com conta Google válida
  ALLOWED_USERS: [
    { email: 'Henrique@fortsun.com.br',    nome: 'Admin Fortsun',  role: 'admin',     setor: null,  ini: 'AF' },
    { email: 'rafael.germano@fortsun.com.br',   nome: 'germano',      role: 'user',      setor: 's1',  ini: 'CT' },
    { email: 'ana@fortsun.com.br',      nome: 'Ana RH',         role: 'user',      setor: 's2',  ini: 'AR' },
    { email: 'roberto@fortsun.com.br',  nome: 'Roberto Mkt',    role: 'user',      setor: 's3',  ini: 'RM' },
    { email: 'lenise@fortsun.com.br',   nome: 'Lenise Costa',   role: 'aprovador', setor: 's4',  ini: 'LC' },
    { email: 'pedro@fortsun.com.br',    nome: 'Pedro Fin',      role: 'user',      setor: 's4',  ini: 'PF' },
    { email: 'maria@fortsun.com.br',    nome: 'Maria Ops',      role: 'user',      setor: 's5',  ini: 'MO' },
    { email: 'joao@fortsun.com.br',     nome: 'João DP',        role: 'user',      setor: 's6',  ini: 'JD' },
    { email: 'sara@fortsun.com.br',     nome: 'Sara Compl.',    role: 'user',      setor: 's7',  ini: 'SC' },
  ],

  // Setores da empresa
  SETORES: [
    { id: 's1', nome: 'TI / Dados',         orcamento: 15000 },
    { id: 's2', nome: 'RH',                 orcamento:  6000 },
    { id: 's3', nome: 'Marketing',          orcamento: 20000 },
    { id: 's4', nome: 'Financeiro',         orcamento: 50000 },
    { id: 's5', nome: 'Operações',          orcamento: 12000 },
    { id: 's6', nome: 'DP',                 orcamento:  8000 },
    { id: 's7', nome: 'Compliance / Log.',  orcamento: 10000 },
  ],
};
// ============================================================
//  FORTSUN — Configuração
//  Preencha com suas credenciais do Google Cloud Console
// ============================================================

const CONFIG = {
  // Client ID do OAuth 2.0 (Google Cloud Console)
  GOOGLE_CLIENT_ID: '969773095532-0l37bsenra6dop0v73ejr4kvp3dvmi9j.apps.googleusercontent.com',

  // ID da planilha Google Sheets
  // URL da planilha: https://docs.google.com/spreadsheets/d/ESTE_ID_AQUI/edit
  SPREADSHEET_ID: '1x-dNniKp9o-WeFeZoMAKMXeoM0jv2-zQPM4qoIsuBQA',

  // E-mails autorizados a usar o sistema
  // Usuários não listados serão bloqueados mesmo com conta Google válida
  ALLOWED_USERS: [
    { email: 'Henrique@fortsun.com.br',    nome: 'Admin Fortsun',  role: 'admin',     setor: null,  ini: 'AF' },
    { email: 'rafael.germano@fortsun.com.br',   nome: 'germano',      role: 'user',      setor: 's1',  ini: 'CT' },
    { email: 'rayssa@fortsunbrasil.com',      nome: 'Rayssa',         role: 'user',      setor: 's6',  ini: 'AR' },
    { email: 'nicolle.melo@fortsun.com.br',  nome: 'Nicolle',    role: 'user',      setor: 's6',  ini: 'RM' },
    { email: 'margarida@fortsun.com.br',   nome: 'Margarida',   role: 'aprovador', setor: 's6',  ini: 'LC' },
    { email: 'alicia@fortsun.com.br',    nome: 'Alicia',      role: 'user',      setor: 's2',  ini: 'PF' },
    { email: 'daniel@fortsun.com.br',    nome: 'Daniel',      role: 'user',      setor: 's5',  ini: 'MO' },
    { email: 'debora@fortsun.com.br',     nome: 'Debora',        role: 'user',      setor: 's3',  ini: 'JD' },
    { email: 'iara@fortsun.com.br',     nome: 'Iara',    role: 'user',      setor: 's7',  ini: 'SC' },
    { email: 'ingrid@fortsun.com.br',     nome: 'Ingrid',    role: 'user',      setor: 's6',  ini: 'SC' },
    { email: 'jessica@fortsun.com.br',     nome: 'Jessica',    role: 'user',      setor: 's7',  ini: 'SC' },
  ],

  // Setores da empresa
  SETORES: [
    { id: 's1', nome: 'TI / Dados',         orcamento: 15000 },
    { id: 's2', nome: 'Dp',                 orcamento:  6000 },
    { id: 's3', nome: 'Marketing',          orcamento: 20000 },
    { id: 's4', nome: 'Financeiro',         orcamento: 50000 },
    { id: 's5', nome: 'Operações',          orcamento: 12000 },
    { id: 's6', nome: 'RH',                 orcamento:  8000 },
    { id: 's7', nome: 'Compliance / Log.',  orcamento: 10000 },
  ],
};
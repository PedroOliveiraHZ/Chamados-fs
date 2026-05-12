

const CONFIG = {

  
  GOOGLE_CLIENT_ID: '969773095532-0l37bsenra6dop0v73ejr4kvp3dvmi9j.apps.googleusercontent.com',

  
  SPREADSHEET_ID: '1x-dNniKp9o-WeFeZoMAKMXeoM0jv2-zQPM4qoIsuBQA',

  ALLOWED_USERS: [
    // ADMIN — acesso total, vê todos os chamados e verbas
    { email: 'henrique@fortsun.com.br',    nome: 'Admin Fortsun',  role: 'admin',     setor: null, ini: 'PH' },

    // TI / DADOS
    { email: 'rafael.germano@fortsun.com.br',   nome: '',      role: 'user',      setor: 's1', ini: 'RG' },

    // RH
    { email: 'nicolle@fortsun.com.br',      nome: '',         role: 'user',      setor: 's2', ini: 'NC' },
    { email: 'ingird@fortsun.com.br',      nome: '',         role: 'user',      setor: 's2', ini: 'IG' },

    // MARKETING
    { email: 'debora@fortsun.com.br',  nome: 'R',    role: 'user',      setor: 's3', ini: 'D' },

    // FINANCEIRO —
    { email: 'lenise@fortsun.com.br',   nome: 'Lenise ',   role: 'aprovador', setor: 's4', ini: 'LD' },
    //{ email: '@fortsun.com.br',    nome: '',      role: 'user',      setor: 's4', ini: 'PF' },

    // OPERAÇÕES
    { email: 'daniel@fortsun.com.br',    nome: '',      role: 'user',      setor: 's5', ini: 'MO' },

    // DP
    { email: 'rayssa@fortsun.com.br',     nome: '',        role: 'user',      setor: 's6', ini: 'Rs' },
{ email: 'alicia@fortsun.com.br',     nome: '',        role: 'user',      setor: 's6', ini: 'AL' },
    // COMPLIANCE / LOGÍSTICA
    { email: 'iara@fortsun.com.br',     nome: '',    role: 'user',      setor: 's7', ini: 'I' },

  
  ],


  SETORES: [
    { id: 's1', nome: 'TI / Dados',        orcamento: 15000 },
    { id: 's2', nome: 'RH',                orcamento:  6000 },
    { id: 's3', nome: 'Marketing',         orcamento: 20000 },
    { id: 's4', nome: 'Financeiro',        orcamento: 50000 },
    { id: 's5', nome: 'Operações',         orcamento: 12000 },
    { id: 's6', nome: 'DP',                orcamento:  8000 },
    { id: 's7', nome: 'Compliance / Log.', orcamento: 10000 },
  ],
};
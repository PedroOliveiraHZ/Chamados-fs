// ============================================================
//  FORTSUN — Configuração do Sistema
//  Domínio: https://chamados-fs.vercel.app
// ============================================================

const CONFIG = {

  // Client ID do Google Cloud Console
  GOOGLE_CLIENT_ID: '969773095532-0l37bsenra6dop0v73ejr4kvp3dvmi9j.apps.googleusercontent.com',

  // Planilha Fortsun_Chamados
  SPREADSHEET_ID: '1x-dNniKp9o-WeFeZoMAKMXeoM0jv2-zQPM4qoIsuBQA',

  // ============================================================
  //  USUÁRIOS AUTORIZADOS
  //  IMPORTANTE: e-mails SEMPRE em letras minúsculas
  //  O Google retorna o e-mail em minúsculo — maiúsculas não funcionam
  //  role: 'admin' | 'aprovador' | 'user'
  // ============================================================
  ALLOWED_USERS: [

    // ADMIN
    { email: 'henrique@fortsunbrasil.com',       nome: 'Henrique',        role: 'admin',     setor: null, ini: 'PH' },
    { email: 'henrique@fortsun.com.br',          nome: 'Henrique',        role: 'admin',     setor: null, ini: 'PH' },

    // TI / DADOS
    { email: 'rafael.germano@fortsunbrasil.com',    nome: 'Rafael Germano',  role: 'user',      setor: 's1', ini: 'RG' },

    // RH
    { email: 'nicolle@fortsun.com.br',           nome: 'Nicolle',         role: 'user',      setor: 's2', ini: 'NC' },
    { email: 'ingird@fortsun.com.br',            nome: 'Ingrid',          role: 'user',      setor: 's2', ini: 'IG' },

    // MARKETING
    { email: 'debora@fortsun.com.br',            nome: 'Débora',          role: 'user',      setor: 's3', ini: 'DB' },

    // FINANCEIRO
    { email: 'lenise@fortsun.com.br',            nome: 'Lenise',          role: 'aprovador', setor: 's4', ini: 'LD' },

    // OPERAÇÕES
    { email: 'daniel@fortsun.com.br',            nome: 'Daniel',          role: 'user',      setor: 's5', ini: 'DL' },

    // DP
    { email: 'rayssa@fortsun.com.br',            nome: 'Rayssa',          role: 'user',      setor: 's6', ini: 'RS' },
    { email: 'alicia@fortsun.com.br',            nome: 'Alicia',          role: 'user',      setor: 's6', ini: 'AL' },

    // COMPLIANCE / LOGÍSTICA
    { email: 'iara@fortsun.com.br',              nome: 'Iara',            role: 'user',      setor: 's7', ini: 'IA' },

  ],

  // ============================================================
  //  SETORES
  // ============================================================
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
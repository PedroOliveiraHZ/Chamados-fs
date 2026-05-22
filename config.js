const CONFIG = {
  GOOGLE_CLIENT_ID: '969773095532-0l37bsenra6dop0v73ejr4kvp3dvmi9j.apps.googleusercontent.com',
  SPREADSHEET_ID: '1x-dNniKp9o-WeFeZoMAKMXeoM0jv2-zQPM4qoIsuBQA',

  ALLOWED_USERS: [
    // ADMIN
    { email: 'henrique@fortsunbrasil.com',          nome: 'Henrique',        role: 'admin',     setor: 's1', ini: 'PH' },

    // TI / DADOS
    { email: 'rafael.germano@fortsunbrasil.com',    nome: 'Rafael Germano',  role: 'user',      setor: 's1', ini: 'RG' },

    // RH
    { email: 'nicolle@fortsunbrasil.com',           nome: 'Nicolle',         role: 'user',      setor: 's2', ini: 'NC' },
    { email: 'ingird@fortsunbrasil.com',            nome: 'Ingrid',          role: 'user',      setor: 's2', ini: 'IG' },

    // MARKETING
    { email: 'debora@fortsunbrasil.com',            nome: 'Débora',          role: 'user',      setor: 's3', ini: 'DB' },

    // FINANCEIRO
    { email: 'lenise@fortsunbrasil.com',            nome: 'Lenise',          role: 'aprovador', setor: 's4', ini: 'LD' },

    // OPERAÇÕES
    { email: 'daniel@fortsunbrasil.com',            nome: 'Daniel',          role: 'user',      setor: 's5', ini: 'DL' },
     { email: 'thiago@fortsunbrasil.com',            nome: 'Thiago',          role: 'user',      setor: 's5', ini: 'Th' },

    // DP
    { email: 'rayssa@fortsunbrasil.com',            nome: 'Rayssa',          role: 'user',      setor: 's6', ini: 'RS' },
    { email: 'alicia@fortsunbrasil.com',            nome: 'Alicia',          role: 'user',      setor: 's6', ini: 'AL' },

    // COMPLIANCE / LOGÍSTICA
    { email: 'iara@fortsunbrasil.com',              nome: 'Iara',            role: 'user',      setor: 's7', ini: 'IA' },
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

  // SLA em horas por prioridade
  SLA: {
    'Baixa':   { resposta: 24, resolucao: 72  },
    'Média':   { resposta: 8,  resolucao: 24  },
    'Alta':    { resposta: 4,  resolucao: 8   },
    'Urgente': { resposta: 1,  resolucao: 4   },
  },
};
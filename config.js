const CONFIG = {
  // Cole aqui a URL "/exec" gerada ao implantar o Code.gs como App da Web.
  API_URL: 'https://script.google.com/macros/library/d/10RqhTxlixmC5qpofaPALUb-q0hmkmZ6PIhN3omK6bLTk4sg_-NNk7V19/2',

  // Pessoas que aparecem no seletor "Quem é você" ao abrir um chamado.
  // Isso é só pra preencher o setor automaticamente — não é login.
  PESSOAS: [
    { nome: 'Henrique',       setor: 'TI / Dados' },
    { nome: 'Rafael Germano', setor: 'TI / Dados' },
    { nome: 'Nicolle',        setor: 'RH' },
    { nome: 'Ingrid',         setor: 'RH' },
    { nome: 'Débora',         setor: 'Marketing' },
    { nome: 'Lenise',         setor: 'Financeiro' },
    { nome: 'Daniel',         setor: 'Operações' },
    { nome: 'Thiago',         setor: 'Operações' },
    { nome: 'Rayssa',         setor: 'DP' },
    { nome: 'Alicia',         setor: 'DP' },
    { nome: 'Iara',           setor: 'Compliance / Logística' },
  ],

  SETORES: [
    'TI / Dados', 'RH', 'Marketing', 'Financeiro',
    'Operações', 'DP', 'Compliance / Logística',
  ],

  PRIORIDADES: ['Baixa', 'Média', 'Alta', 'Urgente'],

  STATUS: ['Aberto', 'Em andamento', 'Resolvido', 'Cancelado'],

  // Quem gerencia os chamados no painel (só exibido, senha é validada no servidor).
  RESPONSAVEIS: ['Henrique', 'Rafael'],
};
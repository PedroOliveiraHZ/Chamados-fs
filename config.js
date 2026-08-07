const CONFIG = {
  
  API_URL: 'https://script.google.com/macros/s/AKfycbzkYjPanl_cTGEtcXnjKtEMwgXoPnOYjIw7g4XYfpUwQ5pV0rR9uNMpSt-JAb0w311mTQ/exec',

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
    { nome: 'Leandro',          setor: 'Vylo' },
    { nome: 'Lia Mara',         setor: 'Vylo' },
    { nome: 'Eduardo Kevin',    setor: 'Vylo' },
    { nome: 'Guilherme Camurça',setor: 'Vylo' },
    { nome: 'Maria Clara',      setor: 'Vylo' },
    { nome: 'Eduardo',          setor: 'Vylo' },
    { nome: 'Sara',             setor: '' },
  ],

  SETORES: [
    'TI / Dados', 'RH', 'Marketing', 'Financeiro',
    'Operações', 'DP', 'Compliance / Logística', 'Comercial', 'Vylo',
  ],

  PRIORIDADES: ['Baixa', 'Média', 'Alta', 'Urgente'],

  STATUS: ['Aberto', 'Em andamento', 'Resolvido', 'Cancelado'],

  
  RESPONSAVEIS: ['Henrique', 'Rafael'],
};
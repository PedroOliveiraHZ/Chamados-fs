const CONFIG = {
  
  API_URL: 'https://script.google.com/macros/s/AKfycbzkYjPanl_cTGEtcXnjKtEMwgXoPnOYjIw7g4XYfpUwQ5pV0rR9uNMpSt-JAb0w311mTQ/exec',

  SETORES: [
    'TI / Dados', 'RH', 'Marketing', 'Financeiro',
    'Operações', 'DP', 'Compliance / Logística', 'Comercial', 'Vylo',
  ],

  PRIORIDADES: ['Baixa', 'Média', 'Alta', 'Urgente'],


  PRAZO_HORAS: {
    'Urgente': 4,
    'Alta': 24,
    'Média': 72,
    'Baixa': 168,
  },

  STATUS: ['Aberto', 'Em andamento', 'Resolvido', 'Cancelado'],

  
  RESPONSAVEIS: ['Henrique', 'Rafael'],
};
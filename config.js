const CONFIG = {
  // Cole aqui a URL "/exec" gerada ao implantar o Code.gs como App da Web.
  API_URL: 'https://script.google.com/macros/s/AKfycbzkYjPanl_cTGEtcXnjKtEMwgXoPnOYjIw7g4XYfpUwQ5pV0rR9uNMpSt-JAb0w311mTQ/exec',

  SETORES: [
    'TI / Dados', 'RH', 'Marketing', 'Financeiro',
    'Operações', 'DP', 'Compliance / Logística', 'Comercial', 'Vylo',
  ],

  PRIORIDADES: ['Baixa', 'Média', 'Alta', 'Urgente'],

  // Prazo (SLA) de atendimento por prioridade, em horas, contado a partir da abertura.
  // O painel marca "Atrasado" quando o chamado passa desse prazo sem ser Resolvido/Cancelado.
  PRAZO_HORAS: {
    'Urgente': 4,
    'Alta': 24,
    'Média': 72,
    'Baixa': 168,
  },

  STATUS: ['Aberto', 'Em andamento', 'Resolvido', 'Cancelado'],

  // Quem gerencia os chamados no painel (só exibido, senha é validada no servidor).
  RESPONSAVEIS: ['Henrique', 'Rafael', 'Pedro'],
};
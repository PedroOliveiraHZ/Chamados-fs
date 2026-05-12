// ============================================================
//  FORTSUN — Configuração do Sistema
//
//  SPREADSHEET_ID já configurado com a planilha real.
//
//  ÚNICO PASSO RESTANTE:
//  1. Acesse https://console.cloud.google.com
//  2. Selecione (ou crie) seu projeto
//  3. APIs e Serviços > Credenciais > Criar credencial > ID do cliente OAuth 2.0
//  4. Tipo: Aplicativo da Web
//  5. Origens JS autorizadas: https://chamados-fs.vercel.app
//  6. Cole o Client ID gerado no campo GOOGLE_CLIENT_ID abaixo
//  7. Certifique-se de ter ativado: Google Sheets API e Google Drive API
// ============================================================

const CONFIG = {

  // ↓ Client ID do Google Cloud Console
  // O ID completo está na tela de credenciais → "ID do cliente"
  // Formato: NÚMEROS-letras.apps.googleusercontent.com
  // Cole o ID completo aqui (a imagem estava cortada à esquerda)
  GOOGLE_CLIENT_ID: '969773095532-0l37bsenra6dop0v73ejr4kvp3dvmi9j.apps.googleusercontent.com',

  // Planilha Fortsun_Chamados (já configurada)
  SPREADSHEET_ID: '1x-dNniKp9o-WeFeZoMAKMXeoM0jv2-zQPM4qoIsuBQA',

  // ============================================================
  //  USUÁRIOS AUTORIZADOS
  //  Apenas e-mails listados aqui conseguem logar.
  //  role: 'admin' | 'aprovador' | 'user'
  //  setor: id do setor (null = admin vê tudo)
  // ============================================================
  ALLOWED_USERS: [
    // ADMIN — acesso total, vê todos os chamados e verbas
    { email: 'Henrique@fortsun.com.br',    nome: 'Admin Fortsun',  role: 'admin',     setor: null, ini: 'AF' },

    // TI / DADOS
    { email: 'carlos@fortsun.com.br',   nome: 'Carlos TI',      role: 'user',      setor: 's1', ini: 'CT' },

    // RH
    { email: 'ana@fortsun.com.br',      nome: 'Ana RH',         role: 'user',      setor: 's2', ini: 'AR' },

    // MARKETING
    { email: 'roberto@fortsun.com.br',  nome: 'Roberto Mkt',    role: 'user',      setor: 's3', ini: 'RM' },

    // FINANCEIRO — Lenise é aprovadora (pode aprovar/recusar chamados)
    { email: 'lenise@fortsun.com.br',   nome: 'Lenise Costa',   role: 'aprovador', setor: 's4', ini: 'LC' },
    { email: 'pedro@fortsun.com.br',    nome: 'Pedro Fin',      role: 'user',      setor: 's4', ini: 'PF' },

    // OPERAÇÕES
    { email: 'maria@fortsun.com.br',    nome: 'Maria Ops',      role: 'user',      setor: 's5', ini: 'MO' },

    // DP
    { email: 'joao@fortsun.com.br',     nome: 'João DP',        role: 'user',      setor: 's6', ini: 'JD' },

    // COMPLIANCE / LOGÍSTICA
    { email: 'sara@fortsun.com.br',     nome: 'Sara Compl.',    role: 'user',      setor: 's7', ini: 'SC' },

    // ↓ Adicione mais usuários conforme necessário:
    // { email: 'novo@fortsun.com.br', nome: 'Nome Sobrenome', role: 'user', setor: 's1', ini: 'NS' },
  ],

  // ============================================================
  //  SETORES — orçamento inicial (pode ser ajustado pelo admin
  //  dentro do próprio sistema na tela "Verbas por setor")
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
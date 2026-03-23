export const tierData = [
  {
    name: 'Enterprise',
    investimento: 15000,
    trend: '+10%',
    trendDir: 'up',
    prospects: 250,
    leads: 80,
    agendadas: 45,
    realizadas: 38,
    contratos: 12,
    booking: 450000,
    avgTicket: 37500,
    avgTicketColor: 'green'
  },
  {
    name: 'Large',
    investimento: 15000,
    trend: '+10%',
    trendDir: 'up',
    prospects: 250,
    leads: 70,
    agendadas: 45,
    realizadas: 38,
    contratos: 12,
    booking: 390000,
    avgTicket: 32500,
    avgTicketColor: 'green'
  },
  {
    name: 'Medium',
    investimento: 5000,
    trend: '+10%',
    trendDir: 'up',
    prospects: 100,
    leads: 35,
    agendadas: 30,
    realizadas: 25,
    contratos: 8,
    booking: 120000,
    avgTicket: 3000,
    avgTicketColor: 'orange'
  },
  {
    name: 'Small',
    investimento: 3000,
    trend: '-5%',
    trendDir: 'down',
    prospects: 75,
    leads: 25,
    agendadas: 13,
    realizadas: 13,
    contratos: 4,
    booking: 70000,
    avgTicket: 17500,
    avgTicketColor: 'yellow'
  },
  {
    name: 'Tiny',
    investimento: 1000,
    trend: '-5%',
    trendDir: 'down',
    prospects: 20,
    leads: 17,
    agendadas: 10,
    realizadas: 16,
    contratos: 2,
    booking: 10000,
    avgTicket: 0,
    avgTicketColor: 'red'
  }
]

export const analistaData = [
  {
    name: 'Geovana',
    avatar: 'GE',
    investimento: 5500,
    trend: null,
    trendDir: null,
    prospects: 180,
    leads: 60,
    agendadas: 32,
    realizadas: 28,
    contratos: 9,
    booking: 210000,
    avgTicket: 23333,
    avgTicketColor: 'green'
  },
  {
    name: 'Guilherme',
    avatar: 'GU',
    investimento: 5500,
    trend: '+8%',
    trendDir: 'up',
    prospects: 180,
    leads: 60,
    agendadas: 32,
    realizadas: 28,
    contratos: 9,
    booking: 210000,
    avgTicket: 23333,
    avgTicketColor: 'green'
  },
  {
    name: 'Lucas',
    avatar: 'LU',
    investimento: 1500,
    trend: '+5%',
    trendDir: 'up',
    prospects: 90,
    leads: 30,
    agendadas: 31,
    realizadas: 16,
    contratos: 5,
    booking: 115000,
    avgTicket: 23000,
    avgTicketColor: 'yellow'
  },
  {
    name: 'Gerson',
    avatar: 'GS',
    investimento: 1500,
    trend: '+3%',
    trendDir: 'up',
    prospects: 30,
    leads: 20,
    agendadas: 10,
    realizadas: 11,
    contratos: 7,
    booking: 161000,
    avgTicket: 23000,
    avgTicketColor: 'yellow'
  }
]

export const canalData = [
  {
    name: 'Lead Broker',
    icon: 'users',
    iconColor: '#14b8a6',
    investimento: 8200,
    trend: null,
    trendDir: null,
    prospects: 420,
    leads: 135,
    agendadas: 75,
    realizadas: 62,
    contratos: 18,
    booking: 320000,
    avgTicket: 17777,
    avgTicketColor: 'yellow'
  },
  {
    name: 'Black Box',
    icon: 'box',
    iconColor: '#888',
    investimento: 8200,
    trend: '+12%',
    trendDir: 'up',
    prospects: 420,
    leads: 135,
    agendadas: 75,
    realizadas: 62,
    contratos: 18,
    booking: 320000,
    avgTicket: 17777,
    avgTicketColor: 'yellow'
  },
  {
    name: 'Eventos',
    icon: 'calendar',
    iconColor: '#a855f7',
    investimento: 1000,
    trend: '+7%',
    trendDir: 'up',
    prospects: 110,
    leads: 60,
    agendadas: 40,
    realizadas: 23,
    contratos: 8,
    booking: 120000,
    avgTicket: 15000,
    avgTicketColor: 'orange'
  },
  {
    name: 'Outros',
    icon: 'more-horizontal',
    iconColor: '#666',
    investimento: 1000,
    trend: '-3%',
    trendDir: 'down',
    prospects: 75,
    leads: 25,
    agendadas: 10,
    realizadas: 20,
    contratos: 3,
    booking: 50000,
    avgTicket: 16667,
    avgTicketColor: 'orange'
  }
]

export const listagemData = [
  { nome: 'Empresa Alpha Ltda',   data_criacao: '2025-03-01T09:15:00', tier: 'Enterprise', categoria_step: 'Saber',         canal_origem: 'Lead Broker', etapa: 'MQL',    link_kommo: 'https://app.kommo.com/lead/101' },
  { nome: 'Beta Soluções SA',     data_criacao: '2025-03-02T14:20:00', tier: 'Large',      categoria_step: 'Ter',           canal_origem: 'Black Box',   etapa: 'SQL',    link_kommo: 'https://app.kommo.com/lead/102' },
  { nome: 'Gamma Consultoria',    data_criacao: '2025-03-03T11:00:00', tier: 'Medium',     categoria_step: 'Executar',      canal_origem: 'Eventos',     etapa: 'SAL',    link_kommo: 'https://app.kommo.com/lead/103' },
  { nome: 'Delta Tech',           data_criacao: '2025-03-04T16:45:00', tier: 'Small',      categoria_step: 'Potencializar', canal_origem: 'Lead Broker', etapa: 'Commit', link_kommo: 'https://app.kommo.com/lead/104' },
  { nome: 'Epsilon Digital',      data_criacao: '2025-03-05T10:30:00', tier: 'Tiny',       categoria_step: 'Saber',         canal_origem: 'Black Box',   etapa: 'Leads',  link_kommo: '' },
  { nome: 'Zeta Sistemas',        data_criacao: '2025-03-06T08:00:00', tier: 'Enterprise', categoria_step: 'Ter',           canal_origem: 'Eventos',     etapa: 'MQL',    link_kommo: 'https://app.kommo.com/lead/106' },
  { nome: 'Eta Serviços',         data_criacao: '2025-03-07T13:15:00', tier: 'Large',      categoria_step: 'Executar',      canal_origem: 'Lead Broker', etapa: 'SQL',    link_kommo: 'https://app.kommo.com/lead/107' },
  { nome: 'Theta Engenharia',     data_criacao: '2025-03-08T15:30:00', tier: 'Medium',     categoria_step: 'Saber',         canal_origem: 'Black Box',   etapa: 'Leads',  link_kommo: 'https://app.kommo.com/lead/108' },
  { nome: 'Iota Finanças',        data_criacao: '2025-03-10T09:00:00', tier: 'Enterprise', categoria_step: 'Potencializar', canal_origem: 'Eventos',     etapa: 'SAL',    link_kommo: 'https://app.kommo.com/lead/109' },
  { nome: 'Kappa Automação',      data_criacao: '2025-03-11T11:45:00', tier: 'Small',      categoria_step: 'Ter',           canal_origem: 'Lead Broker', etapa: 'Commit', link_kommo: 'https://app.kommo.com/lead/110' },
  { nome: 'Lambda Inovações',     data_criacao: '2025-03-12T14:00:00', tier: 'Large',      categoria_step: 'Saber',         canal_origem: 'Black Box',   etapa: 'Leads',  link_kommo: '' },
  { nome: 'Mu Tecnologia',        data_criacao: '2025-03-13T10:15:00', tier: 'Tiny',       categoria_step: 'Executar',      canal_origem: 'Eventos',     etapa: 'MQL',    link_kommo: 'https://app.kommo.com/lead/112' },
]

export const MOCK_DATA = {
  tiers: tierData,
  analistas: analistaData,
  canais: canalData,
  listagem: listagemData
}

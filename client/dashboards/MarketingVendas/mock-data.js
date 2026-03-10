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

export const MOCK_DATA = {
  tiers: tierData,
  analistas: analistaData,
  canais: canalData
}

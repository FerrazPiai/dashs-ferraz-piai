/**
 * Dados históricos de 2025 — hardcoded a partir da aba "Visão Comparativa Squads"
 * Fonte: https://docs.google.com/spreadsheets/d/1swc6r-wSguq4buFVUXPM8WyV97GZJjf6t4KwebHpObQ
 *
 * Estrutura: { [quarter]: { squads: { [squad]: { coordenador, mrr, churn, isencao, totalPerdas, pctPerdas, totalMonet, pctMonet, saldoFinal, nps } } } }
 */

export const HISTORICO_2025 = {
  '2025-Q1': {
    squads: {
      'Army':        { coordenador: 'Lucas Nakano',  mrr: 50000.00,    churn: 0,         isencao: 60000.00,   totalPerdas: 60000.00,   pctPerdas: 120.00, totalMonet: 0,         pctMonet: 0,      saldoFinal: -60000.00   },
      'Assemble':    { coordenador: 'Ivan Felipe',   mrr: 233503.07,   churn: 38328.10,  isencao: 133399.10,  totalPerdas: 171727.20,  pctPerdas: 73.54,  totalMonet: 43500.00,  pctMonet: 18.63,  saldoFinal: -128227.20  },
      'Carbon ID':   { coordenador: 'Gabriel',       mrr: 5586.19,     churn: 11379.28,  isencao: 0,          totalPerdas: 11379.28,   pctPerdas: 203.70, totalMonet: 0,         pctMonet: 0,      saldoFinal: -11379.28   },
      'Data Hawk':   { coordenador: 'Júlia',         mrr: 76060.32,    churn: 0,         isencao: 0,          totalPerdas: 0,          pctPerdas: 0,      totalMonet: 20500.00,  pctMonet: 26.95,  saldoFinal: 20500.00    },
      'Growthx':     { coordenador: 'Gabriela',      mrr: 182915.31,   churn: 33790.00,  isencao: 0,          totalPerdas: 33790.00,   pctPerdas: 18.47,  totalMonet: 29763.50,  pctMonet: 16.27,  saldoFinal: -4026.50    },
      'ISaaS':       { coordenador: 'Hamazaki',      mrr: 2666.67,     churn: 0,         isencao: 0,          totalPerdas: 0,          pctPerdas: 0,      totalMonet: 0,         pctMonet: 0,      saldoFinal: 0           },
      'Mkt Place':   { coordenador: 'Frank',         mrr: 2000.00,     churn: 0,         isencao: 0,          totalPerdas: 0,          pctPerdas: 0,      totalMonet: 0,         pctMonet: 0,      saldoFinal: 0           },
      'Rev Hunters': { coordenador: 'Viviane',       mrr: 12523.33,    churn: 0,         isencao: 0,          totalPerdas: 0,          pctPerdas: 0,      totalMonet: 33026.00,  pctMonet: 263.72, saldoFinal: 33026.00    },
      'Roi Eagles':  { coordenador: 'Thaís',         mrr: 70742.18,    churn: 0,         isencao: 2066.00,    totalPerdas: 2066.00,    pctPerdas: 2.92,   totalMonet: 3855.00,   pctMonet: 5.45,   saldoFinal: 1789.00     }
    }
  },

  '2025-Q2': {
    squads: {
      'Army':        { coordenador: 'Lucas Nakano',  mrr: 16666.67,    churn: 0,         isencao: 20000.00,   totalPerdas: 20000.00,   pctPerdas: 120.00, totalMonet: 0,         pctMonet: 0,      saldoFinal: -20000.00   },
      'Assemble':    { coordenador: 'Ivan Felipe',   mrr: 148258.00,   churn: 59014.00,  isencao: 4256.30,    totalPerdas: 63270.30,   pctPerdas: 42.68,  totalMonet: 77155.00,  pctMonet: 52.04,  saldoFinal: 13884.70    },
      'Black Scope': { coordenador: 'Lucas Nakano',  mrr: 44441.58,    churn: 0,         isencao: 30000.00,   totalPerdas: 30000.00,   pctPerdas: 67.50,  totalMonet: 1836.00,   pctMonet: 4.13,   saldoFinal: -28164.00   },
      'Carbon ID':   { coordenador: 'Gabriel',       mrr: 0,           churn: 4500.00,   isencao: 0,          totalPerdas: 4500.00,    pctPerdas: 0,      totalMonet: 0,         pctMonet: 0,      saldoFinal: -4500.00    },
      'Data Hawk':   { coordenador: 'Júlia',         mrr: 59338.44,    churn: 21369.00,  isencao: 1500.00,    totalPerdas: 22869.00,   pctPerdas: 38.54,  totalMonet: 0,         pctMonet: 0,      saldoFinal: -22869.00   },
      'Growthx':     { coordenador: 'Gabriela',      mrr: 116577.31,   churn: 36432.00,  isencao: 1000.00,    totalPerdas: 37432.00,   pctPerdas: 32.11,  totalMonet: 51330.00,  pctMonet: 44.03,  saldoFinal: 13898.00    },
      'ISaaS':       { coordenador: 'Hamazaki',      mrr: 2666.67,     churn: 0,         isencao: 0,          totalPerdas: 0,          pctPerdas: 0,      totalMonet: 0,         pctMonet: 0,      saldoFinal: 0           },
      'Mkt Place':   { coordenador: 'Frank',         mrr: 32966.67,    churn: 0,         isencao: 2000.00,    totalPerdas: 2000.00,    pctPerdas: 6.07,   totalMonet: 10840.00,  pctMonet: 32.88,  saldoFinal: 8840.00     },
      'Rev Hunters': { coordenador: 'Viviane',       mrr: 59322.25,    churn: 12181.00,  isencao: 0,          totalPerdas: 12181.00,   pctPerdas: 20.53,  totalMonet: 24945.00,  pctMonet: 42.05,  saldoFinal: 12764.00    },
      'Roi Eagles':  { coordenador: 'Thaís',         mrr: 166777.45,   churn: 11165.00,  isencao: 23116.28,   totalPerdas: 34281.28,   pctPerdas: 20.56,  totalMonet: 14408.08,  pctMonet: 8.64,   saldoFinal: -19873.20   }
    }
  },

  '2025-Q3': {
    squads: {
      'Assemble':    { coordenador: 'Ivan Felipe',   mrr: 144848.15,   churn: 17211.00,  isencao: 7283.00,    totalPerdas: 24494.00,   pctPerdas: 16.91,  totalMonet: 51500.00,  pctMonet: 35.55,  saldoFinal: 27006.00,   nps: -20.0  },
      'Black Scope': { coordenador: 'Lucas Nakano',  mrr: 123235.47,   churn: 13099.64,  isencao: 2718.00,    totalPerdas: 15817.64,   pctPerdas: 12.84,  totalMonet: 13200.00,  pctMonet: 10.71,  saldoFinal: -2617.64,   nps: 22.2   },
      'Data Hawk':   { coordenador: 'Júlia',         mrr: 0,           churn: 21925.00,  isencao: 0,          totalPerdas: 21925.00,   pctPerdas: 0,      totalMonet: 0,         pctMonet: 0,      saldoFinal: -21925.00   },
      'Growthx':     { coordenador: 'Gabriela',      mrr: 125986.50,   churn: 36197.00,  isencao: 1000.00,    totalPerdas: 37197.00,   pctPerdas: 29.52,  totalMonet: 40810.00,  pctMonet: 32.39,  saldoFinal: 3613.00,    nps: 33.3   },
      'Mkt Place':   { coordenador: 'Frank',         mrr: 52000.00,    churn: 14000.00,  isencao: 0,          totalPerdas: 14000.00,   pctPerdas: 26.92,  totalMonet: 4000.00,   pctMonet: 7.69,   saldoFinal: -10000.00,  nps: 100.0  },
      'Rev Hunters': { coordenador: 'Viviane',       mrr: 0,           churn: 9911.00,   isencao: 0,          totalPerdas: 9911.00,    pctPerdas: 0,      totalMonet: 0,         pctMonet: 0,      saldoFinal: -9911.00    },
      'Roi Eagles':  { coordenador: 'Thaís',         mrr: 152368.24,   churn: 77146.32,  isencao: 3000.00,    totalPerdas: 80146.32,   pctPerdas: 52.60,  totalMonet: 72500.00,  pctMonet: 47.58,  saldoFinal: -7646.32,   nps: 20.0   }
    }
  },

  '2025-Q4': {
    squads: {
      'Assemble':    { coordenador: 'Deniz',         mrr: 138935.17,   churn: 91934.00,  isencao: 11936.00,   totalPerdas: 103870.00,  pctPerdas: 74.76,  totalMonet: 0,         pctMonet: 0,      saldoFinal: -103870.00, nps: -25.0 },
      'Black Scope': { coordenador: 'Lucas Nakano',  mrr: 124079.34,   churn: 41714.00,  isencao: 16333.34,   totalPerdas: 58047.34,   pctPerdas: 46.78,  totalMonet: 5326.00,   pctMonet: 4.29,   saldoFinal: -52721.34,  nps: 50.0  },
      'Growthx':     { coordenador: 'Gabriela',      mrr: 132684.58,   churn: 8599.00,   isencao: 8400.00,    totalPerdas: 16999.00,   pctPerdas: 12.81,  totalMonet: 45545.99,  pctMonet: 34.33,  saldoFinal: 28546.99,   nps: 15.4  },
      'Mkt Place':   { coordenador: 'Frank',         mrr: 36964.95,    churn: 12200.00,  isencao: 0,          totalPerdas: 12200.00,   pctPerdas: 33.00,  totalMonet: 0,         pctMonet: 0,      saldoFinal: -12200.00,  nps: 66.7  },
      'Roi Eagles':  { coordenador: 'Éder',          mrr: 10449.14,    churn: 18000.00,  isencao: 0,          totalPerdas: 18000.00,   pctPerdas: 172.26, totalMonet: 9999.99,   pctMonet: 95.70,  saldoFinal: -8000.01,   nps: 14.3  }
    }
  }
}

export const VISUALIZACOES = [
  { value: 'planejado',       label: 'Planejado'        },
  { value: 'dre',             label: 'Competência'      },
  { value: 'caixa-realizado', label: 'Caixa Realizado'  },
  { value: 'caixa-previsto',  label: 'Caixa Previsto'   },
]

export const MESES = [
  { value: '2026-01', label: 'Jan 2026' },
  { value: '2026-02', label: 'Fev 2026' },
  { value: '2026-03', label: 'Mar 2026' },
  { value: '2026-04', label: 'Abr 2026' },
  { value: '2026-05', label: 'Mai 2026' },
  { value: '2026-06', label: 'Jun 2026' },
  { value: '2026-07', label: 'Jul 2026' },
  { value: '2026-08', label: 'Ago 2026' },
  { value: '2026-09', label: 'Set 2026' },
  { value: '2026-10', label: 'Out 2026' },
  { value: '2026-11', label: 'Nov 2026' },
  { value: '2026-12', label: 'Dez 2026' },
]

// Dados de referência para dev (espelham o formato real da API, já em camelCase)
export const MOCK_DATA = {
  'caixa-realizado': {
    '2026-01': { receitaBruta: 913563, impostos: 51826, tarifas: 46693, royalties: 22381, receitaLiquida: 792664, custosOperacionais: 293969, lucroBruto: 498695, despesasComerciais: 199830, despesasAdministrativas: 123552, despesasGerais: 28923, ebitda: 146390, depreciacao: 0, amortizacao: 0, receitaFinanceira: 9298, despesaFinanceira: 7692, ebt: 144784, impostosSobreLucro: 0, lucroLiquido: 144784 },
    '2026-02': { receitaBruta: 470830, impostos: 35953, tarifas: 14503, royalties: 9767, receitaLiquida: 410608, custosOperacionais: 294868, lucroBruto: 115741, despesasComerciais: 143765, despesasAdministrativas: 115640, despesasGerais: 29211, ebitda: -172876, depreciacao: 0, amortizacao: 0, receitaFinanceira: 51357, despesaFinanceira: 1808, ebt: -222426, impostosSobreLucro: 0, lucroLiquido: -222426 },
    '2026-03': { receitaBruta: 250072, impostos: 0, tarifas: 18797, royalties: 5194, receitaLiquida: 226082, custosOperacionais: 105287, lucroBruto: 120795, despesasComerciais: 18925, despesasAdministrativas: 31572, despesasGerais: 1806, ebitda: 68491, depreciacao: 0, amortizacao: 0, receitaFinanceira: 1128, despesaFinanceira: 18631, ebt: 85994, impostosSobreLucro: 0, lucroLiquido: 85994 },
  },
  'dre': {
    '2026-01': { receitaBruta: 763000, impostos: 37332, tarifas: 46693, royalties: 111791, receitaLiquida: 457141, custosOperacionais: 304538, lucroBruto: 152603, despesasComerciais: 227344, despesasAdministrativas: 110814, despesasGerais: 29480, ebitda: -215035, depreciacao: 0, amortizacao: 0, receitaFinanceira: 9035, despesaFinanceira: 27969, ebt: -196100, impostosSobreLucro: 0, lucroLiquido: -196100 },
    '2026-02': { receitaBruta: 887378, impostos: 42387, tarifas: 33179, royalties: 123624, receitaLiquida: 559975, custosOperacionais: 294975, lucroBruto: 265000, despesasComerciais: 369258, despesasAdministrativas: 113285, despesasGerais: 28503, ebitda: -246046, depreciacao: 0, amortizacao: 0, receitaFinanceira: 32232, despesaFinanceira: 30081, ebt: -248196, impostosSobreLucro: 0, lucroLiquido: -248196 },
    '2026-03': { receitaBruta: 386156, impostos: 43236, tarifas: 24879, royalties: 75188, receitaLiquida: 200571, custosOperacionais: 245077, lucroBruto: -44507, despesasComerciais: 114756, despesasAdministrativas: 80788, despesasGerais: 27696, ebitda: -267747, depreciacao: 0, amortizacao: 0, receitaFinanceira: 29, despesaFinanceira: 19063, ebt: -248712, impostosSobreLucro: 0, lucroLiquido: -248712 },
  },
  'caixa-previsto': {
    '2026-01': { receitaBruta: 629245, impostos: 51826, tarifas: 46693, royalties: 22381, receitaLiquida: 508346, custosOperacionais: 293969, lucroBruto: 214376, despesasComerciais: 181925, despesasAdministrativas: 123552, despesasGerais: 28923, ebitda: -120023, depreciacao: 0, amortizacao: 0, receitaFinanceira: 8331, despesaFinanceira: 7692, ebt: -120662, impostosSobreLucro: 0, lucroLiquido: -120662 },
    '2026-02': { receitaBruta: 503667, impostos: 35953, tarifas: 14503, royalties: 9767, receitaLiquida: 443444, custosOperacionais: 294868, lucroBruto: 148577, despesasComerciais: 171670, despesasAdministrativas: 115640, despesasGerais: 29211, ebitda: -167945, depreciacao: 0, amortizacao: 0, receitaFinanceira: 51173, despesaFinanceira: 1808, ebt: -217310, impostosSobreLucro: 0, lucroLiquido: -217310 },
    '2026-03': { receitaBruta: 838018, impostos: 35347, tarifas: 49096, royalties: 54508, receitaLiquida: 699066, custosOperacionais: 271567, lucroBruto: 427499, despesasComerciais: 283960, despesasAdministrativas: 94493, despesasGerais: 28167, ebitda: 20879, depreciacao: 0, amortizacao: 0, receitaFinanceira: 1106, despesaFinanceira: 19092, ebt: 38865, impostosSobreLucro: 0, lucroLiquido: 38865 },
  },
  'planejado': {
    '2026-01': { receitaBruta: 0, impostos: 0, tarifas: 0, royalties: 0, receitaLiquida: 0, custosOperacionais: 0, lucroBruto: 0, despesasComerciais: 0, despesasAdministrativas: 0, despesasGerais: 0, ebitda: 0, depreciacao: 0, amortizacao: 0, receitaFinanceira: 0, despesaFinanceira: 0, ebt: 0, impostosSobreLucro: 0, lucroLiquido: 0 },
    '2026-02': { receitaBruta: 0, impostos: 0, tarifas: 0, royalties: 0, receitaLiquida: 0, custosOperacionais: 0, lucroBruto: 0, despesasComerciais: 0, despesasAdministrativas: 0, despesasGerais: 0, ebitda: 0, depreciacao: 0, amortizacao: 0, receitaFinanceira: 0, despesaFinanceira: 0, ebt: 0, impostosSobreLucro: 0, lucroLiquido: 0 },
    '2026-03': { receitaBruta: 0, impostos: 0, tarifas: 0, royalties: 0, receitaLiquida: 0, custosOperacionais: 0, lucroBruto: 0, despesasComerciais: 0, despesasAdministrativas: 0, despesasGerais: 0, ebitda: 0, depreciacao: 0, amortizacao: 0, receitaFinanceira: 0, despesaFinanceira: 0, ebt: 0, impostosSobreLucro: 0, lucroLiquido: 0 },
  },
}

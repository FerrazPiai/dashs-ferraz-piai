/**
 * Mock data for GTM Motion dashboard (development fallback)
 * Adapted from mock/gtm-motion.html
 *
 * Expected API shape:
 * {
 *   motions: [
 *     {
 *       id: string,
 *       label: string,
 *       color: 'green' | 'yellow' | 'orange' | 'red',
 *       channels: {
 *         inbound: { kpis: KpisObject, tiers: TierRow[] },
 *         outbound: { kpis: KpisObject, tiers: TierRow[] }
 *       }
 *     }
 *   ]
 * }
 *
 * KpisObject: { leads, mql, sql, sal, commit, avgTicket, booking }
 * Each KPI: { value, provisionado, meta, delta }
 *
 * TierRow: { tier, leads, cr1, cr2, cr3, cr4, mql, sql, sal, commit, mqlWon, avgTicket, booking, subCategories?, isEmptyRow?, isTotal? }
 * cr* fields: { val: number, color: 'green'|'red'|'yellow' }
 */

const ativacao26Inbound = {
  kpis: {
    leads:     { value: 14705, provisionado: 13488, meta: 13488, delta: 109.02 },
    mql:       { value: 10457, provisionado: 10788, meta: 10788, delta: 96.93 },
    sql:       { value: 3161,  provisionado: null,  meta: 3156,  delta: null },
    sal:       { value: 2700,  provisionado: null,  meta: 3390,  delta: null },
    commit:    { value: 558,   provisionado: null,  meta: 1020,  delta: null },
    avgTicket: { value: 23469, provisionado: null,  meta: 25395, delta: null },
    booking:   { value: 13095834, provisionado: null, meta: 25903300, delta: null }
  },
  tiers: [
    {
      tier: 'Enterprise',
      leads: 603,
      cr1: { val: 100.00, color: 'green' },
      mql: 603,
      cr2: { val: 7.13, color: 'red' },
      sql: 43,
      cr3: { val: 97.67, color: 'green' },
      sal: 42,
      cr4: { val: 7.14, color: 'red' },
      commit: 3,
      mqlWon: { val: 0.50, color: 'green' },
      avgTicket: 22870,
      booking: 68610,
      subCategories: [
        { name: 'Saber',        leads: 240, mql: 240, sql: 17, sal: 16, commit: 1, booking: 22870 },
        { name: 'Ter',          leads: 180, mql: 180, sql: 13, sal: 13, commit: 1, booking: 22870 },
        { name: 'Executar',     leads: 120, mql: 120, sql: 8,  sal: 8,  commit: 1, booking: 22870 },
        { name: 'Potencializar',leads: 63,  mql: 63,  sql: 5,  sal: 5,  commit: 0, booking: 0 }
      ]
    },
    {
      tier: 'Large',
      leads: 610,
      cr1: { val: 100.00, color: 'green' },
      mql: 610,
      cr2: { val: 20.16, color: 'red' },
      sql: 123,
      cr3: { val: 85.37, color: 'red' },
      sal: 105,
      cr4: { val: 14.29, color: 'red' },
      commit: 15,
      mqlWon: { val: 2.46, color: 'green' },
      avgTicket: 36662,
      booking: 549926,
      subCategories: [
        { name: 'Saber',        leads: 250, mql: 250, sql: 50, sal: 42, commit: 6, booking: 219970 },
        { name: 'Ter',          leads: 180, mql: 180, sql: 36, sal: 31, commit: 4, booking: 146648 },
        { name: 'Executar',     leads: 120, mql: 120, sql: 24, sal: 21, commit: 3, booking: 109986 },
        { name: 'Potencializar',leads: 60,  mql: 60,  sql: 13, sal: 11, commit: 2, booking: 73322 }
      ]
    },
    {
      tier: 'Medium',
      leads: 3630,
      cr1: { val: 100.00, color: 'green' },
      mql: 3630,
      cr2: { val: 28.73, color: 'red' },
      sql: 1043,
      cr3: { val: 88.30, color: 'green' },
      sal: 921,
      cr4: { val: 21.61, color: 'red' },
      commit: 199,
      mqlWon: { val: 5.48, color: 'green' },
      avgTicket: 26336,
      booking: 5240841,
      subCategories: [
        { name: 'Saber',        leads: 1450, mql: 1450, sql: 417, sal: 368, commit: 80, booking: 2106880 },
        { name: 'Ter',          leads: 1080, mql: 1080, sql: 312, sal: 276, commit: 60, booking: 1580160 },
        { name: 'Executar',     leads: 720,  mql: 720,  sql: 208, sal: 184, commit: 40, booking: 1053440 },
        { name: 'Potencializar',leads: 380,  mql: 380,  sql: 106, sal: 93,  commit: 19, booking: 500361 }
      ]
    },
    {
      tier: 'Small',
      leads: 2740,
      cr1: { val: 99.93, color: 'green' },
      mql: 2738,
      cr2: { val: 35.83, color: 'green' },
      sql: 981,
      cr3: { val: 85.63, color: 'red' },
      sal: 840,
      cr4: { val: 20.48, color: 'red' },
      commit: 172,
      mqlWon: { val: 6.28, color: 'green' },
      avgTicket: 22660,
      booking: 3897599,
      subCategories: [
        { name: 'Saber',        leads: 1100, mql: 1098, sql: 392, sal: 336, commit: 68, booking: 1540880 },
        { name: 'Ter',          leads: 820,  mql: 820,  sql: 294, sal: 252, commit: 52, booking: 1178320 },
        { name: 'Executar',     leads: 548,  mql: 548,  sql: 196, sal: 168, commit: 35, booking: 793100 },
        { name: 'Potencializar',leads: 272,  mql: 272,  sql: 99,  sal: 84,  commit: 17, booking: 385299 }
      ]
    },
    {
      tier: 'Tiny',
      leads: 2777,
      cr1: { val: 99.68, color: 'green' },
      mql: 2768,
      cr2: { val: 30.67, color: 'green' },
      sql: 849,
      cr3: { val: 81.63, color: 'red' },
      sal: 693,
      cr4: { val: 20.78, color: 'red' },
      commit: 144,
      mqlWon: { val: 5.20, color: 'green' },
      avgTicket: 19931,
      booking: 2870113,
      subCategories: [
        { name: 'Saber',        leads: 1110, mql: 1107, sql: 339, sal: 277, commit: 57, booking: 1136067 },
        { name: 'Ter',          leads: 833,  mql: 830,  sql: 254, sal: 208, commit: 43, booking: 857033 },
        { name: 'Executar',     leads: 555,  mql: 553,  sql: 169, sal: 138, commit: 29, booking: 577999 },
        { name: 'Potencializar',leads: 279,  mql: 278,  sql: 87,  sal: 70,  commit: 15, booking: 299014 }
      ]
    },
    {
      tier: 'Non-ICP',
      leads: 4300,
      cr1: { val: 2.51, color: 'green' },
      mql: 108,
      cr2: { val: 112.96, color: 'green' },
      sql: 122,
      cr3: { val: 81.15, color: 'green' },
      sal: 99,
      cr4: { val: 25.25, color: 'green' },
      commit: 25,
      mqlWon: { val: 23.15, color: 'green' },
      avgTicket: 18750,
      booking: 468745,
      subCategories: [
        { name: 'Saber',        leads: 1720, mql: 43, sql: 48, sal: 39, commit: 10, booking: 187500 },
        { name: 'Ter',          leads: 1290, mql: 32, sql: 36, sal: 29, commit: 7,  booking: 131250 },
        { name: 'Executar',     leads: 860,  mql: 21, sql: 24, sal: 19, commit: 5,  booking: 93750 },
        { name: 'Potencializar',leads: 430,  mql: 12, sql: 14, sal: 12, commit: 3,  booking: 56245 }
      ]
    },
    {
      tier: 'Sem mapeamento',
      leads: 45,
      isEmptyRow: true
    },
    {
      tier: 'Total',
      leads: 14705,
      cr1: { val: 71.11, color: 'red' },
      mql: 10457,
      cr2: { val: 30.23, color: 'green' },
      sql: 3161,
      cr3: { val: 85.42, color: 'red' },
      sal: 2700,
      cr4: { val: 20.67, color: 'red' },
      commit: 558,
      mqlWon: { val: 5.34, color: 'green' },
      avgTicket: 23469,
      booking: 13095834,
      isTotal: true
    }
  ]
}

export const MOCK_DATA = {
  motions: [
    {
      id: 'ativacao-26',
      label: 'Ativação 26',
      color: 'green',
      channels: {
        inbound: ativacao26Inbound,
        outbound: {
          kpis: {
            leads:     { value: 3210,  provisionado: null, meta: 3000,  delta: null },
            mql:       { value: 2100,  provisionado: null, meta: 2200,  delta: null },
            sql:       { value: 620,   provisionado: null, meta: 700,   delta: null },
            sal:       { value: 510,   provisionado: null, meta: 600,   delta: null },
            commit:    { value: 95,    provisionado: null, meta: 150,   delta: null },
            avgTicket: { value: 21000, provisionado: null, meta: 24000, delta: null },
            booking:   { value: 1995000, provisionado: null, meta: 3600000, delta: null }
          },
          tiers: [
            {
              tier: 'Total',
              leads: 3210, cr1: { val: 65.42, color: 'red' },
              mql: 2100,   cr2: { val: 29.52, color: 'green' },
              sql: 620,    cr3: { val: 82.26, color: 'red' },
              sal: 510,    cr4: { val: 18.63, color: 'red' },
              commit: 95,  mqlWon: { val: 4.52, color: 'green' },
              avgTicket: 21000, booking: 1995000,
              isTotal: true
            }
          ]
        }
      }
    },
    {
      id: 'reativacao-24',
      label: 'Reativação&Renovação&Expansão 24',
      color: 'yellow',
      channels: {
        inbound: {
          kpis: {
            leads:     { value: 5800, provisionado: null, meta: 5500, delta: null },
            mql:       { value: 4100, provisionado: null, meta: 4200, delta: null },
            sql:       { value: 1250, provisionado: null, meta: 1300, delta: null },
            sal:       { value: 1050, provisionado: null, meta: 1200, delta: null },
            commit:    { value: 210,  provisionado: null, meta: 350,  delta: null },
            avgTicket: { value: 19500, provisionado: null, meta: 22000, delta: null },
            booking:   { value: 4095000, provisionado: null, meta: 7700000, delta: null }
          },
          tiers: [
            {
              tier: 'Total',
              leads: 5800, cr1: { val: 70.69, color: 'red' },
              mql: 4100,   cr2: { val: 30.49, color: 'green' },
              sql: 1250,   cr3: { val: 84.00, color: 'red' },
              sal: 1050,   cr4: { val: 20.00, color: 'red' },
              commit: 210, mqlWon: { val: 5.12, color: 'green' },
              avgTicket: 19500, booking: 4095000,
              isTotal: true
            }
          ]
        },
        outbound: {
          kpis: {
            leads:     { value: 1200, provisionado: null, meta: 1100, delta: null },
            mql:       { value: 850,  provisionado: null, meta: 900,  delta: null },
            sql:       { value: 260,  provisionado: null, meta: 280,  delta: null },
            sal:       { value: 210,  provisionado: null, meta: 250,  delta: null },
            commit:    { value: 42,   provisionado: null, meta: 70,   delta: null },
            avgTicket: { value: 18000, provisionado: null, meta: 20000, delta: null },
            booking:   { value: 756000, provisionado: null, meta: 1400000, delta: null }
          },
          tiers: [
            {
              tier: 'Total',
              leads: 1200, cr1: { val: 70.83, color: 'red' },
              mql: 850,    cr2: { val: 30.59, color: 'green' },
              sql: 260,    cr3: { val: 80.77, color: 'red' },
              sal: 210,    cr4: { val: 20.00, color: 'red' },
              commit: 42,  mqlWon: { val: 4.94, color: 'green' },
              avgTicket: 18000, booking: 756000,
              isTotal: true
            }
          ]
        }
      }
    },
    {
      id: 'reativacao-25',
      label: 'Reativação&Renovação&Expansão 25',
      color: 'orange',
      channels: {
        inbound: {
          kpis: {
            leads:     { value: 4200, provisionado: null, meta: 4000, delta: null },
            mql:       { value: 2900, provisionado: null, meta: 3100, delta: null },
            sql:       { value: 870,  provisionado: null, meta: 950,  delta: null },
            sal:       { value: 720,  provisionado: null, meta: 850,  delta: null },
            commit:    { value: 140,  provisionado: null, meta: 250,  delta: null },
            avgTicket: { value: 21500, provisionado: null, meta: 23000, delta: null },
            booking:   { value: 3010000, provisionado: null, meta: 5750000, delta: null }
          },
          tiers: [
            {
              tier: 'Total',
              leads: 4200, cr1: { val: 69.05, color: 'red' },
              mql: 2900,   cr2: { val: 30.00, color: 'green' },
              sql: 870,    cr3: { val: 82.76, color: 'red' },
              sal: 720,    cr4: { val: 19.44, color: 'red' },
              commit: 140, mqlWon: { val: 4.83, color: 'green' },
              avgTicket: 21500, booking: 3010000,
              isTotal: true
            }
          ]
        },
        outbound: {
          kpis: {
            leads:     { value: 980,  provisionado: null, meta: 900,  delta: null },
            mql:       { value: 680,  provisionado: null, meta: 720,  delta: null },
            sql:       { value: 205,  provisionado: null, meta: 220,  delta: null },
            sal:       { value: 168,  provisionado: null, meta: 195,  delta: null },
            commit:    { value: 32,   provisionado: null, meta: 55,   delta: null },
            avgTicket: { value: 19000, provisionado: null, meta: 21000, delta: null },
            booking:   { value: 608000, provisionado: null, meta: 1155000, delta: null }
          },
          tiers: [
            {
              tier: 'Total',
              leads: 980, cr1: { val: 69.39, color: 'red' },
              mql: 680,   cr2: { val: 30.15, color: 'green' },
              sql: 205,   cr3: { val: 81.95, color: 'red' },
              sal: 168,   cr4: { val: 19.05, color: 'red' },
              commit: 32, mqlWon: { val: 4.71, color: 'green' },
              avgTicket: 19000, booking: 608000,
              isTotal: true
            }
          ]
        }
      }
    }
  ]
}

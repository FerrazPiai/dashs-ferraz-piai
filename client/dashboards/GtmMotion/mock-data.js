/**
 * Mock data for GTM Motion dashboard (development fallback)
 *
 * API shape:
 * {
 *   channels: {
 *     [channelId]: { kpis: KpisObject, tiers: TierRow[] }
 *   }
 * }
 *
 * KpisObject: { leads, mql, sql, sal, commit, avgTicket, booking }
 * Each KPI: { value, provisionado, meta, delta }
 *
 * TierRow: { tier, leads, cr1, cr2, cr3, cr4, mql, sql, sal, commit, mqlWon, avgTicket, booking, subCategories?, isEmptyRow?, isTotal? }
 * cr* fields: { val: number, color: 'green'|'red'|'yellow' }
 */

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

export const CANAIS = [
  { id: 'lead-broker', label: 'Lead Broker' },
  { id: 'v-black-box', label: 'Black Box' },
  { id: 'evento',      label: 'Evento' },
  { id: 'indicacao',   label: 'Indicação' },
  { id: 'recuperacao', label: 'Recuperação' },
]

function cr(val, green, yellow) {
  return { val, color: val >= green ? 'green' : val >= yellow ? 'yellow' : 'red' }
}

// ── Lead Broker (~35%) — full tier breakdown ──────────────────────────────────
const leadBroker = {
  kpis: {
    leads:     { value: 5150, provisionado: 4720, meta: 4720, delta: null },
    mql:       { value: 3660, provisionado: 3776, meta: 3776, delta: null },
    sql:       { value: 1106, provisionado: null,  meta: 1105, delta: null },
    sal:       { value: 945,  provisionado: null,  meta: 1186, delta: null },
    commit:    { value: 195,  provisionado: null,  meta: 357,  delta: null },
    avgTicket: { value: 23800, provisionado: null, meta: 25395, delta: null },
    booking:   { value: 4641000, provisionado: null, meta: 9066150, delta: null },
  },
  tiers: [
    {
      tier: 'Enterprise',
      leads: 211, cr1: cr(100.00, 70, 50), mql: 211,
      cr2: cr(7.11, 25, 15), sql: 15,
      cr3: cr(93.33, 80, 65), sal: 14,
      cr4: cr(7.14, 20, 12), commit: 1,
      mqlWon: cr(0.47, 5, 3), avgTicket: 22870, booking: 22870,
      subCategories: [
        { name: 'Saber',         leads: 84,  mql: 84,  sql: 6, sal: 6, commit: 0, booking: 0 },
        { name: 'Ter',           leads: 63,  mql: 63,  sql: 5, sal: 5, commit: 1, booking: 22870 },
        { name: 'Executar',      leads: 42,  mql: 42,  sql: 3, sal: 2, commit: 0, booking: 0 },
        { name: 'Potencializar', leads: 22,  mql: 22,  sql: 1, sal: 1, commit: 0, booking: 0 },
      ],
    },
    {
      tier: 'Large',
      leads: 214, cr1: cr(100.00, 70, 50), mql: 214,
      cr2: cr(20.09, 25, 15), sql: 43,
      cr3: cr(86.05, 80, 65), sal: 37,
      cr4: cr(13.51, 20, 12), commit: 5,
      mqlWon: cr(2.34, 5, 3), avgTicket: 36662, booking: 183310,
      subCategories: [
        { name: 'Saber',         leads: 88,  mql: 88,  sql: 18, sal: 15, commit: 2, booking: 73324 },
        { name: 'Ter',           leads: 63,  mql: 63,  sql: 13, sal: 11, commit: 2, booking: 73324 },
        { name: 'Executar',      leads: 42,  mql: 42,  sql: 8,  sal: 7,  commit: 1, booking: 36662 },
        { name: 'Potencializar', leads: 21,  mql: 21,  sql: 4,  sal: 4,  commit: 0, booking: 0 },
      ],
    },
    {
      tier: 'Medium',
      leads: 1271, cr1: cr(100.00, 70, 50), mql: 1271,
      cr2: cr(28.72, 25, 15), sql: 365,
      cr3: cr(88.22, 80, 65), sal: 322,
      cr4: cr(21.74, 20, 12), commit: 70,
      mqlWon: cr(5.51, 5, 3), avgTicket: 26336, booking: 1843520,
      subCategories: [
        { name: 'Saber',         leads: 508, mql: 508, sql: 146, sal: 129, commit: 28, booking: 737408 },
        { name: 'Ter',           leads: 381, mql: 381, sql: 109, sal:  97, commit: 21, booking: 553056 },
        { name: 'Executar',      leads: 254, mql: 254, sql:  73, sal:  64, commit: 14, booking: 368704 },
        { name: 'Potencializar', leads: 128, mql: 128, sql:  37, sal:  32, commit:  7, booking: 184352 },
      ],
    },
    {
      tier: 'Small',
      leads: 959, cr1: cr(99.90, 70, 50), mql: 958,
      cr2: cr(35.80, 25, 15), sql: 343,
      cr3: cr(85.71, 80, 65), sal: 294,
      cr4: cr(20.41, 20, 12), commit: 60,
      mqlWon: cr(6.26, 5, 3), avgTicket: 22660, booking: 1359600,
      subCategories: [
        { name: 'Saber',         leads: 385, mql: 384, sql: 137, sal: 118, commit: 24, booking: 543840 },
        { name: 'Ter',           leads: 287, mql: 287, sql: 103, sal:  88, commit: 18, booking: 407880 },
        { name: 'Executar',      leads: 192, mql: 192, sql:  69, sal:  59, commit: 12, booking: 271920 },
        { name: 'Potencializar', leads:  95, mql:  95, sql:  34, sal:  29, commit:  6, booking: 135960 },
      ],
    },
    {
      tier: 'Tiny',
      leads: 972, cr1: cr(99.69, 70, 50), mql: 969,
      cr2: cr(30.65, 25, 15), sql: 297,
      cr3: cr(81.82, 80, 65), sal: 243,
      cr4: cr(20.58, 20, 12), commit: 50,
      mqlWon: cr(5.16, 5, 3), avgTicket: 19931, booking: 996550,
      subCategories: [
        { name: 'Saber',         leads: 389, mql: 388, sql: 119, sal:  97, commit: 20, booking: 398620 },
        { name: 'Ter',           leads: 292, mql: 291, sql:  89, sal:  73, commit: 15, booking: 298965 },
        { name: 'Executar',      leads: 194, mql: 194, sql:  59, sal:  48, commit: 10, booking: 199310 },
        { name: 'Potencializar', leads:  97, mql:  96, sql:  30, sal:  25, commit:  5, booking:  99655 },
      ],
    },
    {
      tier: 'Non-ICP',
      leads: 1505, cr1: cr(2.53, 70, 50), mql: 38,
      cr2: cr(113.16, 25, 15), sql: 43,
      cr3: cr(81.40, 80, 65), sal: 35,
      cr4: cr(25.71, 20, 12), commit: 9,
      mqlWon: cr(23.68, 5, 3), avgTicket: 18750, booking: 168750,
      subCategories: [
        { name: 'Saber',         leads: 602, mql: 15, sql: 17, sal: 14, commit: 4, booking: 75000 },
        { name: 'Ter',           leads: 451, mql: 11, sql: 13, sal: 10, commit: 3, booking: 56250 },
        { name: 'Executar',      leads: 301, mql:  8, sql:  9, sal:  7, commit: 1, booking: 18750 },
        { name: 'Potencializar', leads: 151, mql:  4, sql:  4, sal:  4, commit: 1, booking: 18750 },
      ],
    },
    { tier: 'Sem mapeamento', leads: 18, isEmptyRow: true },
    {
      tier: 'Total',
      leads: 5150, cr1: cr(71.07, 70, 50), mql: 3660,
      cr2: cr(30.22, 25, 15), sql: 1106,
      cr3: cr(85.45, 80, 65), sal: 945,
      cr4: cr(20.63, 20, 12), commit: 195,
      mqlWon: cr(5.33, 5, 3), avgTicket: 23800, booking: 4641000,
      isTotal: true,
    },
  ],
}

// ── Black Box (~25%) ──────────────────────────────────────────────────────────
const blackBox = {
  kpis: {
    leads:     { value: 3678, provisionado: 3372, meta: 3372, delta: null },
    mql:       { value: 2614, provisionado: 2697, meta: 2697, delta: null },
    sql:       { value: 791,  provisionado: null,  meta: 789,  delta: null },
    sal:       { value: 675,  provisionado: null,  meta: 848,  delta: null },
    commit:    { value: 140,  provisionado: null,  meta: 255,  delta: null },
    avgTicket: { value: 23100, provisionado: null, meta: 25395, delta: null },
    booking:   { value: 3234000, provisionado: null, meta: 6475725, delta: null },
  },
  tiers: [
    {
      tier: 'Enterprise',
      leads: 151, cr1: cr(100.00, 70, 50), mql: 151,
      cr2: cr(7.28, 25, 15), sql: 11,
      cr3: cr(90.91, 80, 65), sal: 10,
      cr4: cr(10.00, 20, 12), commit: 1,
      mqlWon: cr(0.66, 5, 3), avgTicket: 23000, booking: 23000,
      subCategories: [
        { name: 'Saber',         leads: 60,  mql: 60,  sql: 4, sal: 4, commit: 0, booking: 0 },
        { name: 'Ter',           leads: 45,  mql: 45,  sql: 4, sal: 3, commit: 1, booking: 23000 },
        { name: 'Executar',      leads: 30,  mql: 30,  sql: 2, sal: 2, commit: 0, booking: 0 },
        { name: 'Potencializar', leads: 16,  mql: 16,  sql: 1, sal: 1, commit: 0, booking: 0 },
      ],
    },
    {
      tier: 'Large',
      leads: 153, cr1: cr(100.00, 70, 50), mql: 153,
      cr2: cr(20.26, 25, 15), sql: 31,
      cr3: cr(83.87, 80, 65), sal: 26,
      cr4: cr(15.38, 20, 12), commit: 4,
      mqlWon: cr(2.61, 5, 3), avgTicket: 36500, booking: 146000,
      subCategories: [
        { name: 'Saber',         leads: 61,  mql: 61,  sql: 13, sal: 11, commit: 2, booking: 73000 },
        { name: 'Ter',           leads: 46,  mql: 46,  sql: 9,  sal: 8,  commit: 1, booking: 36500 },
        { name: 'Executar',      leads: 31,  mql: 31,  sql: 6,  sal: 5,  commit: 1, booking: 36500 },
        { name: 'Potencializar', leads: 15,  mql: 15,  sql: 3,  sal: 2,  commit: 0, booking: 0 },
      ],
    },
    {
      tier: 'Medium',
      leads: 908, cr1: cr(100.00, 70, 50), mql: 908,
      cr2: cr(28.74, 25, 15), sql: 261,
      cr3: cr(88.12, 80, 65), sal: 230,
      cr4: cr(21.74, 20, 12), commit: 50,
      mqlWon: cr(5.51, 5, 3), avgTicket: 26300, booking: 1315000,
      subCategories: [
        { name: 'Saber',         leads: 363, mql: 363, sql: 104, sal: 92,  commit: 20, booking: 526000 },
        { name: 'Ter',           leads: 272, mql: 272, sql: 78,  sal: 69,  commit: 15, booking: 394500 },
        { name: 'Executar',      leads: 182, mql: 182, sql: 52,  sal: 46,  commit: 10, booking: 263000 },
        { name: 'Potencializar', leads: 91,  mql: 91,  sql: 27,  sal: 23,  commit: 5,  booking: 131500 },
      ],
    },
    {
      tier: 'Small',
      leads: 685, cr1: cr(99.85, 70, 50), mql: 684,
      cr2: cr(35.82, 25, 15), sql: 245,
      cr3: cr(85.71, 80, 65), sal: 210,
      cr4: cr(20.48, 20, 12), commit: 43,
      mqlWon: cr(6.29, 5, 3), avgTicket: 22800, booking: 980400,
      subCategories: [
        { name: 'Saber',         leads: 274, mql: 273, sql: 98,  sal: 84,  commit: 17, booking: 387600 },
        { name: 'Ter',           leads: 206, mql: 205, sql: 73,  sal: 63,  commit: 13, booking: 296400 },
        { name: 'Executar',      leads: 137, mql: 137, sql: 49,  sal: 42,  commit: 9,  booking: 205200 },
        { name: 'Potencializar', leads: 68,  mql: 69,  sql: 25,  sal: 21,  commit: 4,  booking: 91200 },
      ],
    },
    {
      tier: 'Tiny',
      leads: 694, cr1: cr(99.71, 70, 50), mql: 692,
      cr2: cr(30.64, 25, 15), sql: 212,
      cr3: cr(82.08, 80, 65), sal: 174,
      cr4: cr(20.69, 20, 12), commit: 36,
      mqlWon: cr(5.20, 5, 3), avgTicket: 19900, booking: 716400,
      subCategories: [
        { name: 'Saber',         leads: 278, mql: 277, sql: 85, sal: 70, commit: 14, booking: 278600 },
        { name: 'Ter',           leads: 208, mql: 208, sql: 64, sal: 52, commit: 11, booking: 218900 },
        { name: 'Executar',      leads: 139, mql: 138, sql: 42, sal: 35, commit: 7,  booking: 139300 },
        { name: 'Potencializar', leads: 69,  mql: 69,  sql: 21, sal: 17, commit: 4,  booking: 79600 },
      ],
    },
    {
      tier: 'Non-ICP',
      leads: 1074, cr1: cr(2.51, 70, 50), mql: 27,
      cr2: cr(114.81, 25, 15), sql: 31,
      cr3: cr(80.65, 80, 65), sal: 25,
      cr4: cr(24.00, 20, 12), commit: 6,
      mqlWon: cr(22.22, 5, 3), avgTicket: 18500, booking: 111000,
      subCategories: [
        { name: 'Saber',         leads: 430, mql: 11, sql: 13, sal: 10, commit: 2, booking: 37000 },
        { name: 'Ter',           leads: 322, mql: 8,  sql: 9,  sal: 8,  commit: 2, booking: 37000 },
        { name: 'Executar',      leads: 215, mql: 5,  sql: 6,  sal: 5,  commit: 1, booking: 18500 },
        { name: 'Potencializar', leads: 107, mql: 3,  sql: 3,  sal: 2,  commit: 1, booking: 18500 },
      ],
    },
    { tier: 'Sem mapeamento', leads: 13, isEmptyRow: true },
    {
      tier: 'Total',
      leads: 3678, cr1: cr(71.07, 70, 50), mql: 2614,
      cr2: cr(30.26, 25, 15), sql: 791,
      cr3: cr(85.34, 80, 65), sal: 675,
      cr4: cr(20.74, 20, 12), commit: 140,
      mqlWon: cr(5.36, 5, 3), avgTicket: 23100, booking: 3234000,
      isTotal: true,
    },
  ],
}

// ── Evento (~15%) ─────────────────────────────────────────────────────────────
const evento = {
  kpis: {
    leads:     { value: 2206, provisionado: 2023, meta: 2023, delta: null },
    mql:       { value: 1569, provisionado: 1618, meta: 1618, delta: null },
    sql:       { value: 474,  provisionado: null,  meta: 473,  delta: null },
    sal:       { value: 405,  provisionado: null,  meta: 509,  delta: null },
    commit:    { value: 84,   provisionado: null,  meta: 153,  delta: null },
    avgTicket: { value: 24200, provisionado: null, meta: 25395, delta: null },
    booking:   { value: 2032800, provisionado: null, meta: 3885435, delta: null },
  },
  tiers: [
    {
      tier: 'Enterprise',
      leads: 90, cr1: cr(100.00, 70, 50), mql: 90,
      cr2: cr(6.67, 25, 15), sql: 6,
      cr3: cr(100.00, 80, 65), sal: 6,
      cr4: cr(0.00, 20, 12), commit: 0,
      mqlWon: cr(0.00, 5, 3), avgTicket: 0, booking: 0,
      subCategories: [
        { name: 'Saber',         leads: 36, mql: 36, sql: 2, sal: 2, commit: 0, booking: 0 },
        { name: 'Ter',           leads: 27, mql: 27, sql: 2, sal: 2, commit: 0, booking: 0 },
        { name: 'Executar',      leads: 18, mql: 18, sql: 1, sal: 1, commit: 0, booking: 0 },
        { name: 'Potencializar', leads: 9,  mql: 9,  sql: 1, sal: 1, commit: 0, booking: 0 },
      ],
    },
    {
      tier: 'Large',
      leads: 92, cr1: cr(100.00, 70, 50), mql: 92,
      cr2: cr(19.57, 25, 15), sql: 18,
      cr3: cr(83.33, 80, 65), sal: 15,
      cr4: cr(13.33, 20, 12), commit: 2,
      mqlWon: cr(2.17, 5, 3), avgTicket: 36200, booking: 72400,
      subCategories: [
        { name: 'Saber',         leads: 37, mql: 37, sql: 7, sal: 6, commit: 1, booking: 36200 },
        { name: 'Ter',           leads: 28, mql: 28, sql: 6, sal: 5, commit: 1, booking: 36200 },
        { name: 'Executar',      leads: 18, mql: 18, sql: 3, sal: 3, commit: 0, booking: 0 },
        { name: 'Potencializar', leads: 9,  mql: 9,  sql: 2, sal: 1, commit: 0, booking: 0 },
      ],
    },
    {
      tier: 'Medium',
      leads: 544, cr1: cr(100.00, 70, 50), mql: 544,
      cr2: cr(28.68, 25, 15), sql: 156,
      cr3: cr(88.46, 80, 65), sal: 138,
      cr4: cr(21.74, 20, 12), commit: 30,
      mqlWon: cr(5.51, 5, 3), avgTicket: 24900, booking: 747000,
      subCategories: [
        { name: 'Saber',         leads: 218, mql: 218, sql: 62, sal: 55, commit: 12, booking: 298800 },
        { name: 'Ter',           leads: 163, mql: 163, sql: 47, sal: 41, commit: 9,  booking: 224100 },
        { name: 'Executar',      leads: 109, mql: 109, sql: 31, sal: 28, commit: 6,  booking: 149400 },
        { name: 'Potencializar', leads: 54,  mql: 54,  sql: 16, sal: 14, commit: 3,  booking: 74700 },
      ],
    },
    {
      tier: 'Small',
      leads: 411, cr1: cr(99.76, 70, 50), mql: 410,
      cr2: cr(35.85, 25, 15), sql: 147,
      cr3: cr(85.71, 80, 65), sal: 126,
      cr4: cr(20.63, 20, 12), commit: 26,
      mqlWon: cr(6.34, 5, 3), avgTicket: 22800, booking: 592800,
      subCategories: [
        { name: 'Saber',         leads: 164, mql: 164, sql: 59, sal: 50, commit: 10, booking: 228000 },
        { name: 'Ter',           leads: 123, mql: 123, sql: 44, sal: 38, commit: 8,  booking: 182400 },
        { name: 'Executar',      leads: 82,  mql: 82,  sql: 29, sal: 25, commit: 5,  booking: 114000 },
        { name: 'Potencializar', leads: 42,  mql: 41,  sql: 15, sal: 13, commit: 3,  booking: 68400 },
      ],
    },
    {
      tier: 'Tiny',
      leads: 416, cr1: cr(99.76, 70, 50), mql: 415,
      cr2: cr(30.60, 25, 15), sql: 127,
      cr3: cr(81.89, 80, 65), sal: 104,
      cr4: cr(20.19, 20, 12), commit: 21,
      mqlWon: cr(5.06, 5, 3), avgTicket: 19800, booking: 415800,
      subCategories: [
        { name: 'Saber',         leads: 166, mql: 166, sql: 51, sal: 42, commit: 8, booking: 158400 },
        { name: 'Ter',           leads: 125, mql: 125, sql: 38, sal: 31, commit: 6, booking: 118800 },
        { name: 'Executar',      leads: 83,  mql: 82,  sql: 25, sal: 21, commit: 5, booking: 99000 },
        { name: 'Potencializar', leads: 42,  mql: 42,  sql: 13, sal: 10, commit: 2, booking: 39600 },
      ],
    },
    {
      tier: 'Non-ICP',
      leads: 644, cr1: cr(2.48, 70, 50), mql: 16,
      cr2: cr(112.50, 25, 15), sql: 18,
      cr3: cr(77.78, 80, 65), sal: 14,
      cr4: cr(35.71, 20, 12), commit: 5,
      mqlWon: cr(31.25, 5, 3), avgTicket: 18800, booking: 94000,
      subCategories: [
        { name: 'Saber',         leads: 258, mql: 6, sql: 7, sal: 6, commit: 2, booking: 37600 },
        { name: 'Ter',           leads: 193, mql: 5, sql: 6, sal: 4, commit: 1, booking: 18800 },
        { name: 'Executar',      leads: 129, mql: 3, sql: 3, sal: 2, commit: 1, booking: 18800 },
        { name: 'Potencializar', leads: 64,  mql: 2, sql: 2, sal: 2, commit: 1, booking: 18800 },
      ],
    },
    { tier: 'Sem mapeamento', leads: 9, isEmptyRow: true },
    {
      tier: 'Total',
      leads: 2206, cr1: cr(71.12, 70, 50), mql: 1569,
      cr2: cr(30.21, 25, 15), sql: 474,
      cr3: cr(85.44, 80, 65), sal: 405,
      cr4: cr(20.74, 20, 12), commit: 84,
      mqlWon: cr(5.35, 5, 3), avgTicket: 24200, booking: 2032800,
      isTotal: true,
    },
  ],
}

// ── Indicação (~15%) ──────────────────────────────────────────────────────────
const indicacao = {
  kpis: {
    leads:     { value: 2206, provisionado: 2023, meta: 2023, delta: null },
    mql:       { value: 1569, provisionado: 1618, meta: 1618, delta: null },
    sql:       { value: 474,  provisionado: null,  meta: 473,  delta: null },
    sal:       { value: 405,  provisionado: null,  meta: 509,  delta: null },
    commit:    { value: 84,   provisionado: null,  meta: 153,  delta: null },
    avgTicket: { value: 25100, provisionado: null, meta: 26000, delta: null },
    booking:   { value: 2108400, provisionado: null, meta: 3978000, delta: null },
  },
  tiers: [
    {
      tier: 'Enterprise',
      leads: 90, cr1: cr(100.00, 70, 50), mql: 90,
      cr2: cr(6.67, 25, 15), sql: 6,
      cr3: cr(100.00, 80, 65), sal: 6,
      cr4: cr(16.67, 20, 12), commit: 1,
      mqlWon: cr(1.11, 5, 3), avgTicket: 25100, booking: 25100,
      subCategories: [
        { name: 'Saber',         leads: 36, mql: 36, sql: 2, sal: 2, commit: 0, booking: 0 },
        { name: 'Ter',           leads: 27, mql: 27, sql: 2, sal: 2, commit: 1, booking: 25100 },
        { name: 'Executar',      leads: 18, mql: 18, sql: 1, sal: 1, commit: 0, booking: 0 },
        { name: 'Potencializar', leads: 9,  mql: 9,  sql: 1, sal: 1, commit: 0, booking: 0 },
      ],
    },
    {
      tier: 'Large',
      leads: 92, cr1: cr(100.00, 70, 50), mql: 92,
      cr2: cr(19.57, 25, 15), sql: 18,
      cr3: cr(83.33, 80, 65), sal: 15,
      cr4: cr(13.33, 20, 12), commit: 2,
      mqlWon: cr(2.17, 5, 3), avgTicket: 37600, booking: 75200,
      subCategories: [
        { name: 'Saber',         leads: 37, mql: 37, sql: 7, sal: 6, commit: 1, booking: 37600 },
        { name: 'Ter',           leads: 28, mql: 28, sql: 6, sal: 5, commit: 1, booking: 37600 },
        { name: 'Executar',      leads: 18, mql: 18, sql: 3, sal: 3, commit: 0, booking: 0 },
        { name: 'Potencializar', leads: 9,  mql: 9,  sql: 2, sal: 1, commit: 0, booking: 0 },
      ],
    },
    {
      tier: 'Medium',
      leads: 544, cr1: cr(100.00, 70, 50), mql: 544,
      cr2: cr(28.68, 25, 15), sql: 156,
      cr3: cr(88.46, 80, 65), sal: 138,
      cr4: cr(21.74, 20, 12), commit: 30,
      mqlWon: cr(5.51, 5, 3), avgTicket: 25800, booking: 774000,
      subCategories: [
        { name: 'Saber',         leads: 218, mql: 218, sql: 62, sal: 55, commit: 12, booking: 309600 },
        { name: 'Ter',           leads: 163, mql: 163, sql: 47, sal: 41, commit: 9,  booking: 232200 },
        { name: 'Executar',      leads: 109, mql: 109, sql: 31, sal: 28, commit: 6,  booking: 154800 },
        { name: 'Potencializar', leads: 54,  mql: 54,  sql: 16, sal: 14, commit: 3,  booking: 77400 },
      ],
    },
    {
      tier: 'Small',
      leads: 411, cr1: cr(99.76, 70, 50), mql: 410,
      cr2: cr(35.85, 25, 15), sql: 147,
      cr3: cr(85.71, 80, 65), sal: 126,
      cr4: cr(20.63, 20, 12), commit: 26,
      mqlWon: cr(6.34, 5, 3), avgTicket: 23600, booking: 613600,
      subCategories: [
        { name: 'Saber',         leads: 164, mql: 164, sql: 59, sal: 50, commit: 10, booking: 236000 },
        { name: 'Ter',           leads: 123, mql: 123, sql: 44, sal: 38, commit: 8,  booking: 188800 },
        { name: 'Executar',      leads: 82,  mql: 82,  sql: 29, sal: 25, commit: 5,  booking: 118000 },
        { name: 'Potencializar', leads: 42,  mql: 41,  sql: 15, sal: 13, commit: 3,  booking: 70800 },
      ],
    },
    {
      tier: 'Tiny',
      leads: 416, cr1: cr(99.76, 70, 50), mql: 415,
      cr2: cr(30.60, 25, 15), sql: 127,
      cr3: cr(81.89, 80, 65), sal: 104,
      cr4: cr(20.19, 20, 12), commit: 21,
      mqlWon: cr(5.06, 5, 3), avgTicket: 20500, booking: 430500,
      subCategories: [
        { name: 'Saber',         leads: 166, mql: 166, sql: 51, sal: 42, commit: 8, booking: 164000 },
        { name: 'Ter',           leads: 125, mql: 125, sql: 38, sal: 31, commit: 6, booking: 123000 },
        { name: 'Executar',      leads: 83,  mql: 82,  sql: 25, sal: 21, commit: 5, booking: 102500 },
        { name: 'Potencializar', leads: 42,  mql: 42,  sql: 13, sal: 10, commit: 2, booking: 41000 },
      ],
    },
    {
      tier: 'Non-ICP',
      leads: 644, cr1: cr(2.48, 70, 50), mql: 16,
      cr2: cr(112.50, 25, 15), sql: 18,
      cr3: cr(77.78, 80, 65), sal: 14,
      cr4: cr(28.57, 20, 12), commit: 4,
      mqlWon: cr(25.00, 5, 3), avgTicket: 19500, booking: 78000,
      subCategories: [
        { name: 'Saber',         leads: 258, mql: 6, sql: 7, sal: 6, commit: 2, booking: 39000 },
        { name: 'Ter',           leads: 193, mql: 5, sql: 6, sal: 4, commit: 1, booking: 19500 },
        { name: 'Executar',      leads: 129, mql: 3, sql: 3, sal: 2, commit: 1, booking: 19500 },
        { name: 'Potencializar', leads: 64,  mql: 2, sql: 2, sal: 2, commit: 0, booking: 0 },
      ],
    },
    { tier: 'Sem mapeamento', leads: 9, isEmptyRow: true },
    {
      tier: 'Total',
      leads: 2206, cr1: cr(71.12, 70, 50), mql: 1569,
      cr2: cr(30.21, 25, 15), sql: 474,
      cr3: cr(85.44, 80, 65), sal: 405,
      cr4: cr(20.74, 20, 12), commit: 84,
      mqlWon: cr(5.35, 5, 3), avgTicket: 25100, booking: 2108400,
      isTotal: true,
    },
  ],
}

// ── Recuperação (~10%) ────────────────────────────────────────────────────────
const recuperacao = {
  kpis: {
    leads:     { value: 1471, provisionado: 1350, meta: 1350, delta: null },
    mql:       { value: 1046, provisionado: 1079, meta: 1079, delta: null },
    sql:       { value: 317,  provisionado: null,  meta: 316,  delta: null },
    sal:       { value: 270,  provisionado: null,  meta: 339,  delta: null },
    commit:    { value: 56,   provisionado: null,  meta: 102,  delta: null },
    avgTicket: { value: 22500, provisionado: null, meta: 25000, delta: null },
    booking:   { value: 1260000, provisionado: null, meta: 2550000, delta: null },
  },
  tiers: [
    {
      tier: 'Enterprise',
      leads: 60, cr1: cr(100.00, 70, 50), mql: 60,
      cr2: cr(6.67, 25, 15), sql: 4,
      cr3: cr(100.00, 80, 65), sal: 4,
      cr4: cr(25.00, 20, 12), commit: 1,
      mqlWon: cr(1.67, 5, 3), avgTicket: 22500, booking: 22500,
      subCategories: [
        { name: 'Saber',         leads: 24, mql: 24, sql: 2, sal: 2, commit: 0, booking: 0 },
        { name: 'Ter',           leads: 18, mql: 18, sql: 1, sal: 1, commit: 1, booking: 22500 },
        { name: 'Executar',      leads: 12, mql: 12, sql: 1, sal: 1, commit: 0, booking: 0 },
        { name: 'Potencializar', leads: 6,  mql: 6,  sql: 0, sal: 0, commit: 0, booking: 0 },
      ],
    },
    {
      tier: 'Large',
      leads: 61, cr1: cr(100.00, 70, 50), mql: 61,
      cr2: cr(19.67, 25, 15), sql: 12,
      cr3: cr(83.33, 80, 65), sal: 10,
      cr4: cr(10.00, 20, 12), commit: 1,
      mqlWon: cr(1.64, 5, 3), avgTicket: 22500, booking: 22500,
      subCategories: [
        { name: 'Saber',         leads: 24, mql: 24, sql: 5, sal: 4, commit: 0, booking: 0 },
        { name: 'Ter',           leads: 18, mql: 18, sql: 4, sal: 3, commit: 0, booking: 0 },
        { name: 'Executar',      leads: 12, mql: 12, sql: 2, sal: 2, commit: 1, booking: 22500 },
        { name: 'Potencializar', leads: 7,  mql: 7,  sql: 1, sal: 1, commit: 0, booking: 0 },
      ],
    },
    {
      tier: 'Medium',
      leads: 363, cr1: cr(100.00, 70, 50), mql: 363,
      cr2: cr(28.65, 25, 15), sql: 104,
      cr3: cr(88.46, 80, 65), sal: 92,
      cr4: cr(21.74, 20, 12), commit: 20,
      mqlWon: cr(5.51, 5, 3), avgTicket: 22500, booking: 450000,
      subCategories: [
        { name: 'Saber',         leads: 145, mql: 145, sql: 42, sal: 37, commit: 8, booking: 180000 },
        { name: 'Ter',           leads: 109, mql: 109, sql: 31, sal: 27, commit: 6, booking: 135000 },
        { name: 'Executar',      leads: 73,  mql: 73,  sql: 21, sal: 18, commit: 4, booking: 90000 },
        { name: 'Potencializar', leads: 36,  mql: 36,  sql: 10, sal: 10, commit: 2, booking: 45000 },
      ],
    },
    {
      tier: 'Small',
      leads: 274, cr1: cr(99.64, 70, 50), mql: 273,
      cr2: cr(35.90, 25, 15), sql: 98,
      cr3: cr(85.71, 80, 65), sal: 84,
      cr4: cr(20.24, 20, 12), commit: 17,
      mqlWon: cr(6.23, 5, 3), avgTicket: 22500, booking: 382500,
      subCategories: [
        { name: 'Saber',         leads: 110, mql: 109, sql: 39, sal: 34, commit: 7, booking: 157500 },
        { name: 'Ter',           leads: 82,  mql: 82,  sql: 29, sal: 25, commit: 5, booking: 112500 },
        { name: 'Executar',      leads: 55,  mql: 55,  sql: 20, sal: 17, commit: 3, booking: 67500 },
        { name: 'Potencializar', leads: 27,  mql: 27,  sql: 10, sal: 8,  commit: 2, booking: 45000 },
      ],
    },
    {
      tier: 'Tiny',
      leads: 278, cr1: cr(99.64, 70, 50), mql: 277,
      cr2: cr(30.69, 25, 15), sql: 85,
      cr3: cr(82.35, 80, 65), sal: 70,
      cr4: cr(20.00, 20, 12), commit: 14,
      mqlWon: cr(5.05, 5, 3), avgTicket: 22500, booking: 315000,
      subCategories: [
        { name: 'Saber',         leads: 111, mql: 111, sql: 34, sal: 28, commit: 6, booking: 135000 },
        { name: 'Ter',           leads: 83,  mql: 83,  sql: 26, sal: 21, commit: 4, booking: 90000 },
        { name: 'Executar',      leads: 56,  mql: 55,  sql: 17, sal: 14, commit: 3, booking: 67500 },
        { name: 'Potencializar', leads: 28,  mql: 28,  sql: 8,  sal: 7,  commit: 1, booking: 22500 },
      ],
    },
    {
      tier: 'Non-ICP',
      leads: 430, cr1: cr(2.56, 70, 50), mql: 11,
      cr2: cr(109.09, 25, 15), sql: 12,
      cr3: cr(83.33, 80, 65), sal: 10,
      cr4: cr(30.00, 20, 12), commit: 3,
      mqlWon: cr(27.27, 5, 3), avgTicket: 22500, booking: 67500,
      subCategories: [
        { name: 'Saber',         leads: 172, mql: 4, sql: 5, sal: 4, commit: 1, booking: 22500 },
        { name: 'Ter',           leads: 129, mql: 3, sql: 4, sal: 3, commit: 1, booking: 22500 },
        { name: 'Executar',      leads: 86,  mql: 3, sql: 2, sal: 2, commit: 1, booking: 22500 },
        { name: 'Potencializar', leads: 43,  mql: 1, sql: 1, sal: 1, commit: 0, booking: 0 },
      ],
    },
    { tier: 'Sem mapeamento', leads: 5, isEmptyRow: true },
    {
      tier: 'Total',
      leads: 1471, cr1: cr(71.11, 70, 50), mql: 1046,
      cr2: cr(30.31, 25, 15), sql: 317,
      cr3: cr(85.17, 80, 65), sal: 270,
      cr4: cr(20.74, 20, 12), commit: 56,
      mqlWon: cr(5.35, 5, 3), avgTicket: 22500, booking: 1260000,
      isTotal: true,
    },
  ],
}

export const MOCK_DATA = {
  channels: {
    'lead-broker': leadBroker,
    'v-black-box':  blackBox,
    'evento':       evento,
    'indicacao':    indicacao,
    'recuperacao':  recuperacao,
  },
}

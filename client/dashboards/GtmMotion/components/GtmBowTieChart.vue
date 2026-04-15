<template>
  <div class="bowtie-section">
    <div class="bowtie-card">
      <!-- Header -->
      <div class="bowtie-header">
        <span class="bowtie-suptitle">Revenue Architecture × Theory of Constraints</span>
        <h2 class="bowtie-title">BowTie Model</h2>
        <span class="bowtie-sub">Heatmap de Restrições · CR · ΔT · VM</span>
      </div>

      <!-- Loading -->
      <div v-if="loading && !hasData" class="bowtie-loading">
        <span class="spinner spinner-lg"></span>
      </div>

      <template v-else-if="hasData">
        <!-- Side labels -->
        <div class="bowtie-sides">
          <span class="side-l">◂ Aquisição</span>
          <span class="side-r">Retenção & Expansão ▸</span>
        </div>

        <!-- Bowtie container (stages + canvas + CR badges + ΔT + guides) -->
        <div class="bowtie-body" ref="bodyRef">
          <!-- Single particle canvas -->
          <canvas ref="canvasRef" class="particles-canvas"></canvas>

          <!-- Guide lines (span the green area at each boundary) -->
          <div
            v-for="g in guideLines"
            :key="'gl'+g.left"
            class="guide-line"
            :style="{ left: g.left + '%', top: g.topPct + '%', height: g.heightPct + '%' }"
          ></div>

          <!-- CR badges (positioned above green area at boundaries) -->
          <div
            v-for="(cr, i) in crBadges"
            :key="'cr'+i"
            class="cr-badge"
            :class="{ 'cr-badge--hidden': isCrHidden(i) }"
            :style="{ left: cr.leftWidth + '%', top: cr.topPct + '%', borderColor: cr.borderColor, color: cr.textColor, background: cr.bgColor }"
          >
            <span class="cr-badge-label">{{ cr.label }}</span>
            <span class="cr-badge-val">{{ fmtPct(cr.val) }}</span>
          </div>

          <!-- Hover sub-stage CR badges (appear above green area when expandable stage is hovered) -->
          <div
            v-for="(cr, i) in hoverCrBadges"
            :key="'hcr'+i"
            class="cr-badge cr-badge--sub"
            :style="{ left: cr.leftWidth + '%', top: cr.topPct + '%', borderColor: cr.borderColor, color: cr.textColor, background: cr.bgColor }"
          >
            <span class="cr-badge-label">{{ cr.label }}</span>
            <span class="cr-badge-val">{{ fmtPct(cr.val) }}</span>
          </div>

          <!-- Stages -->
          <div class="stages">
            <div
              v-for="s in stageList"
              :key="s.id"
              class="stage"
              :class="{ inflection: s.inflection, expandable: s.expandable }"
              :style="{ width: s.width + '%', clipPath: s.clip, background: s.bgStyle }"
              @mouseenter="s.expandable && onHoverIn(s.id)"
              @mouseleave="s.expandable && onHoverOut()"
            >
              <!-- Hover overlay: sub-stages with heatmap backgrounds + CR dividers -->
              <transition name="fade">
                <div v-if="hovered === s.id && s.subs" class="subs-overlay">
                  <div v-for="sub in s.subs" :key="sub.label" class="sub-col" :style="sub.bgStyle ? { background: sub.bgStyle } : {}">
                    <span class="sub-label">{{ sub.label }}</span>
                    <span v-if="sub.volume" class="sub-volume">{{ sub.volume }}</span>
                  </div>
                </div>
              </transition>

              <!-- Normal stage content -->
              <div v-if="hovered !== s.id || !s.subs" class="stage-content" :class="{ 'stage-content--commit': s.inflection }">
                <span class="stage-name">
                  {{ s.label }}<span v-if="s.expandable" class="expand-icon">⊕</span>
                </span>
                <span v-if="s.volume != null" class="stage-volume">{{ s.volume }}</span>
              </div>
            </div>
          </div>

          <!-- ΔT cells (positioned at bottom of green area for each stage) -->
          <template v-for="(s, i) in stageList" :key="'dt'+s.id">
            <!-- Expanded: individual sub-ΔTs following the angled bottom edge -->
            <template v-if="hovered === s.id && s.subs && expandedDtPositions[s.id]">
              <div
                v-for="(sub, j) in s.subs"
                :key="'dtsub-'+s.id+'-'+j"
                class="dt-cell-abs"
                :style="{ left: expandedDtPositions[s.id][j].left + '%', width: expandedDtPositions[s.id][j].width + '%', top: expandedDtPositions[s.id][j].topPct + '%' }"
              >
                <span class="dt-sub-label">{{ sub.label }}</span>
                <div class="dt-pill">
                  <span class="dt-label">ΔT</span>
                  <span class="dt-val">{{ sub.dt ?? 0 }}d</span>
                </div>
              </div>
            </template>
            <!-- Normal: single ΔT at center of stage -->
            <div v-else class="dt-cell-abs" :style="{ left: dtPositions[i].left + '%', width: dtPositions[i].width + '%', top: dtPositions[i].topPct + '%' }">
              <template v-if="s.dt != null">
                <div class="dt-pill">
                  <span class="dt-label">ΔT</span>
                  <span class="dt-val">{{ s.dt }}d</span>
                </div>
              </template>
            </div>
          </template>

          <!-- INFLEXÃO label outside the funnel -->
          <div class="inflexao-outer">INFLEXÃO</div>
        </div>

        <!-- Cycle label -->
        <div class="cycle-label">TEMPO MÉDIO DE CICLO (ΔT)</div>

        <!-- Hover hint -->
        <div class="hover-hint">
          Passe o mouse sobre <strong>Selection</strong> ou <strong>Expansion</strong> para ver sub-estágios
        </div>

        <!-- VM Section -->
        <div class="vm-section" v-if="vmData.length">
          <div class="vm-title">Valor Médio por Estágio — <strong>VM</strong></div>
          <div class="vm-pills">
            <div
              v-for="vm in vmData"
              :key="vm.stage"
              class="vm-pill"
              :class="{ 'vm-pill--highlight': vm.highlight }"
            >
              <span class="vm-pill-label">VM {{ vm.stage }}</span>
              <span class="vm-pill-value">{{ vm.display }}</span>
              <span class="vm-pill-desc">{{ vm.desc }}</span>
            </div>
          </div>
        </div>

        <!-- Legend — gradient bar -->
        <div class="bowtie-legend">
          <span class="hleg">Trava</span>
          <div class="hbar"></div>
          <span class="hleg">Saudável</span>
          <span class="legend-sep">|</span>
          <span class="legend-def">CR = Conversion Rate</span>
          <span class="legend-def">ΔT = Tempo no estágio</span>
          <span class="legend-def">VM = Valor médio (R$)</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { formatCurrencyAbbrev } from '../../../composables/useFormatters.js'

const props = defineProps({
  data: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

// ── Geometry ────────────────────────────────────────────────────────────────
const WIDTHS = [17, 15.5, 14, 5, 14, 15.5, 17]
const HEIGHTS = [
  { l: 0.96, r: 0.78 },
  { l: 0.78, r: 0.55 },
  { l: 0.55, r: 0.22 },
  { l: 0.22, r: 0.22 },
  { l: 0.22, r: 0.55 },
  { l: 0.55, r: 0.78 },
  { l: 0.78, r: 0.96 },
]
// Cumulative left edges (% of total width)
const BOUNDS = WIDTHS.reduce((acc, w) => [...acc, acc[acc.length - 1] + w], [0])
// Exposed for guide lines (boundaries between stages, excluding 0 and total)
const guideBounds = computed(() => BOUNDS.slice(1, -1))

function makeClip(h) {
  const tl = ((1 - h.l) / 2 * 100).toFixed(1)
  const tr = ((1 - h.r) / 2 * 100).toFixed(1)
  const br = ((1 + h.r) / 2 * 100).toFixed(1)
  const bl = ((1 + h.l) / 2 * 100).toFixed(1)
  return `polygon(0% ${tl}%, 100% ${tr}%, 100% ${br}%, 0% ${bl}%)`
}

// Bowtie shape: get top/bottom Y at a given X (0..1 normalized)
function getBowtieY(xNorm) {
  let cumW = 0
  for (let i = 0; i < WIDTHS.length; i++) {
    const w = WIDTHS[i] / 100
    if (xNorm <= cumW + w || i === WIDTHS.length - 1) {
      const t = w > 0 ? (xNorm - cumW) / w : 0
      const hTop = HEIGHTS[i].l + t * (HEIGHTS[i].r - HEIGHTS[i].l)
      const top = (1 - hTop) / 2
      const bot = (1 + hTop) / 2
      return { top, bot }
    }
    cumW += w
  }
  return { top: 0.02, bot: 0.98 }
}

// Get stage index at normalized x position
function getStageAt(xNorm) {
  let cumW = 0
  for (let i = 0; i < WIDTHS.length; i++) {
    cumW += WIDTHS[i] / 100
    if (xNorm <= cumW) return i
  }
  return WIDTHS.length - 1
}

// ── State ───────────────────────────────────────────────────────────────────
const hovered = ref(null)
const bodyRef = ref(null)
const canvasRef = ref(null)
let hoverTimer = null
let animId = null
let resizeTimer = null
let particles = []

const onHoverIn = (id) => { clearTimeout(hoverTimer); hovered.value = id }
const onHoverOut = () => { hoverTimer = setTimeout(() => { hovered.value = null }, 150) }

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtPct = (v) => {
  if (v == null || isNaN(v)) return '—'
  return v.toFixed(1) + '%'
}
const fmtVol = (v) => {
  if (v == null) return ''
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return v.toLocaleString('pt-BR')
}

// Continuous heatmap color: interpolates from orange-red (0%) → amber (50%) → green (100%)
function interpolateHeatRgb(norm) {
  const n = Math.max(0, Math.min(1, norm))
  let r, g, b
  if (n <= 0.5) {
    const t = n / 0.5
    r = 230 + (220 - 230) * t;  g = 75 + (185 - 75) * t;  b = 25 + (30 - 25) * t
  } else {
    const t = (n - 0.5) / 0.5
    r = 220 + (35 - 220) * t;   g = 185 + (200 - 185) * t; b = 30 + (65 - 30) * t
  }
  return [Math.round(r), Math.round(g), Math.round(b)]
}
function makeHeatBg(rgb) {
  const [r, g, b] = rgb
  const dr = Math.round(r * 0.5), dg = Math.round(g * 0.5), db = Math.round(b * 0.5)
  // Vertical subtle darkening at top and bottom edges, main color fill in the center
  return `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.25) 100%), ` +
         `linear-gradient(145deg, rgba(${r},${g},${b},0.70) 0%, rgba(${dr},${dg},${db},0.50) 100%)`
}

// ── Data derivation ─────────────────────────────────────────────────────────
const hasData = computed(() => {
  const d = props.data
  return d && (d.prospects > 0 || d.mql > 0 || d.commit > 0)
})

const bowtieCrs = computed(() => {
  const d = props.data
  if (!d) return {}
  const commitVal = d.commit ?? 0
  const aqlVal = d.aqlMon ?? 0
  const cr4Val = commitVal > 0 ? (aqlVal / commitVal) * 100 : 0

  // Average CRs for multi-sub-stage sections
  const selCrs = [d.cr3?.val, d.cr4?.val].filter(v => v != null && v > 0)
  const selAvg = selCrs.length ? selCrs.reduce((a, b) => a + b, 0) / selCrs.length : 0
  const expCrs = [d.cr5?.val, d.cr6?.val, d.cr7?.val].filter(v => v != null && v > 0)
  const expAvg = expCrs.length ? expCrs.reduce((a, b) => a + b, 0) / expCrs.length : 0

  const rawVals = [d.cr1?.val ?? 0, d.cr2?.val ?? 0, selAvg, cr4Val, d.cr5?.val ?? 0, expAvg]
  const validVals = rawVals.filter(v => v > 0)
  const min = validVals.length ? Math.min(...validVals) : 0
  const max = validVals.length ? Math.max(...validVals) : 100
  const range = max - min

  function makeCr(val) {
    const norm = val <= 0 ? 0 : range === 0 ? 1 : (val - min) / range
    return { val, norm, rgb: interpolateHeatRgb(norm) }
  }

  return {
    cr1: makeCr(d.cr1?.val ?? 0),
    cr2: makeCr(d.cr2?.val ?? 0),
    cr3: makeCr(selAvg),
    cr4: makeCr(cr4Val),
    cr5: makeCr(d.cr5?.val ?? 0),
    cr6: makeCr(expAvg),
    _min: min, _max: max, _range: range,
  }
})

// Sub-stage heatmap: uses same normalization range as main CRs
function subCrHeat(val) {
  const c = bowtieCrs.value
  const range = c._range ?? 100
  const min = c._min ?? 0
  const norm = val <= 0 ? 0 : range === 0 ? 1 : (val - min) / range
  return interpolateHeatRgb(norm)
}

// Hide CR badge when its adjacent expandable stage is hovered
function isCrHidden(badgeIdx) {
  if (badgeIdx === 2 && hovered.value === 'selection') return true
  if (badgeIdx === 5 && hovered.value === 'expansion') return true
  return false
}

// Hover sub-stage CR badges — positioned OUTSIDE the chart (above green area)
const hoverCrBadges = computed(() => {
  if (!hovered.value) return []
  const d = props.data
  if (!d) return []

  const badges = []

  if (hovered.value === 'selection') {
    const si = 2 // stage index for selection
    const hL = HEIGHTS[si].l, hR = HEIGHTS[si].r
    const subsData = [
      { label: 'CR3', val: d.cr3?.val, tNorm: 1 / 2 },
      { label: 'CR4', val: d.cr4?.val, tNorm: 2 / 2 },
    ]
    for (const sub of subsData) {
      if (sub.val == null) continue
      const h = hL + sub.tNorm * (hR - hL)
      const topPct = ((1 - h) / 2) * 100 - CR_GAP
      const leftPct = BOUNDS[si] + sub.tNorm * WIDTHS[si]
      const rgb = subCrHeat(sub.val)
      badges.push({
        label: sub.label, val: sub.val, leftWidth: leftPct, topPct,
        borderColor: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.7)`,
        textColor: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
        bgColor: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.12)`,
      })
    }
  }

  if (hovered.value === 'expansion') {
    const si = 6 // stage index for expansion
    const hL = HEIGHTS[si].l, hR = HEIGHTS[si].r
    const subsData = [
      { label: 'CR5', val: d.cr5?.val, tNorm: 1 / 4 },
      { label: 'CR6', val: d.cr6?.val, tNorm: 2 / 4 },
      { label: 'CR7', val: d.cr7?.val, tNorm: 3 / 4 },
    ]
    for (const sub of subsData) {
      if (sub.val == null) continue
      const h = hL + sub.tNorm * (hR - hL)
      const topPct = ((1 - h) / 2) * 100 - CR_GAP
      const leftPct = BOUNDS[si] + sub.tNorm * WIDTHS[si]
      const rgb = subCrHeat(sub.val)
      badges.push({
        label: sub.label, val: sub.val, leftWidth: leftPct, topPct,
        borderColor: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.7)`,
        textColor: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
        bgColor: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.12)`,
      })
    }
  }

  return badges
})

// Spacing offsets (% of 320px stage height)
const CR_GAP = 4   // ~13px gap above green top (badge uses translateY(-100%) so fully outside)
const DT_GAP = 2   // ~6px gap below green bottom

// CR badges positioned at the top of the green area at each boundary
const crBadges = computed(() => {
  const c = bowtieCrs.value
  const crs = [c.cr1, c.cr2, c.cr3, c.cr4, c.cr5, c.cr6]
  // Shift labels when SELECTION is hovered (sub-badges show CR3/CR4, so main badges shift +1)
  const labels = hovered.value === 'selection'
    ? ['CR1', 'CR2', 'CR3', 'CR5', 'CR6', 'CR7']
    : ['CR1', 'CR2', 'CR3', 'CR4', 'CR5', 'CR6']
  return crs.map((cr, i) => {
    const hFactor = HEIGHTS[i].r
    const topPct = ((1 - hFactor) / 2) * 100 - CR_GAP
    const rgb = cr?.rgb ?? [230, 75, 25]
    return {
      label: labels[i],
      val: cr?.val,
      rgb,
      borderColor: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.7)`,
      textColor: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
      bgColor: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.12)`,
      leftWidth: BOUNDS[i + 1],
      topPct,
    }
  })
})

// Guide lines spanning the green area at each boundary
const guideLines = computed(() => {
  return guideBounds.value.map((left, i) => {
    const hFactor = HEIGHTS[i].r
    const topPct = ((1 - hFactor) / 2) * 100
    const heightPct = hFactor * 100
    return { left, topPct, heightPct }
  })
})

// ΔT positions: bottom of the green area at center of each stage
const dtPositions = computed(() => {
  return STAGE_DEFS.map((_, i) => {
    const avgH = (HEIGHTS[i].l + HEIGHTS[i].r) / 2
    const topPct = ((1 + avgH) / 2) * 100 + DT_GAP
    return { left: BOUNDS[i], width: WIDTHS[i], topPct }
  })
})

// Per-sub-stage ΔT positions for expanded hover (follows angled bottom edge)
const expandedDtPositions = computed(() => {
  const result = {}
  STAGE_DEFS.forEach((def, i) => {
    if (!def.expandable) return
    const subs = def.id === 'selection' ? 2 : 4 // selection has SQL/SAL, expansion has AQL/SQL/SAL/COMMIT
    const subWidth = WIDTHS[i] / subs
    const hL = HEIGHTS[i].l
    const hR = HEIGHTS[i].r
    result[def.id] = Array.from({ length: subs }, (_, j) => {
      const centerNorm = (j + 0.5) / subs
      const height = hL + (hR - hL) * centerNorm
      const topPct = ((1 + height) / 2) * 100 + DT_GAP
      const left = BOUNDS[i] + j * subWidth
      return { left, width: subWidth, topPct }
    })
  })
  return result
})

// Per-stage RGB colors (continuous interpolation)
const stageRgbs = computed(() => {
  const c = bowtieCrs.value
  const accent = [240, 210, 50] // commit always gold
  return [
    c.cr1?.rgb ?? [230, 75, 25],
    c.cr2?.rgb ?? [230, 75, 25],
    c.cr3?.rgb ?? [230, 75, 25],
    accent,
    c.cr4?.rgb ?? [230, 75, 25],
    c.cr5?.rgb ?? [230, 75, 25],
    c.cr6?.rgb ?? [35, 200, 65],
  ]
})
// Legacy name kept for particle speed lookup
const stageHeats = computed(() => {
  const c = bowtieCrs.value
  return [c.cr1, c.cr2, c.cr3, { norm: 0.5 }, c.cr4, c.cr5, c.cr6].map(cr => {
    const n = cr?.norm ?? 0.5
    return n >= 0.6 ? 'green' : n >= 0.3 ? 'yellow' : 'red'
  })
})

const STAGE_DEFS = [
  { id: 'awareness',  label: 'AWARENESS',  expandable: false, inflection: false, side: 'acq' },
  { id: 'education',  label: 'EDUCATION',  expandable: false, inflection: false, side: 'acq' },
  { id: 'selection',  label: 'SELECTION',  expandable: true,  inflection: false, side: 'acq' },
  { id: 'commit',     label: 'COMMIT',     expandable: false, inflection: true,  side: 'acq' },
  { id: 'onboarding', label: 'ONBOARDING', expandable: false, inflection: false, side: 'ret' },
  { id: 'adoption',   label: 'ADOPTION',   expandable: false, inflection: false, side: 'ret' },
  { id: 'expansion',  label: 'EXPANSION',  expandable: true,  inflection: false, side: 'ret' },
]

const stageList = computed(() => {
  const d = props.data
  const heats = stageHeats.value
  const rgbs = stageRgbs.value
  const dt = d?.deltaT ?? {}

  return STAGE_DEFS.map((def, i) => {
    let subs = null
    if (def.id === 'selection') {
      const cr3v = d?.cr3?.val ?? 0, cr4v = d?.cr4?.val ?? 0
      subs = [
        { label: 'SQL', crVal: d?.cr3?.val ?? null, crRgb: subCrHeat(cr3v), dt: dt.sql_sal ?? null, bgStyle: makeHeatBg(subCrHeat(cr3v)), volume: fmtVol(d?.sql) },
        { label: 'SAL', crVal: d?.cr4?.val ?? null, crRgb: subCrHeat(cr4v), dt: dt.sal_commit ?? null, bgStyle: makeHeatBg(subCrHeat(cr4v)), volume: fmtVol(d?.sal) },
      ]
    } else if (def.id === 'expansion') {
      const cr5v = d?.cr5?.val ?? 0, cr6v = d?.cr6?.val ?? 0, cr7v = d?.cr7?.val ?? 0
      subs = [
        { label: 'AQL', crVal: d?.cr5?.val ?? null, crRgb: subCrHeat(cr5v), dt: dt.aql_sql_mon ?? null, bgStyle: makeHeatBg(subCrHeat(cr5v)), volume: fmtVol(d?.aqlMon) },
        { label: 'SQL', crVal: d?.cr6?.val ?? null, crRgb: subCrHeat(cr6v), dt: dt.sql_sal_mon ?? null, bgStyle: makeHeatBg(subCrHeat(cr6v)), volume: fmtVol(d?.sqlMon) },
        { label: 'SAL', crVal: d?.cr7?.val ?? null, crRgb: subCrHeat(cr7v), dt: dt.sal_commit_mon ?? null, bgStyle: makeHeatBg(subCrHeat(cr7v)), volume: fmtVol(d?.salMon) },
        { label: 'COMMIT', crVal: null, crRgb: null, dt: null, bgStyle: null, volume: fmtVol(d?.commitMon) },
      ]
    }

    // ΔT for this stage (always show, default 0)
    let stageDt = 0
    if (def.id === 'awareness') stageDt = dt.prospects_mql ?? 0
    else if (def.id === 'education') stageDt = dt.mql_sql ?? 0
    else if (def.id === 'selection') {
      const dts = [dt.sql_sal, dt.sal_commit].filter(v => v != null && v > 0)
      stageDt = dts.length ? Math.round(dts.reduce((a, b) => a + b, 0) / dts.length) : 0
    }
    else if (def.id === 'commit') stageDt = null
    else if (def.id === 'onboarding') stageDt = dt.onboarding_retention ?? 0
    else if (def.id === 'adoption') {
      stageDt = (dt.sql_sal_mon ?? 0) + (dt.sal_commit_mon ?? 0)
    }
    else if (def.id === 'expansion') {
      const dts = [dt.aql_sql_mon, dt.sql_sal_mon, dt.sal_commit_mon].filter(v => v != null && v > 0)
      stageDt = dts.length ? Math.round(dts.reduce((a, b) => a + b, 0) / dts.length) : 0
    }

    // Volume or revenue label inside stage
    let volume = null
    if (d) {
      if (def.id === 'awareness') volume = fmtVol(d.prospects)
      else if (def.id === 'education') volume = fmtVol(d.mql)
      else if (def.id === 'selection') volume = fmtVol((d.sql ?? 0) + (d.sal ?? 0))
      else if (def.id === 'commit') volume = fmtVol(d.commit)
      else if (def.id === 'onboarding') volume = d.onboarding != null ? fmtVol(d.onboarding) : null
      else if (def.id === 'adoption') volume = d.retention != null ? fmtVol(d.retention) : null
      else if (def.id === 'expansion') {
        const bkMon = d.bookingMon ?? 0
        volume = bkMon > 0 ? formatCurrencyAbbrev(bkMon) : fmtVol(d.aqlMon)
      }
    }

    return {
      ...def,
      width: WIDTHS[i],
      clip: makeClip(HEIGHTS[i]),
      heat: heats[i],
      bgStyle: makeHeatBg(rgbs[i]),
      dt: stageDt,
      subs,
      volume,
    }
  })
})

// ── VM data ─────────────────────────────────────────────────────────────────
const vmData = computed(() => {
  const d = props.data
  if (!d) return []
  const vm = d.vm ?? {}
  const avgTicket = d.avgTicket ?? 0
  const avgTicketMon = d.avgTicketMon ?? 0
  const items = [
    { stage: 'Awareness', value: vm.prospects ?? 0, desc: 'Qualificação', highlight: false },
    { stage: 'Selection', value: vm.selection ?? avgTicket, desc: 'Ticket médio negoc.', highlight: false },
    { stage: 'Commit', value: vm.commit ?? avgTicket, desc: 'ACV médio fechado', highlight: true },
    { stage: 'Expansion', value: vm.expansion ?? avgTicketMon, desc: 'Upsell médio', highlight: false },
    { stage: 'Adoption', value: vm.adoption ?? avgTicketMon, desc: 'Retenção de receita', highlight: false },
  ]
  return items.map(item => ({
    ...item,
    display: item.value > 0 ? formatCurrencyAbbrev(item.value) : 'R$0',
  }))
})

// ── Single-canvas particle system (continuous left→right flow) ──────────────
const PCOLORS = {
  red: [255, 120, 30],
  yellow: [220, 190, 40],
  green: [70, 230, 90],
  accent: [240, 210, 50],
}
// Speeds tuned for visible difference: red = noticeably sluggish, green = flowing
const PSPEEDS = { red: 0.2, yellow: 0.55, green: 1.1, accent: 0.35 }
const PARTICLE_COUNT = 200

function spawnParticle(VW, VH, heats, startX) {
  const xNorm = Math.max(0, Math.min(1, startX / VW))
  const si = getStageAt(xNorm)
  const heat = heats[si] ?? 'yellow'
  const rgbs = stageRgbs.value
  const { top, bot } = getBowtieY(xNorm)
  const margin = 6 / VH
  const yMin = (top + margin) * VH
  const yMax = (bot - margin) * VH
  const speedVar = 0.7 + Math.random() * 0.6
  return {
    x: startX,
    y: yMin + Math.random() * (yMax - yMin),
    r: 1.2 + Math.random() * 1.6,
    alpha: 0.35 + Math.random() * 0.5,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.008 + Math.random() * 0.015,
    color: rgbs[si] ?? PCOLORS[heat] ?? PCOLORS.yellow,
    speedVar,
  }
}

function initParticles() {
  const canvas = canvasRef.value
  const body = bodyRef.value
  if (!canvas || !body) return
  const rect = body.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return
  const dpr = window.devicePixelRatio || 1
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'
  const VW = rect.width
  const VH = rect.height
  const heats = stageHeats.value
  const rightEdge = BOUNDS[BOUNDS.length - 1] / 100 * VW

  // Stagger particles from far off-screen left to the right edge
  // so they flow in gradually rather than appearing all at once
  particles = Array.from({ length: PARTICLE_COUNT }, () => {
    const startX = -VW * 0.5 + Math.random() * (rightEdge + VW * 0.5)
    return spawnParticle(VW, VH, heats, startX)
  })
}

function animate() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const VW = canvas.width / dpr
  const VH = canvas.height / dpr
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, VW, VH)
  const heats = stageHeats.value
  const rgbs = stageRgbs.value
  const rightEdge = BOUNDS[BOUNDS.length - 1] / 100 * VW

  for (const p of particles) {
    // Determine stage speed
    const xNorm = Math.max(0, Math.min(1, p.x / VW))
    const si = getStageAt(xNorm)
    const heat = heats[si] ?? 'yellow'
    const baseSpeed = PSPEEDS[heat] ?? 0.5
    const speed = baseSpeed * p.speedVar
    p.color = rgbs[si] ?? PCOLORS[heat] ?? PCOLORS.yellow

    // Move right with gentle wobble
    p.x += speed
    p.wobble += p.wobbleSpeed
    p.y += Math.sin(p.wobble) * 0.3

    // Clamp Y to bowtie shape
    const { top, bot } = getBowtieY(xNorm)
    const margin = 6 / VH
    const yMin = (top + margin) * VH
    const yMax = (bot - margin) * VH
    if (p.y < yMin) p.y = yMin
    if (p.y > yMax) p.y = yMax

    // Recycle when exiting right — re-enter from left
    if (p.x > rightEdge) {
      const newP = spawnParticle(VW, VH, heats, -10 - Math.random() * 30)
      Object.assign(p, newP)
      continue
    }

    // Skip drawing off-screen particles
    if (p.x < -5) continue

    const [r, g, b] = p.color

    // Soft glow (subtle, not blurry)
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r * 1.8, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * 0.12})`
    ctx.fill()

    // Core (sharp, bright)
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`
    ctx.fill()

    // Bright center point
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r * 0.4, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.3})`
    ctx.fill()
  }
  animId = requestAnimationFrame(animate)
}

function startAnimation() {
  if (animId) cancelAnimationFrame(animId)
  animId = null
  initParticles()
  animate()
}

function handleResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(startAnimation, 200)
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  nextTick(() => { if (hasData.value) startAnimation() })
})

watch(hasData, (val) => { if (val) nextTick(startAnimation) })

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimer)
  clearTimeout(hoverTimer)
  if (animId) cancelAnimationFrame(animId)
})
</script>

<style scoped>
.bowtie-section { margin-bottom: 20px; }
.bowtie-card {
  background: #141414;
  border-radius: 6px;
  padding: 32px 36px 24px;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.bowtie-header { text-align: center; margin-bottom: 20px; }
.bowtie-suptitle {
  display: block;
  font-size: 10px;
  letter-spacing: 2.5px;
  color: #555;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.bowtie-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 6px;
  letter-spacing: 1.5px;
}
.bowtie-sub {
  font-size: 12px;
  color: #666;
  letter-spacing: 1px;
}

/* ── Side labels ─────────────────────────────────────────────────────────── */
.bowtie-sides {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  padding: 0 2px;
}
.side-l, .side-r {
  font-size: 10px;
  letter-spacing: 2px;
  color: #555;
  text-transform: uppercase;
}

/* ── Guide lines (span green area at boundaries) ───────────────────────── */
.guide-line {
  position: absolute;
  border-left: 1px dashed rgba(255, 255, 255, 0.12);
  pointer-events: none;
  z-index: 3;
}

/* ── CR badges (above green area, colored by health) ───────────────────── */
.cr-badge {
  position: absolute;
  transform: translateX(-50%) translateY(-100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid;
  line-height: 1.2;
  white-space: nowrap;
  z-index: 4;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
.cr-badge--hidden { opacity: 0; }
.cr-badge-label {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 2px;
  color: #aaa;
}
.cr-badge-val {
  font-weight: 700;
  font-size: 14px;
}

/* ── Bowtie body (canvas + stages + CR + ΔT + guides) ──────────────────── */
.bowtie-body {
  position: relative;
  overflow: visible;
  margin-top: 40px;
  margin-bottom: 36px;
}
.particles-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

/* ── Stages ──────────────────────────────────────────────────────────────── */
.stages {
  display: flex;
  gap: 0;
  height: 320px;
  position: relative;
  z-index: 2;
}
.stage {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: filter 0.3s ease;
  overflow: hidden;
}
.stage.expandable { cursor: pointer; }
.stage.expandable:hover { filter: brightness(1.25); }

/* ── Stage content ───────────────────────────────────────────────────────── */
.stage-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 4px;
  pointer-events: none;
  user-select: none;
  min-width: 0;
  height: 100%;
}
.stage-content--commit { gap: 4px; }

.stage-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.95);
  text-transform: uppercase;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
  text-align: center;
  line-height: 1.3;
}
.expand-icon {
  display: inline;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  margin-left: 4px;
  vertical-align: middle;
}
/* INFLEXÃO positioned right below the commit stage */
.inflexao-outer {
  position: absolute;
  bottom: -16px;
  /* Center under commit: starts at BOUNDS[3]=46.5%, width=WIDTHS[3]=5% */
  left: 46.5%;
  width: 5%;
  text-align: center;
  font-size: 9px;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  pointer-events: none;
  z-index: 3;
}
.stage-volume {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}

/* ── CR color classes (shared between badges and sub-stages) ─────────────── */
.cr--green {
  border-color: rgba(34, 197, 94, 0.6);
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}
.cr--yellow {
  border-color: rgba(251, 191, 36, 0.6);
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}
.cr--red {
  border-color: rgba(239, 68, 68, 0.6);
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* ── Sub-stages overlay (on hover) ───────────────────────────────────────── */
.subs-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: stretch;
  background: transparent;
}
.sub-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-right: 1px dashed rgba(255, 255, 255, 0.18);
}
.sub-col:last-child { border-right: none; }
.sub-label {
  font-size: 9px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 1px;
  text-transform: uppercase;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}
.sub-volume {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  line-height: 1;
}
/* Hover sub-stage CR badges (appear above chart with fade-in) */
.cr-badge--sub {
  animation: crBadgeFadeIn 0.2s ease;
}
@keyframes crBadgeFadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-80%); }
  to   { opacity: 1; transform: translateX(-50%) translateY(-100%); }
}
.sub-dt {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.5);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── ΔT cells (absolutely positioned at bottom of green area) ──────────── */
.dt-cell-abs {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  z-index: 4;
  pointer-events: none;
}
.dt-sub {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 0;
}
.dt-sub-label {
  font-size: 7px;
  font-weight: 600;
  color: #555;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.dt-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.dt-label {
  font-size: 9px;
  color: #666;
  letter-spacing: 1px;
}
.dt-val {
  font-size: 13px;
  font-weight: 600;
  color: #aaa;
}

/* ── Cycle label + hint ──────────────────────────────────────────────────── */
.cycle-label {
  text-align: center;
  font-size: 9px;
  letter-spacing: 2px;
  color: #444;
  text-transform: uppercase;
  margin-top: 10px;
}
.hover-hint {
  text-align: center;
  font-size: 11px;
  color: #444;
  margin-top: 4px;
}
.hover-hint strong { color: #777; }

/* ── VM Section ──────────────────────────────────────────────────────────── */
.vm-section {
  margin-top: 20px;
  text-align: center;
}
.vm-title {
  font-size: 13px;
  letter-spacing: 1.5px;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.vm-title strong { color: #999; }
.vm-pills {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}
.vm-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 22px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 130px;
}
.vm-pill--highlight {
  border-color: rgba(251, 191, 36, 0.4);
  background: rgba(251, 191, 36, 0.06);
}
.vm-pill-label {
  font-size: 10px;
  color: #666;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.vm-pill-value {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}
.vm-pill--highlight .vm-pill-value { color: #fbbf24; }
.vm-pill-desc {
  font-size: 10px;
  color: #555;
}

/* ── Legend (gradient bar) ────────────────────────────────────────────────── */
.bowtie-legend {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.hleg {
  font-size: 10px;
  color: #666;
  letter-spacing: 0.5px;
}
.hbar {
  width: 180px;
  height: 7px;
  border-radius: 4px;
  background: linear-gradient(90deg, #c62828, #e53935, #ff7043, #ffa726, #ffee58, #c6ff00, #76ff03, #00e676, #00c853);
}
.legend-sep {
  color: #333;
  font-size: 12px;
}
.legend-def {
  font-size: 10px;
  color: #555;
}
/* ── Loading ─────────────────────────────────────────────────────────────── */
.bowtie-loading {
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

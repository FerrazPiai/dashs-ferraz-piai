<template>
  <div class="nps-section">
    <!-- NPS Overview -->
    <div v-if="loading" class="nps-overview-loading">
      <span class="spinner spinner-lg"></span>
    </div>
    <div v-else-if="stats.total > 0" class="nps-overview">
      <!-- NPS Score + Nota Média (extensão) + botão expandir -->
      <div class="nps-kpi-group">
        <div class="nps-score-card" :class="npsScoreClass" ref="npsScoreCardRef">
          <div class="nps-score-label">NPS Score <span class="nps-score-hint" @mouseenter="openNpsTooltip($event)" @mouseleave="hoverLeaveNpsTooltip" @click.stop="pinNpsTooltip">?</span></div>
          <div class="nps-score-value">{{ npsScore >= 0 ? '+' : '' }}{{ npsScore % 1 === 0 ? npsScore.toFixed(0) : npsScore.toFixed(2) }}</div>
          <div class="nps-score-total">{{ stats.total }} respostas</div>
          <div class="nps-score-formula">%P({{ stats.pctP.toFixed(0) }}) - %D({{ stats.pctD.toFixed(0) }})</div>
        </div>
        <!-- Tooltip visual (portal: fixed position, escapes overflow) -->
        <Teleport to="body">
          <div v-if="npsTooltipOpen" class="nps-tooltip" :class="{ 'nps-tooltip--pinned': npsTooltipPinned }" :style="npsTooltipPos" @click.stop @mouseenter="npsTooltipPinned ? null : undefined" @mouseleave="hoverLeaveNpsTooltip">
            <button v-if="npsTooltipPinned" class="nps-tooltip-close" @click="npsTooltipPinned = false; npsTooltipOpen = false">&times;</button>
            <div class="nps-tooltip-title">Como o NPS é calculado</div>
            <div class="nps-tooltip-formula">
              <span class="nps-tooltip-tag nps-tooltip-tag--prom">{{ stats.pctP.toFixed(0) }}% Promotores</span>
              <span class="nps-tooltip-op">−</span>
              <span class="nps-tooltip-tag nps-tooltip-tag--detr">{{ stats.pctD.toFixed(0) }}% Detratores</span>
              <span class="nps-tooltip-op">=</span>
              <span class="nps-tooltip-result" :class="npsScoreClass">{{ npsScore >= 0 ? '+' : '' }}{{ npsScore % 1 === 0 ? npsScore.toFixed(0) : npsScore.toFixed(2) }}</span>
            </div>
            <div class="nps-tooltip-scale">
              <div class="nps-tooltip-scale-bar">
                <div class="nps-tooltip-scale-seg nps-tooltip-scale--detr" style="width:33.3%"><span>-100</span></div>
                <div class="nps-tooltip-scale-seg nps-tooltip-scale--neut" style="width:33.4%"><span>0</span></div>
                <div class="nps-tooltip-scale-seg nps-tooltip-scale--prom" style="width:33.3%"><span>+100</span></div>
              </div>
              <div class="nps-tooltip-marker" :style="{ left: ((npsScore + 100) / 200 * 100) + '%' }"></div>
            </div>
            <div class="nps-tooltip-ranges">
              <span><span class="nps-dot nps-dot-prom"></span> Promotores: nota 9-10</span>
              <span><span class="nps-dot nps-dot-neut"></span> Neutros: nota 7-8</span>
              <span><span class="nps-dot nps-dot-detr"></span> Detratores: nota 0-6</span>
            </div>
          </div>
        </Teleport>
        <transition name="nps-avg-fade">
          <div v-if="!showBreakdown" class="nps-avg-card">
            <div class="nps-avg-label">Nota Média</div>
            <div class="nps-avg-value">{{ avgNota % 1 === 0 ? avgNota.toFixed(0) : avgNota.toFixed(2) }}</div>
          </div>
        </transition>
        <button class="nps-expand-btn" @click="showBreakdown = !showBreakdown" :title="showBreakdown ? 'Retrair' : 'Expandir detalhes'">
          {{ showBreakdown ? '−' : '+' }}
        </button>
        <!-- Mini cards P/N/D (expandíveis, menores que o score) -->
        <transition name="nps-expand">
          <div v-if="showBreakdown" class="nps-mini-cards">
            <div class="nps-mini-card"><div class="nps-mini-val nps-color-prom">{{ stats.promoters }}</div><div class="nps-mini-label">Promotores</div><div class="nps-mini-pct">{{ stats.pctP.toFixed(0) }}%</div></div>
            <div class="nps-mini-card"><div class="nps-mini-val nps-color-neut">{{ stats.neutrals }}</div><div class="nps-mini-label">Neutros</div><div class="nps-mini-pct">{{ stats.pctN.toFixed(0) }}%</div></div>
            <div class="nps-mini-card"><div class="nps-mini-val nps-color-detr">{{ stats.detractors }}</div><div class="nps-mini-label">Detratores</div><div class="nps-mini-pct">{{ stats.pctD.toFixed(0) }}%</div></div>
          </div>
        </transition>
      </div>
      <!-- Barra de distribuição -->
      <div class="nps-dist-wrapper">
        <div class="nps-dist-bar">
          <div class="nps-dist-seg nps-seg-prom" :style="{ width: stats.pctP + '%' }">
            <span v-if="stats.pctP > 12">{{ stats.pctP.toFixed(0) }}%</span>
          </div>
          <div class="nps-dist-seg nps-seg-neut" :style="{ width: stats.pctN + '%' }">
            <span v-if="stats.pctN > 12">{{ stats.pctN.toFixed(0) }}%</span>
          </div>
          <div class="nps-dist-seg nps-seg-detr" :style="{ width: stats.pctD + '%' }">
            <span v-if="stats.pctD > 12">{{ stats.pctD.toFixed(0) }}%</span>
          </div>
        </div>
        <div class="nps-dist-legend">
          <span class="nps-legend-item"><span class="nps-dot nps-dot-prom"></span> Promotores (9-10)</span>
          <span class="nps-legend-item"><span class="nps-dot nps-dot-neut"></span> Neutros (7-8)</span>
          <span class="nps-legend-item"><span class="nps-dot nps-dot-detr"></span> Detratores (0-6)</span>
        </div>
      </div>
    </div>
    <div v-else class="nps-empty">Sem dados de NPS disponíveis</div>

    <!-- Ranking de Coordenadores -->
    <div class="table-section">
      <div class="table-header"><h3 class="table-title">Ranking de Coordenadores</h3></div>
      <div class="nps-ranking">
        <div v-if="!coordRanking.length" class="nps-empty" style="height:120px">Sem dados de coordenadores para os filtros selecionados</div>
        <div v-for="(coord, i) in coordRanking" :key="coord.name" class="nps-rank-row">
          <div class="rank-pos">{{ i + 1 }}o</div>
          <div class="rank-name">{{ coord.name }}</div>
          <div class="rank-bar-track"><div class="rank-bar" :class="coord.nps >= 0 ? 'rank-bar-positive' : 'rank-bar-negative'" :style="{ width: rankBarWidth(coord.nps) + '%' }"></div></div>
          <div class="rank-nps" :class="npsColorClass(coord.nps)">{{ coord.nps >= 0 ? '+' : '' }}{{ coord.nps.toFixed(1) }}</div>
          <div class="rank-detail">
            <span class="rank-stat">{{ coord.total }} resp.</span>
            <span class="rank-stat nps-color-prom">{{ coord.promoters }}P</span>
            <span class="rank-stat nps-color-neut">{{ coord.neutrals }}N</span>
            <span class="rank-stat nps-color-detr">{{ coord.detractors }}D</span>
            <span class="rank-stat">LT {{ coord.avgLt.toFixed(1) }}m</span>
          </div>
        </div>
      </div>
    </div>

    <!-- NPS por Dimensão -->
    <div class="table-section">
      <div class="table-header">
        <h3 class="table-title">NPS por Dimensão</h3>
        <div class="nps-chart-controls">
          <div class="toggle-with-title">
            <span class="toggle-title">Eixo principal</span>
            <VToggleGroup v-model="dimAxis" :options="dimAxisFilteredOptions" />
          </div>
          <template v-if="dimChartType === 'table'">
            <div class="toggle-with-title">
              <span class="toggle-title">Subcategoria</span>
              <VToggleGroup v-model="dimSubAxis" :options="dimSubAxisOptions" />
            </div>
          </template>
          <div v-if="dimChartType !== 'table'" class="toggle-with-title">
            <span class="toggle-title">Métrica</span>
            <VToggleGroup v-model="dimMetric" :options="dimMetricOptions" />
          </div>
          <div class="periodo-toggle-group">
            <button class="periodo-toggle-btn" :class="{ active: dimChartType === 'bar' }" @click="dimChartType = 'bar'" title="Gráfico">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="6" width="3" height="7" rx="1" fill="currentColor"/><rect x="5.5" y="3" width="3" height="10" rx="1" fill="currentColor"/><rect x="10" y="1" width="3" height="12" rx="1" fill="currentColor"/></svg>
            </button>
            <button class="periodo-toggle-btn" :class="{ active: dimChartType === 'table' }" @click="dimChartType = 'table'" title="Tabela">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="2" rx="0.5" fill="currentColor"/><rect x="1" y="5" width="12" height="2" rx="0.5" fill="currentColor"/><rect x="1" y="9" width="12" height="2" rx="0.5" fill="currentColor"/></svg>
            </button>
          </div>
          <button
            v-if="dimChartType === 'table'"
            class="mom-toggle-btn"
            :class="{ active: dimMomEnabled }"
            @click="dimMomEnabled = !dimMomEnabled"
            :title="dimMomEnabled ? 'Comparando com: ' + compPeriodLabel : 'Ativar comparação mês a mês'"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 10L4 4L7 7L10 2L13 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
            MoM
          </button>
        </div>
      </div>
      <div class="card">
        <div v-if="loading" class="chart-loading"><span class="spinner spinner-lg"></span></div>
        <div v-else-if="!dimChartStats.length" class="nps-empty">Sem dados para esta dimensão</div>
        <div v-else-if="dimChartType === 'table'" class="dim-table-wrap">
          <div class="table-scroll">
          <table class="dim-table">
            <thead><tr>
              <th class="col-dim col-sticky">{{ dimAxis === 'tier' ? 'Tier' : dimAxis === 'coord' ? 'Coordenador' : 'Grupo LT' }}</th>
              <th class="col-center">Respostas</th>
              <th class="col-center">NPS</th>
              <th class="col-center">Promotores</th>
              <th class="col-center">Neutros</th>
              <th class="col-center">Detratores</th>
            </tr></thead>
            <tbody>
              <template v-for="row in dimChartStats" :key="row.key">
                <!-- Primary row -->
                <tr class="dim-primary-row" :class="{ 'has-subs': row.subs.length > 0 }">
                  <td class="dim-td-name col-sticky">
                    <button v-if="row.subs.length > 0" class="expand-btn" :class="{ expanded: expandedDims.has(row.key) }" @click="toggleDimExpand(row.key)">
                      <svg v-if="expandedDims.has(row.key)" width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="3.5" y1="7" x2="10.5" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                      <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="3.5" x2="7" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3.5" y1="7" x2="10.5" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </button>
                    <span v-else class="expand-placeholder"></span>
                    {{ dimAxis === 'lt' ? (LT_GROUPS_MAP[row.key] || row.key) : row.key }}
                  </td>
                  <td class="col-center">{{ row.total }}</td>
                  <td class="col-center" :class="row.nps > 0 ? 'nps-color-prom' : row.nps < 0 ? 'nps-color-detr' : ''">{{ row.nps >= 0 ? '+' : '' }}{{ row.nps.toFixed(1) }}</td>
                  <td class="col-center nps-color-prom">{{ row.pctP.toFixed(0) }}%</td>
                  <td class="col-center nps-color-neut">{{ row.pctN.toFixed(0) }}%</td>
                  <td class="col-center nps-color-detr">{{ row.pctD.toFixed(0) }}%</td>
                </tr>
                <!-- MoM delta (when subs NOT expanded) -->
                <tr v-if="dimMomEnabled && !(row.subs.length > 0 && expandedDims.has(row.key))" class="mom-row">
                  <td class="dim-td-name col-sticky mom-label"><span class="expand-placeholder"></span>Δ</td>
                  <td class="col-center mom-cell"><span :class="momCls(row.total - (dimCompMap[row.key]?.total ?? row.total), false)">{{ dimCompMap[row.key] ? fmtDelta(row.total - dimCompMap[row.key].total) : '—' }}</span></td>
                  <td class="col-center mom-cell"><span :class="momCls(row.nps - (dimCompMap[row.key]?.nps ?? row.nps), false)">{{ dimCompMap[row.key] ? fmtDeltaDec(row.nps - dimCompMap[row.key].nps) : '—' }}</span></td>
                  <td class="col-center mom-cell"><span :class="momCls(row.pctP - (dimCompMap[row.key]?.pctP ?? row.pctP), false)">{{ dimCompMap[row.key] ? fmtDeltaDec(row.pctP - dimCompMap[row.key].pctP) : '—' }}</span></td>
                  <td class="col-center mom-cell"><span>{{ dimCompMap[row.key] ? fmtDeltaDec(row.pctN - dimCompMap[row.key].pctN) : '—' }}</span></td>
                  <td class="col-center mom-cell"><span :class="momCls(row.pctD - (dimCompMap[row.key]?.pctD ?? row.pctD), true)">{{ dimCompMap[row.key] ? fmtDeltaDec(row.pctD - dimCompMap[row.key].pctD) : '—' }}</span></td>
                </tr>
                <!-- Subcategory rows + per-sub MoM (when expanded) -->
                <template v-if="row.subs.length > 0 && expandedDims.has(row.key)">
                  <template v-for="sub in row.subs" :key="sub.key">
                    <tr class="dim-sub-row">
                      <td class="dim-td-name col-sticky dim-sub-name"><span class="expand-placeholder"></span>{{ dimSubAxis === 'lt' ? (LT_GROUPS_MAP[sub.key] || sub.key) : sub.key }}</td>
                      <td class="col-center">{{ sub.total }}</td>
                      <td class="col-center" :class="sub.nps > 0 ? 'nps-color-prom' : sub.nps < 0 ? 'nps-color-detr' : ''">{{ sub.nps >= 0 ? '+' : '' }}{{ sub.nps.toFixed(1) }}</td>
                      <td class="col-center nps-color-prom">{{ sub.pctP.toFixed(0) }}%</td>
                      <td class="col-center nps-color-neut">{{ sub.pctN.toFixed(0) }}%</td>
                      <td class="col-center nps-color-detr">{{ sub.pctD.toFixed(0) }}%</td>
                    </tr>
                    <!-- Per-sub MoM delta -->
                    <tr v-if="dimMomEnabled" class="mom-row mom-row--sub">
                      <td class="dim-td-name col-sticky mom-label mom-label--sub"><span class="expand-placeholder"></span>Δ</td>
                      <td class="col-center mom-cell"><span :class="momCls(sub.total - (getSubComp(row.key, sub.key)?.total ?? sub.total), false)">{{ getSubComp(row.key, sub.key) ? fmtDelta(sub.total - getSubComp(row.key, sub.key).total) : '—' }}</span></td>
                      <td class="col-center mom-cell"><span :class="momCls(sub.nps - (getSubComp(row.key, sub.key)?.nps ?? sub.nps), false)">{{ getSubComp(row.key, sub.key) ? fmtDeltaDec(sub.nps - getSubComp(row.key, sub.key).nps) : '—' }}</span></td>
                      <td class="col-center mom-cell"><span :class="momCls(sub.pctP - (getSubComp(row.key, sub.key)?.pctP ?? sub.pctP), false)">{{ getSubComp(row.key, sub.key) ? fmtDeltaDec(sub.pctP - getSubComp(row.key, sub.key).pctP) : '—' }}</span></td>
                      <td class="col-center mom-cell"><span>{{ getSubComp(row.key, sub.key) ? fmtDeltaDec(sub.pctN - getSubComp(row.key, sub.key).pctN) : '—' }}</span></td>
                      <td class="col-center mom-cell"><span :class="momCls(sub.pctD - (getSubComp(row.key, sub.key)?.pctD ?? sub.pctD), true)">{{ getSubComp(row.key, sub.key) ? fmtDeltaDec(sub.pctD - getSubComp(row.key, sub.key).pctD) : '—' }}</span></td>
                    </tr>
                  </template>
                  <!-- Parent-level MoM delta after all subs -->
                  <tr v-if="dimMomEnabled" class="mom-row">
                    <td class="dim-td-name col-sticky mom-label"><span class="expand-placeholder"></span>Δ {{ dimAxis === 'lt' ? (LT_GROUPS_MAP[row.key] || row.key) : row.key }}</td>
                    <td class="col-center mom-cell"><span :class="momCls(row.total - (dimCompMap[row.key]?.total ?? row.total), false)">{{ dimCompMap[row.key] ? fmtDelta(row.total - dimCompMap[row.key].total) : '—' }}</span></td>
                    <td class="col-center mom-cell"><span :class="momCls(row.nps - (dimCompMap[row.key]?.nps ?? row.nps), false)">{{ dimCompMap[row.key] ? fmtDeltaDec(row.nps - dimCompMap[row.key].nps) : '—' }}</span></td>
                    <td class="col-center mom-cell"><span :class="momCls(row.pctP - (dimCompMap[row.key]?.pctP ?? row.pctP), false)">{{ dimCompMap[row.key] ? fmtDeltaDec(row.pctP - dimCompMap[row.key].pctP) : '—' }}</span></td>
                    <td class="col-center mom-cell"><span>{{ dimCompMap[row.key] ? fmtDeltaDec(row.pctN - dimCompMap[row.key].pctN) : '—' }}</span></td>
                    <td class="col-center mom-cell"><span :class="momCls(row.pctD - (dimCompMap[row.key]?.pctD ?? row.pctD), true)">{{ dimCompMap[row.key] ? fmtDeltaDec(row.pctD - dimCompMap[row.key].pctD) : '—' }}</span></td>
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
          </div>
        </div>
        <div v-else class="chart-wrapper"><canvas ref="dimChartRef"></canvas></div>
      </div>
    </div>

    <!-- Evolução Temporal -->
    <div class="table-section">
      <div class="table-header">
        <h3 class="table-title">Evolução Temporal</h3>
        <div class="nps-chart-controls">
          <div class="periodo-filter" ref="evoDropdownRef">
            <label class="periodo-filter-label">Métricas</label>
            <button class="periodo-filter-btn" @click="evoDropdownOpen = !evoDropdownOpen">
              <span class="periodo-filter-value">{{ evoMetricsSummary }}</span>
              <svg class="periodo-filter-arrow" :class="{ open: evoDropdownOpen }" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#666" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
            </button>
            <div v-if="evoDropdownOpen" class="periodo-dropdown">
              <button v-for="m in EVO_METRICS" :key="m.key" class="periodo-dropdown-item" :class="{ active: activeEvoMetrics.has(m.key) }" @click="toggleEvoMetric(m.key)">
                <span class="periodo-dropdown-dot" :style="{ backgroundColor: activeEvoMetrics.has(m.key) ? m.color : 'transparent', borderColor: m.color }"></span>
                {{ m.label }}
              </button>
            </div>
          </div>
          <VToggleGroup v-model="evoGranularity" :options="evoGranularityOptions" />
          <div class="periodo-toggle-group">
            <button class="periodo-toggle-btn" :class="{ active: evoChartType === 'bar' }" @click="evoChartType = 'bar'"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="6" width="3" height="7" rx="1" fill="currentColor"/><rect x="5.5" y="3" width="3" height="10" rx="1" fill="currentColor"/><rect x="10" y="1" width="3" height="12" rx="1" fill="currentColor"/></svg></button>
            <button class="periodo-toggle-btn" :class="{ active: evoChartType === 'line' }" @click="evoChartType = 'line'"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="1,12 4,7 7,9 10,3 13,5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="7" r="1.5" fill="currentColor"/><circle cx="7" cy="9" r="1.5" fill="currentColor"/><circle cx="10" cy="3" r="1.5" fill="currentColor"/></svg></button>
          </div>
          <button class="mom-toggle-btn" :class="{ active: showComparison }" @click="showComparison = !showComparison" :title="showComparison ? 'Desativar comparação' : 'Ativar comparação mês a mês'">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 10L4 4L7 7L10 2L13 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
            MoM
          </button>
        </div>
      </div>
      <div class="card">
        <div v-if="loading" class="chart-loading"><span class="spinner spinner-lg"></span></div>
        <div v-else class="chart-wrapper"><canvas v-if="evoData.labels.length" ref="evoChartRef"></canvas><div v-else class="nps-empty">Sem dados de evolução temporal</div></div>
      </div>
    </div>

    <!-- Tabela Detalhada -->
    <div class="table-section">
      <div class="table-header">
        <h3 class="table-title">Detalhamento NPS</h3>
        <span class="nps-table-count">{{ tableFilteredData.length }} registros</span>
      </div>
      <div class="nps-table-filters">
        <div class="search-wrapper">
          <i data-lucide="search" class="search-icon"></i>
          <input v-model="tableSearch" type="text" placeholder="Buscar por cliente..." class="search-input" />
        </div>
        <VSelect label="Tier" :options="tableTierSelectOptions" v-model="tableTier" all-value="todos" placeholder="Todos" />
        <VSelect label="Grupo LT" :options="tableLtGroupSelectOptions" v-model="tableLtGroup" all-value="todos" placeholder="Todos" />
        <VSelect label="Coordenador" :options="tableCoordSelectOptions" v-model="tableCoord" all-value="todos" placeholder="Todos" />
        <VSelect label="Classificação" :options="tableClassifSelectOptions" v-model="tableClassif" all-value="todos" placeholder="Todos" />
      </div>
      <div class="nps-table-scroll">
        <table class="nps-detail-table">
          <thead><tr>
            <th class="col-sticky col-sortable" @click="toggleSort('Cliente')">Cliente {{ sortIcon('Cliente') }}</th>
            <th class="col-sortable" @click="toggleSort('Nota')">Nota {{ sortIcon('Nota') }}</th>
            <th class="col-sortable" @click="toggleSort('Classif')">Classificação {{ sortIcon('Classif') }}</th>
            <th class="col-sortable" @click="toggleSort('Tier')">Tier {{ sortIcon('Tier') }}</th>
            <th class="col-sortable" @click="toggleSort('Coord')">Coordenador {{ sortIcon('Coord') }}</th>
            <th class="col-sortable" @click="toggleSort('LT')">LT {{ sortIcon('LT') }}</th>
            <th class="col-sortable" @click="toggleSort('Data')">Data {{ sortIcon('Data') }}</th>
          </tr></thead>
          <tbody>
            <tr v-for="row in paginatedData" :key="row.ID" :class="classify(row.Nota) === 'detractor' ? 'nps-row-detr' : ''">
              <td class="col-sticky col-cliente" :title="row.Cliente">{{ truncate(row.Cliente, 35) }}</td>
              <td class="col-center"><span class="nps-nota-badge" :class="notaBadgeClass(row.Nota)">{{ row.Nota }}</span></td>
              <td class="col-center" :class="classifClass(row.Nota)">{{ classifLabel(row.Nota) }}</td>
              <td class="col-center">{{ row.Tier }}</td>
              <td class="col-center">{{ !row.coordenador || row.coordenador === '-' ? 'Sem coord.' : row.coordenador }}</td>
              <td class="col-center">{{ row.LT }} {{ row.LT === 1 ? 'mês' : 'meses' }}</td>
              <td class="col-center">{{ formatDataDisplay(row.Data) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="tableFilteredData.length > pageSize" class="nps-table-footer">
        <button class="nps-show-more" @click="showAllRows = !showAllRows">{{ showAllRows ? 'Mostrar menos' : `Mostrar todos (${tableFilteredData.length})` }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import VToggleGroup from '../../../components/ui/VToggleGroup.vue'
import VSelect from '../../../components/ui/VSelect.vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  comparisonData: { type: Array, default: () => [] },
  compPeriodLabel: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  selectedTier: { type: String, default: 'todos' },
  selectedCoord: { type: String, default: 'todos' },
  selectedLtGroup: { type: String, default: 'todos' },
  selectedCategoria: { type: String, default: 'todos' },
  selectedTipo: { type: String, default: 'todos' },
  selectedModelo: { type: String, default: 'todos' },
})

const TIER_ORDER = ['Enterprise', 'Large', 'Medium', 'Small', 'Tiny', 'Non-ICP', 'Sem preenchimento']
const LT_GROUPS = [
  { key: '0-3', label: '0 a 3 meses', min: 0, max: 3 },
  { key: '3-6', label: '3 a 6 meses', min: 3, max: 6 },
  { key: '6-9', label: '6 a 9 meses', min: 6, max: 9 },
  { key: '9-12', label: '9 a 12 meses', min: 9, max: 12 },
  { key: '12+', label: '12+ meses', min: 12, max: Infinity },
]
const LT_GROUPS_MAP = Object.fromEntries(LT_GROUPS.map(g => [g.key, g.label]))
const MES_LABEL = { '01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun','07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez' }
const DIA_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const EVO_METRICS = [
  { key: 'nps', label: 'NPS Score', color: '#22c55e' },
  { key: 'promoters', label: '% Promotores', color: '#4ade80' },
  { key: 'detractors', label: '% Detratores', color: '#ef4444' },
  { key: 'total', label: 'Total Respostas', color: '#f59e0b' },
  { key: 'lt', label: 'LT Médio', color: '#a855f7' },
]

function parseDataToDate(d) {
  if (!d) return null
  // "2026-03-10 0:00:00" (ISO-like) or "21/08/2025" (BR)
  if (d.includes('-')) return new Date(d.split(' ')[0])
  const [dd,mm,yy] = d.split('/'); return new Date(+yy, +mm-1, +dd)
}
function parseDataSortKey(d) {
  if (!d) return 0
  if (d.includes('-')) { const p = d.split(' ')[0].replace(/-/g, ''); return parseInt(p) }
  const [dd,mm,yy] = d.split('/'); return parseInt(`${yy}${mm}${dd}`)
}
function formatDataDisplay(d) {
  if (!d) return '-'
  const dt = parseDataToDate(d)
  if (!dt || isNaN(dt)) return d
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
}
function parseDataToMonth(d) {
  if (!d) return null
  if (d.includes('-')) { const p = d.split(' ')[0].split('-'); return `${p[0]}-${p[1]}` }
  const parts = d.split('/'); if (parts.length === 3) return `${parts[2]}-${parts[1]}`; return null
}
function getWeekKey(d) { const t = new Date(d.getTime()); t.setDate(t.getDate()+3-((t.getDay()+6)%7)); const j = new Date(t.getFullYear(),0,4); const w = 1+Math.round(((t-j)/86400000-3+((j.getDay()+6)%7))/7); return `${t.getFullYear()}-S${String(Math.max(1,w)).padStart(2,'0')}` }
function getLtGroup(lt) { if (lt == null) return null; for (const g of LT_GROUPS) if (lt >= g.min && lt < g.max) return g.key; return '12+' }
function classify(n) { return n >= 9 ? 'promoter' : n >= 7 ? 'neutral' : 'detractor' }
function calcNps(recs) {
  if (!recs.length) return { total:0, promoters:0, neutrals:0, detractors:0, pctP:0, pctN:0, pctD:0, score:0 }
  let p=0,n=0,d=0; for (const r of recs) { const c=classify(r.Nota); if(c==='promoter')p++; else if(c==='neutral')n++; else d++ }
  const t=recs.length; return { total:t, promoters:p, neutrals:n, detractors:d, pctP:(p/t)*100, pctN:(n/t)*100, pctD:(d/t)*100, score:((p-d)/t)*100 }
}

const showBreakdown = ref(false)

// NPS Score tooltip (hover abre, click fixa)
const npsTooltipOpen = ref(false)
const npsTooltipPinned = ref(false)
const npsScoreCardRef = ref(null)
const npsTooltipPos = ref({})

function openNpsTooltip(e) {
  if (npsTooltipPinned.value) return
  const x = Math.max(8, Math.min(e.clientX - 40, window.innerWidth - 350))
  const y = e.clientY + 16
  npsTooltipPos.value = { position: 'fixed', top: y + 'px', left: x + 'px', zIndex: 9999 }
  npsTooltipOpen.value = true
}
function hoverLeaveNpsTooltip() {
  if (npsTooltipPinned.value) return
  npsTooltipOpen.value = false
}
function pinNpsTooltip() {
  if (npsTooltipPinned.value) { npsTooltipPinned.value = false; npsTooltipOpen.value = false; return }
  npsTooltipPinned.value = true
}
function closeNpsTooltipOutside() {
  if (npsTooltipPinned.value) { npsTooltipPinned.value = false; npsTooltipOpen.value = false }
}

function applyFilters(rows) {
  if (props.selectedTier !== 'todos') rows = rows.filter(r => r.Tier === props.selectedTier)
  if (props.selectedCoord !== 'todos') rows = rows.filter(r => r.coordenador === props.selectedCoord)
  if (props.selectedLtGroup !== 'todos') { const g = LT_GROUPS.find(x => x.key === props.selectedLtGroup); if (g) rows = rows.filter(r => typeof r.LT === 'number' && r.LT >= g.min && r.LT < g.max) }
  if (props.selectedCategoria !== 'todos') rows = rows.filter(r => (r.Categoria || r.categoria) === props.selectedCategoria)
  if (props.selectedTipo !== 'todos') rows = rows.filter(r => (r.Tipo || r.tipo) === props.selectedTipo)
  if (props.selectedModelo !== 'todos') rows = rows.filter(r => (r['Modelo de Vendas'] || r.Modelo_de_Vendas || r.modelo_de_vendas) === props.selectedModelo)
  return rows
}

const filteredData = computed(() => applyFilters(props.data))

const filteredCompData = computed(() => applyFilters(props.comparisonData))

const stats = computed(() => calcNps(filteredData.value))
const npsScore = computed(() => stats.value.score)
const npsScoreClass = computed(() => { const s = npsScore.value; return s > 50 ? 'nps-border-green' : s > 0 ? 'nps-border-amber' : 'nps-border-red' })
const avgNota = computed(() => {
  const rows = filteredData.value
  if (!rows.length) return 0
  return rows.reduce((sum, r) => sum + (r.Nota ?? 0), 0) / rows.length
})

const coordRanking = computed(() => {
  const map = {}
  for (const r of filteredData.value) { const nm = (!r.coordenador || r.coordenador === '-') ? 'Sem coordenador' : r.coordenador; if (!map[nm]) map[nm] = { name:nm, records:[], lts:[] }; map[nm].records.push(r); if (typeof r.LT === 'number') map[nm].lts.push(r.LT) }
  return Object.values(map).map(c => { const s = calcNps(c.records); return { name:c.name, nps:s.score, total:s.total, promoters:s.promoters, neutrals:s.neutrals, detractors:s.detractors, avgLt: c.lts.length ? c.lts.reduce((a,b)=>a+b,0)/c.lts.length : 0 } }).sort((a,b) => b.nps - a.nps)
})

// ── Dimension chart ─────────────────────────────────────────────────────────
const ALL_DIM_AXES = [{ value:'tier', label:'Tier' },{ value:'coord', label:'Coordenador' },{ value:'lt', label:'Grupo LT' }]
const dimAxis = ref('tier')
const dimSubAxis = ref('coord')
const dimMomEnabled = ref(false)
const expandedDims = reactive(new Set())

const dimAxisFilteredOptions = computed(() => {
  if (dimChartType.value !== 'table') return ALL_DIM_AXES
  return ALL_DIM_AXES.filter(x => x.value !== dimSubAxis.value)
})
const dimSubAxisOptions = computed(() => ALL_DIM_AXES.filter(x => x.value !== dimAxis.value))

watch(dimAxis, () => {
  if (dimSubAxis.value === dimAxis.value) {
    const valid = dimSubAxisOptions.value
    dimSubAxis.value = valid.length ? valid[0].value : 'coord'
  }
  expandedDims.clear()
})
watch(dimSubAxis, () => {
  if (dimAxis.value === dimSubAxis.value) {
    const valid = dimAxisFilteredOptions.value
    dimAxis.value = valid.length ? valid[0].value : 'tier'
  }
  expandedDims.clear()
})

function toggleDimExpand(key) { expandedDims.has(key) ? expandedDims.delete(key) : expandedDims.add(key) }

const dimMetric = ref('nps')
const dimMetricOptions = [{ value:'nps', label:'NPS Score' },{ value:'dist', label:'Distribuição' }]
const dimChartType = ref('bar')

watch(dimChartType, (val) => {
  if (val !== 'table') { dimMomEnabled.value = false }
})

function getDimKey(r, axis) {
  if (axis === 'tier') return r.Tier || 'Sem preenchimento'
  if (axis === 'coord') return (!r.coordenador || r.coordenador === '-') ? 'Sem coordenador' : r.coordenador
  return getLtGroup(r.LT) || 'N/A'
}
function getDimOrder(axis) {
  if (axis === 'tier') return TIER_ORDER
  if (axis === 'lt') return LT_GROUPS.map(g => g.key)
  return null
}
function sortByOrder(entries, order) {
  if (order) entries.sort((a, b) => { const ia = order.indexOf(a.key), ib = order.indexOf(b.key); return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) })
  else entries.sort((a, b) => b.nps - a.nps)
}

const dimChartStats = computed(() => {
  const map = {}
  for (const r of filteredData.value) {
    const key = getDimKey(r, dimAxis.value)
    if (!map[key]) map[key] = { key, records: [] }
    map[key].records.push(r)
  }
  const order = getDimOrder(dimAxis.value)
  const entries = Object.values(map).map(c => {
    const s = calcNps(c.records)
    const entry = { key: c.key, nps: s.score, total: s.total, pctP: s.pctP, pctN: s.pctN, pctD: s.pctD, subs: [] }
    if (dimChartType.value === 'table') {
      const subMap = {}
      for (const r of c.records) {
        const sk = getDimKey(r, dimSubAxis.value)
        if (!subMap[sk]) subMap[sk] = { key: sk, records: [] }
        subMap[sk].records.push(r)
      }
      const subOrder = getDimOrder(dimSubAxis.value)
      entry.subs = Object.values(subMap).map(sc => { const ss = calcNps(sc.records); return { key: sc.key, nps: ss.score, total: ss.total, pctP: ss.pctP, pctN: ss.pctN, pctD: ss.pctD } })
      sortByOrder(entry.subs, subOrder)
    }
    return entry
  })
  sortByOrder(entries, order)
  return entries
})

// MoM comparison map for dimension table
const dimCompMap = computed(() => {
  if (!filteredCompData.value.length) return {}
  const map = {}
  for (const r of filteredCompData.value) {
    const key = getDimKey(r, dimAxis.value)
    if (!map[key]) map[key] = []
    map[key].push(r)
  }
  const result = {}
  for (const [key, records] of Object.entries(map)) {
    const s = calcNps(records)
    result[key] = { nps: s.score, total: s.total, pctP: s.pctP, pctN: s.pctN, pctD: s.pctD }
  }
  return result
})

// MoM comparison map for subcategories (nested: primaryKey -> subKey -> stats)
const dimCompSubMap = computed(() => {
  if (!filteredCompData.value.length) return {}
  const map = {}
  for (const r of filteredCompData.value) {
    const pk = getDimKey(r, dimAxis.value)
    const sk = getDimKey(r, dimSubAxis.value)
    if (!map[pk]) map[pk] = {}
    if (!map[pk][sk]) map[pk][sk] = []
    map[pk][sk].push(r)
  }
  const result = {}
  for (const [pk, subs] of Object.entries(map)) {
    result[pk] = {}
    for (const [sk, records] of Object.entries(subs)) {
      const s = calcNps(records)
      result[pk][sk] = { nps: s.score, total: s.total, pctP: s.pctP, pctN: s.pctN, pctD: s.pctD }
    }
  }
  return result
})
function getSubComp(pk, sk) { return dimCompSubMap.value[pk]?.[sk] }

function fmtDelta(d) { return d > 0 ? `+${d}` : d < 0 ? String(d) : '—' }
function fmtDeltaDec(d) { return d > 0 ? `+${d.toFixed(1)}` : d < 0 ? d.toFixed(1) : '—' }
function momCls(d, invert) { if (d === 0) return ''; return (invert ? d < 0 : d > 0) ? 'mom-up' : 'mom-down' }

// ── Evolution chart ─────────────────────────────────────────────────────────
const evoGranularity = ref('mes')
const evoGranularityOptions = [{ value:'data', label:'Data' },{ value:'dia_semana', label:'Dia' },{ value:'semana', label:'Semana' },{ value:'mes', label:'Mês' },{ value:'ano', label:'Ano' }]
const evoChartType = ref('line')
const showComparison = ref(false)
const activeEvoMetrics = reactive(new Set(['nps']))
const evoDropdownOpen = ref(false)
const evoDropdownRef = ref(null)
function toggleEvoMetric(k) { if (activeEvoMetrics.has(k)) { if (activeEvoMetrics.size>1) activeEvoMetrics.delete(k) } else activeEvoMetrics.add(k) }
const evoMetricsSummary = computed(() => { const a=EVO_METRICS.filter(m=>activeEvoMetrics.has(m.key)); if(a.length===EVO_METRICS.length) return 'Todas'; if(a.length<=2) return a.map(m=>m.label).join(', '); return `${a.length} selecionadas` })
function handleClickOutside(e) { if (evoDropdownRef.value && !evoDropdownRef.value.contains(e.target)) evoDropdownOpen.value = false }

const evoData = computed(() => {
  const map = {}
  for (const r of filteredData.value) {
    let key, sortKey; const date = parseDataToDate(r.Data); const mesKey = parseDataToMonth(r.Data)
    if (evoGranularity.value==='data') { if(!r.Data) continue; key=r.Data; sortKey=parseDataSortKey(r.Data) }
    else if (evoGranularity.value==='dia_semana') { if(!date) continue; const dow=date.getDay(); key=DIA_SEMANA[dow]; sortKey=dow }
    else if (evoGranularity.value==='semana') { if(!date) continue; key=getWeekKey(date); sortKey=key }
    else if (evoGranularity.value==='ano') { if(!mesKey) continue; key=mesKey.split('-')[0]; sortKey=key }
    else { if(!mesKey) continue; key=mesKey; sortKey=mesKey }
    if (!map[key]) map[key]={ records:[], lts:[], sortKey }; map[key].records.push(r); if (typeof r.LT==='number') map[key].lts.push(r.LT)
  }
  const sorted = Object.entries(map).sort((a,b) => { const sa=a[1].sortKey, sb=b[1].sortKey; return sa<sb?-1:sa>sb?1:0 })
  const labels = sorted.map(([k]) => { if (evoGranularity.value==='mes') { const [y,m]=k.split('-'); return `${MES_LABEL[m]} ${y.slice(2)}` } if (evoGranularity.value==='data') { return formatDataDisplay(k) } return k })
  const data = sorted.map(([,v]) => { const s=calcNps(v.records); return { nps:s.score, promoters:s.pctP, detractors:s.pctD, total:s.total, lt:v.lts.length?v.lts.reduce((a,b)=>a+b,0)/v.lts.length:0 } })
  let compData = null
  if (showComparison.value && data.length > 1) { const half = Math.ceil(data.length/2); compData = data.map((_,i) => i >= half ? data[i-half] : null) }
  return { labels, data, compData }
})

// ── Table filters (local to detail table) ──────────────────────────────────
const tableSearch = ref('')
const tableTier = ref('todos')
const tableCoord = ref('todos')
const tableLtGroup = ref('todos')
const tableClassif = ref('todos')

const tableTierOptions = computed(() => {
  const set = new Set()
  for (const r of filteredData.value) if (r.Tier) set.add(r.Tier)
  return TIER_ORDER.filter(t => set.has(t))
})
const tableCoordOptions = computed(() => {
  const set = new Set()
  for (const r of filteredData.value) {
    if (r.coordenador && r.coordenador !== '-') set.add(r.coordenador)
  }
  return [...set].sort()
})
const tableLtGroupOptions = LT_GROUPS
const tableClassifOptions = [
  { value: 'promoter', label: 'Promotor' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'detractor', label: 'Detrator' },
]

// Options no formato VSelect (com "Todos" no topo)
const TODOS_OPT = { value: 'todos', label: 'Todos' }
const tableTierSelectOptions = computed(() => [TODOS_OPT, ...tableTierOptions.value.map(v => ({ value: v, label: v }))])
const tableCoordSelectOptions = computed(() => [TODOS_OPT, ...tableCoordOptions.value.map(v => ({ value: v, label: v }))])
const tableLtGroupSelectOptions = [TODOS_OPT, ...tableLtGroupOptions.map(g => ({ value: g.key, label: g.label }))]
const tableClassifSelectOptions = [TODOS_OPT, ...tableClassifOptions]

const tableFilteredData = computed(() => {
  let rows = filteredData.value
  if (tableSearch.value) {
    const q = tableSearch.value.toLowerCase()
    rows = rows.filter(r => (r.Cliente || '').toLowerCase().includes(q))
  }
  if (tableTier.value !== 'todos') rows = rows.filter(r => r.Tier === tableTier.value)
  if (tableCoord.value !== 'todos') rows = rows.filter(r => r.coordenador === tableCoord.value)
  if (tableLtGroup.value !== 'todos') {
    const g = LT_GROUPS.find(x => x.key === tableLtGroup.value)
    if (g) rows = rows.filter(r => typeof r.LT === 'number' && r.LT >= g.min && r.LT < g.max)
  }
  if (tableClassif.value !== 'todos') rows = rows.filter(r => classify(r.Nota) === tableClassif.value)
  return rows
})

// ── Table sort ──────────────────────────────────────────────────────────────
const sortCol = ref('Nota'); const sortDir = ref('asc'); const showAllRows = ref(false); const pageSize = 30
function toggleSort(col) { if (sortCol.value===col) sortDir.value = sortDir.value==='asc'?'desc':'asc'; else { sortCol.value=col; sortDir.value = col==='Nota'?'asc':'desc' } }
function sortIcon(col) { if (sortCol.value!==col) return ''; return sortDir.value==='asc'?'▲':'▼' }
const sortedTableData = computed(() => {
  const rows = [...tableFilteredData.value]; const dir = sortDir.value==='asc'?1:-1; const col = sortCol.value
  rows.sort((a,b) => {
    if (col==='Cliente') return dir*(a.Cliente||'').localeCompare(b.Cliente||'')
    if (col==='Nota') return dir*((a.Nota??0)-(b.Nota??0))
    if (col==='Classif') { const o={detractor:0,neutral:1,promoter:2}; return dir*(o[classify(a.Nota)]-o[classify(b.Nota)]) }
    if (col==='Tier') return dir*(a.Tier||'').localeCompare(b.Tier||'')
    if (col==='Coord') return dir*(a.coordenador||'').localeCompare(b.coordenador||'')
    if (col==='LT') return dir*((a.LT??0)-(b.LT??0))
    if (col==='Data') return dir*(parseDataSortKey(a.Data)-parseDataSortKey(b.Data))
    return 0
  }); return rows
})
const paginatedData = computed(() => showAllRows.value ? sortedTableData.value : sortedTableData.value.slice(0, pageSize))

// ── Chart instances ─────────────────────────────────────────────────────────
const dimChartRef = ref(null); const evoChartRef = ref(null); let dimChartInstance = null; let evoChartInstance = null

function buildDimChart() {
  if (!dimChartRef.value||!window.Chart) return; if (dimChartInstance) { dimChartInstance.destroy(); dimChartInstance=null }; if (!dimChartStats.value.length) return
  const ctx=dimChartRef.value.getContext('2d'); const labels=dimChartStats.value.map(t=>dimAxis.value==='lt'?LT_GROUPS.find(g=>g.key===t.key)?.label||t.key:t.key); const isLine=dimChartType.value==='line'; let datasets=[]
  if (dimMetric.value==='nps') { const vals=dimChartStats.value.map(t=>t.nps); const cols=vals.map(v=>v>=0?'#22c55e':'#ef4444'); datasets=[{ label:'NPS Score', data:vals, backgroundColor:isLine?'transparent':cols, borderColor:isLine?'#22c55e':cols, borderWidth:isLine?2.5:0, borderRadius:isLine?0:4, tension:0.35, pointRadius:isLine?4:0, pointHoverRadius:isLine?6:0, pointBackgroundColor:cols, pointBorderColor:'#141414', pointBorderWidth:2 }] }
  else { datasets=[{ label:'Promotores', data:dimChartStats.value.map(t=>t.pctP), backgroundColor:'#22c55e', borderRadius:4, stack:'s' },{ label:'Neutros', data:dimChartStats.value.map(t=>t.pctN), backgroundColor:'#f59e0b', borderRadius:0, stack:'s' },{ label:'Detratores', data:dimChartStats.value.map(t=>t.pctD), backgroundColor:'#ef4444', borderRadius:4, stack:'s' }] }
  dimChartInstance = new window.Chart(ctx, { type:dimMetric.value==='dist'?'bar':(isLine?'line':'bar'), data:{labels,datasets}, options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, scales:{ x:{grid:{color:'rgba(255,255,255,0.03)',drawBorder:false},ticks:{color:'#666',font:{size:11,family:"'Ubuntu',sans-serif"}},stacked:dimMetric.value==='dist'}, y:{grid:{color:'rgba(255,255,255,0.03)',drawBorder:false},ticks:{color:'#666',font:{size:11},callback:v=>v.toFixed(0)},stacked:dimMetric.value==='dist',max:dimMetric.value==='dist'?100:undefined} }, plugins:{ datalabels:false, legend:{display:dimMetric.value==='dist',position:'bottom',labels:{color:'#999',font:{size:11,family:"'Ubuntu',sans-serif"},padding:16,usePointStyle:true}}, tooltip:{backgroundColor:'#141414',titleColor:'#fff',bodyColor:'#ccc',borderColor:'#333',borderWidth:1,padding:12,
              callbacks:{
                afterTitle:(items)=>{const i=items[0]?.dataIndex;if(i==null)return'';const s=dimChartStats.value[i];if(!s)return'';return `${s.total} respostas`},
                label:ctx=>{const v=ctx.parsed.y;return dimMetric.value==='nps'?` NPS: ${v>=0?'+':''}${v.toFixed(1)}`:` ${ctx.dataset.label}: ${v.toFixed(1)}%`},
                afterBody:(items)=>{const i=items[0]?.dataIndex;if(i==null)return[];const s=dimChartStats.value[i];if(!s)return[];return[``,`  Promotores: ${s.pctP.toFixed(0)}%`,`  Neutros: ${s.pctN.toFixed(0)}%`,`  Detratores: ${s.pctD.toFixed(0)}%`]}
              }} } } })
}

function buildEvoChart() {
  if (!evoChartRef.value||!window.Chart) return; if (evoChartInstance) { evoChartInstance.destroy(); evoChartInstance=null }; const ed=evoData.value; if (!ed.labels.length) return
  const ctx=evoChartRef.value.getContext('2d'); const isLine=evoChartType.value==='line'; const datasets=[]
  for (const m of EVO_METRICS) {
    if (!activeEvoMetrics.has(m.key)) continue
    const vals = ed.data.map(d=>d[m.key])
    // NPS: cor dinâmica por valor (verde >= 0, vermelho < 0) em bar mode
    const useNpsColors = m.key === 'nps' && !isLine
    const barBg = useNpsColors ? vals.map(v => v >= 0 ? '#22c55e' : '#ef4444') : m.color
    const barBorder = useNpsColors ? vals.map(v => v >= 0 ? '#22c55e' : '#ef4444') : m.color
    datasets.push({ label:m.label, data:vals, backgroundColor:isLine?'transparent':barBg, borderColor:isLine?m.color:barBorder, borderWidth:isLine?2.5:0, borderRadius:isLine?0:4, tension:0.35, pointRadius:isLine?4:0, pointHoverRadius:isLine?6:0, pointBackgroundColor:m.color, pointBorderColor:'#141414', pointBorderWidth:2, fill:false, order:1 })
    if (showComparison.value && ed.compData) { datasets.push({ label:`${m.label} (ant.)`, data:ed.compData.map(d=>d?d[m.key]:null), backgroundColor:isLine?'transparent':`${m.color}40`, borderColor:`${m.color}80`, borderWidth:isLine?1.5:0, borderDash:isLine?[5,4]:[], borderRadius:isLine?0:4, tension:0.35, pointRadius:isLine?3:0, pointBackgroundColor:`${m.color}80`, pointBorderColor:'#141414', pointBorderWidth:1, fill:false, order:2 }) }
  }
  evoChartInstance = new window.Chart(ctx, { type:isLine?'line':'bar', data:{labels:ed.labels,datasets}, options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, scales:{ x:{grid:{color:'rgba(255,255,255,0.03)',drawBorder:false},ticks:{color:'#666',font:{size:11,family:"'Ubuntu',sans-serif"},maxRotation:evoGranularity.value==='data'?45:0}}, y:{grid:{color:'rgba(255,255,255,0.03)',drawBorder:false},ticks:{color:'#666',font:{size:11}}} }, plugins:{ datalabels:false, legend:{display:true,position:'bottom',labels:{color:'#999',font:{size:11,family:"'Ubuntu',sans-serif"},padding:16,usePointStyle:true,filter:i=>!i.text.includes('(ant.)')}}, tooltip:{backgroundColor:'#141414',titleColor:'#fff',bodyColor:'#ccc',borderColor:'#333',borderWidth:1,padding:12,
              callbacks:{
                afterTitle:(items)=>{const i=items[0]?.dataIndex;if(i==null)return'';const d=ed.data[i];if(!d)return'';return `${d.total} respostas`},
                afterBody:(items)=>{const i=items[0]?.dataIndex;if(i==null)return[];const d=ed.data[i];if(!d)return[];const lines=[``,`  NPS: ${d.nps>=0?'+':''}${d.nps.toFixed(1)}`,`  Promotores: ${d.promoters.toFixed(0)}%`,`  Detratores: ${d.detractors.toFixed(0)}%`];if(d.lt>0)lines.push(`  LT Médio: ${d.lt.toFixed(1)}m`);return lines}
              }} } } })
}

watch([filteredData, dimAxis, dimSubAxis, dimMetric, dimChartType], () => { nextTick(() => buildDimChart()) })
watch([filteredData, evoChartType, evoGranularity, showComparison, activeEvoMetrics], () => { nextTick(() => buildEvoChart()) }, { deep: true })
onMounted(() => { document.addEventListener('click', handleClickOutside); document.addEventListener('click', closeNpsTooltipOutside); nextTick(() => { buildDimChart(); buildEvoChart() }) })
onBeforeUnmount(() => { document.removeEventListener('click', handleClickOutside); document.removeEventListener('click', closeNpsTooltipOutside); if (dimChartInstance) dimChartInstance.destroy(); if (evoChartInstance) evoChartInstance.destroy() })

const npsColorClass = (nps) => nps > 50 ? 'nps-color-prom' : nps > 0 ? 'nps-color-neut' : 'nps-color-detr'
const rankBarWidth = (nps) => Math.max(5, ((nps + 100) / 200) * 100)
const classifLabel = (n) => n >= 9 ? 'Promotor' : n >= 7 ? 'Neutro' : 'Detrator'
const classifClass = (n) => n >= 9 ? 'nps-color-prom' : n >= 7 ? 'nps-color-neut' : 'nps-color-detr'
const notaBadgeClass = (n) => n >= 9 ? 'badge-prom' : n >= 7 ? 'badge-neut' : 'badge-detr'
const truncate = (s, l) => s && s.length > l ? s.substring(0, l) + '...' : s
</script>

<style scoped>
.nps-section { margin-top: 16px; overflow: visible; }
.table-section { background: #141414; border: 1px solid #222; border-radius: 6px; overflow: hidden; max-width: 100%; margin-bottom: 16px; }
.table-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; gap: 8px; }
.table-title { font-size: 15px; font-weight: 600; color: #fff; margin: 0; }
.nps-overview { display: flex; gap: 16px; align-items: stretch; margin-bottom: 16px; flex-wrap: wrap; overflow: visible; }
.nps-overview-loading { height: 100px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.nps-kpi-group { display: flex; align-items: stretch; gap: 0; position: relative; overflow: visible; }
.nps-score-card { background: #141414; border: 1px solid #222; border-radius: 6px 0 0 6px; padding: 14px 18px; min-width: 120px; text-align: center; border-left: 3px solid #666; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.nps-border-green { border-left-color: #22c55e; }
.nps-border-amber { border-left-color: #f59e0b; }
.nps-border-red { border-left-color: #ef4444; }
.nps-score-label { font-size: 11px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 4px; }
.nps-score-hint { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 50%; border: 1px solid #444; color: #555; font-size: 9px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
.nps-score-hint:hover { border-color: #888; color: #ccc; background: rgba(255,255,255,0.05); }
.nps-tooltip-title { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 12px; text-align: center; }
.nps-tooltip-formula { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.nps-tooltip-tag { display: inline-flex; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.nps-tooltip-tag--prom { background: rgba(34,197,94,0.15); color: #22c55e; }
.nps-tooltip-tag--detr { background: rgba(239,68,68,0.15); color: #ef4444; }
.nps-tooltip-op { color: #555; font-size: 14px; font-weight: 700; }
.nps-tooltip-result { font-size: 18px; font-weight: 700; }
.nps-tooltip-result.nps-border-green { color: #22c55e; }
.nps-tooltip-result.nps-border-amber { color: #f59e0b; }
.nps-tooltip-result.nps-border-red { color: #ef4444; }
.nps-tooltip-scale { position: relative; margin-bottom: 14px; padding-top: 4px; }
.nps-tooltip-scale-bar { display: flex; height: 6px; border-radius: 3px; overflow: hidden; }
.nps-tooltip-scale-seg { position: relative; }
.nps-tooltip-scale-seg span { position: absolute; bottom: -16px; font-size: 9px; color: #555; font-weight: 500; }
.nps-tooltip-scale--detr { background: #ef4444; } .nps-tooltip-scale--detr span { left: 0; }
.nps-tooltip-scale--neut { background: #f59e0b; } .nps-tooltip-scale--neut span { left: 50%; transform: translateX(-50%); }
.nps-tooltip-scale--prom { background: #22c55e; } .nps-tooltip-scale--prom span { right: 0; }
.nps-tooltip-marker { position: absolute; top: 0; width: 3px; height: 14px; background: #fff; border-radius: 2px; transform: translateX(-50%); box-shadow: 0 0 4px rgba(255,255,255,0.4); }
.nps-tooltip-ranges { display: flex; flex-direction: column; gap: 4px; padding-top: 6px; }
.nps-tooltip-ranges span { font-size: 11px; color: #777; display: flex; align-items: center; gap: 6px; }
.nps-score-value { font-size: 32px; font-weight: 700; color: #fff; line-height: 1.1; }
.nps-score-total { font-size: 11px; color: #777; margin-top: 4px; }
.nps-score-formula { font-size: 9px; color: #555; margin-top: 4px; letter-spacing: 0.3px; }
.nps-avg-card { background: #141414; border: 1px solid #222; border-left: none; border-radius: 0; padding: 14px 16px; text-align: center; display: flex; flex-direction: column; justify-content: center; min-width: 80px; }
.nps-avg-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600; }
.nps-avg-value { font-size: 24px; font-weight: 700; color: #fff; line-height: 1.1; }
.nps-avg-fade-enter-active, .nps-avg-fade-leave-active { transition: all 0.2s ease; overflow: hidden; }
.nps-avg-fade-enter-from, .nps-avg-fade-leave-to { opacity: 0; max-width: 0; padding: 0; min-width: 0; }
.nps-expand-btn { width: 26px; background: #1a1a1a; border: 1px solid #222; border-left: none; border-radius: 0 6px 6px 0; color: #555; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.nps-expand-btn:hover { color: #fff; background: #222; }
.nps-dist-wrapper { flex: 1; min-width: 200px; display: flex; flex-direction: column; justify-content: center; }
.nps-dist-bar { display: flex; height: 32px; border-radius: 4px; overflow: hidden; }
.nps-dist-seg { display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #fff; transition: width 0.3s ease; min-width: 0; }
.nps-seg-prom { background: #22c55e; } .nps-seg-neut { background: #f59e0b; } .nps-seg-detr { background: #ef4444; }
.nps-dist-legend { display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap; }
.nps-legend-item { font-size: 11px; color: #888; display: flex; align-items: center; gap: 4px; }
.nps-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.nps-dot-prom { background: #22c55e; } .nps-dot-neut { background: #f59e0b; } .nps-dot-detr { background: #ef4444; }
.nps-mini-cards { display: flex; gap: 0; }
.nps-mini-card { background: #141414; border: 1px solid #222; border-left: none; border-radius: 0; padding: 10px 12px; text-align: center; min-width: 65px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.nps-mini-card:last-child { border-radius: 0 6px 6px 0; }
.nps-mini-pct { font-size: 10px; color: #666; margin-top: 2px; }
.nps-mini-val { font-size: 18px; font-weight: 700; }
.nps-mini-label { font-size: 11px; color: #ccc; text-transform: uppercase; margin-top: 2px; font-weight: 600; letter-spacing: 0.3px; }
.nps-expand-enter-active, .nps-expand-leave-active { transition: all 0.25s ease; overflow: hidden; }
.nps-expand-enter-from, .nps-expand-leave-to { opacity: 0; max-width: 0; padding: 0; gap: 0; }
.nps-color-prom { color: #22c55e; } .nps-color-neut { color: #f59e0b; } .nps-color-detr { color: #ef4444; }
.nps-ranking { padding: 16px; }
.nps-rank-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.nps-rank-row:last-child { border-bottom: none; }
.rank-pos { font-size: 14px; font-weight: 700; color: #555; min-width: 28px; }
.rank-name { font-size: 13px; color: #ccc; min-width: 140px; }
.rank-bar-track { flex: 1; height: 20px; background: #1a1a1a; border-radius: 4px; overflow: hidden; }
.rank-bar { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
.rank-bar-positive { background: #22c55e; } .rank-bar-negative { background: #ef4444; }
.rank-nps { font-size: 14px; font-weight: 700; min-width: 50px; text-align: right; }
.rank-detail { display: flex; gap: 8px; font-size: 11px; color: #666; }
.rank-stat { white-space: nowrap; }
.nps-chart-controls { display: flex; align-items: flex-end; gap: 8px; flex-wrap: wrap; }
.periodo-filter { display: flex; align-items: center; gap: 8px; background: #1a1a1a; border: 1px solid #222; border-radius: 6px; padding: 8px 14px; position: relative; }
.periodo-filter-label { font-size: 12px; color: #666; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
.periodo-filter-btn { display: flex; align-items: center; gap: 8px; background: transparent; border: none; color: #ccc; font-size: 13px; font-weight: 500; font-family: inherit; cursor: pointer; padding: 0; }
.periodo-filter-value { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.periodo-filter-arrow { flex-shrink: 0; transition: transform 0.2s ease; }
.periodo-filter-arrow.open { transform: rotate(180deg); }
.periodo-dropdown { position: absolute; top: calc(100% + 6px); left: 0; min-width: 200px; background: #141414; border: 1px solid #2a2a2a; border-radius: 6px; padding: 4px; z-index: 50; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
.periodo-dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: none; background: transparent; color: #888; font-size: 13px; font-weight: 500; font-family: inherit; cursor: pointer; border-radius: 4px; transition: all 0.15s ease; text-transform: uppercase; letter-spacing: 0.3px; }
.periodo-dropdown-item:hover { background: #1a1a1a; color: #fff; }
.periodo-dropdown-item.active { color: #fff; font-weight: 600; }
.periodo-dropdown-dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid; flex-shrink: 0; }
.periodo-toggle-group { display: inline-flex; gap: 0; background: #1a1a1a; border-radius: 4px; padding: 3px; }
.periodo-toggle-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 28px; border: none; background: transparent; color: #888; border-radius: 3px; cursor: pointer; transition: all 0.15s ease; }
.periodo-toggle-btn:hover { color: #ccc; } .periodo-toggle-btn.active { background: #2a2a2a; color: #fff; }
/* ── MoM toggle button (reused across sections) ─────────────────────────── */
.mom-toggle-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; color: #666; background: #1a1a1a; border: 1px solid #333; border-radius: 4px; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; font-family: inherit; }
.mom-toggle-btn:hover { color: #999; border-color: #444; }
.mom-toggle-btn.active { color: #ff0000; border-color: #ff0000; background: rgba(255, 0, 0, 0.08); }
/* ── Toggle with title ──────────────────────────────────────────────────── */
.toggle-with-title { display: flex; flex-direction: column; gap: 3px; }
.toggle-title { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600; padding-left: 4px; }

.card { background: #141414; }

/* ── Dimension table ────────────────────────────────────────────────────── */
.dim-table-wrap { padding: 0; }
.dim-table-wrap .table-scroll { overflow-x: auto; }
.dim-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dim-table th { background: #1a1a1a; color: #666; font-size: 11px; text-transform: uppercase; padding: 10px 14px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); white-space: nowrap; }
.dim-table td { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #ccc; }
.dim-table tbody tr:hover { background: rgba(255,255,255,0.02); }
.dim-td-name { font-weight: 500; color: #fff; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
.col-dim { text-align: left; min-width: 160px; }

/* ── Expand button (GTM Motion style) ───────────────────────────────────── */
.expand-btn { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; padding: 0; border: none; background: transparent; color: #555; cursor: pointer; transition: color 0.15s ease; flex-shrink: 0; border-radius: 3px; }
.expand-btn:hover { color: #ccc; background: rgba(255,255,255,0.05); }
.expand-btn.expanded { color: #999; }
.expand-placeholder { display: inline-block; width: 22px; flex-shrink: 0; }

/* ── Primary / Sub / MoM rows ───────────────────────────────────────────── */
.dim-primary-row { font-weight: 500; }
.dim-primary-row.has-subs { cursor: default; }
.dim-primary-row:hover { background: #1a1a1a; }
.dim-sub-row { background: #111 !important; }
.dim-sub-row:hover { background: #161616 !important; }
.dim-sub-row td { padding: 7px 14px; font-size: 12px; }
.dim-sub-row .dim-td-name { font-weight: 400; color: #aaa; }
.dim-sub-row td.col-sticky { background: #111 !important; }
.dim-sub-row:hover td.col-sticky { background: #161616 !important; }
.dim-sub-name { padding-left: 8px; }

/* MoM delta row (parent-level) */
.mom-row { background: #131313 !important; border-bottom: 1px solid rgba(255,255,255,0.03); }
.mom-row td.col-sticky { background: #131313 !important; }
.mom-row td { padding: 2px 14px 5px; font-size: 11px; color: #555; }
.mom-label { font-weight: 500; font-size: 10px !important; letter-spacing: 0.5px; color: #444 !important; }
.mom-cell { font-size: 11px; font-weight: 500; }
.mom-up { color: #22c55e; font-weight: 600; }
.mom-down { color: #ef4444; font-weight: 600; }

/* Sub-level MoM delta row — same background as sub-row */
.mom-row.mom-row--sub { background: #111 !important; border-bottom: 1px solid rgba(255,255,255,0.03); }
.mom-row.mom-row--sub td.col-sticky { background: #111 !important; }
.mom-row--sub td { padding: 0 14px 5px; font-size: 10px; }
.mom-row--sub .mom-up, .mom-row--sub .mom-down { font-weight: 500; }
.mom-row--sub td { border-top: none; }
.mom-label--sub { font-size: 9px !important; color: #3a3a3a !important; }
.dim-sub-row:has(+ .mom-row--sub) { border-bottom: none; }
.dim-sub-row:has(+ .mom-row--sub) td { border-bottom: none; }
.chart-wrapper { position: relative; width: 100%; min-height: 300px; padding: 16px; }
.chart-loading { display: flex; align-items: center; justify-content: center; min-height: 300px; }
.nps-empty { display: flex; align-items: center; justify-content: center; min-height: 120px; color: #555; font-size: 14px; }
.spinner { width: 18px; height: 18px; border: 2px solid #333; border-top-color: #ff0000; border-radius: 50%; animation: nps-spin 0.8s linear infinite; }
.spinner-lg { width: 28px; height: 28px; border-width: 3px; }
@keyframes nps-spin { to { transform: rotate(360deg); } }
.nps-table-count { font-size: 12px; color: #666; }
.nps-table-filters { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.nps-table-filters .search-wrapper { position: relative; flex: 1; min-width: 180px; max-width: 280px; }
.nps-table-filters .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: #555; stroke-width: 2; pointer-events: none; }
.nps-table-filters .search-input { width: 100%; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 4px; color: #ccc; font-size: 12px; font-family: inherit; padding: 6px 10px 6px 32px; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
.nps-table-filters .search-input::placeholder { color: #444; }
.nps-table-filters .search-input:focus { border-color: #444; }
.nps-table-filters .filter-group { display: flex; align-items: center; gap: 6px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 4px; padding: 5px 10px; }
.nps-table-filters .filter-label { font-size: 10px; color: #555; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
.nps-table-filters .filter-select { background: transparent; border: none; color: #ccc; font-size: 12px; font-weight: 500; font-family: inherit; cursor: pointer; outline: none; padding: 3px 16px 3px 2px; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 2px center; }
.nps-table-filters .filter-select option { background: #1a1a1a; color: #ccc; font-family: 'Ubuntu', sans-serif; font-size: 12px; }
.nps-table-scroll { overflow-x: auto; max-height: 500px; overflow-y: auto; }
.nps-detail-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.nps-detail-table thead { position: sticky; top: 0; z-index: 2; }
.nps-detail-table th { background: #1a1a1a; color: #666; font-size: 11px; text-transform: uppercase; padding: 10px 12px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); white-space: nowrap; user-select: none; }
.col-sortable { cursor: pointer; transition: color 0.15s; } .col-sortable:hover { color: #ccc; }
.nps-detail-table td { padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #ccc; }
.nps-detail-table tbody tr:hover { background: rgba(255,255,255,0.02); }
.col-sticky { position: sticky; left: 0; background: #141414; z-index: 1; text-align: left !important; }
.col-cliente { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-center { text-align: center; }
.nps-row-detr { background: rgba(239,68,68,0.03); }
.nps-nota-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; font-weight: 700; font-size: 13px; }
.badge-prom { background: rgba(34,197,94,0.15); color: #22c55e; } .badge-neut { background: rgba(245,158,11,0.15); color: #f59e0b; } .badge-detr { background: rgba(239,68,68,0.15); color: #ef4444; }
.nps-table-footer { padding: 12px 16px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); }
.nps-show-more { background: transparent; border: 1px solid #333; color: #888; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-family: inherit; transition: all 0.15s ease; }
.nps-show-more:hover { color: #fff; border-color: #555; }
@media (max-width: 900px) { .nps-overview { flex-direction: column; } .nps-mini-cards { flex-wrap: wrap; } .rank-detail { display: none; } .nps-chart-controls { flex-wrap: wrap; gap: 6px; } }
@media (max-width: 600px) { .nps-rank-row { flex-wrap: wrap; } .rank-bar-track { min-width: 100%; order: 99; } }
</style>

<style>
/* ── NPS Score Tooltip (unscoped — teleported to body) ──────────────────── */
.nps-tooltip { width: 330px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 18px; box-shadow: 0 12px 32px rgba(0,0,0,0.6); font-family: 'Ubuntu', 'Segoe UI', sans-serif; animation: nps-tt-in 0.15s ease; pointer-events: none; }
.nps-tooltip--pinned { pointer-events: auto; border-color: #333; box-shadow: 0 16px 48px rgba(0,0,0,0.8); }
@keyframes nps-tt-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.nps-tooltip-close { position: absolute; top: 8px; right: 10px; background: none; border: none; color: #555; font-size: 18px; cursor: pointer; padding: 0; line-height: 1; }
.nps-tooltip-close:hover { color: #fff; }
.nps-tooltip-title { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 14px; }
.nps-tooltip-formula { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.nps-tooltip-tag { display: inline-flex; padding: 5px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.nps-tooltip-tag--prom { background: rgba(34,197,94,0.15); color: #22c55e; }
.nps-tooltip-tag--detr { background: rgba(239,68,68,0.15); color: #ef4444; }
.nps-tooltip-op { color: #555; font-size: 16px; font-weight: 700; }
.nps-tooltip-result { font-size: 20px; font-weight: 700; }
.nps-tooltip-result.nps-border-green { color: #22c55e; }
.nps-tooltip-result.nps-border-amber { color: #f59e0b; }
.nps-tooltip-result.nps-border-red { color: #ef4444; }
.nps-tooltip-scale { position: relative; margin-bottom: 18px; padding-top: 4px; }
.nps-tooltip-scale-bar { display: flex; height: 6px; border-radius: 3px; overflow: hidden; }
.nps-tooltip-scale-seg { position: relative; }
.nps-tooltip-scale-seg span { position: absolute; bottom: -16px; font-size: 9px; color: #555; font-weight: 500; }
.nps-tooltip-scale--detr { background: #ef4444; } .nps-tooltip-scale--detr span { left: 0; }
.nps-tooltip-scale--neut { background: #f59e0b; } .nps-tooltip-scale--neut span { left: 50%; transform: translateX(-50%); }
.nps-tooltip-scale--prom { background: #22c55e; } .nps-tooltip-scale--prom span { right: 0; }
.nps-tooltip-marker { position: absolute; top: 0; width: 3px; height: 14px; background: #fff; border-radius: 2px; transform: translateX(-50%); box-shadow: 0 0 6px rgba(255,255,255,0.5); }
.nps-tooltip-ranges { display: flex; flex-direction: column; gap: 5px; }
.nps-tooltip-ranges span { font-size: 11px; color: #777; display: flex; align-items: center; gap: 6px; }
.nps-tooltip-ranges .nps-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.nps-tooltip-ranges .nps-dot-prom { background: #22c55e; }
.nps-tooltip-ranges .nps-dot-neut { background: #f59e0b; }
.nps-tooltip-ranges .nps-dot-detr { background: #ef4444; }
</style>

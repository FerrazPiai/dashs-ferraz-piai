<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="main-header">
      <div class="header-title">
        <h1 class="main-title">Financeiro</h1>
        <span class="title-sep">|</span>
        <h2 class="main-subtitle">Fechamento por Squads</h2>
      </div>
      <div class="main-actions">
        <span v-if="lastUpdateTime" class="last-update">Última atualização: {{ lastUpdateTime }}</span>
        <VToggleGroup v-model="periodMode" :options="periodModeOptions" />
        <div v-if="periodMode === 'mes'" class="period-range">
          <select class="month-select" v-model="mesInicial">
            <option v-for="m in mesesDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <span class="period-sep">até</span>
          <select class="month-select" v-model="mesFinal">
            <option v-for="m in mesesFinaisDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div v-else class="period-range">
          <select class="month-select" v-model="selectedQuarter">
            <option v-for="q in quartersDisponiveis" :key="q.value" :value="q.value">{{ q.label }}</option>
          </select>
        </div>
        <VRefreshButton :loading="loading || refreshing" @click="handleRefresh" />
      </div>
    </div>

    <!-- Filtros + Toggles de KPI em uma unica linha -->
    <div class="filters-bar">
      <div class="filter-group">
        <label class="filter-label">Squad</label>
        <select class="filter-select" v-model="selectedSquad">
          <option value="__all__">Consolidado</option>
          <option v-for="s in squadsDisponiveis" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <label class="filter-checkbox">
        <input type="checkbox" v-model="showVarMM" />
        <span>Var M/M</span>
      </label>
      <label class="filter-checkbox">
        <input type="checkbox" v-model="showPctTotal" />
        <span>% do Total</span>
      </label>

      <!-- Toggles de KPI (alinhados a direita) -->
      <div v-if="hasData" class="kpi-toggles-group">
        <div class="kpi-value-toggle">
          <button
            class="toggle-btn"
            :class="{ active: kpiValueMode === 'abbrev' }"
            @click="kpiValueMode = 'abbrev'"
            title="Valores abreviados (ex: R$ 1,0M)"
            aria-label="Valores abreviados"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <text x="1" y="12" font-size="13" font-weight="700" fill="currentColor">K</text>
            </svg>
          </button>
          <button
            class="toggle-btn"
            :class="{ active: kpiValueMode === 'full' }"
            @click="kpiValueMode = 'full'"
            title="Valores completos (ex: R$ 1.045.904,01)"
            aria-label="Valores completos"
          >
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
              <text x="1" y="12" font-size="13" font-weight="700" fill="currentColor">0,0</text>
            </svg>
          </button>
        </div>
        <div class="kpi-layout-toggle">
          <button
            class="toggle-btn"
            :class="{ active: kpiLayout === 'compact' }"
            @click="kpiLayout = 'compact'"
            title="1 linha"
            aria-label="1 linha"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="0" y="5" width="14" height="4" rx="1" fill="currentColor"/>
            </svg>
          </button>
          <button
            class="toggle-btn"
            :class="{ active: kpiLayout === 'expanded' }"
            @click="kpiLayout = 'expanded'"
            title="2 linhas"
            aria-label="2 linhas"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="0" y="1" width="14" height="4" rx="1" fill="currentColor"/>
              <rect x="0" y="9" width="14" height="4" rx="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div class="legend-wrapper" @click.stop="legendOpen = !legendOpen">
          <button class="legend-btn" :class="{ active: legendOpen }" aria-label="Legenda de cores">
            <i data-lucide="info"></i>
          </button>
          <div v-if="!legendOpen" class="legend-tooltip">
            <div class="legend-title">Legenda de Cores</div>
            <div class="legend-item"><span class="legend-dot legend-dot--green"></span>Crescimento de receita</div>
            <div class="legend-item"><span class="legend-dot legend-dot--red"></span>Perda de receita</div>
            <div class="legend-item"><span class="legend-dot legend-dot--yellow"></span>Isenção (pausa)</div>
            <div class="legend-item"><span class="legend-dot legend-dot--orange"></span>Expansão outras origens</div>
          </div>
          <div v-if="legendOpen" class="legend-popup" @click.stop>
            <button class="legend-popup-close" @click="legendOpen = false" aria-label="Fechar">×</button>
            <div class="legend-section">
              <div class="legend-section-title">Cores nos KPIs</div>
              <div class="legend-item"><span class="legend-dot legend-dot--white"></span><span><strong>Branco</strong> — Receita total (referência)</span></div>
              <div class="legend-item"><span class="legend-dot legend-dot--green"></span><span><strong>Verde</strong> — NRR e Expansão (crescimento sobre base)</span></div>
              <div class="legend-item"><span class="legend-dot legend-dot--red"></span><span><strong>Vermelho</strong> — Revenue Churn e Churn Rate (perda efetiva)</span></div>
              <div class="legend-item"><span class="legend-dot legend-dot--yellow"></span><span><strong>Amarelo</strong> — Isenções (pausa contratual, não é churn)</span></div>
            </div>
            <div class="legend-divider"></div>
            <div class="legend-section">
              <div class="legend-section-title">Cores na Tabela Consolidado</div>
              <div class="legend-item"><span class="legend-dot legend-dot--green"></span><span><strong>Verde</strong> — Expansão</span></div>
              <div class="legend-item"><span class="legend-dot legend-dot--orange"></span><span><strong>Laranja</strong> — Expansão outras origens</span></div>
              <div class="legend-item"><span class="legend-dot legend-dot--red"></span><span><strong>Vermelho</strong> — Revenue Churn</span></div>
              <div class="legend-item"><span class="legend-dot legend-dot--yellow"></span><span><strong>Amarelo</strong> — Isenções</span></div>
            </div>
            <div class="legend-divider"></div>
            <div class="legend-section">
              <div class="legend-section-title">Variação M/M (Δ M/M)</div>
              <div class="legend-section-desc">Δ M/M compara o período selecionado com o período imediatamente anterior (mesma duração). Ative o toggle "Var M/M" no filtro para exibir nos cards.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scorecards: Resumo Executivo -->
    <div v-if="hasData" class="kpi-grid" :class="{ 'kpi-grid--compact': kpiLayout === 'compact' }">
      <FfsScorecard
        label="Receita Total"
        icon="wallet"
        iconColor="#fff"
        valueColor="#fff"
        borderColor="white"
        :value="totalReceita"
        :formatter="fmtBRLKpi"
        :fullFormatter="formatCurrency"
        :delta="deltaReceita"
        :showDelta="showVarMM"
        :loading="loading"
      />
      <FfsScorecard
        label="NRR %"
        icon="activity"
        iconColor="#4ade80"
        valueColor="#4ade80"
        borderColor="green"
        :value="nrrPctScorecard"
        :formatter="v => v === null ? '—' : fmtPctKpi(v)"
        :delta="deltaNrr"
        :showDelta="showVarMM"
        :loading="loading"
      />
      <FfsScorecard
        label="Expansão"
        icon="trending-up"
        iconColor="#22c55e"
        valueColor="#22c55e"
        borderColor="green"
        :value="totalExpansao"
        :formatter="fmtBRLKpi"
        :fullFormatter="formatCurrency"
        :delta="deltaExpansao"
        :showDelta="showVarMM"
        :loading="loading"
      />
      <FfsScorecard
        label="Revenue Churn"
        icon="trending-down"
        iconColor="#f87171"
        valueColor="#f87171"
        borderColor="red"
        :value="totalRevenueChurn"
        :formatter="fmtBRLKpi"
        :fullFormatter="formatCurrency"
        :delta="deltaChurn"
        :showDelta="showVarMM"
        :loading="loading"
      />
      <FfsScorecard
        label="Churn Rate"
        icon="percent"
        iconColor="#f87171"
        valueColor="#f87171"
        borderColor="red"
        :value="churnRate"
        :formatter="fmtPctKpiOrDash"
        :delta="deltaChurnRate"
        :showDelta="showVarMM"
        :loading="loading"
      />
      <FfsScorecard
        label="Isenções"
        icon="pause-circle"
        iconColor="#fbbf24"
        valueColor="#fbbf24"
        borderColor="yellow"
        :value="totalIsencoes"
        :formatter="fmtBRLKpi"
        :fullFormatter="formatCurrency"
        :delta="deltaIsencoes"
        :showDelta="showVarMM"
        :loading="loading"
      />
    </div>

    <!-- Error State -->
    <div v-if="error && !hasData" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && !hasData" class="skeleton-table">
      <div v-for="i in 8" :key="i" class="skeleton-row">
        <div v-for="j in 7" :key="j" class="skeleton-cell"></div>
      </div>
    </div>

    <!-- Tabela: linhas = categorias de receita, colunas = meses -->
    <template v-if="hasData">
      <div class="table-wrapper">
        <table class="fin-table">
          <thead>
            <tr>
              <th class="col-label">
                <span>{{ selectedSquad === '__all__' ? 'Consolidado' : selectedSquad }}</span>
                <span v-if="selectedSquad !== '__all__' && SQUAD_COORDINATORS[selectedSquad]" class="coordinator-label">Coordenador: {{ SQUAD_COORDINATORS[selectedSquad] }}</span>
              </th>
              <th v-for="mes in mesesVisiveis" :key="mes" class="col-month">{{ mes }}</th>
            </tr>
          </thead>
          <tbody>
            <!-- Grupo: Aquisição -->
            <tr class="row-group-summary" @click="toggleGroup('aquisicao')">
              <td class="col-label label-group">
                <span class="label-group-inner">
                  <svg class="group-chevron" :class="{ 'is-expanded': isExpanded('aquisicao') }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  Aquisição
                </span>
              </td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value val-group"
              >
                {{ fmtBRL(getGroupTotal(mes, FIELDS_AQUISICAO)) }}
                <div v-if="showVarMM && fmtVar(getVarMM(mes, FIELDS_AQUISICAO))" class="delta-line" :class="varClass(getVarMM(mes, FIELDS_AQUISICAO))">{{ fmtVar(getVarMM(mes, FIELDS_AQUISICAO)) }}</div>
                <div v-if="showPctTotal && getPctTotal(mes, FIELDS_AQUISICAO) !== null" class="delta-line delta-pct">{{ getPctTotal(mes, FIELDS_AQUISICAO).toFixed(1).replace('.', ',') }}%</div>
              </td>
            </tr>
            <template v-if="isExpanded('aquisicao')">
              <template v-for="field in FIELDS_AQUISICAO" :key="field.key">
                <tr class="row-detail row-detail--clickable" @click="toggleDetail(field.key)">
                  <td class="col-label col-label--detail">
                    <span class="detail-inner">
                      <svg class="detail-chevron" :class="{ 'is-expanded': isDetailExpanded(field.key) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      {{ field.label }}
                    </span>
                  </td>
                  <td
                    v-for="mes in mesesVisiveis"
                    :key="mes"
                    class="col-value col-value--detail"
                  >{{ fmtBRL(getVal(mes, field.key)) }}</td>
                </tr>
                <template v-if="isDetailExpanded(field.key)">
                  <tr
                    v-for="(client, ci) in getAllClients(field.key)"
                    :key="ci"
                    class="row-client"
                  >
                    <td class="col-label col-label--client" :title="client.descricao">
                      {{ client.cliente }}
                      <span v-if="selectedSquad === '__all__' && client.squads?.length" class="squad-tag">{{ client.squads.join(', ') }}</span>
                    </td>
                    <td
                      v-for="mes in mesesVisiveis"
                      :key="mes"
                      class="col-value col-value--client"
                    >
                      <template v-for="(c, j) in getClientRows(mes, field.key)" :key="j">
                        <span v-if="c.cliente === client.cliente">{{ fmtBRL(c.valor) }}</span>
                      </template>
                    </td>
                  </tr>
                </template>
              </template>
            </template>

            <!-- Grupo: Renovação -->
            <tr class="row-group-summary" @click="toggleGroup('renovacao')">
              <td class="col-label label-group">
                <span class="label-group-inner">
                  <svg class="group-chevron" :class="{ 'is-expanded': isExpanded('renovacao') }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  Renovação
                </span>
              </td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value val-group"
              >
                {{ fmtBRL(getGroupTotal(mes, FIELDS_RENOVACAO)) }}
                <div v-if="showVarMM && fmtVar(getVarMM(mes, FIELDS_RENOVACAO))" class="delta-line" :class="varClass(getVarMM(mes, FIELDS_RENOVACAO))">{{ fmtVar(getVarMM(mes, FIELDS_RENOVACAO)) }}</div>
                <div v-if="showPctTotal && getPctTotal(mes, FIELDS_RENOVACAO) !== null" class="delta-line delta-pct">{{ getPctTotal(mes, FIELDS_RENOVACAO).toFixed(1).replace('.', ',') }}%</div>
              </td>
            </tr>
            <template v-if="isExpanded('renovacao')">
              <template v-for="field in FIELDS_RENOVACAO" :key="field.key">
                <tr class="row-detail row-detail--clickable" @click="toggleDetail(field.key)">
                  <td class="col-label col-label--detail">
                    <span class="detail-inner">
                      <svg class="detail-chevron" :class="{ 'is-expanded': isDetailExpanded(field.key) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      {{ field.label }}
                    </span>
                  </td>
                  <td
                    v-for="mes in mesesVisiveis"
                    :key="mes"
                    class="col-value col-value--detail"
                  >{{ fmtBRL(getVal(mes, field.key)) }}</td>
                </tr>
                <template v-if="isDetailExpanded(field.key)">
                  <tr
                    v-for="(client, ci) in getAllClients(field.key)"
                    :key="ci"
                    class="row-client"
                  >
                    <td class="col-label col-label--client" :title="client.descricao">
                      {{ client.cliente }}
                      <span v-if="selectedSquad === '__all__' && client.squads?.length" class="squad-tag">{{ client.squads.join(', ') }}</span>
                    </td>
                    <td
                      v-for="mes in mesesVisiveis"
                      :key="mes"
                      class="col-value col-value--client"
                    >
                      <template v-for="(c, j) in getClientRows(mes, field.key)" :key="j">
                        <span v-if="c.cliente === client.cliente">{{ fmtBRL(c.valor) }}</span>
                      </template>
                    </td>
                  </tr>
                </template>
              </template>
            </template>

            <!-- Grupo: Expansão -->
            <tr class="row-group-summary" @click="toggleGroup('expansao')">
              <td class="col-label label-group label-group--expansion">
                <span class="label-group-inner">
                  <svg class="group-chevron" :class="{ 'is-expanded': isExpanded('expansao') }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  Expansão
                </span>
              </td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value val-group val-expansion"
              >
                {{ fmtBRL(getGroupTotal(mes, FIELDS_EXPANSAO)) }}
                <div v-if="showVarMM && fmtVar(getVarMM(mes, FIELDS_EXPANSAO))" class="delta-line" :class="varClass(getVarMM(mes, FIELDS_EXPANSAO))">{{ fmtVar(getVarMM(mes, FIELDS_EXPANSAO)) }}</div>
                <div v-if="showPctTotal && getPctTotal(mes, FIELDS_EXPANSAO) !== null" class="delta-line delta-pct">{{ getPctTotal(mes, FIELDS_EXPANSAO).toFixed(1).replace('.', ',') }}%</div>
              </td>
            </tr>
            <template v-if="isExpanded('expansao')">
              <template v-for="field in FIELDS_EXPANSAO" :key="field.key">
                <tr class="row-detail row-detail--clickable" @click="toggleDetail(field.key)">
                  <td class="col-label col-label--detail">
                    <span class="detail-inner">
                      <svg class="detail-chevron" :class="{ 'is-expanded': isDetailExpanded(field.key) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      {{ field.label }}
                    </span>
                  </td>
                  <td
                    v-for="mes in mesesVisiveis"
                    :key="mes"
                    class="col-value col-value--detail val-expansion"
                  >{{ fmtBRL(getVal(mes, field.key)) }}</td>
                </tr>
                <template v-if="isDetailExpanded(field.key)">
                  <tr
                    v-for="(client, ci) in getAllClients(field.key)"
                    :key="ci"
                    class="row-client"
                  >
                    <td class="col-label col-label--client" :title="client.descricao">
                      {{ client.cliente }}
                      <span v-if="selectedSquad === '__all__' && client.squads?.length" class="squad-tag">{{ client.squads.join(', ') }}</span>
                    </td>
                    <td
                      v-for="mes in mesesVisiveis"
                      :key="mes"
                      class="col-value col-value--client"
                    >
                      <template v-for="(c, j) in getClientRows(mes, field.key)" :key="j">
                        <span v-if="c.cliente === client.cliente">{{ fmtBRL(c.valor) }}</span>
                      </template>
                    </td>
                  </tr>
                </template>
              </template>
            </template>

            <!-- Grupo: Expansão — Outras Origens (só na visão por squad) -->
            <template v-if="selectedSquad !== '__all__'">
              <tr class="row-group-summary" @click="toggleGroup('expansao-outras')">
                <td class="col-label label-group label-group--outras">
                  <span class="label-group-inner">
                    <svg class="group-chevron" :class="{ 'is-expanded': isExpanded('expansao-outras') }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    Expansão — Outras Origens
                  </span>
                </td>
                <td
                  v-for="mes in mesesVisiveis"
                  :key="mes"
                  class="col-value val-group val-expansion-outras"
                >
                  {{ fmtBRL(getGroupTotal(mes, FIELDS_EXPANSAO_OUTRAS)) }}
                  <div v-if="showVarMM && fmtVar(getVarMM(mes, FIELDS_EXPANSAO_OUTRAS))" class="delta-line" :class="varClass(getVarMM(mes, FIELDS_EXPANSAO_OUTRAS))">{{ fmtVar(getVarMM(mes, FIELDS_EXPANSAO_OUTRAS)) }}</div>
                  <div v-if="showPctTotal && getPctTotal(mes, FIELDS_EXPANSAO_OUTRAS) !== null" class="delta-line delta-pct">{{ getPctTotal(mes, FIELDS_EXPANSAO_OUTRAS).toFixed(1).replace('.', ',') }}%</div>
                </td>
              </tr>
              <template v-if="isExpanded('expansao-outras')">
                <template v-for="field in FIELDS_EXPANSAO_OUTRAS" :key="field.key">
                  <tr class="row-detail row-detail--clickable" @click="toggleDetail(field.key)">
                    <td class="col-label col-label--detail">
                      <svg class="detail-chevron" :class="{ 'is-expanded': isDetailExpanded(field.key) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      {{ field.label }}
                    </td>
                    <td
                      v-for="mes in mesesVisiveis"
                      :key="mes"
                      class="col-value col-value--detail"
                    >{{ fmtBRL(getVal(mes, field.key)) }}</td>
                  </tr>
                  <template v-if="isDetailExpanded(field.key)">
                    <tr
                      v-for="(client, ci) in getAllClients(field.key)"
                      :key="ci"
                      class="row-client"
                    >
                      <td class="col-label col-label--client" :title="client.descricao">
                      {{ client.cliente }}
                      <span v-if="selectedSquad === '__all__' && client.squads?.length" class="squad-tag">{{ client.squads.join(', ') }}</span>
                    </td>
                      <td
                        v-for="mes in mesesVisiveis"
                        :key="mes"
                        class="col-value col-value--client"
                      >
                        <template v-for="(c, j) in getClientRows(mes, field.key)" :key="j">
                          <span v-if="c.cliente === client.cliente">{{ fmtBRL(c.valor) }}</span>
                        </template>
                      </td>
                    </tr>
                  </template>
                </template>
              </template>
            </template>

            <!-- Grupo: Comissão -->
            <tr class="row-group-summary" @click="toggleGroup('comissao')">
              <td class="col-label label-group">
                <span class="label-group-inner">
                  <svg class="group-chevron" :class="{ 'is-expanded': isExpanded('comissao') }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  Comissão
                </span>
              </td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value val-group"
              >
                {{ fmtBRL(getGroupTotal(mes, FIELDS_COMISSAO)) }}
                <div v-if="showVarMM && fmtVar(getVarMM(mes, FIELDS_COMISSAO))" class="delta-line" :class="varClass(getVarMM(mes, FIELDS_COMISSAO))">{{ fmtVar(getVarMM(mes, FIELDS_COMISSAO)) }}</div>
                <div v-if="showPctTotal && getPctTotal(mes, FIELDS_COMISSAO) !== null" class="delta-line delta-pct">{{ getPctTotal(mes, FIELDS_COMISSAO).toFixed(1).replace('.', ',') }}%</div>
              </td>
            </tr>
            <template v-if="isExpanded('comissao')">
              <template v-for="field in FIELDS_COMISSAO" :key="field.key">
                <tr class="row-detail row-detail--clickable" @click="toggleDetail(field.key)">
                  <td class="col-label col-label--detail">
                    <span class="detail-inner">
                      <svg class="detail-chevron" :class="{ 'is-expanded': isDetailExpanded(field.key) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      {{ field.label }}
                    </span>
                  </td>
                  <td
                    v-for="mes in mesesVisiveis"
                    :key="mes"
                    class="col-value col-value--detail"
                  >{{ fmtBRL(getVal(mes, field.key)) }}</td>
                </tr>
                <template v-if="isDetailExpanded(field.key)">
                  <tr
                    v-for="(client, ci) in getAllClients(field.key)"
                    :key="ci"
                    class="row-client"
                  >
                    <td class="col-label col-label--client" :title="client.descricao">
                      {{ client.cliente }}
                      <span v-if="selectedSquad === '__all__' && client.squads?.length" class="squad-tag">{{ client.squads.join(', ') }}</span>
                    </td>
                    <td
                      v-for="mes in mesesVisiveis"
                      :key="mes"
                      class="col-value col-value--client"
                    >
                      <template v-for="(c, j) in getClientRows(mes, field.key)" :key="j">
                        <span v-if="c.cliente === client.cliente">{{ fmtBRL(c.valor) }}</span>
                      </template>
                    </td>
                  </tr>
                </template>
              </template>
            </template>

            <!-- Grupo: Revenue Churn -->
            <tr class="row-group-summary" @click="toggleGroup('churn')">
              <td class="col-label label-group label-group--churn">
                <span class="label-group-inner">
                  <svg class="group-chevron" :class="{ 'is-expanded': isExpanded('churn') }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  Revenue Churn
                </span>
              </td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value val-group val-churn-loss"
              >
                {{ fmtBRL(getGroupTotal(mes, FIELDS_CHURN_TOTAL)) }}
                <div v-if="showVarMM && fmtVar(getVarMM(mes, FIELDS_CHURN_TOTAL))" class="delta-line" :class="varClass(getVarMM(mes, FIELDS_CHURN_TOTAL))">{{ fmtVar(getVarMM(mes, FIELDS_CHURN_TOTAL)) }}</div>
                <div v-if="showPctTotal && getPctTotal(mes, FIELDS_CHURN_TOTAL) !== null" class="delta-line delta-pct">{{ getPctTotal(mes, FIELDS_CHURN_TOTAL).toFixed(1).replace('.', ',') }}%</div>
              </td>
            </tr>
            <template v-if="isExpanded('churn')">
              <template v-for="field in FIELDS_CHURN" :key="field.key">
                <tr class="row-detail row-detail--clickable" @click="toggleDetail(field.key)">
                  <td class="col-label col-label--detail">
                    <span class="detail-inner">
                      <svg class="detail-chevron" :class="{ 'is-expanded': isDetailExpanded(field.key) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      {{ field.label }}
                    </span>
                  </td>
                  <td
                    v-for="mes in mesesVisiveis"
                    :key="mes"
                    class="col-value col-value--detail"
                    :class="isChurnLossField(field.key) ? 'val-churn-loss' : 'val-churn-exempt'"
                  >{{ fmtBRL(getVal(mes, field.key)) }}</td>
                </tr>
                <template v-if="isDetailExpanded(field.key)">
                  <!-- Saber -->
                  <tr class="row-client row-detail--clickable" @click="toggleDetail(field.key + '-saber')">
                    <td class="col-label col-label--client">
                      <span class="detail-inner">
                        <svg class="detail-chevron" :class="{ 'is-expanded': isDetailExpanded(field.key + '-saber') }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        Saber
                      </span>
                    </td>
                    <td
                      v-for="mes in mesesVisiveis"
                      :key="mes"
                      class="col-value col-value--client"
                      :class="isChurnLossField(field.key) ? 'val-churn-loss' : 'val-churn-exempt'"
                    >{{ fmtChurnCategory(mes, field.key, 'saber') }}</td>
                  </tr>
                  <template v-if="isDetailExpanded(field.key + '-saber')">
                    <tr
                      v-for="(client, ci) in getAllClientsByChurnCategory(field.key, 'saber')"
                      :key="'saber-' + ci"
                      class="row-client"
                    >
                      <td class="col-label col-label--subclient" :title="client.descricao">
                        {{ client.cliente }}
                        <span v-if="selectedSquad === '__all__' && client.squads?.length" class="squad-tag">{{ client.squads.join(', ') }}</span>
                      </td>
                      <td
                        v-for="mes in mesesVisiveis"
                        :key="mes"
                        class="col-value col-value--client"
                        :class="isChurnLossField(field.key) ? 'val-churn-loss' : 'val-churn-exempt'"
                      >
                        <template v-for="(c, j) in getClientRowsByChurnCategory(mes, field.key, 'saber')" :key="j">
                          <span v-if="c.cliente === client.cliente">{{ fmtBRL(c.valor) }}</span>
                        </template>
                      </td>
                    </tr>
                  </template>

                  <!-- Ter -->
                  <tr class="row-client row-detail--clickable" @click="toggleDetail(field.key + '-ter')">
                    <td class="col-label col-label--client">
                      <span class="detail-inner">
                        <svg class="detail-chevron" :class="{ 'is-expanded': isDetailExpanded(field.key + '-ter') }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        Ter
                      </span>
                    </td>
                    <td
                      v-for="mes in mesesVisiveis"
                      :key="mes"
                      class="col-value col-value--client"
                      :class="isChurnLossField(field.key) ? 'val-churn-loss' : 'val-churn-exempt'"
                    >{{ fmtChurnCategory(mes, field.key, 'ter') }}</td>
                  </tr>
                  <template v-if="isDetailExpanded(field.key + '-ter')">
                    <tr
                      v-for="(client, ci) in getAllClientsByChurnCategory(field.key, 'ter')"
                      :key="'ter-' + ci"
                      class="row-client"
                    >
                      <td class="col-label col-label--subclient" :title="client.descricao">
                        {{ client.cliente }}
                        <span v-if="selectedSquad === '__all__' && client.squads?.length" class="squad-tag">{{ client.squads.join(', ') }}</span>
                      </td>
                      <td
                        v-for="mes in mesesVisiveis"
                        :key="mes"
                        class="col-value col-value--client"
                        :class="isChurnLossField(field.key) ? 'val-churn-loss' : 'val-churn-exempt'"
                      >
                        <template v-for="(c, j) in getClientRowsByChurnCategory(mes, field.key, 'ter')" :key="j">
                          <span v-if="c.cliente === client.cliente">{{ fmtBRL(c.valor) }}</span>
                        </template>
                      </td>
                    </tr>
                  </template>

                  <!-- Executar -->
                  <tr class="row-client row-detail--clickable" @click="toggleDetail(field.key + '-executar')">
                    <td class="col-label col-label--client">
                      <span class="detail-inner">
                        <svg class="detail-chevron" :class="{ 'is-expanded': isDetailExpanded(field.key + '-executar') }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        Executar
                      </span>
                    </td>
                    <td
                      v-for="mes in mesesVisiveis"
                      :key="mes"
                      class="col-value col-value--client"
                      :class="isChurnLossField(field.key) ? 'val-churn-loss' : 'val-churn-exempt'"
                    >{{ fmtChurnCategory(mes, field.key, 'executar') }}</td>
                  </tr>
                  <template v-if="isDetailExpanded(field.key + '-executar')">
                    <tr
                      v-for="(client, ci) in getAllClientsByChurnCategory(field.key, 'executar')"
                      :key="'executar-' + ci"
                      class="row-client"
                    >
                      <td class="col-label col-label--subclient" :title="client.descricao">
                        {{ client.cliente }}
                        <span v-if="selectedSquad === '__all__' && client.squads?.length" class="squad-tag">{{ client.squads.join(', ') }}</span>
                      </td>
                      <td
                        v-for="mes in mesesVisiveis"
                        :key="mes"
                        class="col-value col-value--client"
                        :class="isChurnLossField(field.key) ? 'val-churn-loss' : 'val-churn-exempt'"
                      >
                        <template v-for="(c, j) in getClientRowsByChurnCategory(mes, field.key, 'executar')" :key="j">
                          <span v-if="c.cliente === client.cliente">{{ fmtBRL(c.valor) }}</span>
                        </template>
                      </td>
                    </tr>
                  </template>
                </template>
              </template>
            </template>

            <!-- Revenue Churn % -->
            <tr class="row-metric">
              <td class="col-label label-metric">Revenue Churn %</td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value val-metric val-churn-loss"
              >{{ fmtChurnPct(getRevenueChurnPct(mes)) }}</td>
            </tr>

            <!-- NRR (R$) -->
            <tr class="row-metric">
              <td class="col-label label-metric">NRR</td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value val-metric"
              >{{ getNrrValue(mes) !== null ? fmtBRL(getNrrValue(mes)) : '—' }}</td>
            </tr>

            <!-- NRR % -->
            <tr class="row-metric">
              <td class="col-label label-metric">NRR %</td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value val-metric"
                :class="getNrrClass(mes)"
              >{{ fmtPct(getNrrPct(mes)) }}</td>
            </tr>

            <!-- Total -->
            <tr class="row-total">
              <td class="col-label label-bold">Total</td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value val-bold"
              >
                {{ fmtBRL(getVal(mes, 'total')) }}
                <div v-if="showVarMM && fmtVar(getVarMMSingle(mes, 'total'))" class="delta-line" :class="varClass(getVarMMSingle(mes, 'total'))">{{ fmtVar(getVarMMSingle(mes, 'total')) }}</div>
              </td>
            </tr>

            <!-- Grupo: Clientes -->
            <tr class="row-group-summary row-group-summary--clients" @click="toggleGroup('clientes')">
              <td class="col-label label-group">
                <span class="label-group-inner">
                  <svg class="group-chevron" :class="{ 'is-expanded': isExpanded('clientes') }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  Clientes
                </span>
              </td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value val-group col-meta"
              >
                {{ getClientSaldo(mes) || '—' }}
                <div v-if="showVarMM && fmtVar(getVarMMFn(mes, getClientSaldo))" class="delta-line" :class="varClass(getVarMMFn(mes, getClientSaldo))">{{ fmtVar(getVarMMFn(mes, getClientSaldo)) }}</div>
              </td>
            </tr>
            <template v-if="isExpanded('clientes')">
              <!-- Clientes Iniciais (Recorrentes) -->
              <tr class="row-detail">
                <td class="col-label col-label--detail">Clientes Iniciais</td>
                <td
                  v-for="mes in mesesVisiveis"
                  :key="mes"
                  class="col-value col-value--detail col-meta"
                >
                  {{ getVal(mes, 'Qtde recorrentes') ?? '—' }}
                  <div v-if="showVarMM && fmtVar(getVarMMSingle(mes, 'Qtde recorrentes'))" class="delta-line" :class="varClass(getVarMMSingle(mes, 'Qtde recorrentes'))">{{ fmtVar(getVarMMSingle(mes, 'Qtde recorrentes')) }}</div>
                  <div v-if="showPctTotal && getPctSaldo(mes, m => getVal(m, 'Qtde recorrentes'))" class="delta-line delta-pct">{{ getPctSaldo(mes, m => getVal(m, 'Qtde recorrentes')).toFixed(1).replace('.', ',') }}%</div>
                </td>
              </tr>

              <!-- Novos Clientes (com breakdown) -->
              <tr class="row-detail row-detail--clickable" @click="toggleDetail('clientes-novos')">
                <td class="col-label col-label--detail">
                  <span class="detail-inner">
                    <svg class="detail-chevron" :class="{ 'is-expanded': isDetailExpanded('clientes-novos') }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    Novos Clientes
                  </span>
                </td>
                <td
                  v-for="mes in mesesVisiveis"
                  :key="mes"
                  class="col-value col-value--detail col-meta val-expansion"
                >
                  {{ getVal(mes, 'Qtde novos') || '—' }}
                  <div v-if="showVarMM && fmtVar(getVarMMSingle(mes, 'Qtde novos'))" class="delta-line" :class="varClass(getVarMMSingle(mes, 'Qtde novos'))">{{ fmtVar(getVarMMSingle(mes, 'Qtde novos')) }}</div>
                  <div v-if="showPctTotal && getPctSaldo(mes, m => getVal(m, 'Qtde novos'))" class="delta-line delta-pct">{{ getPctSaldo(mes, m => getVal(m, 'Qtde novos')).toFixed(1).replace('.', ',') }}%</div>
                </td>
              </tr>
              <template v-if="isDetailExpanded('clientes-novos')">
                <tr class="row-client">
                  <td class="col-label col-label--client">Saber</td>
                  <td
                    v-for="mes in mesesVisiveis"
                    :key="mes"
                    class="col-value col-value--client col-meta"
                  >
                    {{ getVal(mes, 'Qtde novos saber') || '—' }}
                    <div v-if="showVarMM && fmtVar(getVarMMSingle(mes, 'Qtde novos saber'))" class="delta-line" :class="varClass(getVarMMSingle(mes, 'Qtde novos saber'))">{{ fmtVar(getVarMMSingle(mes, 'Qtde novos saber')) }}</div>
                  </td>
                </tr>
                <tr class="row-client">
                  <td class="col-label col-label--client">Ter</td>
                  <td
                    v-for="mes in mesesVisiveis"
                    :key="mes"
                    class="col-value col-value--client col-meta"
                  >
                    {{ getVal(mes, 'Qtde novos ter') || '—' }}
                    <div v-if="showVarMM && fmtVar(getVarMMSingle(mes, 'Qtde novos ter'))" class="delta-line" :class="varClass(getVarMMSingle(mes, 'Qtde novos ter'))">{{ fmtVar(getVarMMSingle(mes, 'Qtde novos ter')) }}</div>
                  </td>
                </tr>
                <tr class="row-client">
                  <td class="col-label col-label--client">Executar</td>
                  <td
                    v-for="mes in mesesVisiveis"
                    :key="mes"
                    class="col-value col-value--client col-meta"
                  >
                    {{ getVal(mes, 'Qtde novos executar') || '—' }}
                    <div v-if="showVarMM && fmtVar(getVarMMSingle(mes, 'Qtde novos executar'))" class="delta-line" :class="varClass(getVarMMSingle(mes, 'Qtde novos executar'))">{{ fmtVar(getVarMMSingle(mes, 'Qtde novos executar')) }}</div>
                  </td>
                </tr>
              </template>

              <!-- Clientes Perdidos (com breakdown) -->
              <tr class="row-detail row-detail--clickable" @click="toggleDetail('clientes-perdidos')">
                <td class="col-label col-label--detail">
                  <span class="detail-inner">
                    <svg class="detail-chevron" :class="{ 'is-expanded': isDetailExpanded('clientes-perdidos') }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    Clientes Perdidos
                  </span>
                </td>
                <td
                  v-for="mes in mesesVisiveis"
                  :key="mes"
                  class="col-value col-value--detail col-meta val-churn-loss"
                >
                  {{ getChurnCount(mes) || '—' }}
                  <div v-if="showVarMM && fmtVar(getVarMMFn(mes, getChurnCount))" class="delta-line" :class="varClass(getVarMMFn(mes, getChurnCount))">{{ fmtVar(getVarMMFn(mes, getChurnCount)) }}</div>
                  <div v-if="showPctTotal && getPctSaldo(mes, getChurnCount)" class="delta-line delta-pct">{{ getPctSaldo(mes, getChurnCount).toFixed(1).replace('.', ',') }}%</div>
                </td>
              </tr>
              <template v-if="isDetailExpanded('clientes-perdidos')">
                <tr class="row-client">
                  <td class="col-label col-label--client">Saber</td>
                  <td
                    v-for="mes in mesesVisiveis"
                    :key="mes"
                    class="col-value col-value--client col-meta"
                    :class="getChurnCountByCategory(mes).saber > 0 ? 'val-churn-loss' : ''"
                  >
                    {{ getChurnCountByCategory(mes).saber || '—' }}
                    <div v-if="showVarMM && fmtVar(getVarMMFn(mes, m => getChurnCountByCategory(m).saber))" class="delta-line" :class="varClass(getVarMMFn(mes, m => getChurnCountByCategory(m).saber))">{{ fmtVar(getVarMMFn(mes, m => getChurnCountByCategory(m).saber)) }}</div>
                  </td>
                </tr>
                <tr class="row-client">
                  <td class="col-label col-label--client">Ter</td>
                  <td
                    v-for="mes in mesesVisiveis"
                    :key="mes"
                    class="col-value col-value--client col-meta"
                    :class="getChurnCountByCategory(mes).ter > 0 ? 'val-churn-loss' : ''"
                  >
                    {{ getChurnCountByCategory(mes).ter || '—' }}
                    <div v-if="showVarMM && fmtVar(getVarMMFn(mes, m => getChurnCountByCategory(m).ter))" class="delta-line" :class="varClass(getVarMMFn(mes, m => getChurnCountByCategory(m).ter))">{{ fmtVar(getVarMMFn(mes, m => getChurnCountByCategory(m).ter)) }}</div>
                  </td>
                </tr>
                <tr class="row-client">
                  <td class="col-label col-label--client">Executar</td>
                  <td
                    v-for="mes in mesesVisiveis"
                    :key="mes"
                    class="col-value col-value--client col-meta"
                    :class="getChurnCountByCategory(mes).executar > 0 ? 'val-churn-loss' : ''"
                  >
                    {{ getChurnCountByCategory(mes).executar || '—' }}
                    <div v-if="showVarMM && fmtVar(getVarMMFn(mes, m => getChurnCountByCategory(m).executar))" class="delta-line" :class="varClass(getVarMMFn(mes, m => getChurnCountByCategory(m).executar))">{{ fmtVar(getVarMMFn(mes, m => getChurnCountByCategory(m).executar)) }}</div>
                  </td>
                </tr>
              </template>

              <!-- Churn % -->
              <tr class="row-detail">
                <td class="col-label col-label--detail">Churn %</td>
                <td
                  v-for="mes in mesesVisiveis"
                  :key="mes"
                  class="col-value col-value--detail col-meta"
                  :class="getChurnClientPct(mes) ? 'val-churn-loss' : ''"
                >{{ fmtChurnClientPct(mes) }}</td>
              </tr>

            </template>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Gráficos -->
    <div v-if="hasData" class="charts-section">
      <div class="charts-grid">
        <!-- NRR Evolution -->
        <VChartCard title="Evolução NRR %" :loading="loading">
          <NrrEvolutionChart
            :labels="chartMonths.map(shortMonth)"
            :datasets="nrrChartDatasets"
          />
        </VChartCard>

        <!-- Revenue Churn por Tipo -->
        <VChartCard title="Revenue Churn por Tipo" :loading="loading">
          <VBarChart
            :labels="chartMonths.map(shortMonth)"
            :datasets="churnChartDatasets"
            :stacked="true"
          />
        </VChartCard>
      </div>

      <!-- Ranking de Squads (só no consolidado) -->
      <div v-if="selectedSquad === '__all__'" class="charts-grid charts-grid--full">
        <VChartCard title="Ranking de Squads" :loading="loading">
          <template #actions>
            <VToggleGroup v-model="rankingMetric" :options="rankingMetricOptions" />
          </template>
          <VBarChart
            :labels="rankingData.labels"
            :datasets="rankingData.datasets"
            :horizontal="true"
            :datalabels="true"
          />
        </VChartCard>
      </div>
    </div>
  </div>

  <!-- Modal: Confirmação de atualização -->
  <VConfirmModal
    :visible="showConfirmModal"
    title="Atualizar dados"
    message="Deseja atualizar os dados do Fechamento Financeiro? A atualização pode levar alguns minutos."
    confirmText="Sim, atualizar"
    cancelText="Cancelar"
    type="warning"
    @confirm="confirmRefresh"
    @cancel="cancelRefresh"
  />

  <!-- Modal: Atualização já em andamento -->
  <VConfirmModal
    :visible="showUpdatingModal"
    title="Atualização em andamento"
    message="Já existe uma atualização dos dados em andamento. Aguarde a conclusão antes de solicitar uma nova atualização."
    confirmText="Entendido"
    type="info"
    @confirm="showUpdatingModal = false"
    @cancel="showUpdatingModal = false"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import VConfirmModal from '../../components/ui/VConfirmModal.vue'
import VToggleGroup from '../../components/ui/VToggleGroup.vue'
import VChartCard from '../../components/charts/VChartCard.vue'
import VBarChart from '../../components/charts/VBarChart.vue'
import NrrEvolutionChart from './components/NrrEvolutionChart.vue'
import FfsScorecard from './components/FfsScorecard.vue'
import { useDashboardData } from '../../composables/useDashboardData.js'
import { formatCurrency, formatCurrencyAbbrev } from '../../composables/useFormatters.js'
import { MOCK_DATA } from './mock-data.js'
import { processChurnData, aggregateByMonth as aggregateChurnByMonth } from './churn-engine.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DASHBOARD_ID = 'fechamento-financeiro-squads'

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

const QUARTER_MONTHS = {
  Q1: [1, 2, 3],
  Q2: [4, 5, 6],
  Q3: [7, 8, 9],
  Q4: [10, 11, 12]
}

const periodModeOptions = [
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'mes', label: 'Mensal' }
]

/** Categorias de receita agrupadas */
const FIELDS_AQUISICAO = [
  { key: '1.1.01 Aquisição | [Saber] BR', label: 'Saber BR' },
  { key: '1.1.02 Aquisição | [Ter] BR', label: 'Ter BR' },
  { key: '1.1.03 Aquisição | [Executar] BR', label: 'Executar BR' },
  { key: '1.1.04 Aquisição | [Potencializar] BR', label: 'Potencializar BR' }
]

const FIELDS_RENOVACAO = [
  { key: '1.2.01 Renovação | [Saber] BR', label: 'Saber BR' },
  { key: '1.2.03 Renovação | [Executar] BR', label: 'Executar BR' },
  { key: '1.2.07 Renovação | [Executar] USA', label: 'Executar USA' }
]

const FIELDS_EXPANSAO = [
  { key: '1.3.01 Expansão | [Saber] BR', label: 'Saber BR' },
  { key: '1.3.02 Expansão | [Ter] BR', label: 'Ter BR' },
  { key: '1.3.03 Expansão | [Executar] BR', label: 'Executar BR' }
]

const FIELDS_EXPANSAO_OUTRAS = [
  { key: '1.3.01 Expansão Outras Origens | [Saber] BR', label: 'Saber BR' },
  { key: '1.3.02 Expansão Outras Origens | [Ter] BR', label: 'Ter BR' },
  { key: '1.3.03 Expansão Outras Origens | [Executar] BR', label: 'Executar BR' }
]

const FIELDS_COMISSAO = [
  { key: '1.4.01 Comissão de Cliente (BV / Variável)', label: 'BV / Variável' },
  { key: '1.4.02 Comissão Stack Digital', label: 'Stack Digital' }
]

/** Revenue Churn — sublinhas do grupo */
const FIELDS_CHURN = [
  { key: '__churn', label: 'Cancelamento de Contrato' },
  { key: '__downsell', label: 'Downsell' },
  { key: '__isencao', label: 'Isenção' }
]

/** Mapeamento squad → coordenador (atualizar com nomes reais) */
const SQUAD_COORDINATORS = {
  'ASSEMBLE': '—',
  'GROWTH LAB': '—',
  'GROWTHX': '—',
  'SHARKS': '—',
  'V4 X': '—',
  '8 - ROI EAGLES': '—',
  '9 - BLACK SCOPE': '—',
  '10 - STARK': '—'
}

/** Apenas churn + downsell entram no total do grupo (isenção é temporária) */
const FIELDS_CHURN_TOTAL = [
  { key: '__churn', label: 'Churn' },
  { key: '__downsell', label: 'Downsell' }
]

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const selectedSquad = ref('__all__')
const periodMode = ref('trimestre')
const selectedQuarter = ref(null)
const mesInicial = ref(null)
const mesFinal = ref(null)
const lastUpdateTime = ref(null)
const expandedGroups = ref(new Set())
const expandedDetails = ref(new Set())
const showVarMM = ref(false)
const showPctTotal = ref(false)
const kpiLayout = ref('expanded')
const kpiValueMode = ref('full')
const legendOpen = ref(false)

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmtBRL(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(v)
}

/** Formatter dinamico para KPIs — alterna abreviado/completo conforme kpiValueMode */
const fmtBRLKpi = computed(() =>
  kpiValueMode.value === 'abbrev' ? formatCurrencyAbbrev : formatCurrency
)

/** Formatter de percentual para KPIs (sempre 1 casa decimal) */
function fmtPctKpi(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return `${v.toFixed(1).replace('.', ',')}%`
}

function fmtPctKpiOrDash(v) {
  if (v === null || v === undefined || isNaN(v) || v === 0) return '—'
  return `${v.toFixed(1).replace('.', ',')}%`
}

// ---------------------------------------------------------------------------
// Parse month string → sortable value
// ---------------------------------------------------------------------------

function parseMonthStr(mesAno) {
  if (!mesAno) return { month: 0, year: 0, sortKey: 0 }
  const parts = mesAno.split('/')
  const monthName = parts[0]?.toLowerCase().trim()
  const year = parseInt(parts[1], 10) || 0
  const month = MONTH_NAMES.indexOf(monthName) + 1
  return { month, year, sortKey: year * 100 + month }
}

/** Gera label "mês/ano" a partir de índice numérico */
function monthLabel(month, year) {
  return `${MONTH_NAMES[month - 1]}/${year}`
}

// ---------------------------------------------------------------------------
// Campos de expansão (usados na separação própria vs outras origens)
// ---------------------------------------------------------------------------

const EXPANSION_KEYS = [
  '1.3.01 Expansão | [Saber] BR',
  '1.3.02 Expansão | [Ter] BR',
  '1.3.03 Expansão | [Executar] BR'
]

const ACQUISITION_KEYS = [
  '1.1.01 Aquisição | [Saber] BR',
  '1.1.02 Aquisição | [Ter] BR',
  '1.1.03 Aquisição | [Executar] BR',
  '1.1.04 Aquisição | [Potencializar] BR'
]

const RENOVATION_KEYS = [
  '1.2.01 Renovação | [Saber] BR',
  '1.2.03 Renovação | [Executar] BR',
  '1.2.07 Renovação | [Executar] USA'
]

// ---------------------------------------------------------------------------
// Transformação: dados crus da API → agregado por Mes/Ano + Squad
// Separa expansão própria de expansão via monetização (outras origens)
// ---------------------------------------------------------------------------

/** Chaves de aquisição por categoria (para contagem de clientes novos) */
const ACQUISITION_SABER = '1.1.01 Aquisição | [Saber] BR'
const ACQUISITION_TER = '1.1.02 Aquisição | [Ter] BR'
const ACQUISITION_EXECUTAR = '1.1.03 Aquisição | [Executar] BR'
const ACQUISITION_POTENCIALIZAR = '1.1.04 Aquisição | [Potencializar] BR'

function transformApiData(rawRows) {
  const map = new Map()
  const clientSets = new Map()

  rawRows.forEach(r => {
    const key = r['Mes/Ano'] + '|' + r.Squad
    if (!map.has(key)) {
      map.set(key, {
        'Mes/Ano': r['Mes/Ano'],
        'Squad': r.Squad,
        '1.1.01 Aquisição | [Saber] BR': 0,
        '1.1.02 Aquisição | [Ter] BR': 0,
        '1.1.03 Aquisição | [Executar] BR': 0,
        '1.1.04 Aquisição | [Potencializar] BR': 0,
        '1.2.01 Renovação | [Saber] BR': 0,
        '1.2.03 Renovação | [Executar] BR': 0,
        '1.2.07 Renovação | [Executar] USA': 0,
        '1.3.01 Expansão | [Saber] BR': 0,
        '1.3.02 Expansão | [Ter] BR': 0,
        '1.3.03 Expansão | [Executar] BR': 0,
        '1.3.01 Expansão Outras Origens | [Saber] BR': 0,
        '1.3.02 Expansão Outras Origens | [Ter] BR': 0,
        '1.3.03 Expansão Outras Origens | [Executar] BR': 0,
        '1.4.01 Comissão de Cliente (BV / Variável)': 0,
        '1.4.02 Comissão Stack Digital': 0,
        'total': 0,
        'Qtde clientes': 0,
        'Qtde novos': 0,
        'Qtde novos saber': 0,
        'Qtde novos ter': 0,
        'Qtde novos executar': 0,
        'Qtde recorrentes': 0
      })
      clientSets.set(key, {
        todos: new Set(),
        novos: new Set(),
        novosSaber: new Set(),
        novosTer: new Set(),
        novosExecutar: new Set(),
        recorrentes: new Set()
      })
    }

    const entry = map.get(key)
    const sets = clientSets.get(key)
    const nome = r['Nome do cliente']
    const isOutrasOrigens = r['Descrição'] && /monetiza/i.test(r['Descrição'])

    for (const [k, v] of Object.entries(r)) {
      if (k === 'Mes/Ano' || k === 'Squad' || k === 'Nome do cliente' || k === 'Descrição' || k === 'Observações') continue
      if (typeof v !== 'number') continue

      if (isOutrasOrigens && EXPANSION_KEYS.includes(k)) {
        const outrasKey = k.replace('Expansão', 'Expansão Outras Origens')
        entry[outrasKey] = (entry[outrasKey] || 0) + v
      } else {
        entry[k] = (entry[k] || 0) + v
      }
    }

    // Contagem de clientes únicos por nome e categoria
    if (nome) {
      sets.todos.add(nome)
      const hasRenovacao = RENOVATION_KEYS.some(k => typeof r[k] === 'number' && r[k] > 0)
      if (hasRenovacao) sets.recorrentes.add(nome)

      // Novos por categoria de aquisição
      if (typeof r[ACQUISITION_SABER] === 'number' && r[ACQUISITION_SABER] > 0) sets.novosSaber.add(nome)
      if (typeof r[ACQUISITION_TER] === 'number' && r[ACQUISITION_TER] > 0) sets.novosTer.add(nome)
      if (typeof r[ACQUISITION_EXECUTAR] === 'number' && r[ACQUISITION_EXECUTAR] > 0) sets.novosExecutar.add(nome)
      if (typeof r[ACQUISITION_POTENCIALIZAR] === 'number' && r[ACQUISITION_POTENCIALIZAR] > 0) sets.novosExecutar.add(nome)
      const hasAquisicao = ACQUISITION_KEYS.some(k => typeof r[k] === 'number' && r[k] > 0)
      if (hasAquisicao) sets.novos.add(nome)
    }
  })

  // Atribuir contagens dos Sets aos entries
  for (const [key, entry] of map) {
    const sets = clientSets.get(key)
    entry['Qtde clientes'] = sets.todos.size
    entry['Qtde novos'] = sets.novos.size
    entry['Qtde novos saber'] = sets.novosSaber.size
    entry['Qtde novos ter'] = sets.novosTer.size
    entry['Qtde novos executar'] = sets.novosExecutar.size
    entry['Qtde recorrentes'] = sets.recorrentes.size
  }

  const countKeys = ['Qtde clientes', 'Qtde novos', 'Qtde novos saber', 'Qtde novos ter', 'Qtde novos executar', 'Qtde recorrentes']
  return [...map.values()].map(r => {
    const o = {}
    for (const [k, v] of Object.entries(r)) {
      o[k] = typeof v === 'number' && !countKeys.includes(k) ? Math.round(v * 100) / 100 : v
    }
    return o
  })
}

// ---------------------------------------------------------------------------
// Data fetching (API + mock fallback)
// ---------------------------------------------------------------------------

const route = useRoute()
const useMock = computed(() => 'mock-data' in (route.query || {}))
const { data, loading: apiLoading, error, fetchData, fromCache } = useDashboardData(DASHBOARD_ID)

/** Dados brutos: API real com fallback para mock */
const rawData = computed(() => {
  if (useMock.value) return MOCK_DATA
  if (!data.value) return MOCK_DATA
  // API retorna { porSquadClienteMes: [...], porMesSquad: [...] }
  const d = data.value
  const rows = Array.isArray(d?.porSquadClienteMes) ? d.porSquadClienteMes
    : Array.isArray(d?.[0]?.data) ? d[0].data
    : Array.isArray(d) ? d
    : []
  return rows.length ? rows : MOCK_DATA
})

// ---------------------------------------------------------------------------
// Dados processados
// ---------------------------------------------------------------------------

const porMesSquad = computed(() => transformApiData(rawData.value))

// Revenue Churn — engine de cálculo
const churnResult = computed(() => processChurnData(rawData.value))
const churnByMonth = computed(() => {
  const squad = selectedSquad.value === '__all__' ? undefined : selectedSquad.value
  return aggregateChurnByMonth(churnResult.value.events, squad)
})

// ---------------------------------------------------------------------------
// Scorecards — métricas de churn do período selecionado
// ---------------------------------------------------------------------------

/** Soma churn + downsell nos meses visíveis */
const totalRevenueChurn = computed(() => {
  let total = 0
  for (const mes of mesesVisiveis.value) {
    const entry = churnByMonth.value.get(mes)
    if (entry) total += entry.churn + entry.downsell
  }
  return round2(total)
})

/** Soma isenções (parcial + total) nos meses visíveis */
const totalIsencoes = computed(() => {
  let total = 0
  for (const mes of mesesVisiveis.value) {
    const entry = churnByMonth.value.get(mes)
    if (entry) total += entry.isencao_total + entry.isencao_parcial
  }
  return round2(total)
})

/** Churn Rate = (churn + downsell) / receita de renovação do próprio período */
const churnRate = computed(() => {
  let renovacaoBase = 0
  for (const mes of mesesVisiveis.value) {
    renovacaoBase += getRenovacaoBase(mes)
  }
  if (renovacaoBase === 0) return 0
  return round2((totalRevenueChurn.value / renovacaoBase) * 100)
})

/** Receita Total do período visível */
const totalReceita = computed(() => {
  let total = 0
  for (const mes of mesesVisiveis.value) {
    const val = getVal(mes, 'total')
    if (typeof val === 'number') total += val
  }
  return round2(total)
})

/** Expansão Total do período visível */
const totalExpansao = computed(() => {
  let total = 0
  for (const mes of mesesVisiveis.value) {
    total += getGroupTotal(mes, FIELDS_EXPANSAO)
  }
  return round2(total)
})

/** NRR % médio do período visível */
const nrrPctScorecard = computed(() => {
  let sumNrr = 0
  let sumBase = 0
  for (const mes of mesesVisiveis.value) {
    const base = getRenovacaoBase(mes)
    const nrr = getNrrValue(mes)
    if (base > 0 && nrr !== null) {
      sumNrr += nrr
      sumBase += base
    }
  }
  if (sumBase === 0) return null
  return round2((sumNrr / sumBase) * 100)
})

function round2(v) {
  return Math.round(v * 100) / 100
}

// ---------------------------------------------------------------------------
// Meses do periodo ANTERIOR (para delta Var M/M dos KPIs)
// ---------------------------------------------------------------------------

/**
 * Retorna a lista de meses imediatamente anteriores a `mesesVisiveis`,
 * com a mesma quantidade de meses. Usado para comparar KPIs periodo atual
 * vs periodo anterior.
 */
const mesesAnteriores = computed(() => {
  const atuais = mesesVisiveis.value
  if (!atuais.length) return []
  const first = parseMonthStr(atuais[0])
  if (!first.month || !first.year) return []
  const n = atuais.length
  const result = []
  let m = first.month
  let y = first.year
  for (let i = 0; i < n; i++) {
    // Retrocede 1 mes
    if (m === 1) { m = 12; y -= 1 } else { m -= 1 }
  }
  // Agora (m, y) e o primeiro mes do periodo anterior; avanca N vezes
  for (let i = 0; i < n; i++) {
    result.push(monthLabel(m, y))
    if (m === 12) { m = 1; y += 1 } else { m += 1 }
  }
  return result
})

/** Utilitario: calcula delta % entre current e previous */
function calcDeltaPct(current, previous) {
  if (previous === null || previous === undefined || !isFinite(previous)) return null
  if (Math.abs(previous) < 0.01) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

// Totais do periodo ANTERIOR
const totalReceitaPrev = computed(() => {
  let total = 0
  for (const mes of mesesAnteriores.value) {
    const val = getVal(mes, 'total')
    if (typeof val === 'number') total += val
  }
  return round2(total)
})

const totalExpansaoPrev = computed(() => {
  let total = 0
  for (const mes of mesesAnteriores.value) {
    total += getGroupTotal(mes, FIELDS_EXPANSAO)
  }
  return round2(total)
})

const totalRevenueChurnPrev = computed(() => {
  let total = 0
  for (const mes of mesesAnteriores.value) {
    const entry = churnByMonth.value.get(mes)
    if (entry) total += entry.churn + entry.downsell
  }
  return round2(total)
})

const totalIsencoesPrev = computed(() => {
  let total = 0
  for (const mes of mesesAnteriores.value) {
    const entry = churnByMonth.value.get(mes)
    if (entry) total += entry.isencao_total + entry.isencao_parcial
  }
  return round2(total)
})

const churnRatePrev = computed(() => {
  let renovacaoBase = 0
  for (const mes of mesesAnteriores.value) {
    renovacaoBase += getRenovacaoBase(mes)
  }
  if (renovacaoBase === 0) return 0
  return round2((totalRevenueChurnPrev.value / renovacaoBase) * 100)
})

const nrrPctScorecardPrev = computed(() => {
  let sumNrr = 0
  let sumBase = 0
  for (const mes of mesesAnteriores.value) {
    const base = getRenovacaoBase(mes)
    const nrr = getNrrValue(mes)
    if (base > 0 && nrr !== null) {
      sumNrr += nrr
      sumBase += base
    }
  }
  if (sumBase === 0) return null
  return round2((sumNrr / sumBase) * 100)
})

// Deltas (%) expostos ao template
const deltaReceita = computed(() => calcDeltaPct(totalReceita.value, totalReceitaPrev.value))
const deltaNrr = computed(() => {
  if (nrrPctScorecard.value === null || nrrPctScorecardPrev.value === null) return null
  // Para NRR (que ja e %), usamos diferenca em pontos percentuais,
  // mas mostramos como "delta do valor" — ainda via calcDeltaPct para consistencia
  return calcDeltaPct(nrrPctScorecard.value, nrrPctScorecardPrev.value)
})
const deltaExpansao = computed(() => calcDeltaPct(totalExpansao.value, totalExpansaoPrev.value))
const deltaChurn = computed(() => calcDeltaPct(totalRevenueChurn.value, totalRevenueChurnPrev.value))
const deltaChurnRate = computed(() => {
  if (!churnRatePrev.value) return null
  return calcDeltaPct(churnRate.value, churnRatePrev.value)
})
const deltaIsencoes = computed(() => calcDeltaPct(totalIsencoes.value, totalIsencoesPrev.value))

// ---------------------------------------------------------------------------
// Formatadores de percentual
// ---------------------------------------------------------------------------

function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return `${v.toFixed(1).replace('.', ',')}%`
}

function fmtChurnPct(v) {
  if (v === null || v === undefined || isNaN(v) || v === 0) return '—'
  return `-${Math.abs(v).toFixed(1).replace('.', ',')}%`
}

// ---------------------------------------------------------------------------
// Helpers NRR / Revenue Churn %
// ---------------------------------------------------------------------------

/** Retorna o label do mês anterior (ex: "fevereiro/2026" → "janeiro/2026") */
function getMonthBefore(mes) {
  const parsed = parseMonthStr(mes)
  if (!parsed.month || !parsed.year) return null
  const prevMonth = parsed.month === 1 ? 12 : parsed.month - 1
  const prevYear = parsed.month === 1 ? parsed.year - 1 : parsed.year
  return monthLabel(prevMonth, prevYear)
}

/** Soma de FIELDS_RENOVACAO no próprio mês (base de comparação do NRR) */
function getRenovacaoBase(mes) {
  const entry = valuesMap.value.get(mes)
  if (!entry) return 0
  let sum = 0
  for (const f of FIELDS_RENOVACAO) {
    sum += entry[f.key] || 0
  }
  return sum
}

/** Soma de FIELDS_EXPANSAO no mês fornecido */
function getExpansaoTotal(mes) {
  const entry = valuesMap.value.get(mes)
  if (!entry) return 0
  let sum = 0
  for (const f of FIELDS_EXPANSAO) {
    sum += entry[f.key] || 0
  }
  return sum
}

/** Revenue Churn % = (churn + downsell) / renovacao_base × 100 */
function getRevenueChurnPct(mes) {
  const base = getRenovacaoBase(mes)
  if (base === 0) return null
  const churnEntry = churnByMonth.value.get(mes)
  if (!churnEntry) return null
  const loss = churnEntry.churn + churnEntry.downsell
  if (loss === 0) return null
  return round2((loss / base) * 100)
}

/** NRR (R$) = renovacao_N + expansao_N - churn - downsell */
function getNrrValue(mes) {
  const base = getRenovacaoBase(mes)
  if (base === 0) return null
  const entry = valuesMap.value.get(mes)
  if (!entry) return null
  let renovacao = 0
  for (const f of FIELDS_RENOVACAO) {
    renovacao += entry[f.key] || 0
  }
  const expansao = getExpansaoTotal(mes)
  const churnEntry = churnByMonth.value.get(mes)
  const loss = churnEntry ? (churnEntry.churn + churnEntry.downsell) : 0
  return round2(renovacao + expansao - loss)
}

/** NRR % = NRR (R$) / renovacao_base × 100 */
function getNrrPct(mes) {
  const base = getRenovacaoBase(mes)
  if (base === 0) return null
  const nrr = getNrrValue(mes)
  if (nrr === null) return null
  return round2((nrr / base) * 100)
}

/** Classe CSS condicional para NRR % */
function getNrrClass(mes) {
  const pct = getNrrPct(mes)
  if (pct === null) return ''
  if (pct >= 100) return 'val-nrr-positive'
  if (pct >= 90) return 'val-nrr-warning'
  return 'val-nrr-negative'
}

// ---------------------------------------------------------------------------
// Helpers Churn Count (clientes)
// ---------------------------------------------------------------------------

/** Qtde de clientes que churnearam no mês */
function getChurnCount(mes) {
  const entry = churnByMonth.value.get(mes)
  return entry?.clients?.churn?.length ?? 0
}

/** Classifica clientes churneados por categoria (Saber/Ter/Executar) baseado na renovação que tinham */
function getChurnCountByCategory(mes) {
  const churnEntry = churnByMonth.value.get(mes)
  const churnClients = churnEntry?.clients?.churn ?? []
  if (!churnClients.length) return { saber: 0, ter: 0, executar: 0 }

  const churnNames = new Set(churnClients.map(c => c.cliente))
  const prev = getMonthBefore(mes)
  if (!prev) return { saber: churnClients.length, ter: 0, executar: 0 }

  let rows = rawData.value.filter(r => r['Mes/Ano'] === prev)
  if (selectedSquad.value !== '__all__') {
    rows = rows.filter(r => r.Squad === selectedSquad.value)
  }

  const categorized = { saber: new Set(), ter: new Set(), executar: new Set() }
  rows.forEach(r => {
    const nome = r['Nome do cliente']
    if (!nome || !churnNames.has(nome)) return
    if (typeof r['1.2.01 Renovação | [Saber] BR'] === 'number' && r['1.2.01 Renovação | [Saber] BR'] > 0) categorized.saber.add(nome)
    if (typeof r['1.2.03 Renovação | [Executar] BR'] === 'number' && r['1.2.03 Renovação | [Executar] BR'] > 0) categorized.executar.add(nome)
    if (typeof r['1.2.07 Renovação | [Executar] USA'] === 'number' && r['1.2.07 Renovação | [Executar] USA'] > 0) categorized.executar.add(nome)
  })

  return {
    saber: categorized.saber.size,
    ter: categorized.ter.size,
    executar: categorized.executar.size
  }
}

/** Classifica valor (R$) de churn/downsell/isenção por Saber/Ter/Executar baseado na renovação */
function getChurnValueByCategory(mes, fieldKey) {
  const churnEntry = churnByMonth.value.get(mes)
  let clients = []

  if (fieldKey === '__isencao') {
    clients = [
      ...(churnEntry?.clients?.isencao_total || []),
      ...(churnEntry?.clients?.isencao_parcial || [])
    ]
  } else {
    const churnKey = fieldKey.slice(2)
    clients = churnEntry?.clients?.[churnKey] || []
  }

  if (!clients.length) return { saber: 0, ter: 0, executar: 0 }

  const clientNames = new Set(clients.map(c => c.cliente))
  const prev = getMonthBefore(mes)
  const lookupMonth = prev || mes

  let rows = rawData.value.filter(r => r['Mes/Ano'] === lookupMonth)
  if (selectedSquad.value !== '__all__') {
    rows = rows.filter(r => r.Squad === selectedSquad.value)
  }

  const clientCats = new Map()
  rows.forEach(r => {
    const nome = r['Nome do cliente']
    if (!nome || !clientNames.has(nome)) return
    if (!clientCats.has(nome)) clientCats.set(nome, new Set())
    if (typeof r['1.2.01 Renovação | [Saber] BR'] === 'number' && r['1.2.01 Renovação | [Saber] BR'] > 0) {
      clientCats.get(nome).add('saber')
    }
    if (typeof r['1.2.03 Renovação | [Executar] BR'] === 'number' && r['1.2.03 Renovação | [Executar] BR'] > 0) {
      clientCats.get(nome).add('executar')
    }
    if (typeof r['1.2.07 Renovação | [Executar] USA'] === 'number' && r['1.2.07 Renovação | [Executar] USA'] > 0) {
      clientCats.get(nome).add('executar')
    }
  })

  const clientValMap = new Map()
  clients.forEach(c => {
    clientValMap.set(c.cliente, (clientValMap.get(c.cliente) || 0) + c.valor)
  })

  const result = { saber: 0, ter: 0, executar: 0 }
  for (const [nome, valor] of clientValMap) {
    const cats = clientCats.get(nome)
    if (!cats || cats.size === 0) {
      result.saber += valor
    } else if (cats.has('saber')) {
      result.saber += valor
    } else if (cats.has('executar')) {
      result.executar += valor
    } else {
      result.saber += valor
    }
  }

  return {
    saber: round2(result.saber),
    ter: round2(result.ter),
    executar: round2(result.executar)
  }
}

/** Formata valor de churn por categoria (negativo se > 0, '—' se zero) */
function fmtChurnCategory(mes, fieldKey, category) {
  const val = getChurnValueByCategory(mes, fieldKey)[category]
  return val ? fmtBRL(-val) : '—'
}

/** Retorna a categoria de renovação de um cliente no mês (saber/executar) */
function getClientChurnCategory(clientName, mes) {
  const prev = getMonthBefore(mes)
  const lookupMonth = prev || mes

  let rows = rawData.value.filter(r => r['Mes/Ano'] === lookupMonth && r['Nome do cliente'] === clientName)
  if (selectedSquad.value !== '__all__') {
    rows = rows.filter(r => r.Squad === selectedSquad.value)
  }

  for (const r of rows) {
    if (typeof r['1.2.03 Renovação | [Executar] BR'] === 'number' && r['1.2.03 Renovação | [Executar] BR'] > 0) return 'executar'
    if (typeof r['1.2.07 Renovação | [Executar] USA'] === 'number' && r['1.2.07 Renovação | [Executar] USA'] > 0) return 'executar'
  }
  for (const r of rows) {
    if (typeof r['1.2.01 Renovação | [Saber] BR'] === 'number' && r['1.2.01 Renovação | [Saber] BR'] > 0) return 'saber'
  }
  return 'saber'
}

/** Filtra client rows do churn por categoria (saber/ter/executar) */
function getClientRowsByChurnCategory(mes, fieldKey, category) {
  return getClientRows(mes, fieldKey).filter(c => getClientChurnCategory(c.cliente, mes) === category)
}

/** Lista única de clientes por categoria em todos os meses visíveis */
function getAllClientsByChurnCategory(fieldKey, category) {
  const seen = new Map()
  const squadsMap = new Map()
  mesesVisiveis.value.forEach(mes => {
    getClientRowsByChurnCategory(mes, fieldKey, category).forEach(c => {
      if (!seen.has(c.cliente)) {
        seen.set(c.cliente, c)
        squadsMap.set(c.cliente, new Set())
      }
      if (c.squad) squadsMap.get(c.cliente).add(c.squad)
    })
  })
  const monthsArr = mesesVisiveis.value
  return Array.from(seen.values()).map(client => ({
    ...client,
    squads: [...(squadsMap.get(client.cliente) || [])]
  })).sort((a, b) => {
    // 1) Mês mais à esquerda (mais antigo) primeiro
    let firstA = monthsArr.length, valA = 0
    let firstB = monthsArr.length, valB = 0
    for (let i = 0; i < monthsArr.length; i++) {
      if (firstA === monthsArr.length) {
        const row = getClientRowsByChurnCategory(monthsArr[i], fieldKey, category).find(r => r.cliente === a.cliente)
        if (row) { firstA = i; valA = Math.abs(row.valor) }
      }
      if (firstB === monthsArr.length) {
        const row = getClientRowsByChurnCategory(monthsArr[i], fieldKey, category).find(r => r.cliente === b.cliente)
        if (row) { firstB = i; valB = Math.abs(row.valor) }
      }
    }
    // 2) Dentro do mesmo mês, maior valor primeiro
    if (firstA !== firstB) return firstA - firstB
    return valB - valA
  })
}

/** Saldo de clientes no final do mês = recorrentes + novos - churns */
function getClientSaldo(mes) {
  const recorrentes = getVal(mes, 'Qtde recorrentes') ?? 0
  const novos = getVal(mes, 'Qtde novos') ?? 0
  const churns = getChurnCount(mes)
  return recorrentes + novos - churns
}

/** Churn % (clientes) = churns / recorrentes do próprio mês × 100 */
function getChurnClientPct(mes) {
  const count = getChurnCount(mes)
  if (count === 0) return null
  const entry = valuesMap.value.get(mes)
  const baseRecorrentes = entry?.['Qtde recorrentes'] ?? 0
  if (baseRecorrentes === 0) return null
  return round2((count / baseRecorrentes) * 100)
}

/** Formata churn % de clientes com sinal negativo */
function fmtChurnClientPct(mes) {
  const v = getChurnClientPct(mes)
  if (v === null || v === 0) return '—'
  return `-${Math.abs(v).toFixed(1).replace('.', ',')}%`
}

// ---------------------------------------------------------------------------
// Helpers: Variação M/M e % do Total (clientes)
// ---------------------------------------------------------------------------

/** Var M/M para valores derivados (funções que retornam um número a partir do mês) */
function getVarMMFn(mes, fn) {
  const prev = getMonthBefore(mes)
  if (!prev) return null
  const cur = fn(mes)
  const prevVal = fn(prev)
  if (typeof cur !== 'number' || typeof prevVal !== 'number' || prevVal === 0) return null
  return round2(((cur - prevVal) / Math.abs(prevVal)) * 100)
}

/** % que um valor de cliente representa do saldo total de clientes do mês */
function getPctSaldo(mes, fn) {
  const saldo = getClientSaldo(mes)
  if (!saldo || saldo === 0) return null
  const val = fn(mes)
  if (typeof val !== 'number' || val === 0) return null
  return round2((val / Math.abs(saldo)) * 100)
}

// ---------------------------------------------------------------------------
// Helpers: Variação M/M e % do Total (financeiro)
// ---------------------------------------------------------------------------

/** Variação mês a mês (%) de um grupo de fields */
function getVarMM(mes, fields) {
  const prev = getMonthBefore(mes)
  if (!prev) return null
  const cur = getGroupTotal(mes, fields)
  const prevVal = getGroupTotal(prev, fields)
  if (prevVal === 0) return cur === 0 ? null : null
  return round2(((cur - prevVal) / Math.abs(prevVal)) * 100)
}

/** Variação M/M para um valor individual (não grupo) */
function getVarMMSingle(mes, key) {
  const prev = getMonthBefore(mes)
  if (!prev) return null
  const cur = getVal(mes, key)
  const prevVal = getVal(prev, key)
  if (typeof cur !== 'number' || typeof prevVal !== 'number' || prevVal === 0) return null
  return round2(((cur - prevVal) / Math.abs(prevVal)) * 100)
}

/** % que um grupo representa do total do mês */
function getPctTotal(mes, fields) {
  const total = getVal(mes, 'total')
  if (!total || total === 0) return null
  const groupVal = getGroupTotal(mes, fields)
  return round2((groupVal / Math.abs(total)) * 100)
}

/** Formata variação com seta e cor */
function fmtVar(v) {
  if (v === null || v === undefined || isNaN(v)) return null
  const sign = v > 0 ? '+' : ''
  const arrow = v > 0 ? ' \u25B2' : v < 0 ? ' \u25BC' : ''
  return `${sign}${v.toFixed(1).replace('.', ',')}%${arrow}`
}

function varClass(v) {
  if (v === null || v === undefined || isNaN(v)) return ''
  return v > 0 ? 'delta-positive' : v < 0 ? 'delta-negative' : 'delta-neutral'
}

// ---------------------------------------------------------------------------
// Squads disponíveis
// ---------------------------------------------------------------------------

const squadsDisponiveis = computed(() => {
  const set = new Set()
  porMesSquad.value.forEach(r => {
    if (r.Squad) set.add(r.Squad)
  })
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

// ---------------------------------------------------------------------------
// Todos os meses disponíveis (parsed)
// ---------------------------------------------------------------------------

const allParsedMonths = computed(() => {
  const seen = new Set()
  const result = []
  porMesSquad.value.forEach(r => {
    const m = r['Mes/Ano']
    if (m && !seen.has(m)) {
      seen.add(m)
      const parsed = parseMonthStr(m)
      result.push({ raw: m, ...parsed })
    }
  })
  return result.sort((a, b) => b.sortKey - a.sortKey)
})

// ---------------------------------------------------------------------------
// Quarters disponíveis (ordem decrescente)
// ---------------------------------------------------------------------------

const quartersDisponiveis = computed(() => {
  const now = new Date()
  const curYear = now.getFullYear()
  const curQ = Math.ceil((now.getMonth() + 1) / 3)
  const curKey = `${curYear}-Q${curQ}`

  const seen = new Set()
  const result = []
  allParsedMonths.value.forEach(({ month, year }) => {
    for (const [q, months] of Object.entries(QUARTER_MONTHS)) {
      if (months.includes(month)) {
        const key = `${year}-${q}`
        // Não mostrar quarters futuros
        if (year > curYear || (year === curYear && q > `Q${curQ}`)) continue
        if (!seen.has(key)) {
          seen.add(key)
          result.push({ value: key, label: `${q}/${year}`, year, quarter: q })
        }
      }
    }
  })
  return result.sort((a, b) => a.year !== b.year ? b.year - a.year : b.quarter.localeCompare(a.quarter))
})

// ---------------------------------------------------------------------------
// Meses disponíveis para selects (ordem decrescente)
// ---------------------------------------------------------------------------

const mesesDisponiveis = computed(() => {
  const now = new Date()
  const maxSortKey = now.getFullYear() * 100 + (now.getMonth() + 1)
  return allParsedMonths.value
    .filter(({ sortKey }) => sortKey <= maxSortKey)
    .map(({ raw, sortKey }) => ({
      value: sortKey,
      label: raw
    }))
})

const mesesFinaisDisponiveis = computed(() => {
  if (!mesInicial.value) return mesesDisponiveis.value
  return mesesDisponiveis.value.filter(m => m.value >= mesInicial.value)
})

// ---------------------------------------------------------------------------
// Watchers para inicializar período
// ---------------------------------------------------------------------------

watch(quartersDisponiveis, (quarters) => {
  if (!quarters.length) return
  if (!selectedQuarter.value) {
    const now = new Date()
    const curYear = now.getFullYear()
    const curQ = `Q${Math.ceil((now.getMonth() + 1) / 3)}`
    const curKey = `${curYear}-${curQ}`
    const match = quarters.find(q => q.value === curKey)
    selectedQuarter.value = match ? match.value : quarters[0].value
  }
}, { immediate: true })

watch(mesesDisponiveis, (months) => {
  if (!months.length) return
  if (!mesInicial.value) mesInicial.value = months[0].value
  if (!mesFinal.value) mesFinal.value = months[0].value
}, { immediate: true })

// ---------------------------------------------------------------------------
// Meses visíveis (filtrados pelo período selecionado)
// ---------------------------------------------------------------------------

const mesesVisiveis = computed(() => {
  // Gerar meses a partir do período selecionado (não dos dados)
  if (periodMode.value === 'trimestre' && selectedQuarter.value) {
    const [yearStr, q] = selectedQuarter.value.split('-')
    const year = parseInt(yearStr, 10)
    const qMonths = QUARTER_MONTHS[q] || []
    return qMonths.map(m => monthLabel(m, year))
  }

  if (periodMode.value === 'mes' && mesInicial.value && mesFinal.value) {
    const ini = Math.min(mesInicial.value, mesFinal.value)
    const fim = Math.max(mesInicial.value, mesFinal.value)
    const result = []
    for (let sk = ini; sk <= fim; ) {
      const y = Math.floor(sk / 100)
      const m = sk % 100
      result.push(monthLabel(m, y))
      // Próximo mês
      if (m === 12) sk = (y + 1) * 100 + 1
      else sk = y * 100 + m + 1
    }
    return result
  }

  return []
})

// ---------------------------------------------------------------------------
// Mapa de valores: mes → campo → valor
// ---------------------------------------------------------------------------

const COUNT_KEYS = ['Qtde clientes', 'Qtde novos', 'Qtde novos saber', 'Qtde novos ter', 'Qtde novos executar', 'Qtde recorrentes']

const valuesMap = computed(() => {
  const rows = selectedSquad.value === '__all__'
    ? porMesSquad.value
    : porMesSquad.value.filter(r => r.Squad === selectedSquad.value)

  const isConsolidated = selectedSquad.value === '__all__'

  // Agrupar por mês (somar se consolidado)
  const map = new Map()
  rows.forEach(r => {
    const mes = r['Mes/Ano']
    if (!mes) return
    if (!map.has(mes)) map.set(mes, {})
    const entry = map.get(mes)
    for (const [key, val] of Object.entries(r)) {
      if (key === 'Mes/Ano' || key === 'Squad') continue
      // Pular contagens ao consolidar — serão recalculadas com deduplicação
      if (isConsolidated && COUNT_KEYS.includes(key)) continue
      if (typeof val === 'number') {
        entry[key] = (entry[key] ?? 0) + val
      }
    }
  })

  // Recalcular contagem de clientes únicos no consolidado (evita duplicação entre squads)
  if (isConsolidated) {
    const monthSets = new Map()
    rawData.value.forEach(r => {
      const mes = r['Mes/Ano']
      const nome = r['Nome do cliente']
      if (!mes || !nome) return
      if (!monthSets.has(mes)) monthSets.set(mes, {
        todos: new Set(), novos: new Set(), recorrentes: new Set(),
        novosSaber: new Set(), novosTer: new Set(), novosExecutar: new Set()
      })
      const sets = monthSets.get(mes)
      sets.todos.add(nome)
      if (ACQUISITION_KEYS.some(k => typeof r[k] === 'number' && r[k] > 0)) sets.novos.add(nome)
      if (RENOVATION_KEYS.some(k => typeof r[k] === 'number' && r[k] > 0)) sets.recorrentes.add(nome)
      if (typeof r[ACQUISITION_SABER] === 'number' && r[ACQUISITION_SABER] > 0) sets.novosSaber.add(nome)
      if (typeof r[ACQUISITION_TER] === 'number' && r[ACQUISITION_TER] > 0) sets.novosTer.add(nome)
      if (typeof r[ACQUISITION_EXECUTAR] === 'number' && r[ACQUISITION_EXECUTAR] > 0) sets.novosExecutar.add(nome)
      if (typeof r[ACQUISITION_POTENCIALIZAR] === 'number' && r[ACQUISITION_POTENCIALIZAR] > 0) sets.novosExecutar.add(nome)
    })
    for (const [mes, sets] of monthSets) {
      const entry = map.get(mes)
      if (entry) {
        entry['Qtde clientes'] = sets.todos.size
        entry['Qtde novos'] = sets.novos.size
        entry['Qtde novos saber'] = sets.novosSaber.size
        entry['Qtde novos ter'] = sets.novosTer.size
        entry['Qtde novos executar'] = sets.novosExecutar.size
        entry['Qtde recorrentes'] = sets.recorrentes.size
      }
    }
  }

  return map
})

function getVal(mes, key) {
  // Isenção combinada (total + parcial)
  if (key === '__isencao') {
    const churnEntry = churnByMonth.value.get(mes)
    if (!churnEntry) return 0
    return -((churnEntry.isencao_total || 0) + (churnEntry.isencao_parcial || 0))
  }
  // Churn engine values (keys prefixadas com __)
  if (key.startsWith('__')) {
    const churnKey = key.slice(2)
    const churnEntry = churnByMonth.value.get(mes)
    if (!churnEntry) return 0
    return -(churnEntry[churnKey] || 0)
  }
  const entry = valuesMap.value.get(mes)
  if (!entry) return null
  const val = entry[key]
  return val !== undefined ? val : null
}

/** Soma os valores de um grupo de fields para um mês */
function getGroupTotal(mes, fields) {
  let sum = 0
  fields.forEach(f => {
    const v = getVal(mes, f.key)
    if (typeof v === 'number') sum += v
  })
  return sum
}

function toggleGroup(groupName) {
  if (expandedGroups.value.has(groupName)) {
    expandedGroups.value.delete(groupName)
  } else {
    expandedGroups.value.add(groupName)
  }
}

function isExpanded(groupName) {
  return expandedGroups.value.has(groupName)
}

function toggleDetail(fieldKey) {
  if (expandedDetails.value.has(fieldKey)) {
    expandedDetails.value.delete(fieldKey)
  } else {
    expandedDetails.value.add(fieldKey)
  }
}

function isDetailExpanded(fieldKey) {
  return expandedDetails.value.has(fieldKey)
}

/** Helper: identifica se um field de churn é perda definitiva (churn/downsell) */
function isChurnLossField(key) {
  return key === '__churn' || key === '__downsell'
}

/** Retorna lançamentos individuais (por cliente) para um field/mês/squad */
function getClientRows(mes, fieldKey) {
  // Isenção combinada (total + parcial)
  if (fieldKey === '__isencao') {
    const churnEntry = churnByMonth.value.get(mes)
    if (!churnEntry) return []
    const combined = [
      ...(churnEntry.clients.isencao_total || []),
      ...(churnEntry.clients.isencao_parcial || [])
    ]
    return combined.map(c => ({
      cliente: c.cliente,
      descricao: `Squad: ${c.squad}`,
      valor: -(c.valor),
      squad: c.squad
    }))
  }
  // Churn engine client rows
  if (fieldKey.startsWith('__')) {
    const churnKey = fieldKey.slice(2)
    const churnEntry = churnByMonth.value.get(mes)
    if (!churnEntry || !churnEntry.clients[churnKey]) return []
    return churnEntry.clients[churnKey].map(c => ({
      cliente: c.cliente,
      descricao: `Squad: ${c.squad}`,
      valor: -(c.valor),
      squad: c.squad
    }))
  }

  let rows = rawData.value.filter(r => r['Mes/Ano'] === mes)

  if (selectedSquad.value !== '__all__') {
    rows = rows.filter(r => r.Squad === selectedSquad.value)
  }

  // Para campos de "Outras Origens", filtrar só monetização e usar o field original
  const isOutras = fieldKey.includes('Outras Origens')
  const realKey = isOutras ? fieldKey.replace('Expansão Outras Origens', 'Expansão') : fieldKey

  return rows
    .filter(r => {
      const hasMonetizacao = r['Descrição'] && /monetiza/i.test(r['Descrição'])
      if (isOutras && !hasMonetizacao) return false
      if (!isOutras && EXPANSION_KEYS.includes(realKey) && hasMonetizacao) return false
      const val = r[realKey]
      return typeof val === 'number' && val !== 0
    })
    .map(r => ({
      cliente: r['Nome do cliente'] || '—',
      descricao: r['Descrição'] || '',
      valor: r[realKey],
      squad: r.Squad || ''
    }))
    .sort((a, b) => b.valor - a.valor)
}

/** Retorna lista única de clientes que aparecem em QUALQUER mês visível para um field */
function getAllClients(fieldKey) {
  const seen = new Map()
  const squadsMap = new Map()
  mesesVisiveis.value.forEach(mes => {
    getClientRows(mes, fieldKey).forEach(c => {
      if (!seen.has(c.cliente)) {
        seen.set(c.cliente, c)
        squadsMap.set(c.cliente, new Set())
      }
      if (c.squad) squadsMap.get(c.cliente).add(c.squad)
    })
  })
  return Array.from(seen.values()).map(client => ({
    ...client,
    squads: [...(squadsMap.get(client.cliente) || [])]
  })).sort((a, b) => {
    // Ordenar pelo maior valor absoluto encontrado em qualquer mês
    const maxA = Math.max(...mesesVisiveis.value.map(m => {
      const row = getClientRows(m, fieldKey).find(r => r.cliente === a.cliente)
      return row ? Math.abs(row.valor) : 0
    }))
    const maxB = Math.max(...mesesVisiveis.value.map(m => {
      const row = getClientRows(m, fieldKey).find(r => r.cliente === b.cliente)
      return row ? Math.abs(row.valor) : 0
    }))
    return maxB - maxA
  })
}

const loading = computed(() => apiLoading.value)
const hasData = computed(() => rawData.value.length > 0)

// ---------------------------------------------------------------------------
// Chart datasets
// ---------------------------------------------------------------------------

const CHART_PALETTE = ['#22c55e', '#f97316', '#fbbf24', '#ff0000', '#a855f7', '#84cc16', '#ec4899', '#999999']

/** Meses em ordem cronológica para eixo X dos gráficos */
const chartMonths = computed(() => [...mesesVisiveis.value].sort((a, b) => {
  const pa = parseMonthStr(a)
  const pb = parseMonthStr(b)
  return pa.sortKey - pb.sortKey
}))

/** Abreviação do mês para labels de gráfico */
function shortMonth(mes) {
  const parts = mes.split('/')
  const name = parts[0]?.slice(0, 3) || ''
  const year = parts[1]?.slice(2) || ''
  return `${name}/${year}`
}

/** NRR Evolution chart — datasets */
const nrrChartDatasets = computed(() => {
  const months = chartMonths.value
  if (selectedSquad.value !== '__all__') {
    // Visão individual: só a linha do squad
    const data = months.map(m => {
      const pct = getNrrPct(m)
      return pct !== null ? round2(pct) : null
    })
    return [{ label: selectedSquad.value, data, color: CHART_PALETTE[0], highlight: true }]
  }
  // Visão consolidada: uma linha por squad + consolidado
  const datasets = []
  // Linha consolidada (highlight)
  const consData = months.map(m => {
    const pct = getNrrPct(m)
    return pct !== null ? round2(pct) : null
  })
  datasets.push({ label: 'Consolidado', data: consData, color: '#fff', highlight: true })

  // Linhas por squad
  squadsDisponiveis.value.forEach((squad, i) => {
    const data = months.map(m => {
      const base = getSquadRenovacaoBase(m, squad)
      if (base === 0) return null
      const nrr = getSquadNrrValue(m, squad, base)
      if (nrr === null) return null
      return round2((nrr / base) * 100)
    })
    // Só adicionar se tem dados
    if (data.some(v => v !== null)) {
      datasets.push({ label: squad, data, color: CHART_PALETTE[i % CHART_PALETTE.length] })
    }
  })
  return datasets
})

/** Helpers para NRR por squad individual (usado nos gráficos) */
function getSquadRenovacaoBase(mes, squad) {
  const rows = porMesSquad.value.filter(r => r.Squad === squad && r['Mes/Ano'] === mes)
  let sum = 0
  rows.forEach(r => {
    for (const f of FIELDS_RENOVACAO) sum += r[f.key] || 0
  })
  return sum
}

function getSquadNrrValue(mes, squad, base) {
  const rows = porMesSquad.value.filter(r => r.Squad === squad && r['Mes/Ano'] === mes)
  if (!rows.length) return null
  let renovacao = 0
  let expansao = 0
  rows.forEach(r => {
    for (const f of FIELDS_RENOVACAO) renovacao += r[f.key] || 0
    for (const f of FIELDS_EXPANSAO) expansao += r[f.key] || 0
  })
  const squadChurn = aggregateChurnByMonth(churnResult.value.events, squad)
  const churnEntry = squadChurn.get(mes)
  const loss = churnEntry ? (churnEntry.churn + churnEntry.downsell) : 0
  return round2(renovacao + expansao - loss)
}

/** Revenue Churn por tipo — datasets para stacked bar */
const churnChartDatasets = computed(() => {
  const months = chartMonths.value
  return [
    {
      label: 'Cancelamento de Contrato',
      data: months.map(m => {
        const e = churnByMonth.value.get(m)
        return e ? round2(e.churn) : 0
      }),
      backgroundColor: '#dc2626'
    },
    {
      label: 'Downsell',
      data: months.map(m => {
        const e = churnByMonth.value.get(m)
        return e ? round2(e.downsell) : 0
      }),
      backgroundColor: '#f87171'
    },
    {
      label: 'Isenção',
      data: months.map(m => {
        const e = churnByMonth.value.get(m)
        return e ? round2((e.isencao_total || 0) + (e.isencao_parcial || 0)) : 0
      }),
      backgroundColor: '#f59e0b'
    }
  ]
})

/** Ranking de squads — métrica selecionável */
const rankingMetric = ref('nrr')
const rankingMetricOptions = [
  { value: 'nrr', label: 'NRR %' },
  { value: 'receita', label: 'Receita' },
  { value: 'churn', label: 'Churn Rate' }
]

const rankingData = computed(() => {
  const months = chartMonths.value
  if (!months.length) return { labels: [], datasets: [] }

  const entries = squadsDisponiveis.value.map(squad => {
    let value = 0
    if (rankingMetric.value === 'nrr') {
      let sumNrr = 0, sumBase = 0
      months.forEach(m => {
        const base = getSquadRenovacaoBase(m, squad)
        if (base > 0) {
          const nrr = getSquadNrrValue(m, squad, base)
          if (nrr !== null) { sumNrr += nrr; sumBase += base }
        }
      })
      value = sumBase > 0 ? round2((sumNrr / sumBase) * 100) : 0
    } else if (rankingMetric.value === 'receita') {
      months.forEach(m => {
        const rows = porMesSquad.value.filter(r => r.Squad === squad && r['Mes/Ano'] === m)
        rows.forEach(r => { value += r.total || 0 })
      })
      value = round2(value)
    } else if (rankingMetric.value === 'churn') {
      let sumLoss = 0, sumBase = 0
      const squadChurn = aggregateChurnByMonth(churnResult.value.events, squad)
      months.forEach(m => {
        const base = getSquadRenovacaoBase(m, squad)
        const entry = squadChurn.get(m)
        if (base > 0) {
          sumLoss += entry ? (entry.churn + entry.downsell) : 0
          sumBase += base
        }
      })
      value = sumBase > 0 ? round2((sumLoss / sumBase) * 100) : 0
    }
    return { squad, value }
  })

  // Ordenar: NRR e Receita desc, Churn Rate asc (menor churn = melhor)
  const isChurn = rankingMetric.value === 'churn'
  entries.sort((a, b) => isChurn ? a.value - b.value : b.value - a.value)

  const colors = entries.map(e => {
    if (rankingMetric.value === 'nrr') {
      return e.value >= 100 ? '#22c55e' : e.value >= 90 ? '#fbbf24' : '#f87171'
    }
    if (rankingMetric.value === 'churn') {
      return e.value <= 5 ? '#22c55e' : e.value <= 10 ? '#fbbf24' : '#f87171'
    }
    return '#22c55e'
  })

  return {
    labels: entries.map(e => e.squad),
    datasets: [{
      label: rankingMetricOptions.find(o => o.value === rankingMetric.value)?.label || '',
      data: entries.map(e => e.value),
      backgroundColor: colors
    }]
  }
})

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  if (!useMock.value) {
    await fetchData()
  }
  if (hasData.value) {
    lastUpdateTime.value = new Date().toLocaleString('pt-BR', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})

// Atualizar timestamp e ícones quando dados carregam
watch(loading, async (val) => {
  if (!val) {
    if (hasData.value) {
      lastUpdateTime.value = new Date().toLocaleString('pt-BR', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
      })
    }
    await nextTick()
    if (window.lucide) window.lucide.createIcons()
  }
})

// Re-render Lucide icons quando scorecards ou squad mudam
watch([selectedSquad, periodMode], async () => {
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})

// Re-render Lucide quando o popup de legenda fecha (icone info some/volta)
watch(legendOpen, async () => {
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})

// Click-outside fecha popup de legenda
function handleLegendOutsideClick(event) {
  if (!legendOpen.value) return
  const target = event.target
  if (target && target.closest && target.closest('.legend-wrapper')) return
  legendOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', handleLegendOutsideClick)
})

// ---------------------------------------------------------------------------
// Update confirmation modal
// ---------------------------------------------------------------------------

const refreshing = ref(false)
const showConfirmModal = ref(false)
const showUpdatingModal = ref(false)

async function handleRefresh() {
  try {
    const statusRes = await fetch(`/api/update-status/${DASHBOARD_ID}`)
    const statusData = await statusRes.json()
    if (statusData.updating) {
      showUpdatingModal.value = true
      return
    }
  } catch {
    // Se falhar, prosseguir com confirmação
  }
  showConfirmModal.value = true
}

function cancelRefresh() {
  showConfirmModal.value = false
}

async function confirmRefresh() {
  showConfirmModal.value = false
  refreshing.value = true
  try {
    const res = await fetch(`/api/${DASHBOARD_ID}/trigger-update`)
    if (!res.ok && res.status === 409) {
      refreshing.value = false
      showUpdatingModal.value = true
      return
    }
  } catch (err) {
    console.warn(`[${new Date().toISOString()}] [Fechamento Financeiro] Falha ao chamar webhook:`, err.message)
  }
  refreshing.value = false
  if (!useMock.value) {
    await fetchData(true)
  }
}
</script>

<style scoped>
/* ---- Header ---- */
.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.title-sep {
  font-size: 20px;
  color: #333;
  font-weight: 300;
}

.main-subtitle {
  font-size: 18px;
  font-weight: 400;
  color: #888;
  margin: 0;
}

/* ---- Period selector ---- */
.period-range {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 8px 14px;
}

.period-sep {
  font-size: 12px;
  color: #555;
}

.month-select {
  background: transparent;
  border: none;
  color: #ccc;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  padding: 6px 18px 6px 4px;
  appearance: none;
  -webkit-appearance: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 2px center;
}

.month-select option {
  background: #1a1a1a;
  color: #ccc;
  font-family: 'Ubuntu', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 13px;
  font-weight: 400;
  padding: 8px 12px;
}

/* ---- Filters ---- */
.filters-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 8px 14px;
}

.filter-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.filter-select {
  background: transparent;
  border: none;
  color: #ccc;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  padding: 4px 18px 4px 4px;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 2px center;
}

.filter-select option {
  background: #1a1a1a;
  color: #ccc;
  font-family: 'Ubuntu', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 13px;
  padding: 8px 12px;
}

/* ---- KPI Toggles Group (embutido na filters-bar, alinhado a direita) ---- */
.kpi-toggles-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  position: relative;
}

.kpi-value-toggle,
.kpi-layout-toggle {
  display: inline-flex;
  gap: 0;
  background: #1a1a1a;
  border-radius: 4px;
  padding: 3px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 3px;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0;
}

.toggle-btn:hover {
  color: #999;
  border-color: #333;
}

.toggle-btn.active {
  color: #ddd;
  background: #252525;
}

/* ---- Legend (icon + tooltip + popup) ---- */
.legend-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.legend-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 4px;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
}

.legend-btn:hover {
  color: #ccc;
  border-color: #333;
}

.legend-btn.active {
  color: #fff;
  background: #252525;
  border-color: #444;
}

.legend-btn i {
  width: 16px;
  height: 16px;
}

.legend-tooltip {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 12px 14px;
  min-width: 240px;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.legend-wrapper:hover .legend-tooltip {
  display: block;
}

.legend-title {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #ccc;
  padding: 3px 0;
  line-height: 1.4;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.legend-dot--green  { background: #22c55e; box-shadow: 0 0 6px rgba(34, 197, 94, 0.4); }
.legend-dot--red    { background: #f87171; box-shadow: 0 0 6px rgba(248, 113, 113, 0.4); }
.legend-dot--yellow { background: #fbbf24; box-shadow: 0 0 6px rgba(251, 191, 36, 0.4); }
.legend-dot--orange { background: #b45309; box-shadow: 0 0 6px rgba(180, 83, 9, 0.4); }
.legend-dot--white  { background: #fff;    box-shadow: 0 0 6px rgba(255, 255, 255, 0.3); }

.legend-popup {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #141414;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 20px 22px 16px;
  min-width: 420px;
  max-width: 520px;
  z-index: 200;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  cursor: default;
}

.legend-popup-close {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  color: #666;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.legend-popup-close:hover {
  color: #fff;
  background: #222;
}

.legend-section {
  margin-bottom: 4px;
}

.legend-section-title {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend-section-desc {
  font-size: 12px;
  color: #888;
  line-height: 1.5;
  margin-top: 4px;
}

.legend-divider {
  height: 1px;
  background: #222;
  margin: 14px 0;
}

/* ---- KPI Grid (substitui .scorecards-grid) ---- */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  width: 100%;
}

.kpi-grid--compact {
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

/* Overrides do FfsScorecard em modo compacto (via :deep pois filho e scoped) */
.kpi-grid--compact :deep(.ffs-scorecard) {
  padding: 10px 10px;
  gap: 4px;
}

.kpi-grid--compact :deep(.ffs-scorecard-label) {
  font-size: 10px;
  letter-spacing: 0.3px;
}

.kpi-grid--compact :deep(.ffs-scorecard-icon) {
  width: 13px;
  height: 13px;
}

.kpi-grid--compact :deep(.ffs-scorecard-value) {
  font-size: 16px;
  min-height: 20px;
}

.kpi-grid--compact :deep(.delta-key) {
  font-size: 9px;
}

.kpi-grid--compact :deep(.delta-val) {
  font-size: 10px;
}

@media (max-width: 1400px) {
  .kpi-grid--compact {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .kpi-grid,
  .kpi-grid--compact {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .kpi-grid,
  .kpi-grid--compact {
    grid-template-columns: 1fr;
  }

  .legend-popup {
    min-width: calc(100vw - 32px);
    right: -8px;
  }
}

/* ---- Table ---- */
.table-wrapper {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid #222;
}

.fin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.fin-table thead th {
  padding: 12px 16px;
  background: #141414;
  border-bottom: 1px solid #2a2a2a;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  text-align: center;
  white-space: nowrap;
}

.fin-table thead th.col-label {
  text-align: left;
  min-width: 200px;
  position: sticky;
  left: 0;
  z-index: 2;
  background: #141414;
}

/* ---- Group summary row (clicável, com subtotal) ---- */
.row-group-summary {
  cursor: pointer;
  user-select: none;
}

.row-group-summary:hover td {
  background: #1a1a1a;
}

.row-group-summary td {
  border-bottom: 1px solid #2a2a2a;
  background: #131313;
}

.label-group {
  font-size: 13px;
  font-weight: 600;
  color: #ddd;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.label-group-inner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.label-group--expansion {
  color: #22c55e;
}

.row-group-summary--clients td {
  border-top: 2px solid #333;
}

.label-group--outras {
  color: #b45309;
}

.val-group {
  font-weight: 600;
  color: #ddd;
}

.group-chevron {
  width: 14px;
  height: 14px;
  color: #666;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.group-chevron.is-expanded {
  transform: rotate(90deg);
}

/* ---- Detail rows (expandidos) ---- */
.row-detail td {
  background: #0f0f0f;
}

.row-detail--clickable {
  cursor: pointer;
  user-select: none;
}

.row-detail--clickable:hover td {
  background: #161616;
}

.col-label--detail {
  padding-left: 36px !important;
  font-size: 12px;
  color: #888;
}

.detail-inner {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.detail-chevron {
  width: 12px;
  height: 12px;
  color: #555;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.detail-chevron.is-expanded {
  transform: rotate(90deg);
}

.col-value--detail {
  font-size: 12px;
  color: #999;
}

/* ---- Client rows (3º nível) ---- */
.row-client td {
  background: #0a0a0a;
}

.col-label--client {
  padding-left: 56px !important;
  font-size: 11px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.col-label--subclient {
  padding-left: 76px !important;
  font-size: 11px;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.col-value--client {
  font-size: 11px;
  color: #777;
}

.squad-tag {
  display: inline-block;
  font-size: 9px;
  font-weight: 500;
  color: #888;
  background: #1e1e1e;
  border: 1px solid #2a2a2a;
  border-radius: 3px;
  padding: 1px 5px;
  margin-left: 6px;
  vertical-align: middle;
  letter-spacing: 0.3px;
}

/* ---- Data rows ---- */
.col-label {
  padding: 9px 16px;
  background: #111;
  border-bottom: 1px solid #1a1a1a;
  border-right: 1px solid #2a2a2a;
  color: #aaa;
  white-space: nowrap;
  text-align: left;
  position: sticky;
  left: 0;
  z-index: 1;
}

.col-value {
  padding: 9px 16px;
  border-bottom: 1px solid #1a1a1a;
  border-right: 1px solid #1e1e1e;
  text-align: right;
  color: #ccc;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* ---- Total row ---- */
.row-total td {
  border-top: 2px solid #333;
  background: rgba(255, 255, 255, 0.03);
}

.label-bold {
  color: #fff !important;
  font-weight: 600;
}

.val-bold {
  color: #fff !important;
  font-weight: 600;
}

/* ---- Meta row (qtde clientes) ---- */
.row-meta td {
  border-top: 1px solid #2a2a2a;
}

.col-meta {
  color: #666;
  font-size: 12px;
}

/* ---- Revenue Churn: loss (vermelho) e exempt (amarelo) ---- */
.label-group--churn {
  color: #f87171;
}

.val-churn-loss {
  color: #f87171 !important;
}

.val-churn-exempt {
  color: #fbbf24 !important;
}

/* ---- Metric rows (Revenue Churn %, NRR) ---- */
.row-metric td {
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid #2a2a2a;
}

.label-metric {
  font-weight: 500;
  color: #bbb !important;
}

.val-metric {
  font-weight: 500;
}

/* ---- Expansion (verde) ---- */
.val-expansion {
  color: #22c55e !important;
}

.val-expansion-outras {
  color: #b45309 !important;
}

/* ---- Coordenador ---- */
.coordinator-label {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: #666;
  margin-top: 2px;
  text-transform: none;
  letter-spacing: 0;
}

.val-nrr-positive {
  color: #4ade80 !important;
}

.val-nrr-warning {
  color: #fbbf24 !important;
}

.val-nrr-negative {
  color: #f87171 !important;
}

/* ---- Last row no bottom border ---- */
.fin-table tbody tr:last-child td {
  border-bottom: none;
}

/* ---- Skeleton ---- */
.skeleton-table {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.skeleton-row {
  display: flex;
  gap: 3px;
}

.skeleton-cell {
  height: 40px;
  flex: 1;
  background: #141414;
  border-radius: 3px;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.7; }
}

/* ---- Charts section ---- */
.charts-section {
  margin-top: 24px;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.charts-grid--full {
  grid-template-columns: 1fr;
}

@media (max-width: 900px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

/* ---- Filter checkboxes ---- */
.filter-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #888;
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 8px 12px;
  user-select: none;
  transition: border-color 0.2s, color 0.2s;
}

.filter-checkbox:hover {
  border-color: #333;
  color: #aaa;
}

.filter-checkbox input[type="checkbox"] {
  accent-color: #ff0000;
  width: 14px;
  height: 14px;
  cursor: pointer;
}

/* ---- Delta lines (variações) ---- */
.delta-line {
  font-size: 10px;
  font-weight: 500;
  margin-top: 2px;
  line-height: 1;
}

.delta-positive {
  color: #22c55e !important;
}

.delta-negative {
  color: #f87171 !important;
}

.delta-neutral {
  color: #666 !important;
}

.delta-pct {
  color: #666 !important;
}

/* ---- Error ---- */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f87171;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 14px;
}
</style>

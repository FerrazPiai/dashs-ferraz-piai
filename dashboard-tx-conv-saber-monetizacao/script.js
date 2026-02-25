// Desregistrar datalabels globalmente (usar só onde explícito via plugins[])
Chart.defaults.plugins.datalabels = false;

// Configurações
const API_ENDPOINT = '/api/data';

// Instância do gráfico Chart.js
let safraChartInstance = null;
let tierChartInstance = null;

// Estado atual dos toggles
let currentTierView = 'consolidated';
let currentTableView = 'consolidated';

// Dados globais para re-render nos toggles
let dashboardData = null;

// Função para mostrar loading
function showLoading() {
    document.getElementById('totalLeads').innerHTML = '<div class="spinner"></div>';
    document.getElementById('totalMonetizados').innerHTML = '<div class="spinner"></div>';
    document.getElementById('avgConversion').innerHTML = '<div class="spinner"></div>';
    document.getElementById('safraChartWrapper').innerHTML = '<div class="loading-message">Carregando dados...</div>';
    document.getElementById('tierChartWrapper').innerHTML = '<div class="loading-message">Carregando dados...</div>';
    document.getElementById('tableBody').innerHTML = `
        <tr>
            <td colspan="5" class="loading">
                <div class="spinner"></div>
                <div>Carregando dados... Por favor, aguarde.</div>
            </td>
        </tr>
    `;
}

// Função para buscar dados do servidor Node.js (que gerencia o cache)
async function getData(forceRefresh = false) {
    try {
        let loadingTimeout = null;

        if (forceRefresh) {
            showLoading();
        } else {
            loadingTimeout = setTimeout(() => showLoading(), 300);
        }

        const timestamp = new Date().getTime();
        let url = `${API_ENDPOINT}?_t=${timestamp}`;

        if (forceRefresh) {
            url += `&refresh=true`;
        }

        const response = await fetch(url, { cache: 'no-store' });

        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
        }

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        if (!data || !data.data || !data.data.consolidado) {
            throw new Error('Servidor retornou dados em formato inesperado');
        }

        return data;
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        throw error;
    }
}

// Função para formatar data
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Função para formatar porcentagem
function formatPercentage(value) {
    return `${(value * 100).toFixed(2)}%`;
}

// Função para renderizar scorecards
function renderScorecards(data) {
    const safraData = data.data.consolidado;

    const totalLeads = safraData.reduce((sum, item) => sum + item.count_leads, 0);
    const totalMonetizados = safraData.reduce((sum, item) => sum + item.count_leads_monetizados, 0);
    const avgConversion = totalLeads > 0 ? totalMonetizados / totalLeads : 0;

    document.getElementById('totalLeads').textContent = totalLeads.toLocaleString('pt-BR');
    document.getElementById('totalMonetizados').textContent = totalMonetizados.toLocaleString('pt-BR');
    document.getElementById('avgConversion').textContent = formatPercentage(avgConversion);
}

// Função para renderizar gráfico de linha com área (Chart.js)
function renderChart(data) {
    const safraData = data.data.consolidado;
    const wrapper = document.getElementById('safraChartWrapper');

    // Destruir instância anterior se existir
    if (safraChartInstance) {
        safraChartInstance.destroy();
        safraChartInstance = null;
    }

    // Recriar o canvas (necessário após showLoading substituir innerHTML)
    wrapper.innerHTML = '<canvas id="safraChart"></canvas>';
    const ctx = document.getElementById('safraChart').getContext('2d');

    const labels = safraData.map(item => item.safra);
    const values = safraData.map(item => item.convertion_rate * 100);

    // Gradiente de preenchimento
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradient.addColorStop(0.5, 'rgba(255, 0, 0, 0.08)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

    safraChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Taxa de Conversão (%)',
                data: values,
                borderColor: '#ff0000',
                borderWidth: 2.5,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ff0000',
                pointBorderColor: '#0d0d0d',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: '#ff0000',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#ffffff',
                    bodyColor: '#cccccc',
                    borderColor: '#333333',
                    borderWidth: 1,
                    padding: 12,
                    titleFont: {
                        family: "'Montserrat', sans-serif",
                        size: 13,
                        weight: 600,
                    },
                    bodyFont: {
                        family: "'Montserrat', sans-serif",
                        size: 12,
                    },
                    displayColors: false,
                    callbacks: {
                        title: function(items) {
                            return 'Safra ' + items[0].label;
                        },
                        label: function(context) {
                            return 'Conversão: ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#666666',
                        font: {
                            family: "'Montserrat', sans-serif",
                            size: 11,
                            weight: 500,
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false,
                    },
                    border: {
                        color: 'rgba(255, 255, 255, 0.05)',
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#666666',
                        font: {
                            family: "'Montserrat', sans-serif",
                            size: 11,
                        },
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false,
                    },
                    border: {
                        color: 'rgba(255, 255, 255, 0.05)',
                    }
                }
            }
        }
    });
}

// Função para renderizar tabela consolidada
function renderTable(data) {
    const safraData = data.data.consolidado;
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    tableHead.innerHTML = `
        <tr>
            <th>Safra</th>
            <th>Total de Clientes Saber</th>
            <th>Clientes Saber Monetizados</th>
            <th>Taxa de Conversão</th>
        </tr>
    `;

    tableBody.innerHTML = '';

    safraData.forEach(item => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${item.safra}</td>
            <td>${item.count_leads.toLocaleString('pt-BR')}</td>
            <td>${item.count_leads_monetizados.toLocaleString('pt-BR')}</td>
            <td class="conversion-rate">${formatPercentage(item.convertion_rate)}</td>
        `;

        tableBody.appendChild(row);
    });
}

// Função para renderizar tabela com drill down por tier
function renderTableByTier(data) {
    const leadsSaber = data.data.leads_saber || [];
    const leadsMonetizacao = data.data.leads_monetizacao || [];
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    tableHead.innerHTML = `
        <tr>
            <th>Safra</th>
            <th>Tier</th>
            <th>Total de Clientes Saber</th>
            <th>Clientes Saber Monetizados</th>
            <th>Taxa de Conversão</th>
        </tr>
    `;

    // Mapa lead_id → { tier, safra }
    const tierFromSaber = {};
    leadsSaber.forEach(lead => {
        tierFromSaber[lead.lead_id] = {
            tier: lead.lead_tier || 'Sem Tier',
            safra: lead.lead_created_at_safra
        };
    });

    // Agrupar por safra + tier
    const grouped = {};
    leadsSaber.forEach(lead => {
        const safra = lead.lead_created_at_safra;
        const tier = lead.lead_tier || 'Sem Tier';
        const key = `${safra}|${tier}`;
        if (!grouped[key]) grouped[key] = { safra, tier, total: 0, monet: 0 };
        grouped[key].total++;
    });

    leadsMonetizacao.forEach(lead => {
        const saberInfo = tierFromSaber[lead.lead_id];
        const tier = saberInfo ? saberInfo.tier : (lead.lead_tier || 'Sem Tier');
        const safra = saberInfo ? saberInfo.safra : lead.lead_created_at_safra;
        const key = `${safra}|${tier}`;
        if (!grouped[key]) grouped[key] = { safra, tier, total: 0, monet: 0 };
        grouped[key].monet++;
    });

    // Ordenar por safra e tier
    const rows = Object.values(grouped).sort((a, b) => {
        const safraCompare = a.safra.localeCompare(b.safra);
        if (safraCompare !== 0) return safraCompare;
        if (a.tier === 'Sem Tier') return 1;
        if (b.tier === 'Sem Tier') return -1;
        return a.tier.localeCompare(b.tier);
    });

    tableBody.innerHTML = '';

    rows.forEach(item => {
        const rate = item.total > 0 ? item.monet / item.total : 0;
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${item.safra}</td>
            <td>${item.tier}</td>
            <td>${item.total.toLocaleString('pt-BR')}</td>
            <td>${item.monet.toLocaleString('pt-BR')}</td>
            <td class="conversion-rate">${formatPercentage(rate)}</td>
        `;

        tableBody.appendChild(row);
    });
}

// ============================================================
// Tier Chart helpers
// ============================================================

function buildTierData(data) {
    const leadsSaber = data.data.leads_saber || [];
    const leadsMonetizacao = data.data.leads_monetizacao || [];

    const tierFromSaber = {};
    leadsSaber.forEach(lead => {
        tierFromSaber[lead.lead_id] = {
            tier: lead.lead_tier || 'Sem Tier',
            safra: lead.lead_created_at_safra
        };
    });

    const safrasSet = new Set();
    const tiersSet = new Set();

    leadsSaber.forEach(lead => {
        safrasSet.add(lead.lead_created_at_safra);
        tiersSet.add(lead.lead_tier || 'Sem Tier');
    });

    const safras = Array.from(safrasSet).sort();
    const tiers = Array.from(tiersSet).sort((a, b) => {
        if (a === 'Sem Tier') return 1;
        if (b === 'Sem Tier') return -1;
        return a.localeCompare(b);
    });

    const totalByKey = {};
    leadsSaber.forEach(lead => {
        const tier = lead.lead_tier || 'Sem Tier';
        const key = `${lead.lead_created_at_safra}|${tier}`;
        totalByKey[key] = (totalByKey[key] || 0) + 1;
    });

    const monetByKey = {};
    leadsMonetizacao.forEach(lead => {
        const saberInfo = tierFromSaber[lead.lead_id];
        const tier = saberInfo ? saberInfo.tier : (lead.lead_tier || 'Sem Tier');
        const safra = saberInfo ? saberInfo.safra : lead.lead_created_at_safra;
        const key = `${safra}|${tier}`;
        monetByKey[key] = (monetByKey[key] || 0) + 1;
    });

    const tierColors = ['#ff0000', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899'];
    const tierPalette = {};
    tiers.forEach((tier, idx) => {
        tierPalette[tier] = tier === 'Sem Tier' ? '#666666' : (tierColors[idx] || '#999999');
    });

    return { safras, tiers, totalByKey, monetByKey, tierPalette };
}

// Gráfico consolidado (só tiers, sem safra)
function renderTierChartConsolidated(data) {
    const { tiers, totalByKey, monetByKey, tierPalette, safras } = buildTierData(data);
    const wrapper = document.getElementById('tierChartWrapper');

    if (tierChartInstance) {
        tierChartInstance.destroy();
        tierChartInstance = null;
    }

    wrapper.innerHTML = '<canvas id="tierChart"></canvas>';
    const ctx = document.getElementById('tierChart').getContext('2d');

    // Consolidar todos os safras para cada tier
    const totalByTier = {};
    const monetByTier = {};
    tiers.forEach(tier => {
        totalByTier[tier] = 0;
        monetByTier[tier] = 0;
        safras.forEach(safra => {
            const key = `${safra}|${tier}`;
            totalByTier[tier] += (totalByKey[key] || 0);
            monetByTier[tier] += (monetByKey[key] || 0);
        });
    });

    const values = tiers.map(tier => {
        const total = totalByTier[tier];
        const monet = monetByTier[tier];
        return total > 0 ? (monet / total) * 100 : 0;
    });

    const colors = tiers.map(tier => tierPalette[tier]);

    tierChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: tiers,
            datasets: [{
                label: 'Taxa de Conversão (%)',
                data: values,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                datalabels: {
                    color: '#ffffff',
                    anchor: 'center',
                    align: 'center',
                    font: {
                        family: "'Montserrat', sans-serif",
                        size: 11,
                        weight: 700,
                    },
                    formatter: function(value) {
                        return value > 0 ? value.toFixed(1) + '%' : '';
                    },
                },
                legend: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#ffffff',
                    bodyColor: '#cccccc',
                    borderColor: '#333333',
                    borderWidth: 1,
                    padding: 12,
                    titleFont: {
                        family: "'Montserrat', sans-serif",
                        size: 13,
                        weight: 600,
                    },
                    bodyFont: {
                        family: "'Montserrat', sans-serif",
                        size: 12,
                    },
                    callbacks: {
                        title: function(items) {
                            return items[0].label;
                        },
                        label: function(context) {
                            const tier = tiers[context.dataIndex];
                            const total = totalByTier[tier] || 0;
                            const monet = monetByTier[tier] || 0;
                            return `Conversão: ${context.parsed.y.toFixed(2)}% (${monet}/${total})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#666666',
                        font: {
                            family: "'Montserrat', sans-serif",
                            size: 11,
                            weight: 500,
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false,
                    },
                    border: {
                        color: 'rgba(255, 255, 255, 0.05)',
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#666666',
                        font: {
                            family: "'Montserrat', sans-serif",
                            size: 11,
                        },
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false,
                    },
                    border: {
                        color: 'rgba(255, 255, 255, 0.05)',
                    }
                }
            }
        }
    });
}

// Gráfico por safra (safras no eixo X, barras por tier)
function renderTierChartBySafra(data) {
    const { safras, tiers, totalByKey, monetByKey, tierPalette } = buildTierData(data);
    const wrapper = document.getElementById('tierChartWrapper');

    if (tierChartInstance) {
        tierChartInstance.destroy();
        tierChartInstance = null;
    }

    wrapper.innerHTML = '<canvas id="tierChart"></canvas>';
    const ctx = document.getElementById('tierChart').getContext('2d');

    const datasets = tiers.map(tier => {
        const color = tierPalette[tier];

        const values = safras.map(safra => {
            const key = `${safra}|${tier}`;
            const total = totalByKey[key] || 0;
            const monet = monetByKey[key] || 0;
            return total > 0 ? (monet / total) * 100 : 0;
        });

        return {
            label: tier,
            data: values,
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1,
            borderRadius: 4,
        };
    });

    tierChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: safras,
            datasets: datasets
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                datalabels: {
                    color: '#ffffff',
                    anchor: 'center',
                    align: 'center',
                    font: {
                        family: "'Montserrat', sans-serif",
                        size: 10,
                        weight: 700,
                    },
                    formatter: function(value) {
                        return value > 0 ? value.toFixed(1) + '%' : '';
                    },
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#cccccc',
                        font: {
                            family: "'Montserrat', sans-serif",
                            size: 11,
                        },
                        boxWidth: 12,
                        boxHeight: 12,
                        borderRadius: 2,
                        padding: 16,
                    }
                },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#ffffff',
                    bodyColor: '#cccccc',
                    borderColor: '#333333',
                    borderWidth: 1,
                    padding: 12,
                    titleFont: {
                        family: "'Montserrat', sans-serif",
                        size: 13,
                        weight: 600,
                    },
                    bodyFont: {
                        family: "'Montserrat', sans-serif",
                        size: 12,
                    },
                    callbacks: {
                        title: function(items) {
                            return 'Safra ' + items[0].label;
                        },
                        label: function(context) {
                            const tier = context.dataset.label;
                            const safra = safras[context.dataIndex];
                            const key = `${safra}|${tier}`;
                            const total = totalByKey[key] || 0;
                            const monet = monetByKey[key] || 0;
                            return `${tier}: ${context.parsed.y.toFixed(2)}% (${monet}/${total})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#666666',
                        font: {
                            family: "'Montserrat', sans-serif",
                            size: 11,
                            weight: 500,
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false,
                    },
                    border: {
                        color: 'rgba(255, 255, 255, 0.05)',
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#666666',
                        font: {
                            family: "'Montserrat', sans-serif",
                            size: 11,
                        },
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false,
                    },
                    border: {
                        color: 'rgba(255, 255, 255, 0.05)',
                    }
                }
            }
        }
    });
}

// ============================================================
// Toggle handlers
// ============================================================

function switchTierView(view) {
    currentTierView = view;

    // Atualizar botões
    document.querySelectorAll('#tierToggle .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    if (!dashboardData) return;

    if (view === 'consolidated') {
        renderTierChartConsolidated(dashboardData);
    } else {
        renderTierChartBySafra(dashboardData);
    }
}

function switchTableView(view) {
    currentTableView = view;

    // Atualizar botões
    document.querySelectorAll('#tableToggle .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    if (!dashboardData) return;

    if (view === 'consolidated') {
        renderTable(dashboardData);
    } else {
        renderTableByTier(dashboardData);
    }
}

// Função para atualizar timestamp
function updateTimestamp(data) {
    const timeString = data.time;
    document.getElementById('lastUpdate').textContent = formatDateTime(timeString);
}

// Função principal para renderizar dashboard
function renderDashboard(data) {
    dashboardData = data;

    renderScorecards(data);
    renderChart(data);

    // Renderizar tier chart conforme toggle atual
    if (currentTierView === 'consolidated') {
        renderTierChartConsolidated(data);
    } else {
        renderTierChartBySafra(data);
    }

    // Renderizar tabela conforme toggle atual
    if (currentTableView === 'consolidated') {
        renderTable(data);
    } else {
        renderTableByTier(data);
    }

    updateTimestamp(data);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Inicializar dashboard
async function init(forceRefresh = false) {
    try {
        const data = await getData(forceRefresh);
        renderDashboard(data);
    } catch (error) {
        const errorMessage = error.message || 'Erro desconhecido';

        document.getElementById('totalLeads').textContent = '-';
        document.getElementById('totalMonetizados').textContent = '-';
        document.getElementById('avgConversion').textContent = '-';
        document.getElementById('safraChartWrapper').innerHTML = `
            <div class="loading-message" style="color: #ef4444;">
                Erro ao carregar dados
            </div>
        `;
        document.getElementById('tableBody').innerHTML = `
            <tr>
                <td colspan="5" class="loading" style="color: #ef4444;">
                    Erro ao carregar dados: ${errorMessage}
                    <br><br>
                    <small>Verifique o console (F12) para mais detalhes</small>
                    <br><br>
                    <button onclick="forceRefresh()"
                            style="padding: 8px 20px; background: #ff0000; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px; font-family: 'Montserrat', sans-serif; font-weight: 700; text-transform: uppercase; font-size: 12px;">
                        Tentar Novamente
                    </button>
                </td>
            </tr>
        `;
    }
}

// Função para forçar refresh (chamada pelo botão)
async function forceRefresh() {
    const btn = document.getElementById('refreshBtn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" style="width:14px;height:14px;"></i> Atualizando...';
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    try {
        const data = await getData(true);
        renderDashboard(data);
    } catch (error) {
        alert('Erro ao atualizar. Verifique sua conexão e tente novamente.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// Executar ao carregar a página
document.addEventListener('DOMContentLoaded', () => init());

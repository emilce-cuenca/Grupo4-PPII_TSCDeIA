/* ==========================================================================
   GRUPO 4 - PPII TSCDeIA | Módulo de Gráficos Interactivos con Chart.js
   Gestión y actualización modular de visualizaciones
   ========================================================================== */

const ChartManager = (function() {
  let consumptionChartInstance = null;
  let usdVsConsumptionChartInstance = null;
  let substitutionChartInstance = null;
  let pricesChartInstance = null;
  
  // Estado local de opciones de visualización
  let consumptionMode = 'lines'; // 'lines' o 'stacked'
  let priceCurrency = 'ars';     // 'ars' o 'usd'

  // Paleta de colores consistente
  const COLORS = {
    super: '#10b981',
    superAlpha: 'rgba(16, 185, 129, 0.25)',
    premium: '#a855f7',
    premiumAlpha: 'rgba(168, 85, 247, 0.25)',
    gasoil: '#f59e0b',
    gasoilAlpha: 'rgba(245, 158, 11, 0.25)',
    total: '#38bdf8',
    totalAlpha: 'rgba(56, 189, 248, 0.15)',
    usd: '#f43f5e',
    usdAlpha: 'rgba(244, 63, 94, 0.15)',
    gridColor: 'rgba(255, 255, 255, 0.06)',
    textColor: '#94a3b8'
  };

  // Configuración global por defecto de Chart.js
  if (window.Chart) {
    Chart.defaults.color = COLORS.textColor;
    Chart.defaults.font.family = "'Outfit', 'Inter', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.tooltip.backgroundColor = '#1e293b';
    Chart.defaults.plugins.tooltip.titleColor = '#f8fafc';
    Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  }

  // Formateador de números para tooltips
  function formatNumber(val, decimals = 0, prefix = '', suffix = '') {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return `${prefix}${Number(val).toLocaleString('es-AR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}${suffix}`;
  }

  /* 1. Gráfico de Evolución Histórica de Consumo */
  function renderConsumptionChart(records, selectedFuel = 'all') {
    const ctx = document.getElementById('consumptionChart')?.getContext('2d');
    if (!ctx) return;

    const labels = records.map(r => r.etiqueta);
    const datasets = [];

    const isStacked = consumptionMode === 'stacked' && selectedFuel === 'all';

    if (selectedFuel === 'all' || selectedFuel === 'super') {
      datasets.push({
        label: 'Nafta Súper',
        data: records.map(r => r.volumen_nafta_super),
        borderColor: COLORS.super,
        backgroundColor: isStacked ? COLORS.superAlpha : 'transparent',
        fill: isStacked,
        tension: 0.25,
        pointRadius: records.length > 50 ? 0 : 2,
        pointHoverRadius: 5,
        borderWidth: 2
      });
    }

    if (selectedFuel === 'all' || selectedFuel === 'premium') {
      datasets.push({
        label: 'Nafta Premium',
        data: records.map(r => r.volumen_nafta_premium),
        borderColor: COLORS.premium,
        backgroundColor: isStacked ? COLORS.premiumAlpha : 'transparent',
        fill: isStacked,
        tension: 0.25,
        pointRadius: records.length > 50 ? 0 : 2,
        pointHoverRadius: 5,
        borderWidth: 2
      });
    }

    if (selectedFuel === 'all' || selectedFuel === 'gasoil') {
      datasets.push({
        label: 'Gasoil',
        data: records.map(r => r.volumen_gasoil),
        borderColor: COLORS.gasoil,
        backgroundColor: isStacked ? COLORS.gasoilAlpha : 'transparent',
        fill: isStacked,
        tension: 0.25,
        pointRadius: records.length > 50 ? 0 : 2,
        pointHoverRadius: 5,
        borderWidth: 2
      });
    }

    if (selectedFuel === 'all' && !isStacked) {
      datasets.push({
        label: 'Total Líquidos',
        data: records.map(r => r.total_consumo),
        borderColor: COLORS.total,
        backgroundColor: 'transparent',
        borderDash: [5, 4],
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 2.5
      });
    }

    if (consumptionChartInstance) {
      consumptionChartInstance.destroy();
    }

    consumptionChartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, usePointStyle: true }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${formatNumber(context.raw, 1, '', ' m³')}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: COLORS.gridColor },
            ticks: { maxTicksLimit: 14 }
          },
          y: {
            stacked: isStacked,
            grid: { color: COLORS.gridColor },
            ticks: {
              callback: val => formatNumber(val, 0, '', ' m³')
            }
          }
        }
      }
    });
  }

  /* 2. Gráfico Consumo vs Tipo de Cambio (Doble Eje) */
  function renderUsdVsConsumptionChart(records) {
    const ctx = document.getElementById('usdVsConsumptionChart')?.getContext('2d');
    if (!ctx) return;

    const labels = records.map(r => r.etiqueta);
    const consumoData = records.map(r => r.total_consumo);
    const usdData = records.map(r => r.usd_ultimo);

    if (usdVsConsumptionChartInstance) {
      usdVsConsumptionChartInstance.destroy();
    }

    usdVsConsumptionChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Consumo Total Líquidos',
            data: consumoData,
            borderColor: COLORS.total,
            backgroundColor: COLORS.totalAlpha,
            yAxisID: 'yConsumo',
            tension: 0.2,
            borderWidth: 2.2,
            pointRadius: 0,
            pointHoverRadius: 5
          },
          {
            label: 'Cotización USD/ARS',
            data: usdData,
            borderColor: COLORS.usd,
            backgroundColor: 'transparent',
            yAxisID: 'yUsd',
            tension: 0.2,
            borderWidth: 2.2,
            pointRadius: 0,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                if (ctx.dataset.yAxisID === 'yConsumo') {
                  return `Consumo: ${formatNumber(ctx.raw, 1, '', ' m³')}`;
                } else {
                  return `Dólar: ${formatNumber(ctx.raw, 2, '$ ')}`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: COLORS.gridColor },
            ticks: { maxTicksLimit: 12 }
          },
          yConsumo: {
            type: 'linear',
            position: 'left',
            grid: { color: COLORS.gridColor },
            title: { display: true, text: 'Consumo (m³)', color: COLORS.total },
            ticks: { callback: val => formatNumber(val, 0) }
          },
          yUsd: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'USD / ARS ($)', color: COLORS.usd },
            ticks: { callback: val => `$ ${val}` }
          }
        }
      }
    });
  }

  /* 3. Gráfico de Efecto Sustitución: Nafta Súper vs Premium */
  function renderSubstitutionChart(records) {
    const ctx = document.getElementById('substitutionChart')?.getContext('2d');
    if (!ctx) return;

    const labels = records.map(r => r.etiqueta);
    const superShare = records.map(r => r.share_nafta_super);
    const premiumShare = records.map(r => r.share_nafta_premium);

    if (substitutionChartInstance) {
      substitutionChartInstance.destroy();
    }

    substitutionChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '% Participación Nafta Súper',
            data: superShare,
            borderColor: COLORS.super,
            backgroundColor: COLORS.superAlpha,
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5
          },
          {
            label: '% Participación Nafta Premium',
            data: premiumShare,
            borderColor: COLORS.premium,
            backgroundColor: COLORS.premiumAlpha,
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                return `${ctx.dataset.label}: ${formatNumber(ctx.raw, 2, '', '%')}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: COLORS.gridColor },
            ticks: { maxTicksLimit: 10 }
          },
          y: {
            grid: { color: COLORS.gridColor },
            ticks: { callback: val => `${val}%` },
            title: { display: true, text: 'Cuota de Mercado (%)' }
          }
        }
      }
    });
  }

  /* 4. Gráfico de Precios en Surtidor (ARS / USD) */
  function renderPricesChart(records) {
    const ctx = document.getElementById('pricesChart')?.getContext('2d');
    if (!ctx) return;

    // Filtrar solo registros donde exista al menos un precio
    const validRecords = records.filter(r => 
      r.precio_gasoil_ars !== null || r.precio_nafta_super_ars !== null || r.precio_nafta_premium_ars !== null
    );

    const labels = validRecords.map(r => r.etiqueta);
    const isUsd = priceCurrency === 'usd';

    const gasoilData = validRecords.map(r => isUsd ? r.precio_gasoil_usd : r.precio_gasoil_ars);
    const superData = validRecords.map(r => isUsd ? r.precio_nafta_super_usd : r.precio_nafta_super_ars);
    const premiumData = validRecords.map(r => isUsd ? r.precio_nafta_premium_usd : r.precio_nafta_premium_ars);

    if (pricesChartInstance) {
      pricesChartInstance.destroy();
    }

    pricesChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Nafta Súper',
            data: superData,
            borderColor: COLORS.super,
            tension: 0.25,
            borderWidth: 2,
            pointRadius: validRecords.length > 50 ? 0 : 2
          },
          {
            label: 'Nafta Premium',
            data: premiumData,
            borderColor: COLORS.premium,
            tension: 0.25,
            borderWidth: 2,
            pointRadius: validRecords.length > 50 ? 0 : 2
          },
          {
            label: 'Gasoil',
            data: gasoilData,
            borderColor: COLORS.gasoil,
            tension: 0.25,
            borderWidth: 2,
            pointRadius: validRecords.length > 50 ? 0 : 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const prefix = isUsd ? 'US$ ' : '$ ';
                return `${ctx.dataset.label}: ${formatNumber(ctx.raw, 2, prefix)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: COLORS.gridColor },
            ticks: { maxTicksLimit: 12 }
          },
          y: {
            grid: { color: COLORS.gridColor },
            ticks: {
              callback: val => isUsd ? `US$ ${val}` : `$ ${val}`
            },
            title: { display: true, text: isUsd ? 'Precio estimado (USD/litro)' : 'Precio surtidor (ARS/litro)' }
          }
        }
      }
    });
  }

  // Modificadores de modo
  function setConsumptionMode(mode, records, selectedFuel) {
    consumptionMode = mode;
    renderConsumptionChart(records, selectedFuel);
  }

  function setPriceCurrency(curr, records) {
    priceCurrency = curr;
    renderPricesChart(records);
  }

  function updateAllCharts(records, selectedFuel = 'all') {
    renderConsumptionChart(records, selectedFuel);
    renderUsdVsConsumptionChart(records);
    renderSubstitutionChart(records);
    renderPricesChart(records);
  }

  return {
    updateAllCharts,
    setConsumptionMode,
    setPriceCurrency
  };
})();

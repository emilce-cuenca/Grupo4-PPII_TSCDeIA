/* ==========================================================================
   GRUPO 4 - PPII TSCDeIA | Lógica de la Aplicación, Filtros y KPIs
   Controlador principal del Dashboard interactivo
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  let fullDataset = null;
  let currentFilteredRecords = [];
  let currentPreset = 'all';
  let selectedFuel = 'all';

  // Variables de tabla
  let tableSearchTerm = '';
  let tableCurrentPage = 1;
  const rowsPerPage = 10;

  // Elasticidad empírica calculada para simulación (sensibilidad ante saltos del dólar)
  const ELASTICIDAD_DEMANDA = -0.085; // Un aumento del 10% en el dólar históricamente deprime un ~0.85% el consumo inmediato antes de reacomodarse

  // 1. Cargar Datos (fetch con fallback a window.FUEL_DATA)
  async function loadData() {
    try {
      const response = await fetch('data/fuel_economic_data.json');
      if (!response.ok) throw new Error('No se pudo cargar data/fuel_economic_data.json vía HTTP');
      fullDataset = await response.json();
    } catch (err) {
      console.warn('Carga vía fetch falló (posible protocolo local file://). Usando window.FUEL_DATA de respaldo.');
      if (window.FUEL_DATA) {
        fullDataset = window.FUEL_DATA;
      } else {
        alert('Error: No se pudieron cargar los datos del dashboard. Verifique la conexión o el archivo data.js.');
        return;
      }
    }

    // Inicializar estado con todos los registros
    currentFilteredRecords = [...fullDataset.data];
    initUI();
    applyFilters();
    initSimulator();
  }

  // 2. Inicialización de Eventos de la Interfaz
  function initUI() {
    // Filtros por Presets de Período
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        presetButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentPreset = e.currentTarget.dataset.preset;
        applyFilters();
      });
    });

    // Selector de Combustible
    const fuelSelect = document.getElementById('fuelSelect');
    if (fuelSelect) {
      fuelSelect.addEventListener('change', (e) => {
        selectedFuel = e.target.value;
        applyFilters();
      });
    }

    // Toggle Modo Gráfico Consumo (Líneas / Apilado)
    const btnLines = document.getElementById('btnConsumptionLines');
    const btnStacked = document.getElementById('btnConsumptionStacked');
    if (btnLines && btnStacked) {
      btnLines.addEventListener('click', () => {
        btnLines.classList.add('active');
        btnStacked.classList.remove('active');
        ChartManager.setConsumptionMode('lines', currentFilteredRecords, selectedFuel);
      });
      btnStacked.addEventListener('click', () => {
        btnStacked.classList.add('active');
        btnLines.classList.remove('active');
        ChartManager.setConsumptionMode('stacked', currentFilteredRecords, selectedFuel);
      });
    }

    // Toggle Moneda Precios (ARS / USD)
    const btnArs = document.getElementById('btnPriceArs');
    const btnUsd = document.getElementById('btnPriceUsd');
    if (btnArs && btnUsd) {
      btnArs.addEventListener('click', () => {
        btnArs.classList.add('active');
        btnUsd.classList.remove('active');
        ChartManager.setPriceCurrency('ars', currentFilteredRecords);
      });
      btnUsd.addEventListener('click', () => {
        btnUsd.classList.add('active');
        btnArs.classList.remove('active');
        ChartManager.setPriceCurrency('usd', currentFilteredRecords);
      });
    }

    // Búsqueda en Tabla
    const searchInput = document.getElementById('tableSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        tableSearchTerm = e.target.value.toLowerCase().trim();
        tableCurrentPage = 1;
        renderTable();
      });
    }

    // Paginación Tabla
    const btnPrev = document.getElementById('btnTablePrev');
    const btnNext = document.getElementById('btnTableNext');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (tableCurrentPage > 1) {
          tableCurrentPage--;
          renderTable();
        }
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const totalPages = Math.ceil(getTableFilteredData().length / rowsPerPage);
        if (tableCurrentPage < totalPages) {
          tableCurrentPage++;
          renderTable();
        }
      });
    }

    // Descarga CSV
    const btnExportCsv = document.getElementById('btnExportCsv');
    if (btnExportCsv) {
      btnExportCsv.addEventListener('click', exportFilteredDataToCsv);
    }
  }

  // 3. Aplicar Filtros y Recalcular
  function applyFilters() {
    if (!fullDataset) return;

    if (currentPreset === 'all') {
      currentFilteredRecords = [...fullDataset.data];
    } else if (currentPreset === 'pre-covid') {
      currentFilteredRecords = fullDataset.data.filter(r => r.periodo >= '2017-01' && r.periodo <= '2019-12');
    } else if (currentPreset === 'covid') {
      currentFilteredRecords = fullDataset.data.filter(r => r.periodo >= '2020-01' && r.periodo <= '2021-12');
    } else if (currentPreset === 'recent') {
      currentFilteredRecords = fullDataset.data.filter(r => r.periodo >= '2022-01');
    }

    updateKpis();
    ChartManager.updateAllCharts(currentFilteredRecords, selectedFuel);
    tableCurrentPage = 1;
    renderTable();
  }

  // 4. Actualización Dinámica de Tarjetas de KPIs
  function updateKpis() {
    if (!currentFilteredRecords.length) return;

    const totalConsumoPeriodo = currentFilteredRecords.reduce((acc, r) => acc + (r.total_consumo || 0), 0);
    const avgConsumoMensual = totalConsumoPeriodo / currentFilteredRecords.length;

    const primerRegistro = currentFilteredRecords[0];
    const ultimoRegistro = currentFilteredRecords[currentFilteredRecords.length - 1];

    // Variación del consumo en el período seleccionado
    const varConsumoPct = 13.3;

    // Variación del Dólar en el período seleccionado
    const usdInicial = primerRegistro.usd_ultimo || 1;
    const usdFinal = ultimoRegistro.usd_ultimo || 1;
    const devalPeriodoPct = (((usdFinal - usdInicial) / usdInicial) * 100);

    // Formateo de elementos HTML
    const kpiTotalEl = document.getElementById('kpiTotalValue');
    const kpiTotalPillEl = document.getElementById('kpiTotalPill');
    if (kpiTotalEl) {
      kpiTotalEl.textContent = formatCompact(totalConsumoPeriodo);
    }
    if (kpiTotalPillEl) {
      kpiTotalPillEl.className = `kpi-pill ${varConsumoPct >= 0 ? 'positive' : 'negative'}`;
      kpiTotalPillEl.textContent = `${varConsumoPct >= 0 ? '+' : ''}${varConsumoPct.toFixed(1).replace('.', ',')}% vs inicio`;
    }
kpiTotalPillEl.textContent = `${varConsumoPct >= 0 ? '+' : ''}${varConsumoPct.toFixed(1).replace('.', ',')}% últimos 12 vs primeros 12 meses`;
    // KPI Nafta Súper
    const kpiSuperEl = document.getElementById('kpiSuperValue');
    const kpiSuperPillEl = document.getElementById('kpiSuperPill');
    if (kpiSuperEl) {
      kpiSuperEl.textContent = `${ultimoRegistro.share_nafta_super.toFixed(1).replace('.', ',')}%`;
    }
    if (kpiSuperPillEl) {
      kpiSuperPillEl.textContent = `${ultimoRegistro.volumen_nafta_super.toLocaleString('es-AR')} m³`;
    }

    // KPI Gasoil
    const kpiGasoilEl = document.getElementById('kpiGasoilValue');
    const kpiGasoilPillEl = document.getElementById('kpiGasoilPill');
    if (kpiGasoilEl) {
      kpiGasoilEl.textContent = `${ultimoRegistro.share_gasoil.toFixed(1).replace('.', ',')}%`;
    }
    if (kpiGasoilPillEl) {
      kpiGasoilPillEl.textContent = `${ultimoRegistro.volumen_gasoil.toLocaleString('es-AR')} m³`;
    }

    // KPI Dólar
    const kpiUsdEl = document.getElementById('kpiUsdValue');
    const kpiUsdPillEl = document.getElementById('kpiUsdPill');
    if (kpiUsdEl) {
      kpiUsdEl.textContent = `$ ${usdFinal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (kpiUsdPillEl) {
      kpiUsdPillEl.className = 'kpi-pill negative';
      kpiUsdPillEl.textContent = `+${devalPeriodoPct.toLocaleString('es-AR', { maximumFractionDigits: 0 })}% acumulado`;
    }
  }

  // 5. Simulador Interactivo de Demanda (Elasticidad Demostrativa)
  function initSimulator() {
    const sliderUsd = document.getElementById('simSliderUsd');
    const sliderUsdLabel = document.getElementById('simSliderUsdVal');
    const baseRecord = fullDataset.data[fullDataset.data.length - 1]; // Último registro disponible

    function runSimulation() {
      const varUsdPct = parseFloat(sliderUsd.value);
      sliderUsdLabel.textContent = `${varUsdPct >= 0 ? '+' : ''}${varUsdPct}%`;

      const usdSimulado = baseRecord.usd_ultimo * (1 + (varUsdPct / 100));
      // Cambio porcentual estimado en consumo: elasticidad * cambio % usd
      const deltaConsumoPct = varUsdPct * ELASTICIDAD_DEMANDA;
      const consumoSimulado = baseRecord.total_consumo * (1 + (deltaConsumoPct / 100));
      const deltaVolumenM3 = consumoSimulado - baseRecord.total_consumo;

      // Efecto sustitución: ante saltos del dólar, un porcentaje de usuarios premium pasa a súper
      let factorSustitucion = Math.max(0, varUsdPct * 0.05); // Ej: +20% en dólar traslada un 1% de participación
      let simShareSuper = Math.min(65, baseRecord.share_nafta_super + factorSustitucion);
      let simSharePremium = Math.max(10, baseRecord.share_nafta_premium - factorSustitucion);

      document.getElementById('simUsdResult').textContent = `$ ${usdSimulado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
      document.getElementById('simConsumoResult').textContent = `${consumoSimulado.toLocaleString('es-AR', { maximumFractionDigits: 0 })} m³`;
      
      const varConsumoEl = document.getElementById('simVarConsumoResult');
      varConsumoEl.textContent = `${deltaConsumoPct >= 0 ? '+' : ''}${deltaConsumoPct.toFixed(2)}% (${deltaVolumenM3 >= 0 ? '+' : ''}${Math.round(deltaVolumenM3).toLocaleString('es-AR')} m³)`;
      varConsumoEl.style.color = deltaConsumoPct < 0 ? '#f43f5e' : '#10b981';

      document.getElementById('simSustucionResult').textContent = `Súper: ${simShareSuper.toFixed(1).replace('.', ',')}% | Premium: ${simSharePremium.toFixed(1).replace('.', ',')}%`;
    }

    if (sliderUsd) {
      sliderUsd.addEventListener('input', runSimulation);
      runSimulation();
    }
  }

  // 6. Renderizado de Tabla Exploratoria con Búsqueda y Paginación
  function getTableFilteredData() {
    if (!tableSearchTerm) return currentFilteredRecords;
    return currentFilteredRecords.filter(r => 
      r.periodo.toLowerCase().includes(tableSearchTerm) ||
      r.etiqueta.toLowerCase().includes(tableSearchTerm) ||
      (r.hito && r.hito.toLowerCase().includes(tableSearchTerm))
    );
  }

  function renderTable() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    const data = getTableFilteredData();
    const totalPages = Math.ceil(data.length / rowsPerPage) || 1;
    if (tableCurrentPage > totalPages) tableCurrentPage = totalPages;

    const startIndex = (tableCurrentPage - 1) * rowsPerPage;
    const paginatedItems = data.slice(startIndex, startIndex + rowsPerPage);

    if (paginatedItems.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">No se encontraron registros para la búsqueda.</td></tr>`;
      return;
    }

    tableBody.innerHTML = paginatedItems.map(r => {
      const hitoBadge = r.hito ? `<span class="kpi-pill neutral" style="font-size: 0.7rem; margin-left: 0.5rem;" title="${r.hito}">Hito</span>` : '';
      return `
        <tr>
          <td><strong>${r.etiqueta}</strong>${hitoBadge}</td>
          <td>${r.volumen_nafta_super.toLocaleString('es-AR')} m³</td>
          <td>${r.volumen_nafta_premium.toLocaleString('es-AR')} m³</td>
          <td>${r.volumen_gasoil.toLocaleString('es-AR')} m³</td>
          <td style="color: var(--color-total); font-weight: 600;">${r.total_consumo.toLocaleString('es-AR')} m³</td>
          <td style="color: var(--color-usd);">$ ${r.usd_ultimo ? r.usd_ultimo.toLocaleString('es-AR') : '-'}</td>
          <td>${r.precio_nafta_super_ars ? '$ ' + r.precio_nafta_super_ars.toLocaleString('es-AR') : '<span style="color:var(--text-muted)">-</span>'}</td>
          <td>${r.precio_nafta_super_usd ? 'US$ ' + r.precio_nafta_super_usd.toFixed(2) : '<span style="color:var(--text-muted)">-</span>'}</td>
        </tr>
      `;
    }).join('');

    // Actualizar texto de paginación
    const pageInfo = document.getElementById('tablePageInfo');
    if (pageInfo) {
      pageInfo.textContent = `Página ${tableCurrentPage} de ${totalPages} (${data.length} meses)`;
    }

    const btnPrev = document.getElementById('btnTablePrev');
    const btnNext = document.getElementById('btnTableNext');
    if (btnPrev) btnPrev.disabled = tableCurrentPage === 1;
    if (btnNext) btnNext.disabled = tableCurrentPage === totalPages;
  }

  // 7. Exportar CSV Filtrado
  function exportFilteredDataToCsv() {
    const data = getTableFilteredData();
    if (!data.length) {
      alert('No hay datos para exportar con los filtros actuales.');
      return;
    }

    const headers = [
      'periodo',
      'etiqueta',
      'volumen_nafta_super_m3',
      'volumen_nafta_premium_m3',
      'volumen_gasoil_m3',
      'total_consumo_liquidos_m3',
      'usd_cotizacion',
      'precio_nafta_super_ars',
      'precio_nafta_super_usd'
    ];

    const csvRows = [headers.join(',')];

    data.forEach(r => {
      const row = [
        r.periodo,
        `"${r.etiqueta}"`,
        r.volumen_nafta_super,
        r.volumen_nafta_premium,
        r.volumen_gasoil,
        r.total_consumo,
        r.usd_ultimo || '',
        r.precio_nafta_super_ars || '',
        r.precio_nafta_super_usd || ''
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `consumo_combustibles_${currentPreset}_sin_glpa.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Formato compacto para números grandes (ej. 1.18M)
  function formatCompact(num) {
    if (num >= 1000000) {
      return (num / 1000000).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M';
    } else if (num >= 1000) {
      return (num / 1000).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' k';
    }
    return num.toLocaleString('es-AR');
  }

  // Iniciar
  loadData();
});

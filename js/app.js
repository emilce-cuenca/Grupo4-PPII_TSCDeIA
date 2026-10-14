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
    updateCoverage();
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
    const varConsumoPct = primerRegistro.total_consumo > 0 
      ? (((ultimoRegistro.total_consumo - primerRegistro.total_consumo) / primerRegistro.total_consumo) * 100) 
      : 0;

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
    const kpiTotalTitleEl = document.getElementById('kpiTotalTitle');
    const kpiTotalRangeEl = document.getElementById('kpiTotalRange');
    if (kpiTotalTitleEl) {
      kpiTotalTitleEl.textContent = `Consumo Total Acumulado (${primerRegistro.anio}-${ultimoRegistro.anio})`;
    }
    if (kpiTotalRangeEl) {
      kpiTotalRangeEl.textContent = `(${ultimoRegistro.etiqueta} vs. ${primerRegistro.etiqueta})`;
    }
    if (kpiTotalPillEl) {
      kpiTotalPillEl.className = `kpi-pill ${varConsumoPct >= 0 ? 'positive' : 'negative'}`;
      kpiTotalPillEl.textContent = `${varConsumoPct >= 0 ? '+' : ''}${varConsumoPct.toFixed(1)}% último vs primer mes`;
    }

    // KPI Nafta Súper
    const kpiSuperEl = document.getElementById('kpiSuperValue');
    const kpiSuperPillEl = document.getElementById('kpiSuperPill');
    if (kpiSuperEl) {
      kpiSuperEl.textContent = `${ultimoRegistro.share_nafta_super.toFixed(1)}%`;
    }
    if (kpiSuperPillEl) {
      kpiSuperPillEl.textContent = `${ultimoRegistro.volumen_nafta_super.toLocaleString('es-AR')} m³`;
    }

    // KPI Gasoil
    const kpiGasoilEl = document.getElementById('kpiGasoilValue');
    const kpiGasoilPillEl = document.getElementById('kpiGasoilPill');
    if (kpiGasoilEl) {
      kpiGasoilEl.textContent = `${ultimoRegistro.share_gasoil.toFixed(1)}%`;
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

  // 4b. Cobertura de precio por combustible (meses con dato ÷ meses del período)
  function updateCoverage() {
    const list = document.getElementById('coverageList');
    if (!list || !currentFilteredRecords.length) return;

    const total = currentFilteredRecords.length;
    const fuels = [
      { label: 'Nafta Súper', key: 'precio_nafta_super_ars', color: '#10b981' },
      { label: 'Nafta Premium', key: 'precio_nafta_premium_ars', color: '#a855f7' },
      { label: 'Gasoil', key: 'precio_gasoil_ars', color: '#f59e0b' }
    ];

    const subtitle = document.getElementById('coverageSubtitle');
    if (subtitle) subtitle.textContent = `Meses con precio sobre ${total} meses del período`;

    list.innerHTML = fuels.map(f => {
      const withPrice = currentFilteredRecords.filter(r => r[f.key] != null);
      const pct = (withPrice.length / total) * 100;
      const last = withPrice.length ? withPrice[withPrice.length - 1].etiqueta : 'sin datos en el período';
      return `
        <div>
          <div class="coverage-row-head">
            <strong>${f.label}</strong>
            <span>${pct.toFixed(0)}% (${withPrice.length}/${total})</span>
          </div>
          <div class="coverage-bar"><div class="coverage-bar-fill" style="width:${pct}%; background:${f.color};"></div></div>
          <div class="coverage-last">Último precio: ${last}</div>
        </div>`;
    }).join('');
  }

  // 5. Simulador de Sensibilidad de Demanda
  // Modelo: elasticidad. Línea recta entre los cambios relativos (logaritmos) del consumo y del dólar,
  // ambos contra el mismo mes del año anterior:
  //   ln(consumo_t / consumo_t-12) = α + β · ln(dólar_t / dólar_t-12)
  // β es la elasticidad: si el dólar sube 1%, el consumo cambia β%.
  const SIM_MODELS = {
    sinCovid: { label: 'Interanual sin 2020–21', excludedYears: [2020, 2021] },
    todos: { label: 'Interanual con todos los datos', excludedYears: [] }
  };
  // Hitos cambiarios usados para medir la sustitución (se excluyen los hitos de COVID y de precios)
  const SHOCKS_CAMBIARIOS = ['2018-05', '2018-08', '2019-08', '2022-07', '2023-12'];
  const SHOCK_HORIZON = 3; // meses posteriores al shock

  const usdOf = r => r.usd_promedio || r.usd_ultimo;

  function estimateElasticity(data, excludedYears) {
    const pairs = [];
    for (let t = 12; t < data.length; t++) {
      const prev = data[t - 12];
      const curr = data[t];
      if (!prev.total_consumo || !curr.total_consumo || !usdOf(prev) || !usdOf(curr)) continue;
      if (excludedYears.includes(prev.anio) || excludedYears.includes(curr.anio)) continue;
      pairs.push({
        x: Math.log(usdOf(curr) / usdOf(prev)),
        y: Math.log(curr.total_consumo / prev.total_consumo)
      });
    }

    const n = pairs.length;
    const meanX = pairs.reduce((s, p) => s + p.x, 0) / n;
    const meanY = pairs.reduce((s, p) => s + p.y, 0) / n;
    let sxx = 0, sxy = 0, syy = 0;
    pairs.forEach(p => {
      sxx += (p.x - meanX) ** 2;
      sxy += (p.x - meanX) * (p.y - meanY);
      syy += (p.y - meanY) ** 2;
    });
    const beta = sxy / sxx;
    const alpha = meanY - beta * meanX;

    // Error estándar simple de β (algo optimista: los meses consecutivos se parecen entre sí)
    const residuals = pairs.reduce((s, p) => s + (p.y - alpha - beta * p.x) ** 2, 0);
    const se = Math.sqrt(residuals / (n - 2) / sxx);

    return {
      beta,
      alpha,
      se,
      ciLow: beta - 1.96 * se,
      ciHigh: beta + 1.96 * se,
      r2: (sxy * sxy) / (sxx * syy),
      n,
      minUsdPct: (Math.exp(Math.min(...pairs.map(p => p.x))) - 1) * 100,
      maxUsdPct: (Math.exp(Math.max(...pairs.map(p => p.x))) - 1) * 100
    };
  }

  // Cambio de cuota de Premium (puntos porcentuales) entre el mes previo al shock y SHOCK_HORIZON meses después
  function estimateSubstitution(data) {
    const rows = SHOCKS_CAMBIARIOS.map(periodo => {
      const i = data.findIndex(r => r.periodo === periodo);
      if (i < 1 || i + SHOCK_HORIZON >= data.length) return null;
      const before = data[i - 1];
      const after = data[i + SHOCK_HORIZON];
      const usdPct = (usdOf(after) / usdOf(before) - 1) * 100;
      const premiumPp = after.share_nafta_premium - before.share_nafta_premium;
      return {
        periodo,
        hito: data[i].hito,
        desde: before.etiqueta,
        hasta: after.etiqueta,
        usdPct,
        premiumPp,
        ppPer10: (premiumPp / usdPct) * 10
      };
    }).filter(Boolean);

    const ratios = rows.map(r => r.ppPer10);
    return {
      rows,
      meanPer10: ratios.reduce((s, v) => s + v, 0) / ratios.length,
      minPer10: Math.min(...ratios),
      maxPer10: Math.max(...ratios)
    };
  }

  function initSimulator() {
    const slider = document.getElementById('simSliderUsd');
    const sliderLabel = document.getElementById('simSliderUsdVal');
    if (!slider) return;

    const data = fullDataset.data;
    const estimates = {
      sinCovid: estimateElasticity(data, SIM_MODELS.sinCovid.excludedYears),
      todos: estimateElasticity(data, SIM_MODELS.todos.excludedYears)
    };
    const substitution = estimateSubstitution(data);
    let activeModel = 'sinCovid';

    // Base: promedio de los últimos 12 meses (evita depender de la estacionalidad de un único mes)
    const last12 = data.slice(-12);
    const avg = key => last12.reduce((s, r) => s + (r[key] || 0), 0) / last12.length;
    const base = {
      consumo: avg('total_consumo'),
      sharePremium: avg('share_nafta_premium'),
      shareSuper: avg('share_nafta_super'),
      usd: usdOf(data[data.length - 1]),
      desde: last12[0].etiqueta,
      hasta: last12[last12.length - 1].etiqueta
    };

    const fmt = (v, d = 1) => v.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
    const signed = (v, d = 1) => `${v >= 0 ? '+' : ''}${fmt(v, d)}`;
    // Efecto del modelo: consumo estimado / consumo base = (1 + Δ% dólar)^β
    const effectPct = (beta, usdPct) => (Math.pow(1 + usdPct / 100, beta) - 1) * 100;

    function renderCoefficient() {
      const e = estimates[activeModel];
      const per10 = effectPct(e.beta, 10);
      const per10Low = effectPct(e.ciHigh, 10);
      const per10High = effectPct(e.ciLow, 10);
      document.getElementById('simCoefHeadline').textContent =
        `Por cada 10% de devaluación interanual, el consumo ${per10 < 0 ? 'cae' : 'sube'} ${fmt(Math.abs(per10), 2)}%`;
      document.getElementById('simCoefDetail').textContent =
        `Elasticidad β = ${fmt(e.beta, 3)} (IC 95%: ${fmt(e.ciLow, 3)} a ${fmt(e.ciHigh, 3)}) · ` +
        `efecto por 10%: entre ${fmt(per10High, 2)}% y ${fmt(per10Low, 2)}% · R² = ${fmt(e.r2, 2)} · ` +
        `n = ${e.n} comparaciones interanuales`;
      document.getElementById('simCoefMethod').textContent = activeModel === 'sinCovid'
        ? 'Modelo principal. Se excluyen las comparaciones en las que alguno de los dos meses cae en 2020 o 2021, porque el aislamiento por COVID y el rebote posterior no responden al tipo de cambio.'
        : 'Modelo de comparación. Incluye 2020–21: el shock de COVID agrega variación en el consumo que no tiene que ver con el dólar, por eso el ajuste (R²) es mucho menor.';
      document.getElementById('simRangeInfo').textContent =
        `Rango observado de variación interanual del dólar: ${signed(e.minUsdPct, 0)}% a ${signed(e.maxUsdPct, 0)}%`;
    }

    function runSimulation() {
      const e = estimates[activeModel];
      const usdPct = parseFloat(slider.value);
      sliderLabel.textContent = `${signed(usdPct, 0)}%`;

      const deltaPct = effectPct(e.beta, usdPct);
      const deltaLow = effectPct(e.ciHigh, usdPct);
      const deltaHigh = effectPct(e.ciLow, usdPct);
      const consumoSim = base.consumo * (1 + deltaPct / 100);
      const deltaM3 = consumoSim - base.consumo;

      // Sustitución simétrica: el mismo coeficiente aplica si el dólar sube o baja
      const premiumShift = substitution.meanPer10 * usdPct / 10;
      const simPremium = base.sharePremium + premiumShift;
      const simSuper = base.shareSuper - premiumShift;

      document.getElementById('simUsdResult').textContent = `$ ${fmt(base.usd * (1 + usdPct / 100), 0)}`;
      document.getElementById('simBaseResult').textContent = `${fmt(base.consumo, 0)} m³`;
      document.getElementById('simConsumoResult').textContent = `${fmt(consumoSim, 0)} m³`;

      const varEl = document.getElementById('simVarConsumoResult');
      varEl.textContent = `${signed(deltaPct, 2)}% (${signed(deltaM3, 0)} m³)`;
      varEl.style.color = deltaPct < 0 ? '#f43f5e' : '#10b981';
      document.getElementById('simVarRangeResult').textContent =
        `IC 95%: ${signed(Math.min(deltaLow, deltaHigh), 2)}% a ${signed(Math.max(deltaLow, deltaHigh), 2)}%`;

      document.getElementById('simSustitucionResult').textContent =
        `Súper: ${fmt(simSuper)}% | Premium: ${fmt(simPremium)}% (${signed(premiumShift, 2)} pp)`;

      const warning = document.getElementById('simRangeWarning');
      const outOfRange = usdPct < e.minUsdPct || usdPct > e.maxUsdPct;
      warning.hidden = !outOfRange;
      if (outOfRange) {
        warning.textContent = `⚠️ ${signed(usdPct, 0)}% está fuera del rango observado en los datos ` +
          `(${signed(e.minUsdPct, 0)}% a ${signed(e.maxUsdPct, 0)}%). El resultado es una extrapolación del modelo.`;
      }
    }

    function renderSubstitutionTable() {
      document.getElementById('simShockBody').innerHTML = substitution.rows.map(r => `
        <tr>
          <td><strong>${r.hito}</strong><br><span style="color: var(--text-muted); font-size: 0.75rem;">${r.desde} → ${r.hasta}</span></td>
          <td>${signed(r.usdPct)}%</td>
          <td style="color: ${r.premiumPp < 0 ? '#f43f5e' : '#10b981'};">${signed(r.premiumPp, 2)} pp</td>
          <td>${signed(r.ppPer10, 2)} pp</td>
        </tr>`).join('');
      document.getElementById('simShockSummary').textContent =
        `Promedio usado en el simulador: ${signed(substitution.meanPer10, 2)} pp de cuota Premium por cada 10% de devaluación ` +
        `(rango entre shocks: ${signed(substitution.minPer10, 2)} a ${signed(substitution.maxPer10, 2)} pp). ` +
        `Los shocks no muestran un efecto consistente (el signo cambia entre episodios), así que este coeficiente es muy incierto.`;
    }

    document.getElementById('simBaseInfo').textContent =
      `Base: promedio mensual ${base.desde} – ${base.hasta} · cuotas Súper ${fmt(base.shareSuper)}% / Premium ${fmt(base.sharePremium)}%`;

    const modelButtons = document.querySelectorAll('.sim-model-btn');
    modelButtons.forEach(btn => {
      btn.addEventListener('click', e => {
        modelButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeModel = e.currentTarget.dataset.model;
        renderCoefficient();
        runSimulation();
      });
    });

    slider.addEventListener('input', runSimulation);
    renderCoefficient();
    renderSubstitutionTable();
    runSimulation();
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

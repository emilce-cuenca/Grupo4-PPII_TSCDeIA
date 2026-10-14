# Dashboard de Análisis de Combustibles y Macroeconomía (2017–2025)
### Grupo 4 • Práctica Profesionalizante II (PPII)
**Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial**

Este proyecto es una aplicación web interactiva (Frontend SPA sin backend) para la visualización, exploración y análisis del consumo de combustibles líquidos en la **Ciudad de Corrientes**, su relación con los precios en surtidor y la evolución del tipo de cambio USD/ARS (variable nacional) entre 2017 y 2025.

> **Nota Metodológica:** Por especificación de los requerimientos, **el combustible GLPA fue completamente excluido** del análisis, de las métricas y de los cálculos de consumo total. El universo de análisis se enfoca en los combustibles líquidos automotores: **Nafta Súper**, **Nafta Premium** y **Gasoil**.

---

## Características Principales

1. **Indicadores Clave (KPIs):**
   - Consumo acumulado del período seleccionado en metros cúbicos ($m^3$) con indicador de variación relativa.
   - Cuota de mercado mensual de Nafta Súper y Gasoil.
   - Cotización del dólar estadounidense y devaluación acumulada en el rango temporal.

2. **Gráficos Interactivos:**
   - **Evolución Histórica de Consumo:** Series mensuales con alternador de visualización entre curvas de línea continua o gráfico de áreas apiladas (*stacked*), con selector dinámico de combustible.
   - **Efecto Sustitución de Naftas:** Análisis del comportamiento del consumidor ante cambios económicos (% cuota Nafta Súper vs. Nafta Premium).
   - **Demanda vs. Tipo de Cambio:** Gráfico de doble escala temporal (volumen en $m^3$ vs. cotización USD/ARS en pesos).
   - **Precios en Surtidor:** Evolución de precios por litro en estaciones de servicio, con selector para alternar entre pesos argentinos ($) y dólares (US$).

3. **Simulador de Sensibilidad de Demanda (Data Science Demo):**
   - Publica la elasticidad consumo-dólar estimada con los datos (con intervalo de confianza, R² y n), con dos modelos en solapas: interanual sin 2020–21 (principal) e interanual con todos los datos.
   - Slider de variación interanual del dólar (-30% a +350%) que estima el consumo mensual y la sustitución Premium → Súper, y avisa cuando el valor sale del rango observado.
   - Tabla de sustitución observada en los cinco shocks cambiarios catalogados.

4. **Explorador Tabular y Exportación:**
   - Tabla paginada con buscador en tiempo real por mes o año.
   - Botón de descarga de datos filtrados en formato **CSV**.

---

## Estructura del Repositorio

```text
Grupo4-PPII_TSCDeIA/
├── css/
│   └── styles.css              # Hoja de estilos con variables, glassmorphism y diseño responsivo
├── data/
│   └── fuel_economic_data.json # Dataset unificado y normalizado (sin GLPA)
├── datasets/                   # Datasets crudos originales provistos por la cátedra
│   ├── consumo_combustible - consumo_combustible.csv
│   ├── datos-historicos-usd-pesoarg.csv
│   └── precios surtidor combustibles - precios_surtidor_combustibles.csv
├── js/
│   ├── app.js                  # Lógica de filtros, cálculo de KPIs, simulador y tabla
│   ├── charts.js               # Instanciación y gestión reactiva de gráficos con Chart.js
│   └── data.js                 # Respaldo de datos para ejecución local directa
├── scripts/
│   └── preprocess_data.py      # Pipeline de limpieza y unificación de CSVs a JSON
├── .gitignore                  # Exclusión de entornos virtuales y temporales
├── index.html                  # Punto de entrada de la interfaz de usuario
├── vercel.json                 # Configuración de rutas y cabeceras de caché para Vercel
└── README.md                   # Documentación del proyecto
```

---

## Fuentes de Datos

| Variable | Fuente | Alcance |
|---|---|---|
| Consumo de combustibles (m³) | Portal de Datos Abiertos de la Municipalidad de Corrientes | Ciudad de Corrientes, mensual |
| Precios en surtidor ($/litro) | Portal de Datos Abiertos de la Municipalidad de Corrientes | Ciudad de Corrientes, mensual |
| Tipo de cambio USD/ARS | [Investing.com – Datos históricos USD/ARS](https://es.investing.com/currencies/usd-ars-historical-data) | Nacional, mensual |

> El tipo de cambio es una variable **nacional** comparada contra un consumo **local**. El dashboard muestra una **asociación** entre ambas series, no una relación causal: en el consumo de una ciudad también influyen la estacionalidad, la actividad económica local y el parque automotor.

---

## Metodología

El script [`scripts/preprocess_data.py`](scripts/preprocess_data.py) transforma los tres CSV de `datasets/` en `data/fuel_economic_data.json` (y su copia `js/data.js` para uso offline):

1. **Normalización de números y fechas:** se convierte el formato argentino (`1.189,00`, `$ 15,91`, `0,27%`) a `float` y todas las fechas a la clave mensual `YYYY-MM`.
2. **Exclusión de GLPA:** por especificación de los requerimientos, el GLPA se descarta de consumo y precios. El total de consumo se **recalcula** como `gasoil + nafta súper + nafta premium` (no se usa `total_general`).
3. **Cuotas de mercado:** `share_X = volumen_X / total_consumo × 100`; `ratio_premium_super = nafta_premium / nafta_súper`.
4. **Precios en dólares:** `precio_USD = precio_ARS / usd_promedio` del mes (si no hay promedio, se usa el último valor del mes).
5. **Unión por mes:** consumo, dólar y precios se unen por `YYYY-MM`. Un mes sin dato en una fuente queda en `null`.
6. **Hitos:** meses con eventos relevantes (crisis cambiarias, COVID, etc.) se marcan en el campo `hito` y se dibujan como líneas verticales en los gráficos.

**Indicadores del tablero**
- *Consumo Total Acumulado:* suma del consumo de los meses del período seleccionado. El porcentaje que lo acompaña es la variación entre el **último y el primer mes** del período, no el crecimiento del acumulado.
- *Cobertura de precio:* para cada combustible, `meses con precio ÷ meses del período seleccionado`. Se calcula en el navegador a partir del JSON.
- *Gasto en combustible en dólares:* `volumen (m³) × 1000 × precio_USD` por mes, en millones de US$, donde `precio_USD = precio_ARS ÷ USD/ARS del mes`. Sólo se calcula en los meses con precio; el total suma los tres combustibles y existe hasta Feb 2023, último mes en que los tres tienen precio.

**Simulador de sensibilidad (calculado en el navegador, `js/app.js`)**
- *Elasticidad β:* para cada mes se calcula el cambio relativo del dólar y del consumo respecto del mismo mes del año anterior (en logaritmos, para que los cambios relativos pesen igual), y se ajusta una recta por mínimos cuadrados: `ln(consumo_t / consumo_t-12) = α + β · ln(dólar_t / dólar_t-12)`. β se lee así: si el dólar sube 1%, el consumo cambia β%. El intervalo de confianza usa el error estándar simple de β, que es algo optimista porque las comparaciones interanuales se solapan.
  - *Modelo principal:* excluye las comparaciones en las que alguno de los dos meses cae en 2020 o 2021 (COVID). Resultado actual: β = -0,262 (IC 95%: -0,323 a -0,201), R² = 0,57, n = 56. Por cada 10% de devaluación interanual, el consumo cae ~2,5%.
  - *Modelo de comparación:* todos los datos. β = -0,303 (IC 95%: -0,428 a -0,178), R² = 0,20, n = 92.
  - *Por qué logaritmos:* en una prueba con los datos, tuvo menos error que el modelo lineal (≈8,0 vs ≈8,6 puntos porcentuales dentro de la muestra, y ≈8,4 vs ≈9,0 dejando un año afuera). La mejora es chica.
- *Variación en demanda:* `consumo estimado = consumo base × (1 + Δ% dólar)^β`, con consumo base = promedio mensual de los últimos 12 meses. Es un **efecto aislado, no un pronóstico**: no incluye la tendencia general (α) y el error típico del modelo es de ~8 puntos porcentuales de variación del consumo.
- *Sustitución:* para cada hito cambiario (2018-05, 2018-08, 2019-08, 2022-07, 2023-12) se mide el cambio de la cuota de Premium entre el mes previo y tres meses después, dividido por la variación del dólar en ese lapso. El simulador usa el promedio (-0,27 pp por cada 10% de devaluación; rango -1,30 a +0,58 pp).

---

## Límites y Advertencias

- **Los precios no cubren toda la serie.** Último mes con dato por combustible: **Nafta Premium: Mar 2022**, **Gasoil: Feb 2023**, **Nafta Súper: Oct 2023**. El gráfico de precios muestra los 104 meses con huecos y marca con un punto el último dato de cada combustible.
- Los hitos de **Dic 2023** y **Ene 2024** caen fuera del rango con precios.
- El **simulador de sensibilidad** es un modelo demostrativo, no una proyección validada. Mide asociación, no causalidad. En los datos el dólar siempre subió entre +20% y +349% interanual: valores fuera de ese rango son extrapolaciones. El coeficiente de sustitución es muy incierto (el signo cambia entre shocks).
- Los datos de consumo y precios corresponden a una sola ciudad y no son extrapolables al país.

---

## Reproducibilidad

El script usa sólo la librería estándar de Python (no requiere `requirements.txt`). Para regenerar los datos desde los CSV crudos:

```bash
python scripts/preprocess_data.py
```

Esto sobrescribe `data/fuel_economic_data.json` y `js/data.js`. Si se cambia la fuente, un hito o el título, hay que editar el script y volver a ejecutarlo, en lugar de modificar los archivos generados.

---

## Cómo Ejecutar Localmente

### Opción 1: Servidor HTTP local con Python (Recomendado)
Desde la terminal en la raíz del proyecto, ejecuta:
```bash
.\.venv\Scripts\python.exe -m http.server 8000
```
O con el comando Python de tu sistema:
```bash
python -m http.server 8000
```
Luego abre en tu navegador: [http://localhost:8000](http://localhost:8000).

### Opción 2: Apertura directa
Puedes abrir directamente el archivo `index.html` haciendo doble clic sobre él en tu explorador de archivos.

---

## Guía Paso a Paso para Desplegar en Vercel

Dado que la aplicación es un **Frontend estático optimizado**, su despliegue en Vercel es automático, sin costo y toma menos de 1 minuto:

### Método A: A través de GitHub (Recomendado)
1. **Subir el proyecto a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Dashboard de combustibles Grupo 4"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```
2. **Conectar en Vercel:**
   - Ingresa a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
   - Haz clic en **"Add New..."** > **"Project"**.
   - Selecciona el repositorio de tu proyecto (`Grupo4-PPII_TSCDeIA`).
   - Deja las opciones de configuración por defecto (**Framework Preset: Other**, **Root Directory: ./**).
   - Haz clic en **"Deploy"**.
3. ¡Listo! Vercel te proporcionará una URL pública segura (ejemplo: `https://grupo4-ppii.vercel.app`) para compartir con el supervisor y la cátedra.

### Método B: Mediante Vercel CLI
Si tienes la herramienta CLI de Vercel:
```bash
npm i -g vercel
vercel
```
Sigue las instrucciones en pantalla aceptando las opciones predeterminadas.

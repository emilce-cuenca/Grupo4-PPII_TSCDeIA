# Dashboard de Análisis de Combustibles y Macroeconomía (2017–2025)
### Grupo 4 • Práctica Profesionalizante II (PPII)
**Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial**

Este proyecto es una aplicación web interactiva (Frontend SPA sin backend) para la visualización, exploración y análisis del consumo de combustibles líquidos en Argentina, su relación con los precios en surtidor y la evolución del tipo de cambio oficial USD/ARS entre 2017 y 2025.

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
   - Control interactivo para proyectar escenarios de variación cambiaria (-30% a +100%) y observar el impacto estimado en el consumo y la sustitución de combustibles basándose en la elasticidad empírica observada.

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



# Análisis de Combustibles & Macroeconomía — Corrientes (2017 - 2025)

Dashboard interactivo desarrollado para la Práctica Profesionalizante II (TSCDelA). Permite analizar la evolución histórica de consumos, precios en surtidor y tipos de cambio USD/ARS.

## 🛠 Tecnologías Utilizadas
- **HTML5 / CSS3 / JavaScript (ES6+)**
- **Chart.js** para la visualización de gráficos interactivos.
- **Vercel** para despliegue y hosting continuo.

## 📊 Metodología y Generación de Datos
El archivo principal `fuel_economic_data.json` (ubicado en la carpeta `data/`) se genera a partir de las fuentes de datos crudas mediante scripts de procesamiento de datos que unifican las series temporales de volúmenes de combustibles, índices de precios y cotizaciones del dólar correspondientes al período analizado.

## 🚀 Análisis: Próximos pasos (Evolución metodológica)

| Indicador | Cómo | Por qué |
| :--- | :--- | :--- |
| **Precio real** | precio en pesos $\div$ IPC, con un mes base | Completa la pregunta de si el combustible se encareció en términos reales, hoy solo respondida en dólares. |
| **Consumo per cápita** | consumo $\div$ población de la ciudad | Separa la caída de actividad del crecimiento de la población. La capa municipal de población sirve como base. |
| **Elasticidad por combustible** | el mismo modelo, por separado para Súper, Premium y Gasoil | El gasoil responde a transporte y agro, no a consumo de hogares: es esperable que su elasticidad sea distinta. |

## 👥 Grupo 4
- Integrantes del equipo de desarrollo.
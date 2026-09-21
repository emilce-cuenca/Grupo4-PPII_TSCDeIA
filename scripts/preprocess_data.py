#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de procesamiento y consolidación de datos para Grupo 4 - PPII TSCDeIA.
Unifica datasets de:
1. Consumo de combustibles (sin GLPA)
2. Tipo de cambio histórico USD/ARS
3. Precios en surtidor (sin GLPA)

Genera data/fuel_economic_data.json y js/data.js
"""

import os
import csv
import json
import re
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
DATA_OUT_DIR = os.path.join(BASE_DIR, "data")
JS_OUT_DIR = os.path.join(BASE_DIR, "js")

os.makedirs(DATA_OUT_DIR, exist_ok=True)
os.makedirs(JS_OUT_DIR, exist_ok=True)

def parse_arg_number(val_str):
    """Convierte cadenas con formato numérico argentino (ej. '1.189,00' o '15,9' o ' $ 15,91 ') a float."""
    if val_str is None:
        return None
    s = str(val_str).strip()
    if not s:
        return None
    # Eliminar símbolos de moneda, %, espacios
    s = s.replace("$", "").replace("%", "").replace(" ", "").strip()
    if not s:
        return None
    # Eliminar puntos de miles y cambiar coma por punto decimal
    # Caso 1: tiene punto y coma, ej '1.189,00' -> remover punto, coma a punto
    if "." in s and "," in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return round(float(s), 4)
    except ValueError:
        return None

def normalize_date_key(date_str):
    """Normaliza varias representaciones de fechas a clave canónica YYYY-MM."""
    s = date_str.strip()
    # Casos: '2017/01/01', '2017-01-01'
    m = re.match(r"^(\d{4})[/-](\d{1,2})[/-](\d{1,2})", s)
    if m:
        year, month = int(m.group(1)), int(m.group(2))
        return f"{year:04d}-{month:02d}"
    
    # Casos: '01/01/2017' o '1/1/2017' (D/M/YYYY)
    m = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})", s)
    if m:
        day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"{year:04d}-{month:02d}"
        
    raise ValueError(f"Formato de fecha no reconocido: {date_str}")

def load_consumo():
    filename = "consumo_combustible - consumo_combustible.csv"
    path = os.path.join(DATASETS_DIR, filename)
    consumo_by_month = {}
    
    with open(path, "r", encoding="latin-1") as f:
        reader = csv.DictReader(f)
        for row in reader:
            periodo = row.get("periodo", "").strip()
            if not periodo:
                continue
            month_key = normalize_date_key(periodo)
            gasoil = parse_arg_number(row.get("volumen_gasoil", 0)) or 0.0
            nafta_super = parse_arg_number(row.get("volumen_nafta_comun_y_super", 0)) or 0.0
            nafta_premium = parse_arg_number(row.get("volumen_nafta_premium", 0)) or 0.0
            
            # Recalcular total estrictamente para combustibles líquidos (SIN GLPA)
            total_liquidos = round(gasoil + nafta_super + nafta_premium, 2)
            
            share_gasoil = round((gasoil / total_liquidos * 100), 2) if total_liquidos > 0 else 0
            share_super = round((nafta_super / total_liquidos * 100), 2) if total_liquidos > 0 else 0
            share_premium = round((nafta_premium / total_liquidos * 100), 2) if total_liquidos > 0 else 0
            ratio_premium_super = round((nafta_premium / nafta_super), 4) if nafta_super > 0 else 0
            
            consumo_by_month[month_key] = {
                "volumen_gasoil": gasoil,
                "volumen_nafta_super": nafta_super,
                "volumen_nafta_premium": nafta_premium,
                "total_consumo": total_liquidos,
                "share_gasoil": share_gasoil,
                "share_nafta_super": share_super,
                "share_nafta_premium": share_premium,
                "ratio_premium_super": ratio_premium_super
            }
    return consumo_by_month

def load_usd():
    filename = "datos-historicos-usd-pesoarg.csv"
    path = os.path.join(DATASETS_DIR, filename)
    usd_by_month = {}
    
    with open(path, "r", encoding="latin-1") as f:
        # Delimitador es punto y coma
        reader = csv.reader(f, delimiter=";")
        headers = [h.strip() for h in next(reader)]
        
        for row in reader:
            if not row or not any(row):
                continue
            # Header: Fecha;Último;Apertura;Máximo;Mínimo;% var.;promedio_simple_mes
            fecha_raw = row[0].strip()
            month_key = normalize_date_key(fecha_raw)
            
            ultimo = parse_arg_number(row[1]) if len(row) > 1 else None
            apertura = parse_arg_number(row[2]) if len(row) > 2 else None
            maximo = parse_arg_number(row[3]) if len(row) > 3 else None
            minimo = parse_arg_number(row[4]) if len(row) > 4 else None
            var_pct = parse_arg_number(row[5]) if len(row) > 5 else None
            promedio = parse_arg_number(row[6]) if len(row) > 6 else None
            
            usd_by_month[month_key] = {
                "usd_ultimo": ultimo,
                "usd_apertura": apertura,
                "usd_maximo": maximo,
                "usd_minimo": minimo,
                "usd_var_pct": var_pct,
                "usd_promedio": promedio if promedio is not None else ultimo
            }
    return usd_by_month

def load_precios():
    filename = "precios surtidor combustibles - precios_surtidor_combustibles.csv"
    path = os.path.join(DATASETS_DIR, filename)
    precios_by_month = {}
    
    with open(path, "r", encoding="latin-1") as f:
        reader = csv.reader(f, delimiter=",")
        header = next(reader)
        # Headers: fecha, gasoil, glpa, nafta_comun_y_super, nafta_premium
        for row in reader:
            if not row or not any(row):
                continue
            fecha_raw = row[0].strip()
            month_key = normalize_date_key(fecha_raw)
            
            gasoil_p = parse_arg_number(row[1]) if len(row) > 1 else None
            # row[2] es glpa -> IGNORAR
            super_p = parse_arg_number(row[3]) if len(row) > 3 else None
            premium_p = parse_arg_number(row[4]) if len(row) > 4 else None
            
            precios_by_month[month_key] = {
                "precio_gasoil_ars": gasoil_p,
                "precio_nafta_super_ars": super_p,
                "precio_nafta_premium_ars": premium_p
            }
    return precios_by_month

def build_dataset():
    consumo_data = load_consumo()
    usd_data = load_usd()
    precios_data = load_precios()
    
    all_months = sorted(list(set(list(consumo_data.keys()) + list(usd_data.keys()))))
    
    monthly_records = []
    
    # Nombres de meses en español
    meses_es = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    
    for m in all_months:
        c = consumo_data.get(m, {})
        u = usd_data.get(m, {})
        p = precios_data.get(m, {
            "precio_gasoil_ars": None,
            "precio_nafta_super_ars": None,
            "precio_nafta_premium_ars": None
        })
        
        year, month = map(int, m.split("-"))
        label = f"{meses_es[month-1]} {year}"
        
        # Precios en USD
        usd_ref = u.get("usd_promedio") or u.get("usd_ultimo")
        p_gasoil_usd = round(p["precio_gasoil_ars"] / usd_ref, 2) if (p["precio_gasoil_ars"] and usd_ref) else None
        p_super_usd = round(p["precio_nafta_super_ars"] / usd_ref, 2) if (p["precio_nafta_super_ars"] and usd_ref) else None
        p_premium_usd = round(p["precio_nafta_premium_ars"] / usd_ref, 2) if (p["precio_nafta_premium_ars"] and usd_ref) else None
        
        # Hitos históricos para contexto analítico
        hito = None
        if m == "2018-05":
            hito = "Inicio crisis cambiaria 2018"
        elif m == "2018-08":
            hito = "Salto del dólar (agosto 2018)"
        elif m == "2019-08":
            hito = "Efecto elecciones PASO 2019"
        elif m == "2020-03":
            hito = "Inicio Aislamiento ASPO (COVID-19)"
        elif m == "2020-04":
            hito = "Mínimo histórico de movilidad COVID"
        elif m == "2022-07":
            hito = "Tensión cambiaria (renuncia Min. Economía)"
        elif m == "2023-12":
            hito = "Ajuste cambiario oficial (Dic 2023)"
        elif m == "2024-01":
            hito = "Reajuste de precios de combustibles"
            
        record = {
            "periodo": m,
            "fecha_completa": f"{m}-01",
            "etiqueta": label,
            "anio": year,
            "mes": month,
            "hito": hito,
            # Consumo en m3 (sin GLPA)
            "volumen_gasoil": c.get("volumen_gasoil"),
            "volumen_nafta_super": c.get("volumen_nafta_super"),
            "volumen_nafta_premium": c.get("volumen_nafta_premium"),
            "total_consumo": c.get("total_consumo"),
            "share_gasoil": c.get("share_gasoil"),
            "share_nafta_super": c.get("share_nafta_super"),
            "share_nafta_premium": c.get("share_nafta_premium"),
            "ratio_premium_super": c.get("ratio_premium_super"),
            # Dólar
            "usd_ultimo": u.get("usd_ultimo"),
            "usd_promedio": u.get("usd_promedio"),
            "usd_var_pct": u.get("usd_var_pct"),
            # Precios ARS
            "precio_gasoil_ars": p.get("precio_gasoil_ars"),
            "precio_nafta_super_ars": p.get("precio_nafta_super_ars"),
            "precio_nafta_premium_ars": p.get("precio_nafta_premium_ars"),
            # Precios USD
            "precio_gasoil_usd": p_gasoil_usd,
            "precio_nafta_super_usd": p_super_usd,
            "precio_nafta_premium_usd": p_premium_usd
        }
        monthly_records.append(record)
        
    # Calcular estadísticas globales para KPIs
    total_volumen_historico = sum(r["total_consumo"] for r in monthly_records if r["total_consumo"])
    
    # Mínimo y máximo histórico de consumo mensual
    valid_consumos = [r for r in monthly_records if r["total_consumo"]]
    min_consumo_rec = min(valid_consumos, key=lambda x: x["total_consumo"])
    max_consumo_rec = max(valid_consumos, key=lambda x: x["total_consumo"])
    
    # Primer y último registro USD
    usd_records = [r for r in monthly_records if r["usd_ultimo"]]
    primer_usd = usd_records[0]["usd_ultimo"]
    ultimo_usd = usd_records[-1]["usd_ultimo"]
    devaluacion_acumulada_pct = round(((ultimo_usd - primer_usd) / primer_usd) * 100, 1)
    
    # Último registro disponible
    ultimo_record = monthly_records[-1]
    
    summary = {
        "total_registros_meses": len(monthly_records),
        "periodo_inicio": monthly_records[0]["periodo"],
        "periodo_fin": monthly_records[-1]["periodo"],
        "total_volumen_historico_m3": round(total_volumen_historico, 2),
        "minimo_historico_consumo": {
            "periodo": min_consumo_rec["periodo"],
            "etiqueta": min_consumo_rec["etiqueta"],
            "volumen": min_consumo_rec["total_consumo"],
            "causa": "Aislamiento Preventivo Obligatorio (COVID-19)"
        },
        "maximo_historico_consumo": {
            "periodo": max_consumo_rec["periodo"],
            "etiqueta": max_consumo_rec["etiqueta"],
            "volumen": max_consumo_rec["total_consumo"]
        },
        "usd_inicial": primer_usd,
        "usd_actual": ultimo_usd,
        "devaluacion_acumulada_pct": devaluacion_acumulada_pct,
        "ultimo_mes": {
            "periodo": ultimo_record["periodo"],
            "etiqueta": ultimo_record["etiqueta"],
            "total_consumo": ultimo_record["total_consumo"],
            "usd": ultimo_record["usd_ultimo"],
            "share_super": ultimo_record["share_nafta_super"],
            "share_premium": ultimo_record["share_nafta_premium"],
            "share_gasoil": ultimo_record["share_gasoil"]
        },
        "combustibles_incluidos": ["Gasoil", "Nafta Súper", "Nafta Premium"],
        "combustibles_excluidos": ["GLPA"]
    }
    
    final_output = {
        "metadata": {
            "proyecto": "Grupo 4 - PPII (Práctica Profesionalizante II)",
            "carrera": "Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial",
            "titulo": "Dashboard de Análisis de Combustibles y Variables Macroeconómicas",
            "fecha_generacion": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "fuentes": [
                "Secretaría de Energía de la Nación (Consumo y Precios)",
                "Datos Históricos Tipo de Cambio USD/ARS"
            ]
        },
        "summary": summary,
        "data": monthly_records
    }
    
    # 1. Guardar JSON en data/
    json_path = os.path.join(DATA_OUT_DIR, "fuel_economic_data.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)
    print(f"[OK] Archivo JSON generado exitosamente en: {json_path}")
    
    # 2. Guardar JS en js/data.js (para soporte instantáneo offline / file://)
    js_path = os.path.join(JS_OUT_DIR, "data.js")
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("/* Datos consolidados generados automáticamente - Grupo 4 PPII */\n")
        f.write("window.FUEL_DATA = ")
        json.dump(final_output, f, ensure_ascii=False)
        f.write(";\n")
    print(f"[OK] Archivo JS generado exitosamente en: {js_path}")

if __name__ == "__main__":
    build_dataset()

"""
Configuración del módulo de Inteligencia Artificial (Google Gemini)
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

IA_CONFIG = {
    "api_key": os.getenv("GOOGLE_AI_API_KEY", ""),
    "model": os.getenv("GOOGLE_AI_MODEL", "gemini-2.0-flash"),
    "timeout": int(os.getenv("GOOGLE_AI_TIMEOUT", "30")),  # 30s — suficiente para bajo volumen (3-5 req/min)
    "retries": 0,  # Sin reintentos — si falla, fallback inmediato al regex
}

# System instruction — Gemini es un EXTRACTOR simple de campos
# Balance: Detalles suficientes + velocidad
SYSTEM_INSTRUCTION = (
    "Extrae de un texto OCR: cedula (10 dígitos), nombres, apellidos. "
    "Corrige errores OCR obvios (0→O, 1→I, D0→DO, etc.). "
    "Responde SOLO JSON: {\"cedula\":\"...\",\"nombres\":\"...\",\"apellidos\":\"...\"}"
)

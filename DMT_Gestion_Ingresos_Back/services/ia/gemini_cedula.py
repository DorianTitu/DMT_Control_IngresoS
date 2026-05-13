"""
Servicio Gemini para extracción de datos de cédulas ecuatorianas.

Optimizaciones:
  - Cache en memoria por hash del texto OCR
  - System instruction separada (menos tokens variables facturados)
  - responseMimeType=application/json → JSON puro sin markdown
  - maxOutputTokens=64 (respuesta siempre pequeña)
  - Header X-goog-api-key
"""

import hashlib
import json
import logging
import re
import urllib.request
import urllib.error
from typing import Dict, Optional

from config.ia_config import IA_CONFIG, SYSTEM_INSTRUCTION

logger = logging.getLogger(__name__)

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models"
    "/{model}:generateContent"
)

# Cache en memoria: sha256(texto_ocr) → resultado limpio
_cache: Dict[str, Dict] = {}


def _cache_key(*textos: str) -> str:
    contenido = "|".join(t.strip() for t in textos)
    return hashlib.sha256(contenido.encode()).hexdigest()


def _ultimos_10_digitos(texto: str) -> str:
    return re.sub(r"\D", "", texto or "")[-10:]


class GeminiCedulaService:
    """Limpia y estructura el texto OCR de una cédula usando Gemini."""

    def __init__(self):
        self.api_key = IA_CONFIG["api_key"]
        self.model = IA_CONFIG["model"]
        self.timeout = IA_CONFIG["timeout"]
        self.url = _GEMINI_URL.format(model=self.model)

        if not self._esta_configurado():
            logger.warning("GOOGLE_AI_API_KEY no configurada — módulo IA deshabilitado")
        else:
            logger.info(f"[Gemini] Modelo activo: {self.model}")

    def _esta_configurado(self) -> bool:
        return bool(self.api_key) and self.api_key != "tu_api_key_aqui"

    # ------------------------------------------------------------------
    # Método principal: texto OCR bruto → JSON limpio
    # ------------------------------------------------------------------

    def extraer_campos_desde_texto_ocr(self, texto_ocr_bruto: str) -> Dict:
        """
        Recibe el texto OCR completo de la cédula (tal como lo detectó EasyOCR)
        y retorna los datos limpios estructurados.

        Args:
            texto_ocr_bruto: cadena OCR, ej:
                "APELLIDOS ESTRADA VEGA NOMBRES D0EI4N AL3X4N5R NUI.0928470756"

        Returns:
            { "cedula": "0928470756", "nombres": "DORIAN ALEXANDER",
              "apellidos": "ESTRADA VEGA", "cache": False, "origen": "gemini" }
        """
        if not self._esta_configurado():
            return self._sin_ia("GOOGLE_AI_API_KEY no configurada")

        key = _cache_key(texto_ocr_bruto)

        if key in _cache:
            logger.info("[Gemini] Cache hit")
            return {**_cache[key], "cache": True}

        try:
            prompt = f"Texto OCR:\n{texto_ocr_bruto.strip()}"
            respuesta = self._llamar_api(prompt)
            resultado = self._parsear_respuesta(respuesta)
            resultado["origen"] = "gemini"
            resultado["cache"] = False

            _cache[key] = {k: v for k, v in resultado.items() if k != "cache"}
            logger.info(
                f"[Gemini] OK | cedula={resultado['cedula']} | "
                f"nombres={resultado['nombres']} | apellidos={resultado['apellidos']} | "
                f"cache_size={len(_cache)}"
            )
            return resultado

        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="ignore")
            logger.error(f"[Gemini] HTTP {e.code}: {body[:200]}")
            return self._sin_ia(f"HTTP {e.code}: {body[:100]}")
        except urllib.error.URLError as e:
            logger.error(f"[Gemini] Error de red: {e}")
            return self._sin_ia(f"Error de red: {e}")
        except json.JSONDecodeError as e:
            logger.error(f"[Gemini] JSON inválido en respuesta: {e}")
            return self._sin_ia(f"Respuesta no es JSON: {e}")
        except Exception as e:
            logger.error(f"[Gemini] Error inesperado: {e}")
            return self._sin_ia(str(e))

    def limpiar_datos_cedula(
        self,
        texto_ocr_numero: str,
        texto_ocr_nombres: str,
        texto_ocr_apellidos: str = "",
    ) -> Dict:
        """
        Variante que recibe los tres campos OCR separados.
        Los combina y llama a extraer_campos_desde_texto_ocr.
        """
        texto_combinado = (
            f"NUM:{texto_ocr_numero.strip()} "
            f"NOM:{texto_ocr_nombres.strip()} "
            f"APE:{texto_ocr_apellidos.strip()}"
        )
        return self.extraer_campos_desde_texto_ocr(texto_combinado)

    # ------------------------------------------------------------------
    # Cache
    # ------------------------------------------------------------------

    def limpiar_cache(self):
        _cache.clear()
        logger.info("[Gemini] Caché vaciado")

    def info_cache(self) -> Dict:
        return {"entradas": len(_cache), "claves": list(_cache.keys())}

    # ------------------------------------------------------------------
    # HTTP
    # ------------------------------------------------------------------

    def _llamar_api(self, prompt_usuario: str) -> str:
        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_INSTRUCTION}]
            },
            "contents": [
                {"role": "user", "parts": [{"text": prompt_usuario}]}
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 64,
                "responseMimeType": "application/json",
            },
        }

        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-goog-api-key": self.api_key,
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        return (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )

    # ------------------------------------------------------------------
    # Parsing
    # ------------------------------------------------------------------

    def _parsear_respuesta(self, texto: str) -> Dict:
        if not texto or not texto.strip():
            raise json.JSONDecodeError("Respuesta vacía", "", 0)

        # Limpiar markdown si Gemini lo agrega pese al responseMimeType
        texto = re.sub(r"```(?:json)?", "", texto).strip()

        # Buscar bloque JSON
        match = re.search(r"\{.*?\}", texto, re.DOTALL)
        if match:
            texto = match.group(0)

        # Cerrar llaves si JSON fue truncado
        if texto.count("{") > texto.count("}"):
            texto += "}" * (texto.count("{") - texto.count("}"))

        try:
            datos = json.loads(texto)
        except json.JSONDecodeError:
            # Último recurso: extraer campos con regex
            logger.warning(f"[Gemini] JSON no parseable, extrayendo con regex: {texto[:100]}")
            datos = {
                "cedula":    (re.search(r'"cedula"\s*:\s*"([^"]*)"', texto) or [None, ""])[1],
                "nombres":   (re.search(r'"nombres"\s*:\s*"([^"]*)"', texto) or [None, ""])[1],
                "apellidos": (re.search(r'"apellidos"\s*:\s*"([^"]*)"', texto) or [None, ""])[1],
            }

        return {
            "cedula":    _ultimos_10_digitos(str(datos.get("cedula", ""))),
            "nombres":   str(datos.get("nombres", "")).strip().upper(),
            "apellidos": str(datos.get("apellidos", "")).strip().upper(),
        }

    def _sin_ia(self, motivo: str) -> Dict:
        return {
            "cedula": "",
            "nombres": "",
            "apellidos": "",
            "origen": "sin_ia",
            "cache": False,
            "error": motivo,
        }

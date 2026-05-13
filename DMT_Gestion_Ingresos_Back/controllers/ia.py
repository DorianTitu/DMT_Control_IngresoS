"""
Endpoints de IA — extracción y limpieza de datos de cédula con Google Gemini.
"""

import logging
import base64
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Literal
from starlette.concurrency import run_in_threadpool

from services.ocr.cedula_nacional_nueva import CedulaNacionalNuevaOCR
from services.ocr.cedula_nacional_antigua import CedulaNacionalAntiguaOCR
from services.ia.gemini_cedula import GeminiCedulaService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ia", tags=["IA - Google Gemini"])

# Instancia compartida — el caché vive aquí durante todo el proceso
_gemini = GeminiCedulaService()


def _ultimos_10_digitos(texto: str) -> str:
    import re

    return re.sub(r"\D", "", texto or "")[-10:]


class ImagenCedulaRequest(BaseModel):
    imagen_base64: str
    tipo_cedula: Literal["nueva", "antigua"] = "nueva"
    tipo_camara: Literal["peatonal", "vehicular"] = "peatonal"


class TextoOCRRequest(BaseModel):
    texto_completo: str  # Texto OCR completo de la cédula


def _parsear_cedula_ocr(texto: str) -> dict:
    """
    Parsea el texto OCR completo de una cédula y extrae:
    - Cédula (busca primero después de "DOCUMENTO", luego cualquier número de 10 dígitos)
    - Nombres (después de "NOMBRES")
    - Apellidos (después de "APELLIDOS")
    """
    import re
    
    texto_upper = texto.upper()
    
    cedula = _ultimos_10_digitos(texto_upper)
    
    # Extraer apellidos - buscar después de "APELLIDOS" hasta "NOMBRES"
    apellidos = ""
    match_apellidos = re.search(r'APELLIDOS\s+(.+?)(?=NOMBRES)', texto_upper)
    if match_apellidos:
        apellidos = match_apellidos.group(1).strip()
        # Limpiar extra whitespace
        apellidos = ' '.join(apellidos.split())
    
    # Extraer nombres - buscar después de "NOMBRES" hasta siguiente palabra clave
    nombres = ""
    match_nombres = re.search(r'NOMBRES\s+(.+?)(?=NACIONALIDAD|SEXO|FECHA|NUI|$)', texto_upper)
    if match_nombres:
        nombres = match_nombres.group(1).strip()
        # Limpiar extra whitespace
        nombres = ' '.join(nombres.split())
    
    logger.debug(f"[PARSER] Cédula: '{cedula}' | Nombres: '{nombres}' | Apellidos: '{apellidos}'")
    
    return {
        "cedula": cedula,
        "nombres": nombres,
        "apellidos": apellidos,
    }


@router.post("/cedula/procesar")
async def procesar_cedula_con_ia(datos: ImagenCedulaRequest):
    """
    Pipeline completo: imagen base64 → OCR → Gemini → datos limpios.

    Respuesta incluye:
    - resultado_ia: { cedula, nombres, apellidos, confianza, cache }
    - ocr_crudo: texto bruto detectado por EasyOCR en cada zona
    """
    try:
        imagen_bytes = base64.b64decode(datos.imagen_base64)

        ocr = (
            CedulaNacionalNuevaOCR(tipo_camara=datos.tipo_camara)
            if datos.tipo_cedula == "nueva"
            else CedulaNacionalAntiguaOCR(tipo_camara=datos.tipo_camara)
        )

        logger.info(f"[IA] OCR número ({datos.tipo_cedula}/{datos.tipo_camara})")
        res_numero = await run_in_threadpool(ocr.procesar_numero_cedula, imagen_bytes)

        logger.info(f"[IA] OCR nombres ({datos.tipo_cedula}/{datos.tipo_camara})")
        res_nombres = await run_in_threadpool(ocr.procesar_nombres_apellidos, imagen_bytes)

        texto_numero = res_numero.get("ocr", {}).get("texto_completo", "")
        cedula_ocr = res_numero.get("numero_cedula_parseado", {}).get("numero", "")
        parsed_nombres = res_nombres.get("nombres_apellidos_parseados", {})
        texto_nombres = parsed_nombres.get("nombres", "")
        texto_apellidos = parsed_nombres.get("apellidos", "")

        logger.info("[IA] Enviando a Gemini...")
        resultado_ia = await run_in_threadpool(_gemini.limpiar_datos_cedula, texto_numero, texto_nombres, texto_apellidos)
        if len(cedula_ocr) == 10:
            resultado_ia["cedula"] = cedula_ocr
            resultado_ia["cedula_origen"] = "ocr_numero"

        return {
            "tipo_cedula": datos.tipo_cedula,
            "tipo_camara": datos.tipo_camara,
            "resultado_ia": resultado_ia,
            "ocr_crudo": {
                "numero": texto_numero,
                "numero_parseado": cedula_ocr,
                "nombres": texto_nombres,
                "apellidos": texto_apellidos,
            },
        }

    except Exception as e:
        logger.error(f"[IA] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cedula/limpiar-texto")
async def limpiar_texto_con_ia(datos: TextoOCRRequest):
    """
    Flujo:
        1️⃣ Envía texto OCR BRUTO a Gemini
        2️⃣ Gemini extrae: cedula, nombres, apellidos
        3️⃣ Si Gemini falla → fallback a regex
        4️⃣ Arma JSON de salida con los datos + confianza, origen, cache

    Body:
        texto_completo → Texto OCR bruto de la cédula

    Respuesta:
        { 
            "cedula": "0928470756", 
            "nombres": "LISBETH CAROLINA", 
            "apellidos": "ESTRADA VEGA", 
            "confianza": 1.0,
            "origen": "gemini" | "ocr_fallback",
            "cache": True | False
        }
    """
    try:
        # ====== PASO 1: ENVIAR A GEMINI ======
        logger.info(f"[IA] 1️⃣ Enviando texto OCR bruto a Gemini...")
        resultado_gemini = await run_in_threadpool(
            _gemini.extraer_campos_desde_texto_ocr,
            datos.texto_completo,
        )
        
        # Si Gemini extrajo con éxito → retornar con confianza alta
        if resultado_gemini.get("origen") == "gemini":
            logger.info(f"[IA] ✅ Gemini extrajo: cedula={resultado_gemini.get('cedula')}")
            return {
                "cedula": resultado_gemini.get("cedula", ""),
                "nombres": resultado_gemini.get("nombres", "").strip(),
                "apellidos": resultado_gemini.get("apellidos", "").strip(),
                "confianza": 1.0,
                "origen": "gemini",
                "cache": resultado_gemini.get("cache", False)
            }
        
        # ====== PASO 2: FALLBACK A REGEX (Gemini falló) ======
        logger.warning(f"[IA] 2️⃣ Gemini falló ({resultado_gemini.get('error')}), usando regex fallback...")
        datos_regex = _parsear_cedula_ocr(datos.texto_completo)
        
        # Validar que el regex extrajo algo
        if not datos_regex.get("cedula") and not datos_regex.get("nombres"):
            logger.error(f"[IA] ❌ Ni Gemini ni regex pudieron extraer datos")
            raise HTTPException(
                status_code=400, 
                detail="No se pudo extraer información de la cédula"
            )
        
        logger.info(f"[IA] ✅ Regex extrajo fallback: cedula={datos_regex.get('cedula')}")
        
        return {
            "cedula": datos_regex["cedula"],
            "nombres": datos_regex["nombres"].strip(),
            "apellidos": datos_regex["apellidos"].strip(),
            "confianza": 0.3,
            "origen": "ocr_fallback",
            "cache": False
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[IA] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cache/info")
async def info_cache():
    """Retorna estadísticas del caché en memoria de Gemini."""
    return _gemini.info_cache()


@router.delete("/cache")
async def limpiar_cache():
    """Vacía el caché en memoria de Gemini."""
    _gemini.limpiar_cache()
    return {"mensaje": "Caché vaciado correctamente"}

import logging
import base64
import io
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from PIL import Image, ImageDraw
from starlette.concurrency import run_in_threadpool

from config.ocr_cedula_config import OCR_ZONAS
from services.ocr.cedula_nacional_nueva import CedulaNacionalNuevaOCR
from services.ocr.cedula_nacional_antigua import CedulaNacionalAntiguaOCR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ocr", tags=["OCR"])


# Modelos de entrada
class ImagenBase64(BaseModel):
    """Modelo para recibir imagen en Base64"""
    imagen_base64: str


def _imagen_a_base64(img: Image.Image) -> str:
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _dibujar_zonas_ocr(imagen_bytes: bytes, tipo_camara: str, tipo_cedula: str) -> dict:
    img = Image.open(io.BytesIO(imagen_bytes)).convert("RGB")
    draw = ImageDraw.Draw(img)
    zonas = OCR_ZONAS[tipo_camara][tipo_cedula]
    colores = {
        "zona_numero": "#D60612",
        "zona_nombres_apellidos": "#2563EB",
    }
    etiquetas = {
        "zona_numero": "Número de cédula",
        "zona_nombres_apellidos": "Nombres y apellidos",
    }

    recortes = {}
    w, h = img.size
    for key, zona in zonas.items():
        x1, y1, x2, y2 = zona
        x1c, y1c = min(max(0, x1), w), min(max(0, y1), h)
        x2c, y2c = min(max(0, x2), w), min(max(0, y2), h)
        color = colores.get(key, "#D60612")
        draw.rectangle((x1c, y1c, x2c, y2c), outline=color, width=5)
        label = etiquetas.get(key, key)
        text_box = (x1c, max(0, y1c - 28), min(w, x1c + 260), y1c)
        draw.rectangle(text_box, fill=color)
        draw.text((x1c + 8, max(0, y1c - 23)), label, fill="white")
        if x1c < x2c and y1c < y2c:
            recortes[key] = {
                "label": label,
                "zona": [x1, y1, x2, y2],
                "imagen_base64": _imagen_a_base64(img.crop((x1c, y1c, x2c, y2c))),
            }

    return {
        "tipo_camara": tipo_camara,
        "tipo_cedula": tipo_cedula,
        "dimensiones_imagen": {"width": w, "height": h},
        "zonas": {key: list(value) for key, value in zonas.items()},
        "imagen_marcada_base64": _imagen_a_base64(img),
        "recortes": recortes,
    }


@router.post("/debug/zonas")
async def debug_zonas_ocr(
    datos: ImagenBase64,
    tipo_camara: str = Query("peatonal", description="Tipo de cámara: 'peatonal' o 'vehicular'"),
    tipo_cedula: str = Query("nueva", description="Tipo de cédula: 'nueva' o 'antigua'"),
):
    if tipo_camara not in ["peatonal", "vehicular"]:
        raise HTTPException(status_code=400, detail="tipo_camara debe ser 'peatonal' o 'vehicular'")
    if tipo_cedula not in ["nueva", "antigua"]:
        raise HTTPException(status_code=400, detail="tipo_cedula debe ser 'nueva' o 'antigua'")
    try:
        imagen_bytes = base64.b64decode(datos.imagen_base64)
        return await run_in_threadpool(_dibujar_zonas_ocr, imagen_bytes, tipo_camara, tipo_cedula)
    except Exception as e:
        logger.error(f"Error dibujando zonas OCR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cedula-nueva/numero")
async def procesar_cedula_nueva_numero(
    datos: ImagenBase64,
    tipo_camara: str = Query("peatonal", description="Tipo de cámara: 'peatonal' o 'vehicular'")
):
    """Procesa número de cédula - Cédula Nueva (recibe Base64, retorna solo 10 dígitos)"""
    try:
        # Validar tipo_camara
        if tipo_camara not in ["peatonal", "vehicular"]:
            raise HTTPException(status_code=400, detail="tipo_camara debe ser 'peatonal' o 'vehicular'")
        
        logger.info(f"OCR: Cédula Nueva - Número ({tipo_camara})")
        
        # Crear servicio con tipo_camara
        servicio_nueva = CedulaNacionalNuevaOCR(tipo_camara=tipo_camara)
        
        # Decodificar Base64 a bytes
        imagen_bytes = base64.b64decode(datos.imagen_base64)
        resultado = await run_in_threadpool(servicio_nueva.procesar_numero_cedula, imagen_bytes)
        
        if "error" in resultado:
            raise HTTPException(status_code=400, detail=resultado["error"])
        
        numero_parseado = resultado.get("numero_cedula_parseado", {})
        
        return {
            "tipo": "Cédula Nueva",
            "zona": "Número de Cédula",
            "tipo_camara": tipo_camara,
            "numero_cedula": numero_parseado.get("numero", ""),
            "confianza": numero_parseado.get("confianza", 0)
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error OCR cédula nueva número: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cedula-nueva/nombres-apellidos")
async def procesar_cedula_nueva_nombres_apellidos(
    datos: ImagenBase64,
    tipo_camara: str = Query("peatonal", description="Tipo de cámara: 'peatonal' o 'vehicular'")
):
    """Procesa nombres y apellidos - Cédula Nueva (recibe Base64, retorna solo apellidos y nombres)"""
    try:
        # Validar tipo_camara
        if tipo_camara not in ["peatonal", "vehicular"]:
            raise HTTPException(status_code=400, detail="tipo_camara debe ser 'peatonal' o 'vehicular'")
        
        logger.info(f"OCR: Cédula Nueva - Nombres y Apellidos ({tipo_camara})")
        
        # Crear servicio con tipo_camara
        servicio_nueva = CedulaNacionalNuevaOCR(tipo_camara=tipo_camara)
        
        # Decodificar Base64 a bytes
        imagen_bytes = base64.b64decode(datos.imagen_base64)
        resultado = await run_in_threadpool(servicio_nueva.procesar_nombres_apellidos, imagen_bytes)
        
        if "error" in resultado:
            raise HTTPException(status_code=400, detail=resultado["error"])
        
        parsed_data = resultado.get("nombres_apellidos_parseados", {})
        
        return {
            "tipo": "Cédula Nueva",
            "zona": "Nombres y Apellidos",
            "tipo_camara": tipo_camara,
            "apellidos": parsed_data.get("apellidos", ""),
            "confianza_apellidos": parsed_data.get("confianza_apellidos", 0),
            "nombres": parsed_data.get("nombres", ""),
            "confianza_nombres": parsed_data.get("confianza_nombres", 0)
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error OCR cédula nueva nombres-apellidos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cedula-antigua/numero")
async def procesar_cedula_antigua_numero(
    datos: ImagenBase64,
    tipo_camara: str = Query("peatonal", description="Tipo de cámara: 'peatonal' o 'vehicular'")
):
    """Procesa número de cédula - Cédula Antigua (recibe Base64)"""
    try:
        # Validar tipo_camara
        if tipo_camara not in ["peatonal", "vehicular"]:
            raise HTTPException(status_code=400, detail="tipo_camara debe ser 'peatonal' o 'vehicular'")
        
        logger.info(f"OCR: Cédula Antigua - Número ({tipo_camara})")
        
        # Crear servicio con tipo_camara
        servicio_antigua = CedulaNacionalAntiguaOCR(tipo_camara=tipo_camara)
        
        # Decodificar Base64 a bytes
        imagen_bytes = base64.b64decode(datos.imagen_base64)
        resultado = await run_in_threadpool(servicio_antigua.procesar_numero_cedula, imagen_bytes)
        
        if "error" in resultado:
            raise HTTPException(status_code=400, detail=resultado["error"])
        
        numero_parseado = resultado.get("numero_cedula_parseado", {})
        
        return {
            "tipo": "Cédula Antigua",
            "zona": "Número de Cédula",
            "tipo_camara": tipo_camara,
            "numero_cedula": numero_parseado.get("numero", ""),
            "confianza": numero_parseado.get("confianza", 0)
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error OCR cédula antigua número: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cedula-antigua/nombres-apellidos")
async def procesar_cedula_antigua_nombres_apellidos(
    datos: ImagenBase64,
    tipo_camara: str = Query("peatonal", description="Tipo de cámara: 'peatonal' o 'vehicular'")
):
    """Procesa nombres y apellidos - Cédula Antigua (recibe Base64)"""
    try:
        # Validar tipo_camara
        if tipo_camara not in ["peatonal", "vehicular"]:
            raise HTTPException(status_code=400, detail="tipo_camara debe ser 'peatonal' o 'vehicular'")
        
        logger.info(f"OCR: Cédula Antigua - Nombres y Apellidos ({tipo_camara})")
        
        # Crear servicio con tipo_camara
        servicio_antigua = CedulaNacionalAntiguaOCR(tipo_camara=tipo_camara)
        
        # Decodificar Base64 a bytes
        imagen_bytes = base64.b64decode(datos.imagen_base64)
        resultado = await run_in_threadpool(servicio_antigua.procesar_nombres_apellidos, imagen_bytes)
        
        if "error" in resultado:
            raise HTTPException(status_code=400, detail=resultado["error"])
        
        parsed_data = resultado.get("nombres_apellidos_parseados", {})
        
        return {
            "tipo": "Cédula Antigua",
            "zona": "Nombres y Apellidos",
            "tipo_camara": tipo_camara,
            "apellidos": parsed_data.get("apellidos", ""),
            "confianza_apellidos": parsed_data.get("confianza_apellidos", 0),
            "nombres": parsed_data.get("nombres", ""),
            "confianza_nombres": parsed_data.get("confianza_nombres", 0)
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error OCR cédula antigua nombres-apellidos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

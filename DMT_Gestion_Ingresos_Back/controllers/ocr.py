import logging
import base64
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from services.ocr.cedula_nacional_nueva import CedulaNacionalNuevaOCR
from services.ocr.cedula_nacional_antigua import CedulaNacionalAntiguaOCR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ocr", tags=["OCR"])


# Modelos de entrada
class ImagenBase64(BaseModel):
    """Modelo para recibir imagen en Base64"""
    imagen_base64: str


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

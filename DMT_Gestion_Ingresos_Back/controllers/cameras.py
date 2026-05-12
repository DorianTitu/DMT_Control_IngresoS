"""Endpoints para captura de imágenes de 4 cámaras DVR"""

import asyncio
import logging
import base64
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from starlette.concurrency import run_in_threadpool

from services.captura.peatonal_usuario import CamaraPeatonalUsuario
from services.captura.peatonal_cedula import CamaraPeatonalCedula
from services.captura.vehicular_usuario import CamaraVehicularUsuario
from services.captura.vehicular_cedula import CamaraVehicularCedula
from services.captura.vehicular_placa import CamaraVehicularPlaca

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/camaras", tags=["Cámaras"])

servicio_peatonal_usuario = CamaraPeatonalUsuario()
servicio_peatonal_cedula = CamaraPeatonalCedula()
servicio_vehicular_usuario = CamaraVehicularUsuario()
servicio_vehicular_cedula = CamaraVehicularCedula()
servicio_vehicular_placa = CamaraVehicularPlaca()


def _respuesta_imagen(canal: str, imagen_bytes: bytes, aplicar_crop: bool | None = None):
    payload = {
        "exito": True,
        "canal": canal,
        "tipo": "image/jpeg",
        "imagen_base64": base64.b64encode(imagen_bytes).decode(),
    }
    if aplicar_crop is not None:
        payload["aplicar_crop"] = aplicar_crop
    return payload


async def _capturar(nombre: str, fn, *args, **kwargs):
    imagen_bytes = await run_in_threadpool(fn, *args, **kwargs)
    if imagen_bytes is None:
        raise HTTPException(status_code=500, detail=f"Error al capturar imagen de {nombre}")
    return imagen_bytes


@router.get("/peatonal-usuario/imagen")
async def obtener_imagen_peatonal_usuario():
    """Imagen de Usuario Peatonal (Canal 1) en Base64"""
    try:
        logger.info("Imagen: Cámara Peatonal Usuario")
        
        imagen_bytes = await _capturar("Usuario Peatonal", servicio_peatonal_usuario.obtener_imagen)
        return _respuesta_imagen("Peatonal Usuario", imagen_bytes)
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error en endpoint peatonal_usuario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/peatonal-cedula/imagen")
async def obtener_imagen_peatonal_cedula(aplicar_crop: bool = True):
    """Obtiene imagen de Cédula Peatonal (Canal 3) en Base64"""
    try:
        logger.info(f"Imagen: Cámara Peatonal Cédula (crop={aplicar_crop})")
        
        imagen_bytes = await _capturar("Cédula Peatonal", servicio_peatonal_cedula.obtener_imagen, aplicar_crop=aplicar_crop)
        return _respuesta_imagen("Peatonal Cédula", imagen_bytes, aplicar_crop)
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error en endpoint peatonal_cedula: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vehicular-usuario/imagen")
async def obtener_imagen_vehicular_usuario():
    """Obtiene imagen de Vehículos de Usuario (Canal 2) en Base64"""
    try:
        logger.info("Imagen: Cámara Vehicular Usuario")
        
        imagen_bytes = await _capturar("Vehículos de Usuario", servicio_vehicular_usuario.obtener_imagen)
        return _respuesta_imagen("Vehicular Usuario", imagen_bytes)
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error en endpoint vehicular_usuario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vehicular-cedula/imagen")
async def obtener_imagen_vehicular_cedula(aplicar_crop: bool = True):
    """Obtiene imagen de Cédula Vehicular (Canal 4) en Base64"""
    try:
        logger.info(f"Imagen: Cámara Vehicular Cédula (crop={aplicar_crop})")
        
        imagen_bytes = await _capturar("Cédula Vehicular", servicio_vehicular_cedula.obtener_imagen, aplicar_crop=aplicar_crop)
        return _respuesta_imagen("Vehicular Cédula", imagen_bytes, aplicar_crop)
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error en endpoint vehicular_cedula: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vehicular-placa/imagen")
async def obtener_imagen_vehicular_placa():
    """Obtiene imagen de Placa Vehicular (HTTP Digest) en Base64 - SIN RECORTE"""
    try:
        logger.info("Imagen: Cámara Vehicular Placa")
        
        imagen_bytes = await _capturar("Placa Vehicular", servicio_vehicular_placa.obtener_imagen)
        return _respuesta_imagen("Vehicular Placa", imagen_bytes)
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error en endpoint vehicular_placa: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capturar-registro")
async def capturar_registro(
    tipo: Literal["peatonal", "vehicular"] = Query(...),
    aplicar_crop: bool = True,
):
    """
    Captura en paralelo las fotos necesarias para un registro.

    - peatonal: usuario + cédula
    - vehicular: usuario + cédula + placa
    """
    try:
        if tipo == "peatonal":
            usuario_task = _capturar("Usuario Peatonal", servicio_peatonal_usuario.obtener_imagen)
            cedula_task = _capturar("Cédula Peatonal", servicio_peatonal_cedula.obtener_imagen, aplicar_crop=aplicar_crop)
            usuario, cedula = await asyncio.gather(usuario_task, cedula_task)
            return {
                "exito": True,
                "tipo": tipo,
                "imagenes": {
                    "usuario": base64.b64encode(usuario).decode(),
                    "cedula": base64.b64encode(cedula).decode(),
                },
            }

        usuario_task = _capturar("Vehículos de Usuario", servicio_vehicular_usuario.obtener_imagen)
        cedula_task = _capturar("Cédula Vehicular", servicio_vehicular_cedula.obtener_imagen, aplicar_crop=aplicar_crop)
        placa_task = _capturar("Placa Vehicular", servicio_vehicular_placa.obtener_imagen)
        usuario, cedula, placa = await asyncio.gather(usuario_task, cedula_task, placa_task)
        return {
            "exito": True,
            "tipo": tipo,
            "imagenes": {
                "usuario": base64.b64encode(usuario).decode(),
                "cedula": base64.b64encode(cedula).decode(),
                "placa": base64.b64encode(placa).decode(),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en capturar_registro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from services.ingresos.gestor_db import GestorIngresosDB

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingresos-peatonal", tags=["Ingresos Peatonales"])
gestor = GestorIngresosDB("peatonal")


class CrearIngresoRequest(BaseModel):
    numero_cedula: str = Field(..., description="10 dígitos de cédula")
    nombres: str = Field(..., description="Nombres completos")
    apellidos: str = Field(..., description="Apellidos")
    hora_entrada: str = Field(..., description="Hora de entrada HH:MM:SS")
    departamento: str = Field(..., description="Departamento/área de destino")
    motivo: str = Field(..., description="Motivo del ingreso")
    imagen_usuario_base64: str = Field(..., description="Imagen del usuario en Base64")
    imagen_cedula_base64: str = Field(..., description="Imagen de la cédula en Base64")


class ActualizarIngresoRequest(BaseModel):
    numero_cedula: Optional[str] = None
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    departamento: Optional[str] = None
    motivo: Optional[str] = None


class RegistrarSalidaRequest(BaseModel):
    hora_salida: Optional[str] = Field(None, description="Hora de salida HH:MM:SS. Si no se envía usa hora actual")


@router.post("/create")
async def crear_ingreso_peatonal(datos: CrearIngresoRequest):
    try:
        resultado = await run_in_threadpool(gestor.crear_ingreso, **datos.dict())
        if "error" in resultado:
            raise HTTPException(status_code=400, detail=resultado["error"])
        return {"exito": True, "mensaje": "Ingreso peatonal registrado exitosamente", **resultado}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en crear_ingreso_peatonal: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {e}")


@router.get("/listar/dia")
async def listar_ingresos_por_dia(fecha: str):
    try:
        resultado = await run_in_threadpool(gestor.listar_ingresos_por_dia, fecha)
        if "error" in resultado:
            raise HTTPException(status_code=400, detail=resultado["error"])
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en listar_ingresos_por_dia: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {e}")


@router.get("/{ticket}")
async def leer_ingreso_peatonal(ticket: str):
    try:
        resultado = await run_in_threadpool(gestor.leer_ingreso, ticket)
        if "error" in resultado:
            raise HTTPException(status_code=404, detail=resultado["error"])
        return {"exito": True, "datos": resultado}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en leer_ingreso_peatonal: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {e}")


@router.put("/{ticket}")
async def actualizar_ingreso_peatonal(ticket: str, datos: ActualizarIngresoRequest):
    try:
        datos_dict = datos.dict(exclude_none=True)
        if not datos_dict:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")
        resultado = await run_in_threadpool(gestor.actualizar_ingreso, ticket, datos_dict)
        if "error" in resultado:
            raise HTTPException(status_code=404, detail=resultado["error"])
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en actualizar_ingreso_peatonal: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {e}")


@router.put("/{ticket}/salida")
async def registrar_salida_peatonal(ticket: str, datos: RegistrarSalidaRequest):
    try:
        resultado = await run_in_threadpool(gestor.registrar_salida, ticket, datos.hora_salida)
        if "error" in resultado:
            raise HTTPException(status_code=400, detail=resultado["error"])
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en registrar_salida_peatonal: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {e}")

from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from services.ingresos.gestor_db import GestorIngresosDB


router = APIRouter(tags=["Métricas"])


@router.get("/ingresos/listar/dia")
async def listar_ingresos_dia(fecha: str):
    resultado = await run_in_threadpool(GestorIngresosDB.listar_todos_por_dia, fecha)
    if "error" in resultado:
        raise HTTPException(status_code=400, detail=resultado["error"])
    return resultado


@router.get("/metrics")
async def metricas(fecha: str | None = None):
    return await run_in_threadpool(GestorIngresosDB.metricas, fecha)


@router.get("/vehicular/cupos")
async def cupos_vehiculares():
    return await run_in_threadpool(GestorIngresosDB.cupos_vehiculares)


@router.get("/ingresos/persona/{numero_cedula}")
async def buscar_persona_por_cedula(numero_cedula: str):
    return await run_in_threadpool(GestorIngresosDB.buscar_persona_por_cedula, numero_cedula)


@router.get("/ingresos/exportar")
async def exportar_ingresos(
    fecha: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    tipo: Optional[str] = None,
    numero_cedula: Optional[str] = None,
    departamento: Optional[str] = None,
    motivo: Optional[str] = None,
    estado: Optional[str] = None,
):
    try:
        archivo = await run_in_threadpool(
            GestorIngresosDB.exportar_excel,
            fecha=fecha,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            tipo=tipo,
            numero_cedula=numero_cedula,
            departamento=departamento,
            motivo=motivo,
            estado=estado,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Filtros inválidos: {exc}") from exc

    return StreamingResponse(
        archivo,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="ingresos.xlsx"'},
    )

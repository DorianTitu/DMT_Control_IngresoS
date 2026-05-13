from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services.catalogos import CatalogosStore


router = APIRouter(prefix="/catalogos", tags=["Catálogos"])
store = CatalogosStore()

TipoMotivo = Literal["peatonal", "vehicular", "ambos"]


class DepartamentoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=80)
    activo: bool = True
    cupo_vehicular: Optional[int] = Field(None, ge=0)


class DepartamentoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=80)
    activo: Optional[bool] = None
    cupo_vehicular: Optional[int] = Field(None, ge=0)


class MotivoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=80)
    tipo: TipoMotivo = "ambos"
    departamento_id: str = Field(..., min_length=1)
    activo: bool = True


class MotivoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=80)
    tipo: Optional[TipoMotivo] = None
    departamento_id: Optional[str] = Field(None, min_length=1)
    activo: Optional[bool] = None


@router.get("")
async def listar_catalogos():
    return store.listar(solo_activos=False)


@router.get("/departamentos")
async def listar_departamentos(activos: bool = True):
    return {"departamentos": store.listar_departamentos(solo_activos=activos)}


@router.post("/departamentos", status_code=201)
async def crear_departamento(payload: DepartamentoCreate):
    return store.crear_departamento(payload.nombre, payload.activo, payload.cupo_vehicular)


@router.put("/departamentos/{item_id}")
async def actualizar_departamento(item_id: str, payload: DepartamentoUpdate):
    try:
        return store.actualizar_departamento(item_id, payload.dict(exclude_unset=True))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/departamentos/{item_id}")
async def eliminar_departamento(item_id: str):
    try:
        return store.eliminar_departamento(item_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/departamentos/{item_id}/reset-parqueo")
async def resetear_parqueo_departamento(item_id: str):
    try:
        return store.resetear_parqueo_departamento(item_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/motivos")
async def listar_motivos(
    tipo: Optional[TipoMotivo] = Query(default=None),
    departamento_id: Optional[str] = None,
    activos: bool = True,
):
    return {"motivos": store.listar_motivos(tipo=tipo, departamento_id=departamento_id, solo_activos=activos)}


@router.post("/motivos", status_code=201)
async def crear_motivo(payload: MotivoCreate):
    return store.crear_motivo(payload.nombre, payload.tipo, payload.departamento_id, payload.activo)


@router.put("/motivos/{item_id}")
async def actualizar_motivo(item_id: str, payload: MotivoUpdate):
    try:
        return store.actualizar_motivo(item_id, payload.dict(exclude_unset=True))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/motivos/{item_id}")
async def eliminar_motivo(item_id: str):
    try:
        return store.eliminar_motivo(item_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

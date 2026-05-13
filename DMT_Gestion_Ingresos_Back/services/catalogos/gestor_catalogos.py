import json
import re
import tempfile
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from config.settings import CATALOGOS_PATH


DEFAULT_CATALOGOS = {
    "departamentos": [
        {"id": "dpto-1a", "nombre": "Dpto. 1A", "activo": True, "cupo_vehicular": None, "parqueo_reset_at": None},
        {"id": "dpto-1b", "nombre": "Dpto. 1B", "activo": True, "cupo_vehicular": None, "parqueo_reset_at": None},
        {"id": "dpto-2a", "nombre": "Dpto. 2A", "activo": True, "cupo_vehicular": None, "parqueo_reset_at": None},
    ],
    "motivos": [
        {"id": "visita", "nombre": "Visita", "tipo": "ambos", "departamento_id": "dpto-1a", "activo": True},
        {"id": "trabajador", "nombre": "Trabajador", "tipo": "peatonal", "departamento_id": "dpto-1a", "activo": True},
        {"id": "entrega", "nombre": "Entrega", "tipo": "ambos", "departamento_id": "dpto-1b", "activo": True},
        {"id": "residente", "nombre": "Residente", "tipo": "vehicular", "departamento_id": "dpto-2a", "activo": True},
    ],
}


class CatalogosStore:
    _lock = threading.Lock()

    def __init__(self, path: Path = CATALOGOS_PATH):
        self.path = path

    def listar(self, solo_activos: bool = False) -> Dict[str, List[Dict[str, Any]]]:
        data = self._read()
        if not solo_activos:
            return data
        return {
            "departamentos": [item for item in data["departamentos"] if item.get("activo", True)],
            "motivos": [item for item in data["motivos"] if item.get("activo", True)],
        }

    def listar_departamentos(self, solo_activos: bool = True) -> List[Dict[str, Any]]:
        items = self._read()["departamentos"]
        return self._filtrar_activos(items, solo_activos)

    def listar_motivos(
        self,
        tipo: Optional[str] = None,
        departamento_id: Optional[str] = None,
        solo_activos: bool = True,
    ) -> List[Dict[str, Any]]:
        items = self._filtrar_activos(self._read()["motivos"], solo_activos)
        if tipo:
            items = [item for item in items if item["tipo"] in ("ambos", tipo)]
        if departamento_id:
            items = [item for item in items if item.get("departamento_id") == departamento_id]
        return items

    def crear_departamento(self, nombre: str, activo: bool = True, cupo_vehicular: Optional[int] = None) -> Dict[str, Any]:
        item = {
            "id": self._new_id("dpto", nombre),
            "nombre": nombre.strip(),
            "activo": activo,
            "cupo_vehicular": cupo_vehicular,
            "parqueo_reset_at": None,
        }
        return self._append("departamentos", item)

    def actualizar_departamento(self, item_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self._update("departamentos", item_id, payload)

    def eliminar_departamento(self, item_id: str) -> Dict[str, Any]:
        return self._update("departamentos", item_id, {"activo": False})

    def resetear_parqueo_departamento(self, item_id: str) -> Dict[str, Any]:
        return self._update("departamentos", item_id, {"parqueo_reset_at": datetime.now().isoformat(timespec="seconds")})

    def crear_motivo(self, nombre: str, tipo: str, departamento_id: str, activo: bool = True) -> Dict[str, Any]:
        item = {
            "id": self._new_id("motivo", nombre),
            "nombre": nombre.strip(),
            "tipo": tipo,
            "departamento_id": departamento_id,
            "activo": activo,
        }
        return self._append("motivos", item)

    def actualizar_motivo(self, item_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self._update("motivos", item_id, payload)

    def eliminar_motivo(self, item_id: str) -> Dict[str, Any]:
        return self._update("motivos", item_id, {"activo": False})

    def _read(self) -> Dict[str, List[Dict[str, Any]]]:
        with self._lock:
            self._ensure_file()
            with self.path.open("r", encoding="utf-8") as file:
                data = json.load(file)
            return self._normalizar(data)

    def _write(self, data: Dict[str, List[Dict[str, Any]]]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=self.path.parent, delete=False) as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
            file.write("\n")
            tmp_path = Path(file.name)
        tmp_path.replace(self.path)

    def _append(self, collection: str, item: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self._ensure_file()
            data = self._load_unlocked()
            data[collection].append(item)
            self._write(data)
            return item

    def _update(self, collection: str, item_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self._ensure_file()
            data = self._load_unlocked()
            for item in data[collection]:
                if item["id"] == item_id:
                    clean_payload = dict(payload)
                    if "nombre" in clean_payload:
                        clean_payload["nombre"] = clean_payload["nombre"].strip()
                    item.update(clean_payload)
                    self._write(data)
                    return item
        raise KeyError(f"No existe el elemento {item_id}")

    def _ensure_file(self) -> None:
        if self.path.exists():
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._write(DEFAULT_CATALOGOS)

    def _load_unlocked(self) -> Dict[str, List[Dict[str, Any]]]:
        with self.path.open("r", encoding="utf-8") as file:
            data = json.load(file)
        data = self._normalizar(data)
        return data

    @staticmethod
    def _normalizar(data: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
        departamentos = data.get("departamentos", [])
        motivos = data.get("motivos", [])
        for item in departamentos:
            item.setdefault("cupo_vehicular", None)
            item.setdefault("parqueo_reset_at", None)
        default_departamento_id = departamentos[0]["id"] if departamentos else ""
        for item in motivos:
            item.setdefault("departamento_id", default_departamento_id)
        return {"departamentos": departamentos, "motivos": motivos}

    @staticmethod
    def _filtrar_activos(items: List[Dict[str, Any]], solo_activos: bool) -> List[Dict[str, Any]]:
        if not solo_activos:
            return items
        return [item for item in items if item.get("activo", True)]

    @staticmethod
    def _new_id(prefix: str, nombre: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", nombre.lower()).strip("-")
        suffix = uuid.uuid4().hex[:6]
        return f"{prefix}-{slug or 'item'}-{suffix}"

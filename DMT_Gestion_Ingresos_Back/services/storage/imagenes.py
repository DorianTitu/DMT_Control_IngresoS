import base64
from pathlib import Path
from typing import Dict

from config.settings import REGISTROS_BASE_PATH


def validar_jpeg_base64(imagen_base64: str, nombre: str) -> tuple[bool, str]:
    try:
        if not imagen_base64:
            return False, f"{nombre} no puede estar vacía"

        data = base64.b64decode(imagen_base64)
        if not data:
            return False, f"{nombre} decodificada está vacía"
        if not data.startswith(b"\xff\xd8"):
            return False, f"{nombre} no es una imagen JPEG válida"
        return True, ""
    except Exception as exc:
        return False, f"Error decodificando {nombre}: {exc}"


def guardar_imagenes_ingreso(
    tipo_ingreso: str,
    fecha_path: str,
    ticket: str,
    imagenes_base64: Dict[str, str],
) -> Dict[str, str]:
    ticket_dir = REGISTROS_BASE_PATH / tipo_ingreso / fecha_path / ticket
    ticket_dir.mkdir(parents=True, exist_ok=True)

    rutas: Dict[str, str] = {}
    for tipo_imagen, contenido_base64 in imagenes_base64.items():
        data = base64.b64decode(contenido_base64)
        ruta = ticket_dir / f"{tipo_imagen}.jpeg"
        ruta.write_bytes(data)
        rutas[tipo_imagen] = str(ruta)

    return rutas


def leer_imagen_base64(ruta: str) -> str:
    path = Path(ruta)
    if not path.exists():
        return ""
    return base64.b64encode(path.read_bytes()).decode("utf-8")

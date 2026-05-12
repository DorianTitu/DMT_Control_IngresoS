import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _split_csv(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://dmt_user:dmt_password@localhost:5432/dmt_ingresos",
)

REGISTROS_BASE_PATH = Path(os.getenv("REGISTROS_BASE_PATH", str(BASE_DIR / "data" / "registros")))
OCR_RESULTADOS_DIR = Path(os.getenv("OCR_RESULTADOS_DIR", str(BASE_DIR / "data" / "ocr_resultados")))
CATALOGOS_PATH = Path(os.getenv("CATALOGOS_PATH", str(BASE_DIR / "data" / "catalogos.json")))

CORS_ORIGINS = _split_csv(
    os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000",
    )
)

APP_ENV = os.getenv("APP_ENV", "development")

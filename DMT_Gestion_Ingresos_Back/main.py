"""
DMT Gestión de Ingresos - Backend v3.1
"""

import logging
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config.settings import CORS_ORIGINS
from controllers.cameras import router as cameras_router
from controllers.catalogos import router as catalogos_router
from controllers.ocr import router as ocr_router
from controllers.ia import router as ia_router
from controllers.ingresos_peatonales import router as ingresos_peatonales_router
from controllers.ingresos_vehiculares import router as ingresos_vehiculares_router
from controllers.metricas import router as metricas_router
from services.db import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DMT Gestión de Ingresos",
    description="API de control de acceso: captura DVR, OCR, IA con Google Gemini y PostgreSQL",
    version="3.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cameras_router)
app.include_router(catalogos_router)
app.include_router(ocr_router)
app.include_router(ia_router)
app.include_router(ingresos_peatonales_router)
app.include_router(ingresos_vehiculares_router)
app.include_router(metricas_router)


@app.on_event("startup")
async def startup_event():
    logger.info("Iniciando aplicación — creando tablas en BD...")
    init_db()
    logger.info("BD lista.")


@app.get("/")
async def root():
    return {
        "nombre": "DMT Gestión de Ingresos",
        "version": "3.1.0",
        "estado": "activo",
        "documentacion": "/docs",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "camaras": "/camaras",
            "catalogos": "/catalogos",
            "ocr": "/ocr",
            "ia": "/ia",
            "ingresos_peatonal": "/ingresos-peatonal",
            "ingresos_vehicular": "/ingresos-vehicular",
            "metricas": "/metrics",
        },
    }


@app.get("/health")
async def health():
    return {"estado": "ok", "timestamp": datetime.now().isoformat()}


@app.exception_handler(Exception)
async def exception_handler(request, exc):
    logger.error(f"Error no manejado: {exc}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

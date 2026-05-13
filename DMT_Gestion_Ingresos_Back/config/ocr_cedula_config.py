"""
Configuración de OCR para cédulas
Define zonas de recorte para número y nombres/apellidos
Organizado por tipo_camara (peatonal/vehicular) y tipo de cédula (nueva/antigua)
"""

import os

from config.settings import OCR_RESULTADOS_DIR

# =============================================
# ZONAS DE RECORTE POR CÁMARA Y TIPO DE CÉDULA
# Dimensiones: 1200x720 píxeles
# =============================================
ZONA_NUMERO_NUEVA = (65, 515, 445, 610)
ZONA_NOMBRES_NUEVA = (315, 110, 650, 315)
ZONA_NUMERO_ANTIGUA = (640, 125, 930, 220)
ZONA_NOMBRES_ANTIGUA = (340, 210, 650, 305)

OCR_ZONAS = {
    "peatonal": {
        "nueva": {
            "zona_numero": ZONA_NUMERO_NUEVA,                    # Número NUI
            "zona_nombres_apellidos": ZONA_NOMBRES_NUEVA         # Bloque APELLIDOS/NOMBRES
        },
        "antigua": {
            "zona_numero": ZONA_NUMERO_ANTIGUA,                  # Número No. 000000000-0
            "zona_nombres_apellidos": ZONA_NOMBRES_ANTIGUA       # Bloque APELLIDOS Y NOMBRES
        }
    },
    "vehicular": {
        "nueva": {
            "zona_numero": ZONA_NUMERO_NUEVA,
            "zona_nombres_apellidos": ZONA_NOMBRES_NUEVA
        },
        "antigua": {
            "zona_numero": ZONA_NUMERO_ANTIGUA,
            "zona_nombres_apellidos": ZONA_NOMBRES_ANTIGUA
        }
    }
}

# =============================================
# PARÁMETROS DE PROCESAMIENTO (Optimizado para texto limpio)
# =============================================
OCR_CONFIG = {
    "upscale_factor": int(os.getenv("OCR_UPSCALE_FACTOR", "2")), # x2 en lugar de x3 (fue x1)
    "clahe_clip_limit": float(os.getenv("OCR_CLAHE_CLIP_LIMIT", "3.0")),
    "clahe_tile_size": int(os.getenv("OCR_CLAHE_TILE_SIZE", "8")),
    "morph_kernel_size": 2,                                     # Kernel pequeño
    "resultados_dir": str(OCR_RESULTADOS_DIR),
    "guardar_debug": os.getenv("OCR_GUARDAR_DEBUG", "false").lower() == "true",
    "auto_rotate": False                                        # Desactivado
}

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
OCR_ZONAS = {
    "peatonal": {
        "nueva": {
            "zona_numero": (50, 480, 1150, 700),                 # Número (parte inferior)
            "zona_nombres_apellidos": (50, 20, 1150, 280)        # Nombres y apellidos (parte superior)
        },
        "antigua": {
            "zona_numero": (50, 480, 1150, 700),                 # Número (parte inferior)
            "zona_nombres_apellidos": (50, 20, 1150, 280)        # Nombres y apellidos (parte superior)
        }
    },
    "vehicular": {
        "nueva": {
            # TODO: Ajustar estas zonas para cámara vehicular
            "zona_numero": (50, 480, 1150, 700),                 # Número (parte inferior)
            "zona_nombres_apellidos": (50, 20, 1150, 280)        # Nombres y apellidos (parte superior)
        },
        "antigua": {
            # TODO: Ajustar estas zonas para cámara vehicular
            "zona_numero": (50, 480, 1150, 700),                 # Número (parte inferior)
            "zona_nombres_apellidos": (50, 20, 1150, 280)        # Nombres y apellidos (parte superior)
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

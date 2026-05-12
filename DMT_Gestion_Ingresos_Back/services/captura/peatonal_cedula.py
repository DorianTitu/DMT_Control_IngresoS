"""
Servicio para Cámara Peatonal Cédula - Canal 3 (con recorte)
"""

import logging
from typing import Optional, Tuple
from PIL import Image
import io

from services.captura.base import ServicioCapturadorConCrop
from config.dvr_base import CROP_CONFIG

logger = logging.getLogger(__name__)


class CamaraPeatonalCedula(ServicioCapturadorConCrop):
    """Servicio de captura para Cámara Peatonal Cédula (Canal 3) con recorte"""
    
    def __init__(self):
        super().__init__(
            canal=3,
            nombre="Cámara Peatonal Cédula"
        )
    
    def obtener_imagen(self, aplicar_crop: bool = True) -> Optional[bytes]:
        """Obtiene imagen de cédula con recorte opcional"""
        imagen_bytes = self.capturar_snapshot()
        
        if imagen_bytes is None:
            return None
        
        if aplicar_crop and self.config_crop:
            vertices = self.config_crop["vertices"]
            imagen_bytes = self.aplicar_recorte(
                imagen_bytes,
                top_left=vertices["top_left"],
                bottom_right=vertices["bottom_right"]
            )
        
        return imagen_bytes

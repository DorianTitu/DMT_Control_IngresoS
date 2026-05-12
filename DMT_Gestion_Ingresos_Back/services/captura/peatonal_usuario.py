"""
Servicio para Cámara Peatonal Usuario - Canal 1
"""

from services.captura.base import ServicioCapturadorBase


class CamaraPeatonalUsuario(ServicioCapturadorBase):
    """Servicio de captura para Cámara Peatonal Usuario (Canal 1)"""
    
    def __init__(self):
        super().__init__(
            canal=1,
            nombre="Cámara Peatonal Usuario"
        )
    
    def obtener_imagen(self):
        """Obtiene imagen del  usuario peatonal"""
        return self.capturar_snapshot()

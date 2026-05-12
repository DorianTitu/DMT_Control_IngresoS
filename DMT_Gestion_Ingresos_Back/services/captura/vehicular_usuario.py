"""
Servicio para Cámara Vehicular Usuario - Canal 2
"""

from services.captura.base import ServicioCapturadorBase


class CamaraVehicularUsuario(ServicioCapturadorBase):
    """Servicio de captura para Cámara Vehicular Usuario (Canal 2)"""
    
    def __init__(self):
        super().__init__(
            canal=2,
            nombre="Cámara Vehicular Usuario"
        )
    
    def obtener_imagen(self):
        """Obtiene imagen del vehículo de usuario"""
        return self.capturar_snapshot()

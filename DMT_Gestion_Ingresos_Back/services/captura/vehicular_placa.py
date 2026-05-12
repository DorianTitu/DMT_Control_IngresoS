import logging
from typing import Optional
from requests.auth import HTTPDigestAuth
import requests

logger = logging.getLogger(__name__)


class CamaraVehicularPlaca:
    """Servicio de captura para Cámara Vehicular Placa (HTTP Digest)"""
    
    def __init__(self):
        self.ip = "192.168.1.2"
        self.usuario = "admin"
        self.contraseña = "DMT_1990"
        self.url = f"http://{self.ip}/cgi-bin/snapshot.cgi"
        self.timeout = 10
        self.nombre = "Cámara Vehicular Placa"
    
    def obtener_imagen(self) -> Optional[bytes]:
        """
        Captura imagen de placa vehicular vía HTTP Digest
        
        Returns:
            Bytes de la imagen JPEG o None si falla
        """
        try:
            logger.info(f"[{self.nombre}] Capturando snapshot...")
            
            response = requests.get(
                self.url,
                auth=HTTPDigestAuth(self.usuario, self.contraseña),
                timeout=self.timeout,
                stream=True
            )
            
            # Validar captura exitosa
            if response.status_code == 200 and len(response.content) > 1000:
                logger.info(f"[{self.nombre}] Snapshot capturado: {len(response.content)} bytes")
                return response.content
            else:
                logger.error(
                    f"[{self.nombre}] Error: HTTP {response.status_code}, "
                    f"tamaño: {len(response.content)} bytes"
                )
                return None
                
        except requests.ConnectTimeout:
            logger.error(f"[{self.nombre}] Connection timeout - Cámara no accesible")
            return None
        except requests.Timeout:
            logger.error(f"[{self.nombre}] Timeout")
            return None
        except Exception as e:
            logger.error(f"[{self.nombre}] Error al capturar snapshot: {str(e)}")
            return None

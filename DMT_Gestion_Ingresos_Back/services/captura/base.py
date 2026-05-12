"""
Servicio base para captura de imágenes de cámaras
Contiene lógica común de conexión y captura RTSP
"""

import subprocess
import os
import tempfile
import logging
from typing import Optional, Tuple
from PIL import Image
import io
from config.dvr_base import DVR_CONFIG, FFMPEG_CONFIG, obtener_url_rtsp, CROP_CONFIG

logger = logging.getLogger(__name__)

class ServicioCapturadorBase:
    """Clase base para servicios de captura de imágenes"""
    
    def __init__(self, canal: int, nombre: str):
        """
        Inicializa el servicio de captura
        Args:
            canal: Número de canal RTSP (1-4)
            nombre: Nombre descriptivo del servicio
        """
        self.canal = canal
        self.nombre = nombre
        self.url_rtsp = obtener_url_rtsp(canal)
        
    def capturar_snapshot(self) -> Optional[bytes]:
        """
        Captura un snapshot del DVR usando RTSP y FFmpeg
        
        Returns:
            Bytes de la imagen JPEG o None si falla
        """
        try:
            logger.info(f"[{self.nombre}] Capturando snapshot del canal {self.canal}...")
            
            # Crear archivo temporal
            with tempfile.NamedTemporaryFile(suffix=f'.{FFMPEG_CONFIG["format"]}', delete=False) as tmp:
                tmp_path = tmp.name
            
            try:
                # Comando ffmpeg
                cmd = [
                    "ffmpeg",
                    "-rtsp_transport", FFMPEG_CONFIG["rtsp_transport"],
                    "-i", self.url_rtsp,
                    "-vframes", str(FFMPEG_CONFIG["vframes"]),
                    "-q:v", str(FFMPEG_CONFIG["quality"]),
                    "-y",
                    tmp_path
                ]
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    timeout=FFMPEG_CONFIG["timeout"],
                    text=True
                )
                
                if result.returncode == 0 and os.path.exists(tmp_path):
                    with open(tmp_path, 'rb') as f:
                        imagen_bytes = f.read()
                    
                    logger.info(f"[{self.nombre}] Snapshot capturado: {len(imagen_bytes)} bytes")
                    return imagen_bytes
                else:
                    logger.error(f"[{self.nombre}] FFmpeg falló con código {result.returncode}")
                    if result.stderr:
                        logger.error(f"[{self.nombre}] Stderr: {result.stderr[-200:]}")
                    return None
                    
            finally:
                # Limpiar archivo temporal
                if os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except Exception as e:
                        logger.warning(f"[{self.nombre}] No se pudo eliminar archivo temporal: {e}")
        
        except subprocess.TimeoutExpired:
            logger.error(f"[{self.nombre}] Timeout al capturar snapshot")
            return None
        except FileNotFoundError:
            logger.error(f"[{self.nombre}] FFmpeg no está instalado")
            return None
        except Exception as e:
            logger.error(f"[{self.nombre}] Error al capturar snapshot: {str(e)}")
            return None


class ServicioCapturadorConCrop(ServicioCapturadorBase):
    """Clase intermedia con funcionalidad de recorte para cámaras de cédula"""
    
    def __init__(self, canal: int, nombre: str):
        super().__init__(canal, nombre)
        self.config_crop = CROP_CONFIG.get(canal)
    
    def aplicar_recorte(self, imagen_bytes: bytes, 
                       top_left: Tuple[int, int] = None, 
                       bottom_right: Tuple[int, int] = None) -> Optional[bytes]:
        """Aplica recorte cuadrado usando dos vértices"""
        try:
            if top_left is None or bottom_right is None:
                if self.config_crop:
                    top_left = self.config_crop["vertices"]["top_left"]
                    bottom_right = self.config_crop["vertices"]["bottom_right"]
                else:
                    logger.warning(f"[{self.nombre}] Sin configuración de crop")
                    return imagen_bytes
            
            imagen = Image.open(io.BytesIO(imagen_bytes))
            x1, y1 = top_left
            x2, y2 = bottom_right
            
            x1, x2 = min(x1, x2), max(x1, x2)
            y1, y2 = min(y1, y2), max(y1, y2)
            
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(imagen.width, x2)
            y2 = min(imagen.height, y2)
            
            imagen_recortada = imagen.crop((x1, y1, x2, y2))
            
            buffer = io.BytesIO()
            imagen_recortada.save(buffer, format='JPEG', quality=95)
            return buffer.getvalue()
        
        except Exception as e:
            logger.error(f"[{self.nombre}] Error aplicar recorte: {str(e)}")
            return None

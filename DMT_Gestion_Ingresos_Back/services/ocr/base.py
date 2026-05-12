import logging
from typing import Optional, Tuple, Dict
import cv2
import numpy as np
from PIL import Image
import io
import os
import json
from datetime import datetime
# import easyocr  # Comentado temporalmente - dependencia muy pesada

# Pillow 10.0.0+ removió Image.ANTIALIAS
if not hasattr(Image, 'ANTIALIAS'):
    Image.ANTIALIAS = Image.Resampling.LANCZOS

from config.ocr_cedula_config import OCR_CONFIG

logger = logging.getLogger(__name__)

_reader = None


def get_ocr_reader():
    """Singleton de EasyOCR — se carga una sola vez al primer uso."""
    global _reader
    if _reader is None:
        logger.info("Iniciando EasyOCR reader (español)...")
        try:
            import easyocr
            _reader = easyocr.Reader(['es'], gpu=False, verbose=False)
            logger.info("EasyOCR listo.")
        except ImportError:
            logger.warning("EasyOCR no está instalado. Características OCR no disponibles.")
            _reader = None
    return _reader


class BaseCedulaNacionalOCR:
    """Procesador base de OCR para cédulas ecuatorianas."""

    def __init__(self, tipo: str):
        self.tipo = tipo
        self.upscale = OCR_CONFIG["upscale_factor"]
        self.tratamientos_aplicados: list = []

    # ------------------------------------------------------------------
    # Procesamiento de imagen
    # ------------------------------------------------------------------

    def _cargar_imagen(self, imagen_bytes: bytes) -> Optional[np.ndarray]:
        try:
            img_pil = Image.open(io.BytesIO(imagen_bytes))
            img_cv = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
            logger.debug(f"[{self.tipo}] Imagen cargada: {img_cv.shape}")
            self.tratamientos_aplicados.append(f"Cargada: {img_cv.shape}")
            return img_cv
        except Exception as e:
            logger.error(f"[{self.tipo}] Error cargando imagen: {e}")
            return None

    def _crop_zona(self, img: np.ndarray, zona: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
        """Recorta la zona de interés ANTES del upscale para reducir carga."""
        x1, y1, x2, y2 = zona
        # Clamp para evitar índices fuera de rango
        h, w = img.shape[:2]
        x1, x2 = max(0, x1), min(w, x2)
        y1, y2 = max(0, y1), min(h, y2)
        
        # Validar que el crop resulte en una imagen válida
        if x1 >= x2 or y1 >= y2:
            logger.error(f"[{self.tipo}] Crop inválido: imagen demasiado pequeña. Tamaño: {w}x{h}, zona solicitada: {zona}")
            return None
            
        cropped = img[y1:y2, x1:x2]
        
        if cropped.size == 0:
            logger.error(f"[{self.tipo}] Crop resultó en imagen vacía. Tamaño imagen: {w}x{h}, zona: ({x1},{y1},{x2},{y2})")
            return None
            
        self.tratamientos_aplicados.append(f"Crop: ({x1},{y1},{x2},{y2}) de {w}x{h}")
        return cropped

    def _upscale(self, img: np.ndarray) -> np.ndarray:
        """Amplía la imagen (ya recortada) para mejorar legibilidad del OCR."""
        if self.upscale <= 1:
            self.tratamientos_aplicados.append("Upscale: omitido")
            return img
        h, w = img.shape[:2]
        new_w, new_h = int(w * self.upscale), int(h * self.upscale)
        upscaled = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        logger.debug(f"[{self.tipo}] Upscale: {w}x{h} → {new_w}x{new_h}")
        self.tratamientos_aplicados.append(f"Upscale: {self.upscale}x")
        return upscaled

    def _preprocesar_para_ocr(self, img: np.ndarray, valor_threshold: int = 110) -> np.ndarray:
        """
        Pipeline de preprocesamiento optimizado:
        1. Escala de grises
        2. CLAHE (mejora contraste adaptativo)
        3. Threshold suave
        Devuelve imagen en escala de grises (EasyOCR acepta 1 canal).
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        clahe = cv2.createCLAHE(
            clipLimit=OCR_CONFIG["clahe_clip_limit"],
            tileGridSize=(OCR_CONFIG["clahe_tile_size"], OCR_CONFIG["clahe_tile_size"])
        )
        gray = clahe.apply(gray)

        _, gray = cv2.threshold(gray, valor_threshold, 255, cv2.THRESH_BINARY)

        self.tratamientos_aplicados.append(f"CLAHE+Threshold: {valor_threshold}")
        return gray

    # ------------------------------------------------------------------
    # OCR
    # ------------------------------------------------------------------

    def extraer_texto(self, img_gray: np.ndarray, solo_digitos: bool = False) -> Dict:
        """
        Extrae texto con EasyOCR.
        img_gray: imagen en escala de grises (preprocesada).
        solo_digitos: activa allowlist de dígitos para la zona del número (más rápido y preciso).
        """
        try:
            reader = get_ocr_reader()
            kwargs = {
                "detail": 1,
                "paragraph": False,
                "decoder": "greedy",
                "beamWidth": 1,
                "batch_size": 1,
                "workers": 0,
                "canvas_size": 1280,
                "mag_ratio": 1.0,
            }
            if solo_digitos:
                kwargs["allowlist"] = "0123456789 "

            results = reader.readtext(img_gray, **kwargs)

            componentes = [
                {
                    "texto": text,
                    "confianza": float(conf),
                    "bbox": [[float(x), float(y)] for x, y in bbox],
                }
                for bbox, text, conf in results
            ]
            texto_completo = " ".join(c["texto"] for c in componentes)

            logger.info(f"[{self.tipo}] OCR: {len(componentes)} componentes detectados")
            self.tratamientos_aplicados.append(f"EasyOCR: {len(componentes)} componentes")

            return {
                "exito": True,
                "texto_completo": texto_completo,
                "componentes": componentes,
                "cantidad_componentes": len(componentes),
            }
        except Exception as e:
            logger.error(f"[{self.tipo}] Error en OCR: {e}")
            return {
                "exito": False,
                "error": str(e),
                "texto_completo": "",
                "componentes": [],
            }

    # ------------------------------------------------------------------
    # Pipeline principal: crop → upscale → preprocesar → OCR
    # ------------------------------------------------------------------

    def procesar_zona_con_ocr(
        self,
        imagen_bytes: bytes,
        zona: Tuple[int, int, int, int],
        solo_digitos: bool = False,
        threshold: int = 110,
    ) -> Dict:
        """Procesa una zona de la imagen completa y extrae texto OCR."""
        self.tratamientos_aplicados = []

        img = self._cargar_imagen(imagen_bytes)
        if img is None:
            return {"exito": False, "error": "No se pudo cargar la imagen"}

        img = self._crop_zona(img, zona)     # 1. Crop (imagen pequeña)
        if img is None:
            return {"exito": False, "error": "La zona de recorte está fuera de los límites de la imagen. La imagen debe tener el tamaño suficiente para abarcar la zona especificada."}
            
        img = self._upscale(img)             # 2. Upscale solo del recorte
        img_gray = self._preprocesar_para_ocr(img, threshold)  # 3. Grises + CLAHE + Threshold

        # Guardar imagen procesada como PNG para debug/guardado
        imagen_procesada_bytes = cv2.imencode(".png", img_gray)[1].tobytes()

        ocr_result = self.extraer_texto(img_gray, solo_digitos=solo_digitos)

        return {
            "exito": True,
            "imagen_procesada": imagen_procesada_bytes,
            "dimensiones": img_gray.shape,
            "tratamientos_aplicados": self.tratamientos_aplicados,
            "ocr": ocr_result,
        }

    # ------------------------------------------------------------------
    # Persistencia de resultados
    # ------------------------------------------------------------------

    def guardar_resultado(self, imagen_bytes: bytes, zona_nombre: str, datos_adicionales: Dict = None) -> Dict:
        """Guarda imagen procesada y metadatos JSON en disco."""
        try:
            carpeta = OCR_CONFIG["resultados_dir"]
            os.makedirs(carpeta, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            nombre_base = f"{self.tipo.replace(' ', '_')}_{zona_nombre}_{timestamp}"

            ruta_imagen = os.path.join(carpeta, f"{nombre_base}.png")
            with open(ruta_imagen, "wb") as f:
                f.write(imagen_bytes)

            metadatos = {
                "timestamp": timestamp,
                "tipo_cedula": self.tipo,
                "zona": zona_nombre,
                "tratamientos": self.tratamientos_aplicados,
                "ruta_imagen": ruta_imagen,
            }
            if datos_adicionales:
                metadatos.update(datos_adicionales)

            ruta_json = os.path.join(carpeta, f"{nombre_base}.json")
            with open(ruta_json, "w") as f:
                json.dump(metadatos, f, indent=2, ensure_ascii=False)

            return {"exito": True, "ruta_imagen": ruta_imagen, "ruta_json": ruta_json}

        except Exception as e:
            logger.error(f"[{self.tipo}] Error guardando resultado: {e}")
            return {"exito": False, "error": str(e)}

    # ------------------------------------------------------------------
    # Utilidades
    # ------------------------------------------------------------------

    @staticmethod
    def calcular_confianza_promedio(componentes: list) -> float:
        if not componentes:
            return 0.0
        return sum(c.get("confianza", 0) for c in componentes) / len(componentes)

import re
from config.ocr_cedula_config import OCR_CONFIG, OCR_ZONAS
from services.ocr.base import BaseCedulaNacionalOCR

VARIACIONES_NOMBRES = {
    "NOMBRES", "MOMBRES", "NOMARES", "NOMBFES", "NQMBRES", "NOMORES",
}


def _ultimos_10_digitos(texto: str) -> str:
    return re.sub(r"\D", "", texto or "")[-10:]


class CedulaNacionalNuevaOCR(BaseCedulaNacionalOCR):
    """OCR para cédulas nuevas de Ecuador."""

    def __init__(self, tipo_camara: str = "peatonal"):
        super().__init__("Cédula Nueva")
        self.tipo_camara = tipo_camara
        self.zonas = OCR_ZONAS[tipo_camara]["nueva"]

    # ------------------------------------------------------------------
    # Parsers
    # ------------------------------------------------------------------

    def _extraer_numero_cedula(self, texto_ocr: str, confianza: float) -> dict:
        texto = texto_ocr.strip().upper()
        # Remover prefijos NUI
        texto = re.sub(r"^NUI\.?\s*", "", texto)
        numero = _ultimos_10_digitos(texto)
        return {"numero": numero, "confianza": confianza}

    def _parsear_nombres_apellidos(self, componentes: list) -> dict:
        if not componentes:
            return {"apellidos": "", "nombres": "", "confianza_apellidos": 0.0, "confianza_nombres": 0.0}

        indice_nombres = next(
            (i for i, c in enumerate(componentes) if c.get("texto", "").upper().strip() in VARIACIONES_NOMBRES),
            None
        )

        if indice_nombres is None:
            texto = " ".join(c.get("texto", "") for c in componentes)
            conf = self.calcular_confianza_promedio(componentes)
            return {"apellidos": "", "nombres": texto, "confianza_apellidos": 0.0, "confianza_nombres": conf}

        apellidos_comps = componentes[max(0, indice_nombres - 2):indice_nombres]
        nombres_comps = componentes[indice_nombres + 1:indice_nombres + 2]

        return {
            "apellidos": " ".join(c.get("texto", "") for c in apellidos_comps).strip(),
            "nombres": " ".join(c.get("texto", "") for c in nombres_comps).strip(),
            "confianza_apellidos": self.calcular_confianza_promedio(apellidos_comps),
            "confianza_nombres": self.calcular_confianza_promedio(nombres_comps),
        }

    # ------------------------------------------------------------------
    # Métodos públicos
    # ------------------------------------------------------------------

    def procesar_numero_cedula(self, imagen_bytes: bytes) -> dict:
        resultado = self.procesar_zona_con_ocr(
            imagen_bytes,
            self.zonas["zona_numero"],
            solo_digitos=True,   # allowlist de dígitos → más rápido y preciso
            threshold=110,
        )
        if not resultado.get("exito"):
            return resultado

        ocr = resultado.get("ocr", {})
        confianza = self.calcular_confianza_promedio(ocr.get("componentes", []))
        numero_parseado = self._extraer_numero_cedula(ocr.get("texto_completo", ""), confianza)
        resultado["numero_cedula_parseado"] = numero_parseado

        if OCR_CONFIG["guardar_debug"]:
            resultado["guardado"] = self.guardar_resultado(
                resultado["imagen_procesada"],
                "numero_cedula",
                {"ocr": ocr, "numero_cedula_parseado": numero_parseado},
            )
        return resultado

    def procesar_nombres_apellidos(self, imagen_bytes: bytes) -> dict:
        resultado = self.procesar_zona_con_ocr(
            imagen_bytes,
            self.zonas["zona_nombres_apellidos"],
            solo_digitos=False,
            threshold=110,
        )
        if not resultado.get("exito"):
            return resultado

        componentes = resultado.get("ocr", {}).get("componentes", [])
        parsed = self._parsear_nombres_apellidos(componentes)
        resultado["nombres_apellidos_parseados"] = parsed

        if OCR_CONFIG["guardar_debug"]:
            resultado["guardado"] = self.guardar_resultado(
                resultado["imagen_procesada"],
                "nombres_apellidos",
                {"ocr": resultado.get("ocr"), "nombres_apellidos_parseados": parsed},
            )
        return resultado

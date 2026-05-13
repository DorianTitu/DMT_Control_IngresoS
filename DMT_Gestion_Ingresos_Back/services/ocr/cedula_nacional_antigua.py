import re
from config.ocr_cedula_config import OCR_CONFIG, OCR_ZONAS
from services.ocr.base import BaseCedulaNacionalOCR

VARIACIONES_NOMBRES = {
    "NOMBRES", "MOMBRES", "NOMARES", "NOMBFES", "NQMBRES", "NOMORES",
}

TEXTOS_IGNORADOS_ANTIGUA = {
    "CEDULA", "CÉDULA", "CIUDADANIA", "CIUDADANÍA", "APELLIDOS", "NOMBRES",
    "APELLIDOS Y NOMBRES", "APELLIDOS NOMBRES", "DIRECCION", "DIRECCIÓN",
    "IDENTIFICACION", "IDENTIFICACIÓN", "CEDULACION", "CEDULACIÓN",
    "EDULACION", "EDULACIOM",
}


def _ultimos_10_digitos(texto: str) -> str:
    return re.sub(r"\D", "", texto or "")[-10:]


def _normalizar_etiqueta(texto: str) -> str:
    texto = (texto or "").upper()
    return texto.translate(str.maketrans({"0": "O", "1": "I", "8": "B"}))


class CedulaNacionalAntiguaOCR(BaseCedulaNacionalOCR):
    """OCR para cédulas antiguas de Ecuador."""

    def __init__(self, tipo_camara: str = "peatonal"):
        super().__init__("Cédula Antigua")
        self.tipo_camara = tipo_camara
        self.zonas = OCR_ZONAS[tipo_camara]["antigua"]

    # ------------------------------------------------------------------
    # Parsers
    # ------------------------------------------------------------------

    def _extraer_numero_cedula_antigua(self, componentes: list) -> dict:
        for comp in componentes:
            texto = comp.get("texto", "").strip()
            numero = _ultimos_10_digitos(texto)
            if len(numero) >= 10:
                return {"numero": numero, "confianza": comp.get("confianza", 0)}
        return {"numero": "", "confianza": 0}

    def _parsear_nombres_apellidos_antigua(self, componentes: list) -> dict:
        if not componentes:
            return {"apellidos": "", "nombres": "", "confianza_apellidos": 0.0, "confianza_nombres": 0.0}

        lineas = []
        for comp in componentes:
            texto = comp.get("texto", "").upper().strip()
            texto = re.sub(r"\s+", " ", texto)
            etiqueta = _normalizar_etiqueta(texto)
            if not texto or etiqueta in TEXTOS_IGNORADOS_ANTIGUA:
                continue
            if "APELLIDO" in etiqueta or "NOMBRE" in etiqueta or ("NOM" in etiqueta and "RES" in etiqueta):
                continue
            if "CEDULA" in etiqueta or "CÉDULA" in etiqueta or "CIUDADANIA" in etiqueta or "CIUDADANÍA" in etiqueta:
                continue
            if "DIRECCI" in etiqueta or "IDENTIF" in etiqueta or "EDULA" in etiqueta:
                continue
            if re.fullmatch(r"[\d\W_]+", texto):
                continue
            lineas.append({"texto": texto, "confianza": comp.get("confianza", 0)})

        if len(lineas) >= 2:
            apellidos_comps = [lineas[0]]
            nombres_comps = [lineas[1]]
            return {
                "apellidos": lineas[0]["texto"],
                "nombres": lineas[1]["texto"],
                "confianza_apellidos": self.calcular_confianza_promedio(apellidos_comps),
                "confianza_nombres": self.calcular_confianza_promedio(nombres_comps),
            }

        indice_nombres = next(
            (i for i, c in enumerate(componentes) if c.get("texto", "").upper().strip() in VARIACIONES_NOMBRES),
            None
        )

        if indice_nombres is None:
            return {"apellidos": "", "nombres": "", "confianza_apellidos": 0.0, "confianza_nombres": 0.0}

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
            solo_digitos=True,
            threshold=110,
        )
        if not resultado.get("exito"):
            return resultado

        componentes = resultado.get("ocr", {}).get("componentes", [])
        numero_parseado = self._extraer_numero_cedula_antigua(componentes)
        resultado["numero_cedula_parseado"] = numero_parseado

        if OCR_CONFIG["guardar_debug"]:
            resultado["guardado"] = self.guardar_resultado(
                resultado["imagen_procesada"],
                "numero_cedula",
                {"ocr": resultado.get("ocr"), "numero_cedula_parseado": numero_parseado},
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
        parsed = self._parsear_nombres_apellidos_antigua(componentes)
        resultado["nombres_apellidos_parseados"] = parsed

        if OCR_CONFIG["guardar_debug"]:
            resultado["guardado"] = self.guardar_resultado(
                resultado["imagen_procesada"],
                "nombres_apellidos",
                {"ocr": resultado.get("ocr"), "nombres_apellidos_parseados": parsed},
            )
        return resultado

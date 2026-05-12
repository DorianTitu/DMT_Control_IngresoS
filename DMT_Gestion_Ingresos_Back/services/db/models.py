from datetime import date, datetime, time

from sqlalchemy import (
    Column,
    JSON,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from services.db.session import Base


class Ingreso(Base):
    __tablename__ = "ingresos"
    __table_args__ = (
        UniqueConstraint("tipo", "ticket", name="uq_ingresos_tipo_ticket"),
    )

    id = Column(Integer, primary_key=True, index=True)
    ticket = Column(String(40), nullable=False, index=True)
    tipo = Column(String(20), nullable=False, index=True)  # peatonal | vehicular
    numero_cedula = Column(String(10), nullable=False, index=True)
    nombres = Column(String(120), nullable=False)
    apellidos = Column(String(120), nullable=False)
    departamento = Column(String(80), nullable=False, index=True)
    motivo = Column(String(120), nullable=False)
    fecha_ingreso = Column(Date, nullable=False, index=True, default=date.today)
    hora_entrada = Column(Time, nullable=False)
    hora_salida = Column(Time, nullable=True)
    estado = Column(String(20), nullable=False, default="activo", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    imagenes = relationship("IngresoImagen", back_populates="ingreso", cascade="all, delete-orphan")
    ocr_resultados = relationship("OcrResultado", back_populates="ingreso")


class IngresoImagen(Base):
    __tablename__ = "ingreso_imagenes"
    __table_args__ = (
        UniqueConstraint("ingreso_id", "tipo", name="uq_imagen_ingreso_tipo"),
    )

    id = Column(Integer, primary_key=True)
    ingreso_id = Column(Integer, ForeignKey("ingresos.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(30), nullable=False)  # usuario | cedula | placa
    ruta_archivo = Column(Text, nullable=False)
    mime_type = Column(String(80), nullable=False, default="image/jpeg")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ingreso = relationship("Ingreso", back_populates="imagenes")


class OcrResultado(Base):
    __tablename__ = "ocr_resultados"

    id = Column(Integer, primary_key=True)
    ingreso_id = Column(Integer, ForeignKey("ingresos.id", ondelete="SET NULL"), nullable=True, index=True)
    tipo_cedula = Column(String(20), nullable=True)
    tipo_camara = Column(String(20), nullable=True)
    texto_numero = Column(Text, nullable=True)
    texto_nombres = Column(Text, nullable=True)
    texto_apellidos = Column(Text, nullable=True)
    resultado_ia_json = Column(JSON, nullable=True)
    confianza = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ingreso = relationship("Ingreso", back_populates="ocr_resultados")


class IaCache(Base):
    __tablename__ = "ia_cache"

    id = Column(Integer, primary_key=True)
    hash = Column(String(64), nullable=False, unique=True, index=True)
    texto_numero = Column(Text, nullable=False, default="")
    texto_nombres = Column(Text, nullable=False, default="")
    texto_apellidos = Column(Text, nullable=False, default="")
    respuesta_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

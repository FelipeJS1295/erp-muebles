"""
Modelo de Remuneraciones
========================
Sueldo base y tipo de contrato por trabajador.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class TipoContratoEnum(str, enum.Enum):
    contrato = "contrato"
    boleta = "boleta"
    sin_contrato = "sin_contrato"


class Remuneracion(Base):
    __tablename__ = "remuneraciones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trabajador_id = Column(Integer, ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False, unique=True)
    sueldo_base = Column(Float, nullable=False)
    tipo = Column(SAEnum(TipoContratoEnum, name="tipocontratoenum"), nullable=False)
    activo = Column(Integer, default=1)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Remuneracion trabajador={self.trabajador_id} ${self.sueldo_base}>"
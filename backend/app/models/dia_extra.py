"""
Modelo de Días Extras
=====================
Registro de días extras (sábado/domingo) por trabajador.
"""
from sqlalchemy import Column, Integer, Float, Date, DateTime, String, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class TipoDiaExtraEnum(str, enum.Enum):
    sabado  = "sabado"
    domingo = "domingo"


class EstadoDiaExtraEnum(str, enum.Enum):
    pendiente = "pendiente"
    aprobada  = "aprobada"
    rechazada = "rechazada"


class DiaExtra(Base):
    __tablename__ = "dias_extras"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trabajador_id = Column(Integer, ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False)
    fecha = Column(Date, nullable=False)
    tipo_dia = Column(SAEnum(TipoDiaExtraEnum, name="tipodiaextraenum"), nullable=False)
    monto = Column(Float, nullable=False)
    observacion = Column(String(300), nullable=True)
    estado = Column(SAEnum(EstadoDiaExtraEnum, name="estadodiaextraenum"), nullable=False, default="pendiente")
    aprobado_por = Column(String(100), nullable=True)
    fecha_aprobacion = Column(DateTime, nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<DiaExtra trabajador={self.trabajador_id} {self.tipo_dia} ${self.monto} estado={self.estado}>"
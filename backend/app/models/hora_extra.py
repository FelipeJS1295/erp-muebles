"""
Modelo de Horas Extras
======================
Registro de horas extras por trabajador, con aprobación de admin_master.
"""
from sqlalchemy import Column, Integer, Float, Date, DateTime, String, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class EstadoHoraExtraEnum(str, enum.Enum):
    pendiente = "pendiente"
    aprobada  = "aprobada"
    rechazada = "rechazada"


class HoraExtra(Base):
    __tablename__ = "horas_extras"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trabajador_id = Column(Integer, ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False)
    fecha = Column(Date, nullable=False)
    horas = Column(Float, nullable=False)
    sueldo_base = Column(Float, nullable=False)   # snapshot al momento del registro
    valor_hora = Column(Float, nullable=False)     # calculado: (sueldo/30/28)*1.5  — 28 = hrs semanales * 4 semanas? ver fórmula
    monto_total = Column(Float, nullable=False)    # valor_hora * horas
    observacion = Column(String(300), nullable=True)
    estado = Column(SAEnum(EstadoHoraExtraEnum, name="estadohoraextraenum"), nullable=False, default="pendiente")
    aprobado_por = Column(String(100), nullable=True)
    fecha_aprobacion = Column(DateTime, nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<HoraExtra trabajador={self.trabajador_id} horas={self.horas} estado={self.estado}>"
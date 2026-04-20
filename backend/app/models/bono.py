"""
Modelo de Bonos
===============
Registro de bonos asignados a trabajadores.
"""
from sqlalchemy import Column, Integer, Float, Date, DateTime, String, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class EstadoBonoEnum(str, enum.Enum):
    pendiente = "pendiente"
    aprobado  = "aprobado"
    rechazado = "rechazado"


class Bono(Base):
    __tablename__ = "bonos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trabajador_id = Column(Integer, ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False)
    fecha = Column(Date, nullable=False)
    monto = Column(Float, nullable=False)
    descripcion = Column(String(300), nullable=True)
    estado = Column(SAEnum(EstadoBonoEnum, name="estadobonoenum"), nullable=False, default="pendiente")
    aprobado_por = Column(String(100), nullable=True)
    fecha_aprobacion = Column(DateTime, nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Bono trabajador={self.trabajador_id} ${self.monto} estado={self.estado}>"
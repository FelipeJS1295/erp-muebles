"""
Modelo de Días Faltantes
========================
Registro de inasistencias de trabajadores con descuento automático.
"""
from sqlalchemy import Column, Integer, Float, Date, DateTime, String, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base


class DiaFaltante(Base):
    __tablename__ = "dias_faltantes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trabajador_id = Column(Integer, ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False)
    fecha = Column(Date, nullable=False)
    sueldo_base = Column(Float, nullable=False)   # snapshot al momento del registro
    monto_descuento = Column(Float, nullable=False)  # sueldo_base / 30 (negativo en vista)
    observacion = Column(String(300), nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<DiaFaltante trabajador={self.trabajador_id} fecha={self.fecha} descuento={self.monto_descuento}>"
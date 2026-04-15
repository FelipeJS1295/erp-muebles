"""
Modelo de Orden de Trabajo
==========================
Registro de producción por trabajador y producto.
"""

from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base


class OrdenTrabajo(Base):
    __tablename__ = "ordenes_trabajo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    numero_ot = Column(String(50), nullable=False, unique=True, index=True)
    tipo = Column(String(20), default='produccion')
    fecha = Column(Date, nullable=False)
    trabajador_id = Column(Integer, ForeignKey('trabajadores.id'), nullable=False)
    producto_interno_id = Column(Integer, ForeignKey('productos_internos.id'), nullable=False)
    descripcion = Column(String(500), nullable=True)
    cargo_trabajador = Column(String(50), nullable=False)
    precio_aplicado = Column(Float, nullable=False)
    estado = Column(String(50), default='pendiente')
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<OrdenTrabajo {self.numero_ot}>"
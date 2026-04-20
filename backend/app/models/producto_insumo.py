from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class ProductoInsumo(Base):
    __tablename__ = "producto_insumos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    producto_interno_id = Column(Integer, ForeignKey('productos_internos.id'), nullable=False)
    insumo_id = Column(Integer, ForeignKey('insumos.id'), nullable=False)
    cantidad = Column(Float, nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<ProductoInsumo producto={self.producto_interno_id} insumo={self.insumo_id} cantidad={self.cantidad}>"
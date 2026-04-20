from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class SkuRetail(Base):
    __tablename__ = "sku_retail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    producto_interno_id = Column(Integer, ForeignKey('productos_internos.id'), nullable=False, unique=True, index=True)

    # SKUs de marketplaces conocidos
    sku_walmart = Column(String(100), nullable=True, index=True)
    sku_paris = Column(String(100), nullable=True, index=True)
    sku_falabella = Column(String(100), nullable=True, index=True)
    sku_ripley = Column(String(100), nullable=True, index=True)
    sku_hites = Column(String(100), nullable=True, index=True)

    # SKUs adicionales de otros retail (JSON)
    # Formato: [{"nombre": "MercadoLibre", "sku": "MLB123"}, ...]
    otros_retail = Column(JSON, nullable=True)

    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<SkuRetail producto={self.producto_interno_id}>"
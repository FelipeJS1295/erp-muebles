from sqlalchemy import Column, Integer, String, DateTime, func
from app.db.base import Base

class AliasProducto(Base):
    __tablename__ = "alias_productos_maestra"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sku = Column(String(200), nullable=False, index=True)
    nombre_original = Column(String(500), nullable=False)
    alias = Column(String(500), nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
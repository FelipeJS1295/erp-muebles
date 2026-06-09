from sqlalchemy import Column, Integer, String, DateTime, func
from app.db.base import Base

class AliasTransporte(Base):
    __tablename__ = "alias_transporte"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sku = Column(String(200), nullable=False, index=True)
    nombre_original = Column(String(500), nullable=False)
    alias = Column(String(500), nullable=False)
    hora_despacho = Column(String(10), nullable=True)
    transporte = Column(String(200), nullable=True)
    empresa = Column(String(200), nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
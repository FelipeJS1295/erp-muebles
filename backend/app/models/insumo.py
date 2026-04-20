from sqlalchemy import Column, Integer, String, Float, Enum as SAEnum, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class UnidadMedidaEnum(str, enum.Enum):
    kg = "kg"
    metros = "metros"
    centimetros = "centimetros"
    unidades = "unidades"
    litros = "litros"
    gramos = "gramos"
    metros2 = "metros2"


class Insumo(Base):
    __tablename__ = "insumos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(100), nullable=False, unique=True, index=True)
    nombre = Column(String(300), nullable=False)
    unidad_medida = Column(SAEnum(UnidadMedidaEnum), nullable=False)
    precio_costo = Column(Float, nullable=False)
    precio_venta = Column(Float, nullable=False)
    activo = Column(Integer, default=1)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Insumo {self.codigo} - {self.nombre}>"
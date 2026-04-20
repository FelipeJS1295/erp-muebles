from sqlalchemy import Column, Integer, String, Float, JSON, Enum as SAEnum, DateTime
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class TipoProductoEnum(str, enum.Enum):
    sofa = "sofa"
    seccional = "seccional"
    modular = "modular"
    poltrona = "poltrona"
    cojineria = "cojineria"
    cama = "cama"


class ProductoInterno(Base):
    __tablename__ = "productos_internos"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Identificadores
    sku_padre = Column(String(100), nullable=False, index=True)
    sku = Column(String(100), nullable=False, unique=True, index=True)
    descripcion = Column(String(500), nullable=False)
    descripcion_esqueleto = Column(String(500), nullable=True)
    tipo_producto = Column(SAEnum(TipoProductoEnum), nullable=False)

    # Precios obligatorios
    precio_venta = Column(Float, nullable=False)
    precio_venta_descuento = Column(Float, nullable=False)
    precio_costura = Column(Float, nullable=False)
    precio_esqueleteria = Column(Float, nullable=False)
    precio_tapiceria = Column(Float, nullable=False)

    # Datos opcionales
    color = Column(String(100), nullable=True)
    material = Column(String(200), nullable=True)
    peso = Column(Float, nullable=True)

    # Dimensiones opcionales (JSON)
    dimensiones = Column(JSON, nullable=True)  # {alto, ancho, largo}

    # Imágenes (JSON con lista de URLs)
    imagenes = Column(JSON, nullable=True)  # ["url1", "url2", ...]

    # Metadata
    activo = Column(Integer, default=1)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<ProductoInterno {self.sku} - {self.descripcion}>"
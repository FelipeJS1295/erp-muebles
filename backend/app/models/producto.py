from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Identificación
    sku: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(300), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(1000), nullable=True)

    # Atributos específicos de muebles
    material: Mapped[str] = mapped_column(String(200), nullable=True)
    acabado: Mapped[str] = mapped_column(String(200), nullable=True)
    color: Mapped[str] = mapped_column(String(100), nullable=True)

    # Dimensiones (en centímetros)
    alto_cm: Mapped[float] = mapped_column(Float, nullable=True)
    ancho_cm: Mapped[float] = mapped_column(Float, nullable=True)
    profundo_cm: Mapped[float] = mapped_column(Float, nullable=True)
    peso_kg: Mapped[float] = mapped_column(Float, nullable=True)

    # Precios
    precio_costo: Mapped[float] = mapped_column(Float, nullable=True)
    precio_venta: Mapped[float] = mapped_column(Float, nullable=True)

    # Stock
    stock_actual: Mapped[int] = mapped_column(Integer, default=0)
    stock_minimo: Mapped[int] = mapped_column(Integer, default=5)

    # Estado
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    # SKUs en marketplaces (guardados como JSON)
    skus_marketplaces: Mapped[dict] = mapped_column(JSON, nullable=True)
    # Ejemplo: {"walmart": "MBL-001", "paris": "MKNWDUW99Q-1"}

    # Fechas
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    def __repr__(self):
        return f"<Producto {self.sku} - {self.nombre}>"
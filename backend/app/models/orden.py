"""
Modelos de órdenes para todos los marketplaces
"""

from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
import enum


class MarketplaceEnum(str, enum.Enum):
    walmart = "walmart_chile"
    paris = "paris_chile"
    falabella = "falabella"
    ripley = "ripley"
    manual = "manual"


class EstadoOrdenEnum(str, enum.Enum):
    pendiente = "pendiente"
    confirmada = "confirmada"
    lista_despacho = "lista_despacho"
    despachada = "despachada"
    entregada = "entregada"
    cancelada = "cancelada"


class Orden(Base):
    __tablename__ = "ordenes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Identificadores del marketplace
    marketplace: Mapped[str] = mapped_column(
        SAEnum(MarketplaceEnum), nullable=False, index=True
    )
    orden_id_marketplace: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    sub_orden_id: Mapped[str] = mapped_column(String(100), nullable=True)

    # Cliente
    cliente_nombre: Mapped[str] = mapped_column(String(200), nullable=True)
    cliente_id: Mapped[int] = mapped_column(Integer, nullable=True)

    # Estado
    estado_marketplace: Mapped[str] = mapped_column(String(100), nullable=True)
    estado_interno: Mapped[str] = mapped_column(
        SAEnum(EstadoOrdenEnum),
        default=EstadoOrdenEnum.pendiente,
        nullable=False,
    )

    # Productos (guardados como JSON)
    items: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Montos
    total: Mapped[float] = mapped_column(Float, nullable=True)

    # Despacho
    carrier: Mapped[str] = mapped_column(String(100), nullable=True)
    fecha_despacho: Mapped[str] = mapped_column(String(50), nullable=True)
    fecha_llegada: Mapped[str] = mapped_column(String(50), nullable=True)
    label_url: Mapped[str] = mapped_column(String(500), nullable=True)

    # Fechas internas
    fecha_marketplace: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # Raw data por si necesitamos algo extra
    raw: Mapped[dict] = mapped_column(JSON, nullable=True)
    notas: Mapped[str] = mapped_column(String(500), nullable=True)

    def __repr__(self):
        return f"<Orden {self.marketplace} {self.orden_id_marketplace}>"
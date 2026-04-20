from sqlalchemy import Column, Integer, Float, Date, DateTime, String, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class TipoOtroDescuentoEnum(str, enum.Enum):
    compras = "compras"
    horas   = "horas"
    otro    = "otro"


class OtroDescuento(Base):
    __tablename__ = "otros_descuentos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trabajador_id = Column(Integer, ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False)
    tipo = Column(SAEnum(TipoOtroDescuentoEnum, name="tipootrodescuentoenum"), nullable=False)

    # Compras
    documento = Column(String(200), nullable=True)      # N° boleta/factura
    monto_total = Column(Float, nullable=False)          # monto total del descuento
    cuotas = Column(Integer, nullable=True, default=1)   # cuántas cuotas
    monto_cuota = Column(Float, nullable=True)           # monto_total / cuotas
    cuotas_pagadas = Column(Integer, nullable=False, default=0)

    # Horas
    horas = Column(Float, nullable=True)
    valor_hora = Column(Float, nullable=True)            # snapshot

    # Otro
    descripcion = Column(String(300), nullable=True)

    # Estado
    activo = Column(Integer, default=1)                  # 0 cuando cuotas_pagadas == cuotas
    fecha_inicio = Column(Date, nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<OtroDescuento trabajador={self.trabajador_id} tipo={self.tipo} ${self.monto_total}>"
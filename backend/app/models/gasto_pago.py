from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class TipoPagoEnum(str, enum.Enum):
    transferencia = "transferencia"
    cheque = "cheque"
    efectivo = "efectivo"
    tarjeta = "tarjeta"
    otro = "otro"


class GastoPago(Base):
    __tablename__ = "gasto_pagos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    gasto_id = Column(Integer, ForeignKey('gastos.id', ondelete='CASCADE'), nullable=False)
    fecha = Column(Date, nullable=False)
    tipo = Column(SAEnum(TipoPagoEnum, name="tipopagoenum"), nullable=False)
    comprobante = Column(String(200), nullable=True)
    monto = Column(Float, nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<GastoPago gasto={self.gasto_id} ${self.monto} - {self.tipo}>"
"""
Modelo de Gastos Mensuales
==========================
Registro de gastos operacionales de la empresa.
"""
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class TipoGastoEnum(str, enum.Enum):
    arriendo = "arriendo"
    servicios = "servicios"
    remuneraciones = "remuneraciones"
    insumos = "insumos"
    logistica = "logistica"
    marketing = "marketing"
    equipamiento = "equipamiento"
    mantencion = "mantencion"
    impuestos = "impuestos"
    otros = "otros"


class Gasto(Base):
    __tablename__ = "gastos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fecha = Column(Date, nullable=False)
    tipo = Column(SAEnum(TipoGastoEnum, name="tipogastoenum"), nullable=False)
    descripcion = Column(String(500), nullable=False)
    monto = Column(Float, nullable=False)
    monto_pagado = Column(Float, nullable=False, default=0)
    estado = Column(String(20), nullable=False, default='pendiente')
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Gasto {self.tipo} ${self.monto} - {self.fecha}>"
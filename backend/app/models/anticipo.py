from sqlalchemy import Column, Integer, Float, Date, DateTime, String, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class EstadoAnticipoEnum(str, enum.Enum):
    pendiente    = "pendiente"
    pagado       = "pagado"
    rechazado    = "rechazado"


class TipoPagoAnticipoEnum(str, enum.Enum):
    efectivo     = "efectivo"
    cheque       = "cheque"
    transferencia = "transferencia"


class Anticipo(Base):
    __tablename__ = "anticipos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trabajador_id = Column(Integer, ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False)
    fecha = Column(Date, nullable=False)
    monto = Column(Float, nullable=False)
    observacion = Column(String(300), nullable=True)
    estado = Column(SAEnum(EstadoAnticipoEnum, name="estadoanticipooenum"), nullable=False, default="pendiente")
    tipo_pago = Column(SAEnum(TipoPagoAnticipoEnum, name="tipopagoanticipooenum"), nullable=True)
    fecha_pago = Column(Date, nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Anticipo trabajador={self.trabajador_id} ${self.monto} estado={self.estado}>"
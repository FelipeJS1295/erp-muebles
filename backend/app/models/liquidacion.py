from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class TipoLiquidacionEnum(str, enum.Enum):
    venta             = "venta"
    cobro_despacho    = "cobro_despacho"
    devolucion        = "devolucion"
    despacho          = "despacho"


class Liquidacion(Base):
    __tablename__ = "liquidaciones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    marketplace       = Column(String(50), nullable=False)         # paris_chile, walmart, etc
    nro_suborden      = Column(String(100), nullable=True)         # N° suborden del marketplace
    orden_id          = Column(Integer, ForeignKey('ordenes.id'), nullable=True)  # orden en nuestra BD si se encontró
    descripcion       = Column(String(500), nullable=True)
    tipo              = Column(SAEnum(TipoLiquidacionEnum, name="tipoliquidacionenum"), nullable=False)
    monto             = Column(Float, nullable=True)               # monto original de la venta
    comision_pct      = Column(Float, nullable=True)               # % de comisión
    monto_a_pagar     = Column(Float, nullable=True)               # lo que nos paga el marketplace
    fecha_transaccion = Column(Date, nullable=True)
    archivo_origen    = Column(String(300), nullable=True)         # nombre del archivo subido
    nro_solicitud     = Column(String(100), nullable=True)
    fecha_creacion    = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<Liquidacion {self.marketplace} {self.tipo} ${self.monto_a_pagar}>"
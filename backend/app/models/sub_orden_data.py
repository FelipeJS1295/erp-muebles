"""
Modelo Sub Orden Data
=====================
Datos extendidos de una orden para boletas y facturación.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base


class SubOrdenData(Base):
    __tablename__ = "sub_orden_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    orden_id = Column(Integer, ForeignKey('ordenes.id'), nullable=False)
    orden_id_marketplace = Column(String(100), nullable=True)
    marketplace = Column(String(50), nullable=True)
    # Cliente
    cliente_nombre = Column(String(200), nullable=True)
    cliente_rut = Column(String(20), nullable=True)
    cliente_email = Column(String(200), nullable=True)
    cliente_telefono = Column(String(30), nullable=True)
    # Billing
    billing_direccion = Column(String(300), nullable=True)
    billing_ciudad = Column(String(100), nullable=True)
    billing_comuna = Column(String(100), nullable=True)
    # Shipping
    shipping_direccion = Column(String(300), nullable=True)
    shipping_ciudad = Column(String(100), nullable=True)
    shipping_comuna = Column(String(100), nullable=True)
    # Costos
    costo_despacho = Column(Float, nullable=True, default=0)
    subtotal_productos = Column(Float, nullable=True, default=0)
    total = Column(Float, nullable=True, default=0)
    # Tipo documento
    tipo_documento = Column(String(50), nullable=True, default='boleta')
    # Factura
    factura_rut = Column(String(20), nullable=True)
    factura_razon_social = Column(String(200), nullable=True)
    factura_giro = Column(String(200), nullable=True)
    factura_direccion = Column(String(300), nullable=True)
    factura_ciudad = Column(String(100), nullable=True)
    factura_comuna = Column(String(100), nullable=True)
    factura_email = Column(String(200), nullable=True)
    # Fechas
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now())
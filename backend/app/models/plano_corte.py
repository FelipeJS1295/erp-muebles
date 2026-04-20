from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base


class PlanoCorte(Base):
    __tablename__ = "planos_corte"

    id = Column(Integer, primary_key=True, autoincrement=True)
    producto_interno_id = Column(Integer, ForeignKey('productos_internos.id'), nullable=False)
    nombre = Column(String(200), nullable=False)
    meson_largo = Column(Float, nullable=False)
    meson_ancho = Column(Float, nullable=False)
    piezas = Column(JSON, nullable=True)
    activo = Column(Integer, default=1)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<PlanoCorte {self.nombre} - producto={self.producto_interno_id}>"
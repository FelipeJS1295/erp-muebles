from sqlalchemy import Column, Integer, Float, Date, DateTime, String, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base


class Anticipo(Base):
    __tablename__ = "anticipos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trabajador_id = Column(Integer, ForeignKey('trabajadores.id', ondelete='CASCADE'), nullable=False)
    fecha = Column(Date, nullable=False)
    monto = Column(Float, nullable=False)
    observacion = Column(String(300), nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Anticipo trabajador={self.trabajador_id} ${self.monto}>"
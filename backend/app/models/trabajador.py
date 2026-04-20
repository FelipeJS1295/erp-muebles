from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class CargoEnum(str, enum.Enum):
    corte = "corte"
    costura = "costura"
    tapiceria = "tapiceria"
    esqueleteria = "esqueleteria"
    bodega = "bodega"
    cojineria = "cojineria"
    embalaje = "embalaje"
    oficina = "oficina"


class Trabajador(Base):
    __tablename__ = "trabajadores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rut = Column(String(12), nullable=False, unique=True, index=True)
    nombre_completo = Column(String(200), nullable=False)
    email = Column(String(200), nullable=True, unique=True, index=True)
    password_hash = Column(String(200), nullable=True)
    cargo = Column(SAEnum(CargoEnum), nullable=True)
    activo = Column(Integer, default=1)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Trabajador {self.rut} - {self.nombre_completo}>"
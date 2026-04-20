from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.db.base import Base


class ClienteVenta(Base):
    __tablename__ = "clientes_ventas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rut = Column(String(20), nullable=True, unique=True, index=True)
    nombre = Column(String(200), nullable=False)
    email = Column(String(200), nullable=True)
    telefono = Column(String(20), nullable=True)
    activo = Column(Integer, default=1)
    fecha_creacion = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<ClienteVenta {self.rut} - {self.nombre}>"
from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class RolEnum(str, enum.Enum):
    admin_master = "admin_master"
    admin = "admin"
    user = "user"
    view = "view"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre_usuario = Column(String(100), nullable=False, unique=True, index=True)
    email = Column(String(200), nullable=False, unique=True, index=True)
    password_hash = Column(String(200), nullable=False)
    rol = Column(SAEnum(RolEnum), nullable=False, default=RolEnum.user)
    activo = Column(Integer, default=1)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Usuario {self.nombre_usuario} - {self.rol}>"
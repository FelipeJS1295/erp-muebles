from pydantic import BaseModel, EmailStr
from enum import Enum

class RolProduccion(str, Enum):
    TAPICERIA = "Tapicería"
    COSTURA = "Costura"
    ESQUELETERIA = "Esqueleteria"

class UsuarioProduccionBase(BaseModel):
    nombre: str
    rut: str
    correo: EmailStr
    rol: RolProduccion

class UsuarioProduccionCreate(UsuarioProduccionBase):
    password: str

class UsuarioProduccionOut(UsuarioProduccionBase):
    id: int

    class Config:
        from_attributes = True
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.contador import Contador
import hashlib

router = APIRouter(prefix="/api/v1/contadores", tags=["Contadores"])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@router.get("")
async def listar_contadores(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Contador).order_by(Contador.nombre))
        contadores = result.scalars().all()
        return {
            "contadores": [
                {
                    "id": c.id,
                    "nombre": c.nombre,
                    "email": c.email,
                    "activo": c.activo,
                    "fecha_creacion": c.fecha_creacion.isoformat() if c.fecha_creacion else None,
                }
                for c in contadores
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("")
async def crear_contador(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        nombre = data.get("nombre", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not nombre or not email or not password:
            raise HTTPException(status_code=400, detail="Nombre, email y contraseña son requeridos")

        existente = await db.execute(select(Contador).where(Contador.email == email))
        if existente.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ya existe un contador con ese email")

        contador = Contador(
            nombre=nombre,
            email=email,
            password_hash=hash_password(password),
            activo=True,
        )
        db.add(contador)
        await db.commit()
        await db.refresh(contador)
        return {"mensaje": "Contador creado", "id": contador.id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.put("/{id}")
async def actualizar_contador(id: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Contador).where(Contador.id == id))
        contador = result.scalar_one_or_none()
        if not contador:
            raise HTTPException(status_code=404, detail="Contador no encontrado")

        if "nombre" in data:
            contador.nombre = data["nombre"].strip()
        if "email" in data:
            contador.email = data["email"].strip().lower()
        if "password" in data and data["password"]:
            contador.password_hash = hash_password(data["password"])
        if "activo" in data:
            contador.activo = data["activo"]

        await db.commit()
        return {"mensaje": "Contador actualizado"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.delete("/{id}")
async def eliminar_contador(id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Contador).where(Contador.id == id))
        contador = result.scalar_one_or_none()
        if not contador:
            raise HTTPException(status_code=404, detail="Contador no encontrado")
        await db.delete(contador)
        await db.commit()
        return {"mensaje": "Contador eliminado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/login")
async def login_contador(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            raise HTTPException(status_code=400, detail="Email y contraseña requeridos")

        result = await db.execute(
            select(Contador).where(Contador.email == email, Contador.activo == True)
        )
        contador = result.scalar_one_or_none()

        if not contador or contador.password_hash != hash_password(password):
            raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

        from jose import jwt
        from datetime import datetime, timedelta
        import os

        secret = os.getenv("SECRET_KEY", "changeme")
        payload = {
            "sub": str(contador.id),
            "tipo": "contador",
            "exp": datetime.utcnow() + timedelta(days=30),
        }
        token = jwt.encode(payload, secret, algorithm="HS256")

        return {
            "access_token": token,
            "token_type": "bearer",
            "contador": {
                "id": contador.id,
                "nombre": contador.nombre,
                "email": contador.email,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
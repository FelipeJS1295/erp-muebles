import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.trabajador import Trabajador

router = APIRouter(prefix="/api/v1/trabajadores", tags=["Trabajadores"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


@router.get("")
async def listar_trabajadores(activo: int = 1, db: AsyncSession = Depends(get_db)):
    try:
        query = select(Trabajador).where(Trabajador.activo == activo).order_by(Trabajador.nombre_completo)
        result = await db.execute(query)
        trabajadores = result.scalars().all()
        return {
            "total": len(trabajadores),
            "trabajadores": [
                {
                    "id": t.id,
                    "rut": t.rut,
                    "nombre_completo": t.nombre_completo,
                    "email": t.email,
                    "cargo": t.cargo,
                    "activo": t.activo,
                    "fecha_creacion": t.fecha_creacion.isoformat() if t.fecha_creacion else None,
                }
                for t in trabajadores
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_trabajador(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        trabajador = Trabajador(
            rut=data["rut"],
            nombre_completo=data["nombre_completo"],
            email=data.get("email"),
            password_hash=hash_password(data["password"]) if data.get("password") else None,
            cargo=data.get("cargo"),
            activo=1,
        )
        db.add(trabajador)
        await db.commit()
        await db.refresh(trabajador)
        return {"mensaje": "Trabajador creado", "id": trabajador.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{id}")
async def actualizar_trabajador(id: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Trabajador).where(Trabajador.id == id))
        t = result.scalar_one_or_none()
        if not t:
            raise HTTPException(status_code=404, detail="Trabajador no encontrado")
        for campo in ["rut", "nombre_completo", "email", "cargo"]:
            if campo in data:
                setattr(t, campo, data[campo])
        if data.get("password"):
            t.password_hash = hash_password(data["password"])
        await db.commit()
        return {"mensaje": "Trabajador actualizado", "id": t.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{id}")
async def eliminar_trabajador(id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Trabajador).where(Trabajador.id == id))
        t = result.scalar_one_or_none()
        if not t:
            raise HTTPException(status_code=404, detail="Trabajador no encontrado")
        t.activo = 0
        await db.commit()
        return {"mensaje": "Trabajador desactivado", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/login")
async def login_trabajador(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        rut = data.get("rut", "").strip()
        password = data.get("password", "")

        if not rut or not password:
            raise HTTPException(status_code=400, detail="RUT y contraseña requeridos")

        result = await db.execute(
            select(Trabajador).where(
                Trabajador.rut == rut,
                Trabajador.activo == 1,
            )
        )
        trabajador = result.scalar_one_or_none()

        if not trabajador:
            raise HTTPException(status_code=401, detail="RUT o contraseña incorrectos")

        if not trabajador.password_hash:
            raise HTTPException(status_code=401, detail="Este trabajador no tiene contraseña configurada")

        if trabajador.password_hash != hash_password(password):
            raise HTTPException(status_code=401, detail="RUT o contraseña incorrectos")

        # Generar token simple (mismo sistema que usuarios)
        import jwt
        from datetime import datetime, timedelta
        import os

        secret = os.getenv("SECRET_KEY", "changeme")
        payload = {
            "sub": str(trabajador.id),
            "tipo": "trabajador",
            "exp": datetime.utcnow() + timedelta(days=30),
        }
        token = jwt.encode(payload, secret, algorithm="HS256")

        return {
            "access_token": token,
            "token_type": "bearer",
            "trabajador": {
                "id": trabajador.id,
                "nombre_completo": trabajador.nombre_completo,
                "rut": trabajador.rut,
                "cargo": trabajador.cargo or "otro",
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
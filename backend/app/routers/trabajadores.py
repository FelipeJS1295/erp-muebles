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
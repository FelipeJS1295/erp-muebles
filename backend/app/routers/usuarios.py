from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.usuario import Usuario
from app.auth import hash_password

router = APIRouter(prefix="/api/v1/usuarios", tags=["Usuarios"])


@router.get("")
async def listar_usuarios(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(Usuario).where(Usuario.activo == 1).order_by(Usuario.nombre_usuario)
        )
        usuarios = result.scalars().all()
        return {
            "total": len(usuarios),
            "usuarios": [
                {
                    "id": u.id,
                    "nombre_usuario": u.nombre_usuario,
                    "email": u.email,
                    "rol": u.rol,
                    "activo": u.activo,
                    "fecha_creacion": u.fecha_creacion.isoformat() if u.fecha_creacion else None,
                }
                for u in usuarios
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_usuario(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        if not data.get("password"):
            raise HTTPException(status_code=400, detail="La contraseña es obligatoria")
        usuario = Usuario(
            nombre_usuario=data["nombre_usuario"],
            email=data["email"],
            password_hash=hash_password(data["password"]),
            rol=data.get("rol", "user"),
            activo=1,
        )
        db.add(usuario)
        await db.commit()
        await db.refresh(usuario)
        return {"mensaje": "Usuario creado", "id": usuario.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{id}")
async def actualizar_usuario(id: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Usuario).where(Usuario.id == id))
        u = result.scalar_one_or_none()
        if not u:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        for campo in ["nombre_usuario", "email", "rol"]:
            if campo in data:
                setattr(u, campo, data[campo])
        if data.get("password"):
            u.password_hash = hash_password(data["password"])
        await db.commit()
        return {"mensaje": "Usuario actualizado", "id": u.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{id}")
async def eliminar_usuario(id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Usuario).where(Usuario.id == id))
        u = result.scalar_one_or_none()
        if not u:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        u.activo = 0
        await db.commit()
        return {"mensaje": "Usuario desactivado", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
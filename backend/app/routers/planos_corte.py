from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.plano_corte import PlanoCorte

router = APIRouter(prefix="/api/v1/planos-corte", tags=["Planos de Corte"])


@router.get("/producto/{producto_id}")
async def listar_planos(producto_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(PlanoCorte)
            .where(PlanoCorte.producto_interno_id == producto_id)
            .where(PlanoCorte.activo == 1)
            .order_by(PlanoCorte.fecha_creacion.desc())
        )
        planos = result.scalars().all()
        return {
            "producto_id": producto_id,
            "total": len(planos),
            "planos": [
                {
                    "id": p.id,
                    "nombre": p.nombre,
                    "meson_largo": p.meson_largo,
                    "meson_ancho": p.meson_ancho,
                    "piezas": p.piezas,
                    "fecha_creacion": p.fecha_creacion.isoformat() if p.fecha_creacion else None,
                    "fecha_actualizacion": p.fecha_actualizacion.isoformat() if p.fecha_actualizacion else None,
                }
                for p in planos
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/producto/{producto_id}")
async def crear_plano(producto_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        plano = PlanoCorte(
            producto_interno_id=producto_id,
            nombre=data.get("nombre", "Plano sin nombre"),
            meson_largo=data["meson_largo"],
            meson_ancho=data["meson_ancho"],
            piezas=data.get("piezas", []),
            activo=1,
        )
        db.add(plano)
        await db.commit()
        await db.refresh(plano)
        return {"mensaje": "Plano creado", "id": plano.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{plano_id}")
async def actualizar_plano(plano_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(PlanoCorte).where(PlanoCorte.id == plano_id))
        plano = result.scalar_one_or_none()
        if not plano:
            raise HTTPException(status_code=404, detail="Plano no encontrado")
        for campo in ["nombre", "meson_largo", "meson_ancho", "piezas"]:
            if campo in data:
                setattr(plano, campo, data[campo])
        await db.commit()
        return {"mensaje": "Plano actualizado", "id": plano.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{plano_id}")
async def eliminar_plano(plano_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(PlanoCorte).where(PlanoCorte.id == plano_id))
        plano = result.scalar_one_or_none()
        if not plano:
            raise HTTPException(status_code=404, detail="Plano no encontrado")
        plano.activo = 0
        await db.commit()
        return {"mensaje": "Plano eliminado", "id": plano_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
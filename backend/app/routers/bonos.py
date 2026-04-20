"""
Router de Bonos
"""
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.bono import Bono
from app.models.trabajador import Trabajador

router = APIRouter(prefix="/api/v1/bonos", tags=["Bonos"])


@router.get("")
async def listar_bonos(
    estado: str = None,
    trabajador_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = (
            select(Bono, Trabajador)
            .join(Trabajador, Bono.trabajador_id == Trabajador.id)
            .order_by(Bono.fecha_creacion.desc())
        )
        if estado:
            query = query.where(Bono.estado == estado)
        if trabajador_id:
            query = query.where(Bono.trabajador_id == trabajador_id)

        result = await db.execute(query)
        rows = result.all()
        return {
            "total": len(rows),
            "bonos": [
                {
                    "id": b.id,
                    "trabajador_id": b.trabajador_id,
                    "trabajador_nombre": t.nombre_completo,
                    "trabajador_rut": t.rut,
                    "trabajador_cargo": t.cargo,
                    "fecha": b.fecha.isoformat(),
                    "monto": b.monto,
                    "descripcion": b.descripcion,
                    "estado": b.estado,
                    "aprobado_por": b.aprobado_por,
                    "fecha_aprobacion": b.fecha_aprobacion.isoformat() if b.fecha_aprobacion else None,
                    "fecha_creacion": b.fecha_creacion.isoformat() if b.fecha_creacion else None,
                }
                for b, t in rows
            ],
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_bono(body: dict, db: AsyncSession = Depends(get_db)):
    try:
        b = Bono(
            trabajador_id=int(body["trabajador_id"]),
            fecha=date.fromisoformat(body["fecha"]),
            monto=float(body["monto"]),
            descripcion=body.get("descripcion") or None,
            estado="pendiente",
        )
        db.add(b)
        await db.commit()
        await db.refresh(b)
        return {"id": b.id, "mensaje": "Bono registrado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{bono_id}/aprobar")
async def aprobar_bono(bono_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Bono).where(Bono.id == bono_id))
        b = result.scalar_one_or_none()
        if not b:
            raise HTTPException(status_code=404, detail="Bono no encontrado")
        b.estado = "aprobado"
        b.aprobado_por = body.get("aprobado_por", "admin_master")
        b.fecha_aprobacion = datetime.utcnow()
        await db.commit()
        return {"mensaje": "Bono aprobado"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{bono_id}/rechazar")
async def rechazar_bono(bono_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Bono).where(Bono.id == bono_id))
        b = result.scalar_one_or_none()
        if not b:
            raise HTTPException(status_code=404, detail="Bono no encontrado")
        b.estado = "rechazado"
        b.aprobado_por = body.get("aprobado_por", "admin_master")
        b.fecha_aprobacion = datetime.utcnow()
        await db.commit()
        return {"mensaje": "Bono rechazado"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{bono_id}")
async def eliminar_bono(bono_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Bono).where(Bono.id == bono_id))
        b = result.scalar_one_or_none()
        if not b:
            raise HTTPException(status_code=404, detail="Bono no encontrado")
        if b.estado == "aprobado":
            raise HTTPException(status_code=400, detail="No se puede eliminar un bono aprobado")
        await db.delete(b)
        await db.commit()
        return {"mensaje": "Bono eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
"""
Router de Anticipos
"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.anticipo import Anticipo
from app.models.trabajador import Trabajador

router = APIRouter(prefix="/api/v1/anticipos", tags=["Anticipos"])


@router.get("")
async def listar_anticipos(
    trabajador_id: int = None,
    mes: int = None,
    anio: int = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = (
            select(Anticipo, Trabajador)
            .join(Trabajador, Anticipo.trabajador_id == Trabajador.id)
            .order_by(Anticipo.fecha.desc(), Anticipo.fecha_creacion.desc())
        )
        if trabajador_id:
            query = query.where(Anticipo.trabajador_id == trabajador_id)
        if mes and anio:
            from sqlalchemy import extract
            query = query.where(
                extract('month', Anticipo.fecha) == mes,
                extract('year', Anticipo.fecha) == anio,
            )
        elif anio:
            from sqlalchemy import extract
            query = query.where(extract('year', Anticipo.fecha) == anio)

        result = await db.execute(query)
        rows = result.all()

        return {
            "total": len(rows),
            "monto_total": round(sum(a.monto for a, _ in rows), 2),
            "anticipos": [
                {
                    "id": a.id,
                    "trabajador_id": a.trabajador_id,
                    "trabajador_nombre": t.nombre_completo,
                    "trabajador_rut": t.rut,
                    "trabajador_cargo": t.cargo,
                    "fecha": a.fecha.isoformat(),
                    "monto": a.monto,
                    "observacion": a.observacion,
                    "fecha_creacion": a.fecha_creacion.isoformat() if a.fecha_creacion else None,
                }
                for a, t in rows
            ],
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_anticipo(body: dict, db: AsyncSession = Depends(get_db)):
    try:
        a = Anticipo(
            trabajador_id=int(body["trabajador_id"]),
            fecha=date.fromisoformat(body["fecha"]),
            monto=float(body["monto"]),
            observacion=body.get("observacion") or None,
        )
        db.add(a)
        await db.commit()
        await db.refresh(a)
        return {"id": a.id, "mensaje": "Anticipo registrado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{anticipo_id}")
async def eliminar_anticipo(anticipo_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Anticipo).where(Anticipo.id == anticipo_id))
        a = result.scalar_one_or_none()
        if not a:
            raise HTTPException(status_code=404, detail="Anticipo no encontrado")
        await db.delete(a)
        await db.commit()
        return {"mensaje": "Anticipo eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
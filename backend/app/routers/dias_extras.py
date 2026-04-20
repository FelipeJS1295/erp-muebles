"""
Router de Días Extras
"""
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.dia_extra import DiaExtra
from app.models.trabajador import Trabajador

router = APIRouter(prefix="/api/v1/dias-extras", tags=["Días Extras"])


@router.get("")
async def listar_dias_extras(
    estado: str = None,
    trabajador_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = (
            select(DiaExtra, Trabajador)
            .join(Trabajador, DiaExtra.trabajador_id == Trabajador.id)
            .order_by(DiaExtra.fecha_creacion.desc())
        )
        if estado:
            query = query.where(DiaExtra.estado == estado)
        if trabajador_id:
            query = query.where(DiaExtra.trabajador_id == trabajador_id)

        result = await db.execute(query)
        rows = result.all()
        return {
            "total": len(rows),
            "dias_extras": [
                {
                    "id": d.id,
                    "trabajador_id": d.trabajador_id,
                    "trabajador_nombre": t.nombre_completo,
                    "trabajador_rut": t.rut,
                    "trabajador_cargo": t.cargo,
                    "fecha": d.fecha.isoformat(),
                    "tipo_dia": d.tipo_dia,
                    "monto": d.monto,
                    "observacion": d.observacion,
                    "estado": d.estado,
                    "aprobado_por": d.aprobado_por,
                    "fecha_aprobacion": d.fecha_aprobacion.isoformat() if d.fecha_aprobacion else None,
                    "fecha_creacion": d.fecha_creacion.isoformat() if d.fecha_creacion else None,
                }
                for d, t in rows
            ],
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_dia_extra(body: dict, db: AsyncSession = Depends(get_db)):
    try:
        fecha = date.fromisoformat(body["fecha"])

        # Validar que sea sábado (5) o domingo (6)
        if fecha.weekday() not in (5, 6):
            raise HTTPException(status_code=400, detail="La fecha debe ser sábado o domingo")

        tipo_dia = "sabado" if fecha.weekday() == 5 else "domingo"

        de = DiaExtra(
            trabajador_id=int(body["trabajador_id"]),
            fecha=fecha,
            tipo_dia=tipo_dia,
            monto=float(body["monto"]),
            observacion=body.get("observacion") or None,
            estado="pendiente",
        )
        db.add(de)
        await db.commit()
        await db.refresh(de)
        return {"id": de.id, "tipo_dia": tipo_dia, "mensaje": "Día extra registrado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{de_id}/aprobar")
async def aprobar_dia_extra(de_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(DiaExtra).where(DiaExtra.id == de_id))
        de = result.scalar_one_or_none()
        if not de:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        de.estado = "aprobada"
        de.aprobado_por = body.get("aprobado_por", "admin_master")
        de.fecha_aprobacion = datetime.utcnow()
        await db.commit()
        return {"mensaje": "Día extra aprobado"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{de_id}/rechazar")
async def rechazar_dia_extra(de_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(DiaExtra).where(DiaExtra.id == de_id))
        de = result.scalar_one_or_none()
        if not de:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        de.estado = "rechazada"
        de.aprobado_por = body.get("aprobado_por", "admin_master")
        de.fecha_aprobacion = datetime.utcnow()
        await db.commit()
        return {"mensaje": "Día extra rechazado"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{de_id}")
async def eliminar_dia_extra(de_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(DiaExtra).where(DiaExtra.id == de_id))
        de = result.scalar_one_or_none()
        if not de:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        if de.estado == "aprobada":
            raise HTTPException(status_code=400, detail="No se puede eliminar un día extra aprobado")
        await db.delete(de)
        await db.commit()
        return {"mensaje": "Registro eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
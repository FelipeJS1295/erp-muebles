"""
Router de Horas Extras
"""
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.hora_extra import HoraExtra
from app.models.remuneracion import Remuneracion
from app.models.trabajador import Trabajador

router = APIRouter(prefix="/api/v1/horas-extras", tags=["Horas Extras"])


@router.get("")
async def listar_horas_extras(
    estado: str = None,
    trabajador_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = (
            select(HoraExtra, Trabajador)
            .join(Trabajador, HoraExtra.trabajador_id == Trabajador.id)
            .order_by(HoraExtra.fecha_creacion.desc())
        )
        if estado:
            query = query.where(HoraExtra.estado == estado)
        if trabajador_id:
            query = query.where(HoraExtra.trabajador_id == trabajador_id)

        result = await db.execute(query)
        rows = result.all()
        return {
            "total": len(rows),
            "horas_extras": [
                {
                    "id": h.id,
                    "trabajador_id": h.trabajador_id,
                    "trabajador_nombre": t.nombre_completo,
                    "trabajador_rut": t.rut,
                    "trabajador_cargo": t.cargo,
                    "fecha": h.fecha.isoformat(),
                    "horas": h.horas,
                    "sueldo_base": h.sueldo_base,
                    "valor_hora": h.valor_hora,
                    "monto_total": h.monto_total,
                    "observacion": h.observacion,
                    "estado": h.estado,
                    "aprobado_por": h.aprobado_por,
                    "fecha_aprobacion": h.fecha_aprobacion.isoformat() if h.fecha_aprobacion else None,
                    "fecha_creacion": h.fecha_creacion.isoformat() if h.fecha_creacion else None,
                }
                for h, t in rows
            ],
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_hora_extra(body: dict, db: AsyncSession = Depends(get_db)):
    try:
        trabajador_id = int(body["trabajador_id"])

        # Buscar sueldo base
        result_rem = await db.execute(
            select(Remuneracion).where(
                Remuneracion.trabajador_id == trabajador_id,
                Remuneracion.activo == 1,
            )
        )
        rem = result_rem.scalar_one_or_none()
        if not rem:
            raise HTTPException(status_code=400, detail="El trabajador no tiene sueldo base registrado")

        horas = float(body["horas"])
        sueldo_base = rem.sueldo_base

        # Fórmula: (Sueldo Base / 30 / 28) * 1.5
        hora_ordinaria = (sueldo_base * 28) / (30 * 42 * 4)
        valor_hora = round(hora_ordinaria * 1.5, 2)
        monto_total = round(valor_hora * horas, 2)

        he = HoraExtra(
            trabajador_id=trabajador_id,
            fecha=date.fromisoformat(body["fecha"]),
            horas=horas,
            sueldo_base=sueldo_base,
            valor_hora=valor_hora,
            monto_total=monto_total,
            observacion=body.get("observacion") or None,
            estado="pendiente",
        )
        db.add(he)
        await db.commit()
        await db.refresh(he)
        return {
            "id": he.id,
            "valor_hora": valor_hora,
            "monto_total": monto_total,
            "mensaje": "Horas extras registradas correctamente",
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{he_id}/aprobar")
async def aprobar_hora_extra(he_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(HoraExtra).where(HoraExtra.id == he_id))
        he = result.scalar_one_or_none()
        if not he:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        he.estado = "aprobada"
        he.aprobado_por = body.get("aprobado_por", "admin_master")
        he.fecha_aprobacion = datetime.utcnow()
        await db.commit()
        return {"mensaje": "Horas extras aprobadas"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{he_id}/rechazar")
async def rechazar_hora_extra(he_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(HoraExtra).where(HoraExtra.id == he_id))
        he = result.scalar_one_or_none()
        if not he:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        he.estado = "rechazada"
        he.aprobado_por = body.get("aprobado_por", "admin_master")
        he.fecha_aprobacion = datetime.utcnow()
        await db.commit()
        return {"mensaje": "Horas extras rechazadas"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{he_id}")
async def eliminar_hora_extra(he_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(HoraExtra).where(HoraExtra.id == he_id))
        he = result.scalar_one_or_none()
        if not he:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        if he.estado == "aprobada":
            raise HTTPException(status_code=400, detail="No se puede eliminar una hora extra aprobada")
        await db.delete(he)
        await db.commit()
        return {"mensaje": "Registro eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
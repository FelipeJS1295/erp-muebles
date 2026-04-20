"""
Router de Otros Descuentos
"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.otro_descuento import OtroDescuento
from app.models.remuneracion import Remuneracion
from app.models.trabajador import Trabajador

router = APIRouter(prefix="/api/v1/otros-descuentos", tags=["Otros Descuentos"])


@router.get("")
async def listar_otros_descuentos(
    activo: int = None,
    trabajador_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = (
            select(OtroDescuento, Trabajador)
            .join(Trabajador, OtroDescuento.trabajador_id == Trabajador.id)
            .order_by(OtroDescuento.fecha_creacion.desc())
        )
        if activo is not None:
            query = query.where(OtroDescuento.activo == activo)
        if trabajador_id:
            query = query.where(OtroDescuento.trabajador_id == trabajador_id)

        result = await db.execute(query)
        rows = result.all()
        return {
            "total": len(rows),
            "descuentos": [
                {
                    "id": d.id,
                    "trabajador_id": d.trabajador_id,
                    "trabajador_nombre": t.nombre_completo,
                    "trabajador_rut": t.rut,
                    "trabajador_cargo": t.cargo,
                    "tipo": d.tipo,
                    "documento": d.documento,
                    "monto_total": d.monto_total,
                    "cuotas": d.cuotas,
                    "monto_cuota": d.monto_cuota,
                    "cuotas_pagadas": d.cuotas_pagadas,
                    "cuotas_restantes": (d.cuotas or 1) - d.cuotas_pagadas,
                    "horas": d.horas,
                    "valor_hora": d.valor_hora,
                    "descripcion": d.descripcion,
                    "activo": d.activo,
                    "fecha_inicio": d.fecha_inicio.isoformat(),
                    "fecha_creacion": d.fecha_creacion.isoformat() if d.fecha_creacion else None,
                }
                for d, t in rows
            ],
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_otro_descuento(body: dict, db: AsyncSession = Depends(get_db)):
    try:
        trabajador_id = int(body["trabajador_id"])
        tipo = body["tipo"]

        monto_total = 0.0
        monto_cuota = None
        cuotas = 1
        horas = None
        valor_hora = None

        if tipo == "compras":
            monto_total = float(body["monto_total"])
            cuotas = int(body.get("cuotas", 1))
            monto_cuota = round(monto_total / cuotas, 2)

        elif tipo == "horas":
            horas = float(body["horas"])
            # Buscar valor hora del trabajador
            result_rem = await db.execute(
                select(Remuneracion).where(
                    Remuneracion.trabajador_id == trabajador_id,
                    Remuneracion.activo == 1,
                )
            )
            rem = result_rem.scalar_one_or_none()
            if not rem:
                raise HTTPException(status_code=400, detail="El trabajador no tiene sueldo base registrado")
            valor_hora = round((rem.sueldo_base * 28) / (30 * 45 * 4), 2)
            monto_total = round(valor_hora * horas, 2)
            monto_cuota = monto_total
            cuotas = 1

        elif tipo == "otro":
            monto_total = float(body["monto_total"])
            monto_cuota = monto_total
            cuotas = 1

        d = OtroDescuento(
            trabajador_id=trabajador_id,
            tipo=tipo,
            documento=body.get("documento") or None,
            monto_total=monto_total,
            cuotas=cuotas,
            monto_cuota=monto_cuota,
            cuotas_pagadas=0,
            horas=horas,
            valor_hora=valor_hora,
            descripcion=body.get("descripcion") or None,
            activo=1,
            fecha_inicio=date.fromisoformat(body["fecha_inicio"]),
        )
        db.add(d)
        await db.commit()
        await db.refresh(d)
        return {
            "id": d.id,
            "monto_total": monto_total,
            "monto_cuota": monto_cuota,
            "cuotas": cuotas,
            "mensaje": "Descuento registrado correctamente",
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{desc_id}/pagar-cuota")
async def pagar_cuota(desc_id: int, db: AsyncSession = Depends(get_db)):
    """Registra el pago de una cuota del mes actual."""
    try:
        result = await db.execute(select(OtroDescuento).where(OtroDescuento.id == desc_id))
        d = result.scalar_one_or_none()
        if not d:
            raise HTTPException(status_code=404, detail="Descuento no encontrado")
        if d.cuotas_pagadas >= (d.cuotas or 1):
            raise HTTPException(status_code=400, detail="Todas las cuotas ya fueron pagadas")

        d.cuotas_pagadas += 1
        if d.cuotas_pagadas >= (d.cuotas or 1):
            d.activo = 0  # Descuento completado

        await db.commit()
        return {
            "mensaje": "Cuota registrada",
            "cuotas_pagadas": d.cuotas_pagadas,
            "cuotas_restantes": (d.cuotas or 1) - d.cuotas_pagadas,
            "completado": d.activo == 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{desc_id}")
async def eliminar_otro_descuento(desc_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(OtroDescuento).where(OtroDescuento.id == desc_id))
        d = result.scalar_one_or_none()
        if not d:
            raise HTTPException(status_code=404, detail="Descuento no encontrado")
        await db.delete(d)
        await db.commit()
        return {"mensaje": "Descuento eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.dia_faltante import DiaFaltante
from app.models.remuneracion import Remuneracion
from app.models.trabajador import Trabajador

router = APIRouter(prefix="/api/v1/dias-faltantes", tags=["Días Faltantes"])


@router.get("")
async def listar_dias_faltantes(
    trabajador_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = (
            select(DiaFaltante, Trabajador)
            .join(Trabajador, DiaFaltante.trabajador_id == Trabajador.id)
            .order_by(DiaFaltante.fecha_creacion.desc())
        )
        if trabajador_id:
            query = query.where(DiaFaltante.trabajador_id == trabajador_id)

        result = await db.execute(query)
        rows = result.all()
        return {
            "total": len(rows),
            "dias_faltantes": [
                {
                    "id": d.id,
                    "trabajador_id": d.trabajador_id,
                    "trabajador_nombre": t.nombre_completo,
                    "trabajador_rut": t.rut,
                    "trabajador_cargo": t.cargo,
                    "fecha": d.fecha.isoformat(),
                    "sueldo_base": d.sueldo_base,
                    "monto_descuento": d.monto_descuento,
                    "observacion": d.observacion,
                    "fecha_creacion": d.fecha_creacion.isoformat() if d.fecha_creacion else None,
                }
                for d, t in rows
            ],
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_dia_faltante(body: dict, db: AsyncSession = Depends(get_db)):
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

        monto_descuento = round(rem.sueldo_base / 30, 2)

        d = DiaFaltante(
            trabajador_id=trabajador_id,
            fecha=date.fromisoformat(body["fecha"]),
            sueldo_base=rem.sueldo_base,
            monto_descuento=monto_descuento,
            observacion=body.get("observacion") or None,
        )
        db.add(d)
        await db.commit()
        await db.refresh(d)
        return {
            "id": d.id,
            "sueldo_base": rem.sueldo_base,
            "monto_descuento": monto_descuento,
            "mensaje": "Día faltante registrado correctamente",
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{df_id}")
async def eliminar_dia_faltante(df_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(DiaFaltante).where(DiaFaltante.id == df_id))
        d = result.scalar_one_or_none()
        if not d:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        await db.delete(d)
        await db.commit()
        return {"mensaje": "Registro eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
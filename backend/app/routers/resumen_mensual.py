from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date
from app.db.base import get_db
from app.models.trabajador import Trabajador
from app.models.remuneracion import Remuneracion
from app.models.hora_extra import HoraExtra
from app.models.dia_extra import DiaExtra
from app.models.bono import Bono
from app.models.dia_faltante import DiaFaltante
from app.models.orden_trabajo import OrdenTrabajo
from app.models.otro_descuento import OtroDescuento
from app.models.anticipo import Anticipo

router = APIRouter(prefix="/api/v1/resumen-mensual", tags=["Resumen Mensual"])

CARGOS_PRODUCCION = ['costura', 'tapiceria', 'esqueleteria']


@router.get("")
async def resumen_mensual(mes: int, anio: int, db: AsyncSession = Depends(get_db)):
    try:
        fecha_desde = date(anio, mes, 1)
        fecha_hasta = date(anio + 1, 1, 1) if mes == 12 else date(anio, mes + 1, 1)

        result = await db.execute(
            select(Trabajador).where(Trabajador.activo == 1).order_by(Trabajador.nombre_completo)
        )
        trabajadores = result.scalars().all()

        resumen = []

        for t in trabajadores:
            # Remuneración base
            result_rem = await db.execute(
                select(Remuneracion).where(
                    Remuneracion.trabajador_id == t.id,
                    Remuneracion.activo == 1,
                )
            )
            rem = result_rem.scalar_one_or_none()
            sueldo_base_registrado = rem.sueldo_base if rem else 0

            # Producción para cargos costura/tapiceria/esqueleteria
            if t.cargo in CARGOS_PRODUCCION:
                result_ots = await db.execute(
                    select(OrdenTrabajo).where(
                        OrdenTrabajo.trabajador_id == t.id,
                        OrdenTrabajo.fecha >= fecha_desde,
                        OrdenTrabajo.fecha < fecha_hasta,
                        OrdenTrabajo.estado.in_(['completada', 'pendiente']),
                        OrdenTrabajo.tipo != 'reparacion',
                    )
                )
                ots = result_ots.scalars().all()
                sueldo_efectivo = sum(o.precio_aplicado or 0 for o in ots)
                es_produccion = True
            else:
                sueldo_efectivo = sueldo_base_registrado
                es_produccion = False

            # Horas extras aprobadas
            result_he = await db.execute(
                select(HoraExtra).where(
                    HoraExtra.trabajador_id == t.id,
                    HoraExtra.estado == 'aprobada',
                    HoraExtra.fecha >= fecha_desde,
                    HoraExtra.fecha < fecha_hasta,
                )
            )
            horas_extras = result_he.scalars().all()
            total_horas_extras = sum(h.monto_total for h in horas_extras)
            horas_extras_qty = sum(h.horas for h in horas_extras)

            # Días extras aprobados
            result_de = await db.execute(
                select(DiaExtra).where(
                    DiaExtra.trabajador_id == t.id,
                    DiaExtra.estado == 'aprobada',
                    DiaExtra.fecha >= fecha_desde,
                    DiaExtra.fecha < fecha_hasta,
                )
            )
            dias_extras = result_de.scalars().all()
            total_dias_extras = sum(d.monto for d in dias_extras)
            dias_extras_qty = len(dias_extras)

            # Bonos aprobados
            result_bonos = await db.execute(
                select(Bono).where(
                    Bono.trabajador_id == t.id,
                    Bono.estado == 'aprobado',
                    Bono.fecha >= fecha_desde,
                    Bono.fecha < fecha_hasta,
                )
            )
            bonos = result_bonos.scalars().all()
            total_bonos = sum(b.monto for b in bonos)
            bonos_qty = len(bonos)

            # Días faltantes
            result_df = await db.execute(
                select(DiaFaltante).where(
                    DiaFaltante.trabajador_id == t.id,
                    DiaFaltante.fecha >= fecha_desde,
                    DiaFaltante.fecha < fecha_hasta,
                )
            )
            dias_faltantes = result_df.scalars().all()
            total_descuentos = sum(d.monto_descuento for d in dias_faltantes)
            dias_faltantes_qty = len(dias_faltantes)

            # Otros descuentos activos — se descuenta la cuota del mes
            result_od = await db.execute(
                select(OtroDescuento).where(
                    OtroDescuento.trabajador_id == t.id,
                    OtroDescuento.activo == 1,
                    OtroDescuento.fecha_inicio <= fecha_hasta,
                )
            )
            otros_desc = result_od.scalars().all()
            total_otros_descuentos = sum(od.monto_cuota or 0 for od in otros_desc)
            otros_desc_qty = len(otros_desc)
            otros_desc_detalle = [
                {
                    "id": od.id,
                    "tipo": od.tipo,
                    "descripcion": od.descripcion,
                    "documento": od.documento,
                    "monto_cuota": od.monto_cuota,
                    "cuotas_pagadas": od.cuotas_pagadas,
                    "cuotas": od.cuotas,
                }
                for od in otros_desc
            ]

            # Anticipos del mes
            result_ant = await db.execute(
                select(Anticipo).where(
                    Anticipo.trabajador_id == t.id,
                    Anticipo.fecha >= fecha_desde,
                    Anticipo.fecha < fecha_hasta,
                    Anticipo.estado == 'pagado',
                )
            )
            anticipos = result_ant.scalars().all()
            total_anticipos = sum(a.monto for a in anticipos)
            anticipos_qty = len(anticipos)

            total = (
                sueldo_efectivo
                + total_horas_extras
                + total_dias_extras
                + total_bonos
                - total_descuentos
                - total_otros_descuentos
                - total_anticipos
            )

            resumen.append({
                "trabajador_id": t.id,
                "trabajador_nombre": t.nombre_completo,
                "trabajador_rut": t.rut,
                "trabajador_cargo": t.cargo,
                "es_produccion": es_produccion,
                "sueldo_base": sueldo_efectivo,
                "sueldo_base_registrado": sueldo_base_registrado,
                "horas_extras_qty": horas_extras_qty,
                "total_horas_extras": round(total_horas_extras, 2),
                "dias_extras_qty": dias_extras_qty,
                "total_dias_extras": round(total_dias_extras, 2),
                "bonos_qty": bonos_qty,
                "total_bonos": round(total_bonos, 2),
                "dias_faltantes_qty": dias_faltantes_qty,
                "total_descuentos": round(total_descuentos, 2),
                "otros_desc_qty": otros_desc_qty,
                "total_otros_descuentos": round(total_otros_descuentos, 2),
                "otros_desc_detalle": otros_desc_detalle,
                "anticipos_qty": anticipos_qty,
                "total_anticipos": round(total_anticipos, 2),
                "total": round(total, 2),
            })

        # Totales separados producción vs resto
        produccion = [r for r in resumen if r["es_produccion"]]
        resto = [r for r in resumen if not r["es_produccion"]]

        return {
            "mes": mes,
            "anio": anio,
            "total_trabajadores": len(resumen),
            "total_planilla": round(sum(r["total"] for r in resumen), 2),
            "total_produccion": round(sum(r["total"] for r in produccion), 2),
            "total_resto": round(sum(r["total"] for r in resto), 2),
            "resumen": resumen,
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
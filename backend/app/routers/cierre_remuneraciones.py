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

router = APIRouter(prefix="/api/v1/cierre-remuneraciones", tags=["Cierre Remuneraciones"])

CARGOS_PRODUCCION = ['costura', 'tapiceria', 'esqueleteria']


@router.get("")
async def cierre_remuneraciones(
    mes: int = None,
    anio: int = None,
    fecha_desde: str = None,
    fecha_hasta: str = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        # Resolver rango de fechas
        if fecha_desde and fecha_hasta:
            fd = date.fromisoformat(fecha_desde)
            fh = date.fromisoformat(fecha_hasta)
            # fecha_hasta es inclusiva → sumamos 1 día internamente
            from datetime import timedelta
            fh_exclusiva = fh + timedelta(days=1)
        elif mes and anio:
            fd = date(anio, mes, 1)
            fh_exclusiva = date(anio + 1, 1, 1) if mes == 12 else date(anio, mes + 1, 1)
            from datetime import timedelta
            fh = fh_exclusiva - timedelta(days=1)
        else:
            raise HTTPException(status_code=400, detail="Debes indicar mes+anio o fecha_desde+fecha_hasta")

        result = await db.execute(
            select(Trabajador).where(Trabajador.activo == 1).order_by(Trabajador.nombre_completo)
        )
        trabajadores = result.scalars().all()

        resumen = []

        for t in trabajadores:
            # ── Remuneración base ──────────────────────────────────────────
            result_rem = await db.execute(
                select(Remuneracion).where(
                    Remuneracion.trabajador_id == t.id,
                    Remuneracion.activo == 1,
                )
            )
            rem = result_rem.scalar_one_or_none()
            sueldo_base_registrado = rem.sueldo_base if rem else 0
            tipo_contrato = rem.tipo if rem else "contrato"

            # ── Producción ────────────────────────────────────────────────
            if t.cargo in CARGOS_PRODUCCION:
                result_ots = await db.execute(
                    select(OrdenTrabajo).where(
                        OrdenTrabajo.trabajador_id == t.id,
                        OrdenTrabajo.fecha >= fd,
                        OrdenTrabajo.fecha < fh_exclusiva,
                        OrdenTrabajo.estado.in_(['completada', 'pendiente']),
                        OrdenTrabajo.tipo != 'reparacion',
                    )
                )
                ots_produccion = result_ots.scalars().all()

                result_reps = await db.execute(
                    select(OrdenTrabajo).where(
                        OrdenTrabajo.trabajador_id == t.id,
                        OrdenTrabajo.fecha >= fd,
                        OrdenTrabajo.fecha < fh_exclusiva,
                        OrdenTrabajo.tipo == 'reparacion',
                    )
                )
                ots_reparacion = result_reps.scalars().all()

                    # DEBUG TEMPORAL ↓
                print(f"\n[DEBUG] {t.nombre_completo} (id={t.id}) cargo={t.cargo}")
                print(f"  Período: {fd} → {fh_exclusiva}")
                print(f"  OTs producción: {len(ots_produccion)}")
                print(f"  OTs reparación: {len(ots_reparacion)}")
                for o in ots_reparacion:
                    print(f"    rep id={o.id} trabajador_id={o.trabajador_id} fecha={o.fecha} estado={o.estado} precio={o.precio_aplicado}")
                # DEBUG TEMPORAL ↑

                sueldo_efectivo = (
                    sum(o.precio_aplicado or 0 for o in ots_produccion) +
                    sum(o.precio_aplicado or 0 for o in ots_reparacion)
                )

                sueldo_efectivo = (
                    sum(o.precio_aplicado or 0 for o in ots_produccion) +
                    sum(o.precio_aplicado or 0 for o in ots_reparacion)
                )
                es_produccion = True
            else:
                sueldo_efectivo = sueldo_base_registrado
                es_produccion = False

            # ── Horas extras aprobadas ─────────────────────────────────────
            result_he = await db.execute(
                select(HoraExtra).where(
                    HoraExtra.trabajador_id == t.id,
                    HoraExtra.estado == 'aprobada',
                    HoraExtra.fecha >= fd,
                    HoraExtra.fecha < fh_exclusiva,
                )
            )
            horas_extras = result_he.scalars().all()
            total_horas_extras = sum(h.monto_total for h in horas_extras)
            horas_extras_qty = sum(h.horas for h in horas_extras)

            # ── Días extras aprobados ──────────────────────────────────────
            result_de = await db.execute(
                select(DiaExtra).where(
                    DiaExtra.trabajador_id == t.id,
                    DiaExtra.estado == 'aprobada',
                    DiaExtra.fecha >= fd,
                    DiaExtra.fecha < fh_exclusiva,
                )
            )
            dias_extras = result_de.scalars().all()
            total_dias_extras = sum(d.monto for d in dias_extras)
            dias_extras_qty = len(dias_extras)

            # ── Bonos aprobados ────────────────────────────────────────────
            result_bonos = await db.execute(
                select(Bono).where(
                    Bono.trabajador_id == t.id,
                    Bono.estado == 'aprobado',
                    Bono.fecha >= fd,
                    Bono.fecha < fh_exclusiva,
                )
            )
            bonos = result_bonos.scalars().all()
            total_bonos = sum(b.monto for b in bonos)
            bonos_qty = len(bonos)

            # ── Días faltantes ─────────────────────────────────────────────
            result_df = await db.execute(
                select(DiaFaltante).where(
                    DiaFaltante.trabajador_id == t.id,
                    DiaFaltante.fecha >= fd,
                    DiaFaltante.fecha < fh_exclusiva,
                )
            )
            dias_faltantes = result_df.scalars().all()
            total_descuentos_faltantes = sum(d.monto_descuento for d in dias_faltantes)
            dias_faltantes_qty = len(dias_faltantes)

            # ── Otros descuentos activos ───────────────────────────────────
            result_od = await db.execute(
                select(OtroDescuento).where(
                    OtroDescuento.trabajador_id == t.id,
                    OtroDescuento.activo == 1,
                    OtroDescuento.fecha_inicio <= fh_exclusiva,
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

            # ── Anticipos del período ──────────────────────────────────────
            result_ant = await db.execute(
                select(Anticipo).where(
                    Anticipo.trabajador_id == t.id,
                    Anticipo.fecha >= fd,
                    Anticipo.fecha < fh_exclusiva,
                )
            )
            anticipos = result_ant.scalars().all()
            total_anticipos = sum(a.monto for a in anticipos)
            anticipos_qty = len(anticipos)
            anticipos_detalle = [
                {
                    "id": a.id,
                    "fecha": a.fecha.isoformat(),
                    "monto": a.monto,
                    "estado": a.estado,
                    "tipo_pago": a.tipo_pago,
                    "observacion": a.observacion,
                }
                for a in anticipos
            ]

            # ── Total líquido ──────────────────────────────────────────────
            total = (
                sueldo_efectivo
                + total_horas_extras
                + total_dias_extras
                + total_bonos
                - total_descuentos_faltantes
                - total_otros_descuentos
                - total_anticipos
            )

            resumen.append({
                "trabajador_id":          t.id,
                "trabajador_nombre":      t.nombre_completo,
                "trabajador_rut":         t.rut,
                "trabajador_cargo":       t.cargo,
                "tipo_contrato":          tipo_contrato,
                "es_produccion":          es_produccion,
                "sueldo_base":            sueldo_efectivo,
                "sueldo_base_registrado": sueldo_base_registrado,
                # Haberes
                "horas_extras_qty":       horas_extras_qty,
                "total_horas_extras":     total_horas_extras,
                "dias_extras_qty":        dias_extras_qty,
                "total_dias_extras":      total_dias_extras,
                "bonos_qty":              bonos_qty,
                "total_bonos":            total_bonos,
                # Descuentos
                "dias_faltantes_qty":     dias_faltantes_qty,
                "total_descuentos":       total_descuentos_faltantes,
                "otros_desc_qty":         otros_desc_qty,
                "total_otros_descuentos": total_otros_descuentos,
                "otros_desc_detalle":     otros_desc_detalle,
                # Anticipos
                "anticipos_qty":          anticipos_qty,
                "total_anticipos":        total_anticipos,
                "anticipos_detalle":      anticipos_detalle,
                # Total
                "total":                  total,
            })

        total_planilla = sum(r["total"] for r in resumen)
        total_produccion = sum(r["total"] for r in resumen if r["es_produccion"])
        total_resto = sum(r["total"] for r in resumen if not r["es_produccion"])

        return {
            "fecha_desde":     fd.isoformat(),
            "fecha_hasta":     fh.isoformat(),
            "total_planilla":  total_planilla,
            "total_produccion": total_produccion,
            "total_resto":     total_resto,
            "resumen":         resumen,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
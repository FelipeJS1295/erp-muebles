"""
Router de Liquidaciones Marketplace
"""
import io
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.liquidacion import Liquidacion, TipoLiquidacionEnum
from app.models.orden import Orden

router = APIRouter(prefix="/api/v1/liquidaciones", tags=["Liquidaciones"])

TIPO_MAP = {
    'venta':             TipoLiquidacionEnum.venta,
    'cobro por despacho': TipoLiquidacionEnum.cobro_despacho,
    'devolución':        TipoLiquidacionEnum.devolucion,
    'devolucion':        TipoLiquidacionEnum.devolucion,
    'despacho':          TipoLiquidacionEnum.despacho,
}


def _safe_float(val) -> float:
    if val is None: return 0.0
    try: return float(str(val).replace('$', '').replace('.', '').replace(',', '.').strip())
    except: return 0.0


def _safe_str(val) -> str:
    if val is None: return ''
    return str(val).strip()


@router.get("")
async def listar_liquidaciones(
    marketplace: str = None,
    tipo: str = None,
    desde: str = None,
    hasta: str = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = select(Liquidacion).order_by(Liquidacion.fecha_transaccion.desc(), Liquidacion.id.desc())
        if marketplace:
            query = query.where(Liquidacion.marketplace == marketplace)
        if tipo:
            query = query.where(Liquidacion.tipo == tipo)
        if desde:
            query = query.where(Liquidacion.fecha_transaccion >= date.fromisoformat(desde))
        if hasta:
            query = query.where(Liquidacion.fecha_transaccion <= date.fromisoformat(hasta))

        result = await db.execute(query)
        rows = result.scalars().all()

        # Totales
        total_ventas        = sum(r.monto_a_pagar or 0 for r in rows if r.tipo == TipoLiquidacionEnum.venta)
        total_cobro_despacho = sum(r.monto_a_pagar or 0 for r in rows if r.tipo == TipoLiquidacionEnum.cobro_despacho)
        total_devoluciones  = sum(r.monto_a_pagar or 0 for r in rows if r.tipo == TipoLiquidacionEnum.devolucion)
        total_neto          = total_ventas + total_cobro_despacho + total_devoluciones

        return {
            "total": len(rows),
            "resumen": {
                "total_ventas":         round(total_ventas, 2),
                "total_cobro_despacho": round(total_cobro_despacho, 2),
                "total_devoluciones":   round(total_devoluciones, 2),
                "total_neto":           round(total_neto, 2),
            },
            "liquidaciones": [
                {
                    "id":                 r.id,
                    "marketplace":        r.marketplace,
                    "nro_suborden":       r.nro_suborden,
                    "orden_id":           r.orden_id,
                    "descripcion":        r.descripcion,
                    "tipo":               r.tipo,
                    "monto":              r.monto,
                    "comision_pct":       r.comision_pct,
                    "monto_a_pagar":      r.monto_a_pagar,
                    "fecha_transaccion":  r.fecha_transaccion.isoformat() if r.fecha_transaccion else None,
                    "archivo_origen":     r.archivo_origen,
                    "nro_solicitud":      r.nro_solicitud,
                }
                for r in rows
            ],
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/paris/upload")
async def subir_liquidacion_paris(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        import openpyxl
        contents = await file.read()
        wb = openpyxl.load_workbook(io.BytesIO(contents), read_only=True)
        ws = wb.active

        insertadas = 0
        omitidas   = 0
        no_encontradas = []

        for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True)):
            # Columnas del excel Paris:
            # 0:id 1:descripcion 2:tipo 3:numero_orden 4:sku 5:monto
            # 6:acuerdo_comercial 7:comision 8:monto_a_pagar 9:monto_total_factura
            # 10:fecha 11:estado 12:estado_pago 13:nro_solicitud_pago
            # ...19:nro_suborden...

            tipo_raw = _safe_str(row[2]).lower()
            if not tipo_raw:
                continue

            tipo = TIPO_MAP.get(tipo_raw)
            if not tipo:
                omitidas += 1
                continue

            nro_suborden  = _safe_str(row[19])
            descripcion   = _safe_str(row[1])
            monto         = _safe_float(row[5])
            comision_pct  = _safe_float(row[7])
            monto_a_pagar = _safe_float(row[8])
            nro_solicitud = _safe_str(row[13])
            fecha_raw     = row[10]

            fecha_transaccion = None
            if fecha_raw:
                try:
                    if hasattr(fecha_raw, 'date'):
                        fecha_transaccion = fecha_raw.date()
                    else:
                        from datetime import datetime
                        fecha_transaccion = datetime.strptime(str(fecha_raw)[:10], '%Y-%m-%d').date()
                except Exception:
                    pass

            # Buscar orden en BD por nro_suborden
            orden_id = None
            if nro_suborden:
                result = await db.execute(
                    select(Orden).where(
                        Orden.orden_id_marketplace == nro_suborden
                    )
                )
                orden = result.scalar_one_or_none()
                if orden:
                    orden_id = orden.id
                elif tipo in (TipoLiquidacionEnum.venta, TipoLiquidacionEnum.cobro_despacho):
                    no_encontradas.append(nro_suborden)

            liq = Liquidacion(
                marketplace       = 'paris_chile',
                nro_suborden      = nro_suborden or None,
                orden_id          = orden_id,
                descripcion       = descripcion or None,
                tipo              = tipo,
                monto             = monto,
                comision_pct      = comision_pct,
                monto_a_pagar     = monto_a_pagar,
                fecha_transaccion = fecha_transaccion,
                archivo_origen    = file.filename,
                nro_solicitud     = nro_solicitud or None,
            )
            db.add(liq)
            insertadas += 1

        await db.commit()
        return {
            "mensaje": f"Liquidación procesada: {insertadas} registros insertados, {omitidas} omitidos",
            "insertadas":      insertadas,
            "omitidas":        omitidas,
            "no_encontradas":  no_encontradas[:20],
            "total_no_encontradas": len(no_encontradas),
        }

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")


@router.delete("/{liq_id}")
async def eliminar_liquidacion(liq_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Liquidacion).where(Liquidacion.id == liq_id))
        liq = result.scalar_one_or_none()
        if not liq:
            raise HTTPException(status_code=404, detail="Liquidación no encontrada")
        await db.delete(liq)
        await db.commit()
        return {"mensaje": "Eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/archivo/{nombre_archivo}")
async def eliminar_por_archivo(nombre_archivo: str, db: AsyncSession = Depends(get_db)):
    """Elimina todos los registros de un archivo subido (para re-subir)."""
    try:
        result = await db.execute(
            select(Liquidacion).where(Liquidacion.archivo_origen == nombre_archivo)
        )
        rows = result.scalars().all()
        if not rows:
            raise HTTPException(status_code=404, detail="No se encontraron registros de ese archivo")
        for r in rows:
            await db.delete(r)
        await db.commit()
        return {"mensaje": f"{len(rows)} registros eliminados del archivo {nombre_archivo}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/walmart/upload")
async def subir_liquidacion_walmart(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        import io
        import pandas as pd

        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        insertadas    = 0
        omitidas      = 0
        no_encontradas = []

        for _, row in df.iterrows():
            tipo_raw  = _safe_str(row.get('Tipo  / Transaction Type', ''))
            item      = _safe_str(row.get('Item / Item', ''))
            concepto  = _safe_str(row.get('Concept / Concepto', ''))

            # Determinar tipo
            if tipo_raw.lower() == 'venta':
                if item.lower() == 'despacho seller':
                    tipo = TipoLiquidacionEnum.cobro_despacho
                else:
                    tipo = TipoLiquidacionEnum.venta
            elif tipo_raw.lower() == 'disputa':
                if concepto.lower() == 'commission':
                    tipo = TipoLiquidacionEnum.devolucion
                else:
                    omitidas += 1
                    continue  # Storage y otros no nos afectan
            else:
                omitidas += 1
                continue

            # Orden — viene en formato científico, convertir a string limpio
            orden_raw = row.get('Orden / Purchase Order')
            nro_orden = ''
            if orden_raw and str(orden_raw) not in ('nan', '1.0', '1'):
                try:
                    nro_orden = str(int(float(str(orden_raw))))
                except Exception:
                    nro_orden = _safe_str(orden_raw)

            # Montos
            afecto    = _safe_float(row.get('Afecto a Pago / Subject to Payment'))
            comision  = _safe_float(row.get('Cargo por comision / Commission Charges'))
            comision_pct = _safe_float(row.get('% Comision / Commission Rate'))

            # Monto a pagar = afecto + comision (comision ya es negativa)
            monto_a_pagar = afecto + comision if tipo == TipoLiquidacionEnum.venta else afecto

            # Fecha
            fecha_raw = _safe_str(row.get('Fecha de Venta / Sale Date', ''))
            fecha_transaccion = None
            if fecha_raw:
                try:
                    from datetime import datetime
                    fecha_transaccion = datetime.strptime(fecha_raw, '%d_%m_%Y').date()
                except Exception:
                    pass

            # Buscar orden en BD
            orden_id = None
            if nro_orden:
                result = await db.execute(
                    select(Orden).where(Orden.orden_id_marketplace == nro_orden)
                )
                orden = result.scalar_one_or_none()
                if not orden:
                    # Walmart guarda sub_orden_id diferente, buscar por sub_orden_id
                    result = await db.execute(
                        select(Orden).where(Orden.sub_orden_id == nro_orden)
                    )
                    orden = result.scalar_one_or_none()
                if orden:
                    orden_id = orden.id
                elif tipo == TipoLiquidacionEnum.venta:
                    no_encontradas.append(nro_orden)

            liq = Liquidacion(
                marketplace       = 'walmart_chile',
                nro_suborden      = nro_orden or None,
                orden_id          = orden_id,
                descripcion       = item or concepto or None,
                tipo              = tipo,
                monto             = afecto,
                comision_pct      = comision_pct or None,
                monto_a_pagar     = monto_a_pagar,
                fecha_transaccion = fecha_transaccion,
                archivo_origen    = file.filename,
                nro_solicitud     = _safe_str(row.get('Numero Liq. / Settlement number', '')) or None,
            )
            db.add(liq)
            insertadas += 1

        await db.commit()
        return {
            "mensaje":              f"Liquidación Walmart procesada: {insertadas} registros",
            "insertadas":           insertadas,
            "omitidas":             omitidas,
            "no_encontradas":       no_encontradas[:20],
            "total_no_encontradas": len(no_encontradas),
        }

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")
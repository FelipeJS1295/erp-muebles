"""
Router Dashboard Stats
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, datetime, timedelta
from app.db.base import get_db
from app.models.orden import Orden
from app.models.cliente_venta import ClienteVenta

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

ESTADOS_ACTIVOS = [
    'Created', 'Acknowledged', 'ready_to_ship', 'awaiting_fulfillment',
    'pending', 'pending_by_seller', 'WAITING_ACCEPTANCE', 'WAITING_DEBIT',
    'SHIPPING', 'TO_COLLECT', 'printed_label',
]


def get_estado_unificado(orden) -> str:
    hoy = date.today()
    if orden.fecha_despacho:
        try:
            if isinstance(orden.fecha_despacho, str):
                parts = orden.fecha_despacho.split('-')
                fecha = date(int(parts[0]), int(parts[1]), int(parts[2]))
            else:
                fecha = orden.fecha_despacho
            if fecha < hoy and orden.estado_marketplace in ESTADOS_ACTIVOS:
                return 'Atrasada'
        except Exception:
            pass

    mapa = {
        'Created': 'Nueva', 'Acknowledged': 'Nueva',
        'Shipped': 'Despachada', 'Cancelled': 'Cancelada',
        'ready_to_ship': 'Nueva', 'awaiting_fulfillment': 'Nueva',
        'delivery_in_progress': 'Despachada', 'delivered': 'Despachada',
        'deleted': 'Cancelada', 'pending_by_seller': 'Nueva',
        'pending': 'Nueva', 'shipped': 'Despachada', 'canceled': 'Cancelada',
        'WAITING_ACCEPTANCE': 'Nueva', 'WAITING_DEBIT': 'Nueva',
        'SHIPPING': 'Despachada', 'TO_COLLECT': 'Despachada',
        'RECEIVED': 'Despachada', 'CLOSED': 'Despachada',
        'REFUSED': 'Cancelada', 'CANCELED': 'Cancelada',
        'printed_label': 'Nueva',
    }
    return mapa.get(orden.estado_marketplace, orden.estado_marketplace)


@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    try:
        hoy = date.today()
        inicio_mes_actual = date(hoy.year, hoy.month, 1)
        if hoy.month == 1:
            inicio_mes_anterior = date(hoy.year - 1, 12, 1)
            fin_mes_anterior = date(hoy.year, 1, 1)
        else:
            inicio_mes_anterior = date(hoy.year, hoy.month - 1, 1)
            fin_mes_anterior = date(hoy.year, hoy.month, 1)

        # Todas las ordenes
        result = await db.execute(select(Orden).order_by(Orden.fecha_creacion.desc()))
        todas = result.scalars().all()

        # --- KPIs generales ---
        atrasadas = []
        nuevas = []
        ordenes_hoy = []
        por_marketplace: dict = {}
        por_marketplace_monto: dict = {}

        for o in todas:
            estado = get_estado_unificado(o)
            mkt = str(o.marketplace.value) if o.marketplace else 'otro'

            # Por marketplace — conteo
            if mkt not in por_marketplace:
                por_marketplace[mkt] = 0
                por_marketplace_monto[mkt] = 0
            por_marketplace[mkt] += 1
            por_marketplace_monto[mkt] += float(o.total or 0)

            if estado == 'Atrasada':
                atrasadas.append(o)
            if estado == 'Nueva':
                nuevas.append(o)

            # Órdenes de hoy
            if o.fecha_creacion and o.fecha_creacion.date() == hoy:
                ordenes_hoy.append(o)

        # --- Ventas mes actual vs mes anterior ---
        ventas_mes_actual = sum(
            float(o.total or 0) for o in todas
            if o.fecha_creacion and o.fecha_creacion.date() >= inicio_mes_actual
        )
        ventas_mes_anterior = sum(
            float(o.total or 0) for o in todas
            if o.fecha_creacion and inicio_mes_anterior <= o.fecha_creacion.date() < fin_mes_anterior
        )

        # --- Gráfico: ventas por día mes actual vs mes anterior ---
        dias_mes = (hoy - inicio_mes_actual).days + 1
        grafico_actual = {}
        grafico_anterior = {}

        for o in todas:
            if not o.fecha_creacion:
                continue
            fecha_ord = o.fecha_creacion.date()
            monto = float(o.total or 0)

            if fecha_ord >= inicio_mes_actual:
                dia = fecha_ord.day
                grafico_actual[dia] = grafico_actual.get(dia, 0) + monto

            if inicio_mes_anterior <= fecha_ord < fin_mes_anterior:
                dia = fecha_ord.day
                grafico_anterior[dia] = grafico_anterior.get(dia, 0) + monto

        grafico = []
        max_dias = max(dias_mes, 28)
        for dia in range(1, max_dias + 1):
            grafico.append({
                "dia": dia,
                "actual": round(grafico_actual.get(dia, 0)),
                "anterior": round(grafico_anterior.get(dia, 0)),
            })

        # --- Productos más vendidos ---
        productos_count: dict = {}
        for o in todas:
            items = o.items or []
            for item in items:
                nombre = (
                    item.get('nombre') or item.get('Name') or
                    item.get('name') or item.get('descripcion') or
                    item.get('producto_descripcion') or 'Sin nombre'
                )
                sku = (
                    item.get('sku') or item.get('Sku') or
                    item.get('sellerSku') or ''
                )
                key = sku or nombre
                cantidad = int(item.get('cantidad') or item.get('Quantity') or 1)
                monto = float(item.get('precio') or item.get('priceAfterDiscounts') or item.get('basePrice') or item.get('ItemPrice') or 0)
                if key not in productos_count:
                    productos_count[key] = {'nombre': nombre, 'sku': sku, 'cantidad': 0, 'monto': 0}
                productos_count[key]['cantidad'] += cantidad
                productos_count[key]['monto'] += monto * cantidad

        top_productos = sorted(productos_count.values(), key=lambda x: x['cantidad'], reverse=True)[:10]

        # --- Ordenes por cliente API ---
        from app.models.api_cliente import ApiCliente
        result_apis = await db.execute(select(ApiCliente).where(ApiCliente.activo == 1))
        apis = result_apis.scalars().all()

        por_cliente: list = []
        for api in apis:
            result_cli = await db.execute(select(ClienteVenta).where(ClienteVenta.id == api.cliente_id))
            cliente = result_cli.scalar_one_or_none()
            ordenes_cli = [o for o in todas if o.cliente_id == api.cliente_id]
            por_cliente.append({
                "cliente_id": api.cliente_id,
                "cliente_nombre": cliente.nombre if cliente else f"Cliente {api.cliente_id}",
                "marketplace": api.marketplace,
                "total_ordenes": len(ordenes_cli),
                "monto_total": round(sum(float(o.total or 0) for o in ordenes_cli), 2),
            })

        por_cliente.sort(key=lambda x: x['total_ordenes'], reverse=True)

        variacion_pct = 0.0
        if ventas_mes_anterior > 0:
            variacion_pct = round(((ventas_mes_actual - ventas_mes_anterior) / ventas_mes_anterior) * 100, 1)

        return {
            "kpis": {
                "total_ordenes": len(todas),
                "nuevas": len(nuevas),
                "atrasadas": len(atrasadas),
                "ordenes_hoy": len(ordenes_hoy),
                "ventas_mes_actual": round(ventas_mes_actual, 2),
                "ventas_mes_anterior": round(ventas_mes_anterior, 2),
                "variacion_pct": variacion_pct,
            },
            "por_marketplace": [
                {"marketplace": k, "ordenes": v, "monto": round(por_marketplace_monto[k], 2)}
                for k, v in sorted(por_marketplace.items(), key=lambda x: x[1], reverse=True)
            ],
            "por_cliente": por_cliente,
            "grafico": grafico,
            "top_productos": top_productos,
            "ordenes_atrasadas": [
                {
                    "id": o.id,
                    "orden_id": o.orden_id_marketplace,
                    "marketplace": str(o.marketplace.value) if o.marketplace else '',
                    "cliente": o.cliente_nombre,
                    "fecha_despacho": o.fecha_despacho,
                    "estado": o.estado_marketplace,
                    "total": float(o.total or 0),
                }
                for o in atrasadas[:10]
            ],
            "ordenes_hoy_lista": [
                {
                    "id": o.id,
                    "orden_id": o.orden_id_marketplace,
                    "marketplace": str(o.marketplace.value) if o.marketplace else '',
                    "cliente": o.cliente_nombre,
                    "estado": o.estado_marketplace,
                    "total": float(o.total or 0),
                }
                for o in ordenes_hoy[:10]
            ],
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
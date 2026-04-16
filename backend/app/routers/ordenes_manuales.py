"""
Router de Órdenes Manuales
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.db.base import get_db
from app.models.orden import Orden, MarketplaceEnum
from app.models.cliente_venta import ClienteVenta

router = APIRouter(prefix="/api/v1/ordenes-manuales", tags=["Órdenes Manuales"])


@router.get("")
async def listar_ordenes_manuales(
    estado: str = None,
    cliente_id: int = None,
    desde: str = None,
    hasta: str = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = select(Orden).where(
            Orden.marketplace == MarketplaceEnum.manual
        ).order_by(Orden.fecha_creacion.desc())

        if estado:
            query = query.where(Orden.estado_marketplace == estado)
        if cliente_id:
            query = query.where(Orden.cliente_id == cliente_id)
        if desde:
            query = query.where(Orden.fecha_despacho >= desde)
        if hasta:
            query = query.where(Orden.fecha_despacho <= hasta)

        result = await db.execute(query)
        ordenes = result.scalars().all()

        response = []
        for o in ordenes:
            cliente = await db.get(ClienteVenta, o.cliente_id) if o.cliente_id else None
            response.append({
                "id": o.id,
                "orden_id": o.orden_id_marketplace,
                "cliente_id": o.cliente_id,
                "cliente_nombre": cliente.nombre if cliente else o.cliente_nombre,
                "cliente_rut": cliente.rut if cliente else None,
                "cliente_email": cliente.email if cliente else None,
                "estado": o.estado_marketplace,
                "fecha_despacho": o.fecha_despacho,
                "fecha_llegada": o.fecha_llegada,
                "total": o.total,
                "items": o.items,
                "notas": o.notas,
                "fecha_creacion": o.fecha_creacion.isoformat() if o.fecha_creacion else None,
            })

        return {"total": len(response), "ordenes": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_orden_manual(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        # Generar número de orden si no viene
        numero_orden = data.get("numero_orden") or f"MAN-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        orden = Orden(
            marketplace=MarketplaceEnum.manual,
            orden_id_marketplace=numero_orden,
            cliente_id=data.get("cliente_id"),
            cliente_nombre=data.get("cliente_nombre"),
            estado_marketplace=data.get("estado", "pendiente"),
            fecha_despacho=data.get("fecha_despacho"),
            fecha_llegada=data.get("fecha_llegada"),
            total=float(data.get("total", 0)),
            items=data.get("items", []),
            notas=data.get("notas"),
            fecha_marketplace=datetime.utcnow(),
            raw={"tipo": "manual"},
        )
        db.add(orden)
        await db.commit()
        await db.refresh(orden)
        return {"mensaje": "Orden creada", "id": orden.id, "numero_orden": numero_orden}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{id}")
async def actualizar_orden_manual(id: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(Orden).where(Orden.id == id, Orden.marketplace == MarketplaceEnum.manual)
        )
        o = result.scalar_one_or_none()
        if not o:
            raise HTTPException(status_code=404, detail="Orden no encontrada")

        campo_map = {
            "estado": "estado_marketplace",
            "estado_marketplace": "estado_marketplace",
            "fecha_despacho": "fecha_despacho",
            "fecha_llegada": "fecha_llegada",
            "notas": "notas",
            "items": "items",
            "total": "total",
        }
        for campo_input, campo_modelo in campo_map.items():
            if campo_input in data:
                setattr(o, campo_modelo, data[campo_input])

        await db.commit()
        return {"mensaje": "Orden actualizada", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{id}")
async def eliminar_orden_manual(id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(Orden).where(Orden.id == id, Orden.marketplace == MarketplaceEnum.manual)
        )
        o = result.scalar_one_or_none()
        if not o:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        await db.delete(o)
        await db.commit()
        return {"mensaje": "Orden eliminada", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
"""
Router API Clientes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.api_cliente import ApiCliente
from app.models.cliente_venta import ClienteVenta

router = APIRouter(prefix="/api/v1/api-clientes", tags=["API Clientes"])

CAMPOS_POR_MARKETPLACE = {
    "walmart_chile": ["client_id", "api_key"],
    "paris_chile": ["api_key", "seller_id", "base_url"],
    "falabella": ["client_id", "api_key", "base_url"],
    "ripley": ["api_key", "base_url"],
}


@router.get("")
async def listar_api_clientes(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(ApiCliente, ClienteVenta)
            .join(ClienteVenta, ApiCliente.cliente_id == ClienteVenta.id)
            .where(ApiCliente.activo == 1)
            .order_by(ClienteVenta.nombre)
        )
        rows = result.all()
        return {
            "total": len(rows),
            "apis": [
                {
                    "id": api.id,
                    "cliente_id": api.cliente_id,
                    "cliente_nombre": cliente.nombre,
                    "cliente_rut": cliente.rut,
                    "marketplace": api.marketplace,
                    "client_id": api.client_id,
                    "seller_id": api.seller_id,
                    "base_url": api.base_url,
                    "tiene_api_key": bool(api.api_key),
                    "tiene_api_secret": bool(api.api_secret),
                    "extra": api.extra,
                    "fecha_creacion": api.fecha_creacion.isoformat() if api.fecha_creacion else None,
                }
                for api, cliente in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/campos/{marketplace}")
async def campos_marketplace(marketplace: str):
    campos = CAMPOS_POR_MARKETPLACE.get(marketplace, ["api_key"])
    return {"marketplace": marketplace, "campos": campos}


@router.post("")
async def crear_api_cliente(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        # Verificar que no exista ya para ese cliente y marketplace
        result = await db.execute(
            select(ApiCliente).where(
                ApiCliente.cliente_id == data["cliente_id"],
                ApiCliente.marketplace == data["marketplace"],
                ApiCliente.activo == 1,
            )
        )
        existente = result.scalar_one_or_none()
        if existente:
            raise HTTPException(status_code=400, detail="Ya existe una API configurada para ese cliente y marketplace")

        api = ApiCliente(
            cliente_id=data["cliente_id"],
            marketplace=data["marketplace"],
            api_key=data.get("api_key"),
            api_secret=data.get("api_secret"),
            client_id=data.get("client_id"),
            seller_id=data.get("seller_id"),
            base_url=data.get("base_url"),
            extra=data.get("extra"),
            activo=1,
        )
        db.add(api)
        await db.commit()
        await db.refresh(api)
        return {"mensaje": "API configurada", "id": api.id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{id}")
async def actualizar_api_cliente(id: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(ApiCliente).where(ApiCliente.id == id))
        api = result.scalar_one_or_none()
        if not api:
            raise HTTPException(status_code=404, detail="API no encontrada")
        for campo in ["api_key", "api_secret", "client_id", "seller_id", "base_url", "extra"]:
            if campo in data:
                setattr(api, campo, data[campo])
        await db.commit()
        return {"mensaje": "API actualizada", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{id}")
async def eliminar_api_cliente(id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(ApiCliente).where(ApiCliente.id == id))
        api = result.scalar_one_or_none()
        if not api:
            raise HTTPException(status_code=404, detail="API no encontrada")
        api.activo = 0
        await db.commit()
        return {"mensaje": "API eliminada", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/{id}/sync")
async def sync_api_cliente(id: int, db: AsyncSession = Depends(get_db)):
    """Sincroniza las órdenes de un cliente externo."""
    try:
        result = await db.execute(
            select(ApiCliente, ClienteVenta)
            .join(ClienteVenta, ApiCliente.cliente_id == ClienteVenta.id)
            .where(ApiCliente.id == id)
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="API no encontrada")

        api, cliente = row
        nombre_cliente = cliente.nombre
        marketplace = api.marketplace
        creadas, actualizadas = 0, 0

        if marketplace == "walmart_chile":
            from app.services.marketplaces.walmart import WalmartChileService
            from app.models.orden import Orden, MarketplaceEnum
            from sqlalchemy import select as sel
            from datetime import datetime

            svc = WalmartChileService(
                client_id=api.client_id or "",
                client_secret=api.api_key or "",
            )
            estados = ["Created", "Acknowledged", "Shipped", "Cancelled"]
            for estado in estados:
                data = await svc.obtener_ordenes(estado=estado, dias=30)
                for o in data.get("ordenes", []):
                    res = await db.execute(
                        sel(Orden).where(
                            Orden.marketplace == MarketplaceEnum.walmart,
                            Orden.sub_orden_id == o.get("purchase_order_id"),
                            Orden.cliente_id == cliente.id,
                        )
                    )
                    existente = res.scalar_one_or_none()
                    productos = o.get("productos", [])
                    # Agregar nombre cliente a cada producto
                    for p in productos:
                        p["nombre"] = f"{p.get('nombre', '')} ({nombre_cliente})"

                    if existente:
                        existente.estado_marketplace = o.get("estado")
                        existente.fecha_actualizacion = datetime.utcnow()
                        actualizadas += 1
                    else:
                        nueva = Orden(
                            marketplace=MarketplaceEnum.walmart,
                            orden_id_marketplace=o.get("orden_id"),
                            sub_orden_id=o.get("purchase_order_id"),
                            cliente_nombre=o.get("cliente"),
                            cliente_id=cliente.id,
                            estado_marketplace=o.get("estado"),
                            fecha_despacho=o.get("fecha_despacho"),
                            fecha_llegada=o.get("fecha_entrega_cliente"),
                            total=o.get("total"),
                            items=productos,
                            fecha_marketplace=datetime.utcnow(),
                            raw=o,
                        )
                        db.add(nueva)
                        creadas += 1

        elif marketplace == "paris_chile":
            from app.services.marketplaces.paris import ParisMarketplaceService
            from app.models.orden import Orden, MarketplaceEnum
            from sqlalchemy import select as sel
            from datetime import datetime

            svc = ParisMarketplaceService(
                api_key=api.api_key or "",
                seller_id=api.seller_id or "",
                base_url=api.base_url or "https://api-developers.ecomm.cencosud.com",
            )
            data = await svc.obtener_ordenes(limit=100)
            for o in data.get("ordenes", []):
                res = await db.execute(
                    sel(Orden).where(
                        Orden.marketplace == MarketplaceEnum.paris,
                        Orden.orden_id_marketplace == str(o["sub_orden_id"]),
                        Orden.cliente_id == cliente.id,
                    )
                )
                existente = res.scalar_one_or_none()
                items = o.get("items", [])
                for item in items:
                    item["nombre"] = f"{item.get('name', item.get('nombre', ''))} ({nombre_cliente})"
                    item["name"] = item["nombre"]

                estado = o.get("estado", {})
                estado_nombre = estado.get("name") if isinstance(estado, dict) else estado

                if existente:
                    existente.estado_marketplace = estado_nombre
                    existente.fecha_actualizacion = datetime.utcnow()
                    actualizadas += 1
                else:
                    raw = o.get("raw", {})
                    nueva = Orden(
                        marketplace=MarketplaceEnum.paris,
                        orden_id_marketplace=str(o.get("sub_orden_id")),
                        cliente_nombre=o.get("cliente"),
                        cliente_id=cliente.id,
                        estado_marketplace=estado_nombre,
                        carrier=o.get("carrier"),
                        label_url=o.get("label_url"),
                        sub_orden_id=raw.get("labelId"),
                        fecha_despacho=o.get("fecha_despacho"),
                        fecha_llegada=o.get("fecha_llegada"),
                        items=items,
                        fecha_marketplace=datetime.utcnow(),
                        raw=o,
                    )
                    db.add(nueva)
                    creadas += 1

        elif marketplace == "ripley":
            from app.services.marketplaces.ripley import get_ordenes as ripley_get, parsear_orden as ripley_parsear
            from app.models.orden import Orden, MarketplaceEnum
            from sqlalchemy import select as sel
            from datetime import datetime
            import httpx

            # Usar credenciales del cliente
            ordenes_raw = await ripley_get(dias=60, api_key=api.api_key, base_url=api.base_url)
            for o_raw in ordenes_raw:
                estado = o_raw.get("order_state", "")
                orden = ripley_parsear(o_raw)
                orden_id = orden["orden_id"]
                items = orden["items"]
                for item in items:
                    item["nombre"] = f"{item.get('nombre', '')} ({nombre_cliente})"

                res = await db.execute(
                    sel(Orden).where(
                        Orden.marketplace == MarketplaceEnum.ripley,
                        Orden.orden_id_marketplace == orden_id,
                        Orden.cliente_id == cliente.id,
                    )
                )
                existente = res.scalar_one_or_none()
                if existente:
                    existente.estado_marketplace = estado
                    existente.fecha_actualizacion = datetime.utcnow()
                    actualizadas += 1
                else:
                    nueva = Orden(
                        marketplace=MarketplaceEnum.ripley,
                        orden_id_marketplace=orden_id,
                        sub_orden_id=orden["sub_orden_id"],
                        cliente_nombre=orden["cliente"],
                        cliente_id=cliente.id,
                        estado_marketplace=estado,
                        fecha_despacho=orden["fecha_despacho"],
                        total=orden["total"],
                        items=items,
                        fecha_marketplace=datetime.utcnow(),
                        raw=orden["raw"],
                    )
                    db.add(nueva)
                    creadas += 1

        await db.commit()
        return {
            "mensaje": f"Sync {marketplace} ({nombre_cliente}) completado",
            "creadas": creadas,
            "actualizadas": actualizadas,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error sync: {str(e)}")
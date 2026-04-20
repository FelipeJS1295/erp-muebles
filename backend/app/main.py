"""
ERP Fábrica de Muebles — API Principal
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends
from app.db.base import get_db
from app.models.orden import Orden, MarketplaceEnum, EstadoOrdenEnum
from app.routers.productos_internos import router as productos_internos_router
from app.routers.insumos import router as insumos_router
from app.routers.sku_retail import router as sku_retail_router
from app.routers.planos_corte import router as planos_corte_router
from app.routers.trabajadores import router as trabajadores_router
from app.routers.ordenes_trabajo import router as ordenes_trabajo_router
from app.routers.clientes_ventas import router as clientes_ventas_router
from app.routers.ordenes_manuales import router as ordenes_manuales_router
from app.routers.dias_extras import router as dias_extras_router
from app.routers.horas_extras import router as horas_extras_router
from app.routers.dias_faltantes import router as dias_faltantes_router
from app.routers.resumen_mensual import router as resumen_mensual_router
from app.routers.otros_descuentos import router as otros_descuentos_router
from app.routers.bonos import router as bonos_router
from app.routers.boletas import router as boletas_router
from app.routers.api_clientes import router as api_clientes_router
from app.routers.auth import router as auth_router
from app.routers.usuarios import router as usuarios_router
from datetime import datetime

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import Request

from app.services.marketplaces.walmart import WalmartChileService
from app.services.marketplaces.paris import ParisMarketplaceService
from app.services.marketplaces.falabella import FalabellaService
from app.services.marketplaces.ripley import get_ordenes as ripley_get_ordenes, parsear_orden as ripley_parsear_orden, get_estado_erp as ripley_estado_erp, ESTADOS_ACTIVOS as RIPLEY_ESTADOS_ACTIVOS



# =============================================================================
# Instancias de servicios
# =============================================================================

walmart_service: WalmartChileService = None
paris_service: ParisMarketplaceService = None
falabella_service: FalabellaService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global walmart_service, paris_service, falabella_service

    walmart_service = WalmartChileService(
        client_id=os.getenv("WALMART_CLIENT_ID", ""),
        client_secret=os.getenv("WALMART_CLIENT_SECRET", ""),
    )

    paris_service = ParisMarketplaceService(
        api_key=os.getenv("PARIS_API_KEY", ""),
        seller_id=os.getenv("PARIS_SELLER_ID", ""),
        base_url=os.getenv("PARIS_BASE_URL", "https://api-developers.ecomm.cencosud.com"),
    )

    falabella_service = FalabellaService(
        user_id=os.getenv("FALABELLA_USER_ID", ""),
        api_key=os.getenv("FALABELLA_API_KEY", ""),
        base_url=os.getenv("FALABELLA_BASE_URL", "https://sellercenter-api.falabella.com"),
    )

    print("✅ ERP Muebles API iniciando...")
    yield
    print("🛑 ERP Muebles API detenida.")


# =============================================================================
# App
# =============================================================================

app = FastAPI(
    title="ERP Fábrica de Muebles",
    description="API para gestión de fábrica de muebles e integración con marketplaces Chile.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(productos_internos_router)
app.include_router(insumos_router)
app.include_router(sku_retail_router)
app.include_router(planos_corte_router)
app.include_router(trabajadores_router)
app.include_router(usuarios_router)
app.include_router(auth_router)
app.include_router(ordenes_trabajo_router)
app.include_router(ordenes_manuales_router)
app.include_router(clientes_ventas_router)
app.include_router(api_clientes_router)
app.include_router(boletas_router)
app.include_router(horas_extras_router)
app.include_router(dias_extras_router)
app.include_router(bonos_router)
app.include_router(dias_faltantes_router)
app.include_router(resumen_mensual_router)
app.include_router(otros_descuentos_router)

# =============================================================================
# Helper: Auto-crear producto interno
# =============================================================================

async def auto_crear_producto_interno(
    sku_seller: str,
    nombre: str,
    marketplace: str,
    sku_marketplace: str,
    db: AsyncSession
):
    from app.models.producto_interno import ProductoInterno, TipoProductoEnum
    from app.models.sku_retail import SkuRetail

    if not sku_seller:
        return

    result = await db.execute(
        select(ProductoInterno).where(ProductoInterno.sku == sku_seller.upper())
    )
    producto = result.scalar_one_or_none()

    if not producto:
        nombre_lower = (nombre or "").lower()
        if "seccional" in nombre_lower:
            tipo = TipoProductoEnum.seccional
        elif "sofa" in nombre_lower or "sofá" in nombre_lower:
            tipo = TipoProductoEnum.sofa
        elif "poltrona" in nombre_lower:
            tipo = TipoProductoEnum.poltrona
        elif "modular" in nombre_lower:
            tipo = TipoProductoEnum.modular
        elif "cojin" in nombre_lower or "cojín" in nombre_lower:
            tipo = TipoProductoEnum.cojineria
        elif "cama" in nombre_lower:
            tipo = TipoProductoEnum.cama
        else:
            tipo = TipoProductoEnum.sofa

        producto = ProductoInterno(
            sku_padre=sku_seller.upper().rstrip('0123456789').rstrip('-'),
            sku=sku_seller.upper(),
            descripcion=nombre or sku_seller,
            tipo_producto=tipo,
            precio_venta=0,
            precio_venta_descuento=0,
            precio_costura=0,
            precio_esqueleteria=0,
            precio_tapiceria=0,
            activo=1,
        )
        db.add(producto)
        await db.flush()
        print(f"✅ Auto-creado producto interno: {sku_seller}")

    result_sr = await db.execute(
        select(SkuRetail).where(SkuRetail.producto_interno_id == producto.id)
    )
    sr = result_sr.scalar_one_or_none()

    if not sr:
        sr = SkuRetail(producto_interno_id=producto.id)
        db.add(sr)
        await db.flush()

    if marketplace == 'walmart':
        sr.sku_walmart = sku_marketplace
    elif marketplace == 'paris':
        sr.sku_paris = sku_marketplace
    elif marketplace == 'falabella':
        sr.sku_falabella = sku_marketplace


# =============================================================================
# Manejador global de errores
# =============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error interno del servidor.", "error": str(exc)},
    )


# =============================================================================
# Health check
# =============================================================================

@app.get("/health", tags=["Sistema"])
async def health_check():
    return {"status": "ok", "app": "ERP Muebles", "version": "0.1.0"}


# =============================================================================
# Walmart Chile
# =============================================================================

@app.get("/api/v1/marketplaces/walmart/productos", tags=["Walmart Chile"])
async def obtener_productos_walmart(limit: int = 20):
    try:
        return await walmart_service.obtener_productos(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Walmart API: {str(e)}")


@app.get("/api/v1/marketplaces/walmart/ordenes", tags=["Walmart Chile"])
async def obtener_ordenes_walmart(estado: str = "Created", dias: int = 30):
    try:
        return await walmart_service.obtener_ordenes(estado=estado, dias=dias)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Walmart API: {str(e)}")


@app.get("/api/v1/marketplaces/walmart/ordenes/{purchase_order_id}", tags=["Walmart Chile"])
async def obtener_orden_walmart(purchase_order_id: str):
    try:
        return await walmart_service.obtener_orden(purchase_order_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Walmart API: {str(e)}")


@app.get("/api/v1/marketplaces/walmart/inventario/{sku}", tags=["Walmart Chile"])
async def obtener_inventario_walmart(sku: str):
    try:
        return await walmart_service.obtener_inventario(sku)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Walmart API: {str(e)}")


@app.put("/api/v1/marketplaces/walmart/inventario/{sku}", tags=["Walmart Chile"])
async def actualizar_inventario_walmart(sku: str, cantidad: int):
    try:
        return await walmart_service.actualizar_inventario(sku, cantidad)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Walmart API: {str(e)}")


# =============================================================================
# Paris Marketplace (Cencosud)
# =============================================================================

@app.get("/api/v1/marketplaces/paris/ordenes", tags=["Paris Chile"])
async def obtener_ordenes_paris(limit: int = 50, offset: int = 0):
    """Obtiene sub-órdenes desde Paris Marketplace."""
    try:
        return await paris_service.obtener_ordenes(limit=limit, offset=offset)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Paris API: {str(e)}")


@app.get("/api/v1/marketplaces/paris/ordenes/{sub_order_number}", tags=["Paris Chile"])
async def obtener_orden_paris(sub_order_number: str):
    """Obtiene el detalle de una sub-orden de Paris."""
    try:
        return await paris_service.obtener_orden(sub_order_number)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Paris API: {str(e)}")


@app.get("/api/v1/marketplaces/paris/productos", tags=["Paris Chile"])
async def obtener_productos_paris(limit: int = 50, offset: int = 0):
    """Obtiene catálogo de productos en Paris Marketplace."""
    try:
        return await paris_service.obtener_productos(limit=limit, offset=offset)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Paris API: {str(e)}")


@app.get("/api/v1/marketplaces/paris/stock/{sku}", tags=["Paris Chile"])
async def obtener_stock_paris(sku: str):
    """Obtiene el stock de un SKU en Paris Marketplace."""
    try:
        return await paris_service.obtener_stock(sku)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Paris API: {str(e)}")


@app.put("/api/v1/marketplaces/paris/stock/{sku}", tags=["Paris Chile"])
async def actualizar_stock_paris(sku: str, cantidad: int):
    """Actualiza el stock de un SKU en Paris Marketplace."""
    try:
        return await paris_service.actualizar_stock(sku, cantidad)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Paris API: {str(e)}")

# =============================================================================
# Base de datos — Órdenes
# =============================================================================

@app.post("/api/v1/ordenes/sync/walmart", tags=["Base de Datos"])
async def sincronizar_ordenes_walmart(
    dias: int = 30,
    db: AsyncSession = Depends(get_db)
):
    try:
        guardadas = 0
        actualizadas = 0

        # Traer todos los estados posibles
        estados = ["Created", "Acknowledged", "Shipped", "Cancelled"]

        for estado in estados:
            data = await walmart_service.obtener_ordenes(estado=estado, dias=dias)
            ordenes = data.get("ordenes", [])

            for o in ordenes:
                result = await db.execute(
                    select(Orden).where(
                        Orden.marketplace == MarketplaceEnum.walmart,
                        Orden.sub_orden_id == o.get("purchase_order_id"),
                    )
                )
                existente = result.scalar_one_or_none()

                if existente:
                    existente.orden_id_marketplace = o.get("orden_id")
                    existente.estado_marketplace = o.get("estado")
                    existente.fecha_despacho = o.get("fecha_despacho")
                    existente.fecha_llegada = o.get("fecha_entrega_cliente")
                    existente.total = o.get("total")
                    existente.items = o.get("productos", [])
                    existente.fecha_actualizacion = datetime.utcnow()
                    actualizadas += 1
                else:
                    nueva = Orden(
                        marketplace=MarketplaceEnum.walmart,
                        orden_id_marketplace=o.get("orden_id"),
                        sub_orden_id=o.get("purchase_order_id"),
                        cliente_nombre=o.get("cliente"),
                        estado_marketplace=o.get("estado"),
                        fecha_despacho=o.get("fecha_despacho"),
                        fecha_llegada=o.get("fecha_entrega_cliente"),
                        total=o.get("total"),
                        items=o.get("productos", []),
                        fecha_marketplace=datetime.utcnow(),
                        raw=o,
                    )
                    db.add(nueva)
                    guardadas += 1

                # Auto-crear producto interno
                for prod in o.get("productos", []):
                    sku = prod.get("sku")
                    nombre = prod.get("nombre")
                    if sku:
                        await auto_crear_producto_interno(sku, nombre, 'walmart', sku, db)

        await db.commit()
        return {
            "mensaje": "Sync Walmart completado (todos los estados)",
            "guardadas": guardadas,
            "actualizadas": actualizadas,
            "total_procesadas": guardadas + actualizadas,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error sync Walmart: {str(e)}")


@app.get("/api/v1/ordenes", tags=["Base de Datos"])
async def listar_ordenes(
    marketplace: str = None,
    estado: str = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Lista todas las órdenes guardadas en la BD."""
    try:
        from app.models.boleta import Boleta

        query = select(Orden).order_by(Orden.fecha_creacion.desc())
        if marketplace:
            query = query.where(Orden.marketplace == marketplace)
        if estado:
            query = query.where(Orden.estado_marketplace == estado)
        query = query.limit(limit).offset(offset)
        result = await db.execute(query)
        ordenes = result.scalars().all()

        # Cargar folios de boletas
        result_boletas = await db.execute(
            select(Boleta.orden_id, Boleta.folio, Boleta.url_boleta)
        )
        boletas_map = {
            row.orden_id: {"folio": row.folio, "url": row.url_boleta}
            for row in result_boletas
        }

        return {
            "total": len(ordenes),
            "ordenes": [
                {
                    "id": o.id,
                    "marketplace": o.marketplace,
                    "orden_id": o.orden_id_marketplace,
                    "sub_orden_id": o.sub_orden_id,
                    "cliente": o.cliente_nombre,
                    "estado": o.estado_marketplace,
                    "carrier": o.carrier,
                    "fecha_despacho": o.fecha_despacho,
                    "fecha_llegada": o.fecha_llegada,
                    "label_url": o.label_url,
                    "total": o.total,
                    "items": o.items,
                    "raw": o.raw,
                    "fecha_creacion": o.fecha_creacion.isoformat() if o.fecha_creacion else None,
                    "fecha_actualizacion": o.fecha_actualizacion.isoformat() if o.fecha_actualizacion else None,
                    "boleta_folio": boletas_map.get(o.id, {}).get("folio"),
                    "boleta_url": boletas_map.get(o.id, {}).get("url"),
                    "tipo_documento": (
                        (o.raw or {}).get("tipo_documento") or
                        (o.raw or {}).get("order", {}).get("originInvoiceType") or
                        "boleta"
                    ),
                }
                for o in ordenes
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error BD: {str(e)}")

@app.post("/api/v1/marketplaces/paris/etiqueta/{label_id}", tags=["Paris Chile"])
async def imprimir_etiqueta_paris(label_id: str):
    """
    Registra la impresión de etiqueta en Paris/Envíame.
    Se debe llamar al abrir el PDF para que el courier actualice el estado.
    """
    try:
        resultado = await paris_service.imprimir_etiqueta(label_id)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error etiqueta Paris: {str(e)}")

@app.get("/api/v1/marketplaces/walmart/etiqueta/{purchase_order_id}", tags=["Walmart Chile"])
async def obtener_etiqueta_walmart(purchase_order_id: str):
    """
    Obtiene la etiqueta de despacho de una orden de Walmart.
    """
    try:
        resultado = await walmart_service.obtener_etiqueta(purchase_order_id)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error etiqueta Walmart: {str(e)}")

@app.get("/api/v1/productos/consolidado", tags=["Productos"])
async def productos_consolidado():
    try:
        import asyncio

        # Obtener productos de ambos en paralelo
        walmart_res, paris_res = await asyncio.gather(
            walmart_service.obtener_productos(limit=50),
            paris_service.obtener_productos(limit=100),
            return_exceptions=True
        )

        # Procesar Walmart
        walmart_map: dict = {}
        if not isinstance(walmart_res, Exception):
            for p in walmart_res.get("productos", []):
                sku = p.get("sku", "").upper()
                if sku:
                    walmart_map[sku] = {
                        "nombre": p.get("nombre"),
                        "precio_walmart": p.get("precio"),
                        "stock_walmart": p.get("stock"),
                        "estado_walmart": p.get("estado"),
                        "alerta_walmart": p.get("alerta_stock", False),
                    }

        # Procesar Paris - recolectar todos los SKUs variante
        paris_productos = []
        skus_paris = []
        if not isinstance(paris_res, Exception):
            for p in paris_res.get("productos", []):
                variantes = p.get("variantes", [])
                for variante in variantes:
                    paris_productos.append({
                        "sku_paris": variante,
                        "nombre": p.get("nombre"),
                        "sku_padre": p.get("sku_padre"),
                        "estado_paris": p.get("estado"),
                        "categoria": p.get("categoria"),
                    })
                    skus_paris.append(variante)

        # Obtener stock de Paris en bulk
        stock_paris_map: dict = {}
        if skus_paris:
            try:
                chunks = [skus_paris[i:i+50] for i in range(0, len(skus_paris), 50)]
                for chunk in chunks:
                    chunk_stock = await paris_service.obtener_stock_bulk(chunk)
                    stock_paris_map.update(chunk_stock)
            except Exception as e:
                print(f"⚠️ Error stock Paris bulk: {e}")

        # Consolidar — intentar hacer match por nombre entre Walmart y Paris
        consolidado: dict = {}

        # Agregar Walmart
        for sku, datos in walmart_map.items():
            consolidado[sku] = {
                "sku_seller": sku,
                "sku_paris": None,
                "nombre": datos["nombre"],
                "en_walmart": True,
                "en_paris": False,
                "stock_walmart": datos["stock_walmart"],
                "stock_paris": None,
                "precio_walmart": datos["precio_walmart"],
                "estado_walmart": datos["estado_walmart"],
                "estado_paris": None,
                "alerta_stock": datos["alerta_walmart"],
            }

        # Agregar Paris - intentar match por nombre con Walmart
        for p in paris_productos:
            sku_paris = p["sku_paris"]
            nombre = p["nombre"] or ""
            stock = stock_paris_map.get(sku_paris)
            alerta = stock is not None and stock < 5

            # Intentar match con Walmart por nombre similar
            matched = None
            nombre_lower = nombre.lower()
            for wsku, wdatos in consolidado.items():
                wname = (wdatos["nombre"] or "").lower()
                if wname and nombre_lower and (
                    wname == nombre_lower or
                    wname in nombre_lower or
                    nombre_lower in wname
                ):
                    matched = wsku
                    break

            if matched:
                consolidado[matched]["en_paris"] = True
                consolidado[matched]["sku_paris"] = sku_paris
                consolidado[matched]["stock_paris"] = stock
                consolidado[matched]["estado_paris"] = p["estado_paris"]
                if alerta:
                    consolidado[matched]["alerta_stock"] = True
            else:
                consolidado[sku_paris] = {
                    "sku_seller": None,
                    "sku_paris": sku_paris,
                    "nombre": nombre,
                    "en_walmart": False,
                    "en_paris": True,
                    "stock_walmart": None,
                    "stock_paris": stock,
                    "precio_walmart": None,
                    "estado_walmart": None,
                    "estado_paris": p["estado_paris"],
                    "alerta_stock": alerta,
                }

        productos = list(consolidado.values())
        productos.sort(key=lambda x: (not x["alerta_stock"], x["nombre"] or ""))

        return {
            "total": len(productos),
            "criticos": sum(1 for p in productos if p["alerta_stock"]),
            "sin_stock": sum(1 for p in productos if (
                p.get("stock_walmart") == 0 or p.get("stock_paris") == 0
            )),
            "en_ambos": sum(1 for p in productos if p["en_walmart"] and p["en_paris"]),
            "productos": productos,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consolidado: {str(e)}")

# =============================================================================
# Falabella Chile
# =============================================================================

@app.get("/api/v1/marketplaces/falabella/ordenes", tags=["Falabella Chile"])
async def obtener_ordenes_falabella(estado: str = "pending", limite: int = 100):
    try:
        return await falabella_service.obtener_ordenes(estado=estado, limite=limite)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Falabella API: {str(e)}")

@app.get("/api/v1/marketplaces/falabella/productos", tags=["Falabella Chile"])
async def obtener_productos_falabella(limite: int = 100, offset: int = 0):
    try:
        return await falabella_service.obtener_productos(limite=limite, offset=offset)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Falabella API: {str(e)}")

@app.post("/api/v1/ordenes/sync/falabella", tags=["Base de Datos"])
async def sincronizar_ordenes_falabella(db: AsyncSession = Depends(get_db)):
    try:
        guardadas = 0
        actualizadas = 0

        estados = ["pending", "ready_to_ship", "shipped", "canceled"]

        for estado in estados:
            try:
                data = await falabella_service.obtener_ordenes(estado=estado, limite=100)
                ordenes = data.get("ordenes", [])

                for o in ordenes:
                    result = await db.execute(
                        select(Orden).where(
                            Orden.marketplace == MarketplaceEnum.falabella,
                            Orden.orden_id_marketplace == o.get("orden_id"),
                        )
                    )
                    existente = result.scalar_one_or_none()

                    try:
                        items_data = await falabella_service.obtener_items_orden(o.get("orden_id"))
                        items = items_data.get("items", [])
                    except Exception:
                        items = []

                    fecha_despacho = None
                    raw = o.get("raw", {})
                    promised = raw.get("PromisedShippingTime")
                    if promised:
                        fecha_despacho = promised[:10]

                    if existente:
                        existente.estado_marketplace = estado
                        existente.items = items
                        existente.fecha_actualizacion = datetime.utcnow()
                        actualizadas += 1
                    else:
                        nueva = Orden(
                            marketplace=MarketplaceEnum.falabella,
                            orden_id_marketplace=o.get("orden_id"),
                            cliente_nombre=o.get("cliente"),
                            estado_marketplace=estado,
                            fecha_despacho=fecha_despacho,
                            total=float(o.get("total") or 0),
                            items=items,
                            fecha_marketplace=datetime.utcnow(),
                            raw=o.get("raw", {}),
                        )
                        db.add(nueva)
                        guardadas += 1

                    # Auto-crear producto interno
                    for item in items:
                        sku = item.get("Sku")
                        nombre = item.get("Name")
                        if sku:
                            await auto_crear_producto_interno(sku, nombre, 'falabella', sku, db)

            except Exception as e:
                print(f"⚠️ Error estado {estado}: {e}")
                continue

        await db.commit()
        return {
            "mensaje": "Sync Falabella completado",
            "guardadas": guardadas,
            "actualizadas": actualizadas,
            "total_procesadas": guardadas + actualizadas,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error sync Falabella: {str(e)}")


@app.post("/api/v1/ordenes/sync/ripley", tags=["Base de Datos"])
async def sync_ripley(db: AsyncSession = Depends(get_db)):
    try:
        ordenes_raw = await ripley_get_ordenes(dias=60)
        creadas, actualizadas = 0, 0

        for o_raw in ordenes_raw:
            estado = o_raw.get("order_state", "")
            orden = ripley_parsear_orden(o_raw)
            orden_id = orden["orden_id"]

            result = await db.execute(
                select(Orden).where(
                    Orden.marketplace == MarketplaceEnum.ripley,
                    Orden.orden_id_marketplace == orden_id,
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.estado_marketplace = estado
                existing.fecha_despacho = orden["fecha_despacho"]
                existing.fecha_llegada = orden.get("fecha_llegada")
                existing.fecha_actualizacion = datetime.utcnow()
                actualizadas += 1
            else:
                nueva = Orden(
                    marketplace=MarketplaceEnum.ripley,
                    orden_id_marketplace=orden_id,
                    sub_orden_id=orden["sub_orden_id"],
                    cliente_nombre=orden["cliente"],
                    estado_marketplace=estado,
                    fecha_despacho=orden["fecha_despacho"],
                    total=orden["total"],
                    items=orden["items"],
                    fecha_marketplace=datetime.utcnow(),
                    raw=orden["raw"],
                )
                db.add(nueva)
                creadas += 1

            for item in orden["items"]:
                sku = item.get("sku")
                nombre = item.get("nombre")
                if sku:
                    await auto_crear_producto_interno(sku, nombre, 'ripley', sku, db)

        await db.commit()
        return {"mensaje": "Ripley sync OK", "creadas": creadas, "actualizadas": actualizadas}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error sync Ripley: {str(e)}")

@app.post("/api/v1/ordenes/sync/paris", tags=["Base de Datos"])
async def sincronizar_ordenes_paris(
    limit: int = 500,
    db: AsyncSession = Depends(get_db)
):
    from app.models.sub_orden_data import SubOrdenData
    try:
        data = await paris_service.obtener_ordenes(limit=limit)
        ordenes = data.get("ordenes", [])
        guardadas = 0
        actualizadas = 0

        for o in ordenes:
            result = await db.execute(
                select(Orden).where(
                    Orden.orden_id_marketplace == str(o["sub_orden_id"]),
                    Orden.marketplace == MarketplaceEnum.paris,
                )
            )
            existente = result.scalar_one_or_none()

            estado = o.get("estado", {})
            estado_nombre = estado.get("name") if isinstance(estado, dict) else estado

            items_data = o.get("items", [])
            subtotal = sum(
                float(item.get("priceAfterDiscounts") or item.get("basePrice") or 0)
                for item in items_data
            )
            costo_despacho = float(o.get("costo_despacho") or 0)
            customer = o.get("customer", {})
            billing = o.get("billing", {})
            shipping = o.get("shipping", {})
            business = o.get("business_invoice") or {}
            tipo_doc = o.get("tipo_documento", "boleta")

            if existente:
                existente.estado_marketplace = estado_nombre
                existente.fecha_actualizacion = datetime.utcnow()
                orden_obj = existente
                actualizadas += 1
                await db.flush()
            else:
                raw = o.get("raw", {})
                nueva = Orden(
                    marketplace=MarketplaceEnum.paris,
                    orden_id_marketplace=str(o.get("sub_orden_id")),
                    cliente_nombre=o.get("cliente"),
                    estado_marketplace=estado_nombre,
                    carrier=o.get("carrier"),
                    label_url=o.get("label_url"),
                    sub_orden_id=raw.get("labelId"),
                    fecha_despacho=o.get("fecha_despacho"),
                    fecha_llegada=o.get("fecha_llegada"),
                    items=items_data,
                    fecha_marketplace=datetime.utcnow(),
                    raw=o,
                )
                db.add(nueva)
                await db.flush()
                orden_obj = nueva
                guardadas += 1

                for item in items_data:
                    sku_seller = item.get("sellerSku", "").replace("-1","").replace("-2","")
                    sku_paris = item.get("sku")
                    nombre = item.get("name")
                    if sku_seller:
                        await auto_crear_producto_interno(sku_seller, nombre, 'paris', sku_paris, db)

            # Guardar/actualizar sub_orden_data
            result_sod = await db.execute(
                select(SubOrdenData).where(
                    SubOrdenData.orden_id_marketplace == str(o.get("sub_orden_id"))
                )
            )
            sod = result_sod.scalar_one_or_none()

            sod_data = dict(
                orden_id=orden_obj.id,
                orden_id_marketplace=str(o.get("sub_orden_id")),
                marketplace="paris_chile",
                cliente_nombre=customer.get("nombre"),
                cliente_rut=customer.get("rut"),
                cliente_email=customer.get("email"),
                billing_direccion=billing.get("direccion"),
                billing_ciudad=billing.get("ciudad"),
                billing_comuna=billing.get("comuna"),
                shipping_direccion=shipping.get("direccion"),
                shipping_ciudad=shipping.get("ciudad"),
                shipping_comuna=shipping.get("comuna"),
                costo_despacho=costo_despacho,
                subtotal_productos=subtotal,
                total=subtotal + costo_despacho,
                tipo_documento=tipo_doc,
                factura_rut=business.get("rut") or business.get("documentNumber"),
                factura_razon_social=business.get("razonSocial") or business.get("name"),
                factura_giro=business.get("giro") or business.get("activity"),
                factura_direccion=business.get("address") or business.get("direccion"),
                factura_ciudad=business.get("city") or business.get("ciudad"),
                factura_comuna=business.get("comuna") or business.get("communaCode"),
                factura_email=business.get("email"),
            )

            if sod:
                for k, v in sod_data.items():
                    setattr(sod, k, v)
            else:
                db.add(SubOrdenData(**sod_data))

        await db.commit()
        return {
            "mensaje": "Sync Paris completado",
            "guardadas": guardadas,
            "actualizadas": actualizadas,
            "total_procesadas": len(ordenes),
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error sync Paris: {str(e)}")

@app.get("/api/v1/ordenes/{orden_id}/data", tags=["Base de Datos"])
async def obtener_orden_data(orden_id: int, db: AsyncSession = Depends(get_db)):
    from app.models.sub_orden_data import SubOrdenData
    result = await db.execute(
        select(SubOrdenData).where(SubOrdenData.orden_id == orden_id)
    )
    sod = result.scalar_one_or_none()
    if not sod:
        return {"data": None}
    return {
        "data": {
            "cliente_nombre": sod.cliente_nombre,
            "cliente_rut": sod.cliente_rut,
            "cliente_email": sod.cliente_email,
            "billing_direccion": sod.billing_direccion,
            "billing_ciudad": sod.billing_ciudad,
            "billing_comuna": sod.billing_comuna,
            "shipping_direccion": sod.shipping_direccion,
            "shipping_ciudad": sod.shipping_ciudad,
            "shipping_comuna": sod.shipping_comuna,
            "costo_despacho": sod.costo_despacho,
            "subtotal_productos": sod.subtotal_productos,
            "total": sod.total,
            "tipo_documento": sod.tipo_documento,
            "factura_rut": sod.factura_rut,
            "factura_razon_social": sod.factura_razon_social,
            "factura_giro": sod.factura_giro,
            "factura_direccion": sod.factura_direccion,
            "factura_ciudad": sod.factura_ciudad,
            "factura_comuna": sod.factura_comuna,
            "factura_email": sod.factura_email,
        }
    }

# =============================================================================
# Gastos Mensuales
# =============================================================================

from app.models.gasto import Gasto, TipoGastoEnum

@app.get("/api/v1/gastos", tags=["Gastos"])
async def listar_gastos(
    mes: int = None,
    anio: int = None,
    tipo: str = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = select(Gasto).order_by(Gasto.fecha.desc())
        if mes and anio:
            from sqlalchemy import extract
            query = query.where(
                extract('month', Gasto.fecha) == mes,
                extract('year', Gasto.fecha) == anio,
            )
        elif anio:
            from sqlalchemy import extract
            query = query.where(extract('year', Gasto.fecha) == anio)
        if tipo:
            query = query.where(Gasto.tipo == tipo)
        result = await db.execute(query)
        gastos = result.scalars().all()
        total = sum(g.monto for g in gastos)
        return {
            "total": len(gastos),
            "monto_total": total,
            "gastos": [
                {
                    "id": g.id,
                    "fecha": g.fecha.isoformat(),
                    "tipo": g.tipo,
                    "descripcion": g.descripcion,
                    "monto": g.monto,
                    "monto_pagado": g.monto_pagado or 0,
                    "estado": g.estado or "pendiente",
                    "fecha_creacion": g.fecha_creacion.isoformat() if g.fecha_creacion else None,
                }
                for g in gastos
            ],
        }
    except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/api/v1/gastos", tags=["Gastos"])
async def crear_gasto(body: dict, db: AsyncSession = Depends(get_db)):
    try:
        from datetime import date
        gasto = Gasto(
            fecha=date.fromisoformat(body["fecha"]),
            tipo=body["tipo"],
            descripcion=body["descripcion"],
            monto=float(body["monto"]),
        )
        db.add(gasto)
        await db.commit()
        await db.refresh(gasto)
        return {"id": gasto.id, "mensaje": "Gasto creado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.put("/api/v1/gastos/{gasto_id}", tags=["Gastos"])
async def actualizar_gasto(gasto_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        from datetime import date
        result = await db.execute(select(Gasto).where(Gasto.id == gasto_id))
        gasto = result.scalar_one_or_none()
        if not gasto:
            raise HTTPException(status_code=404, detail="Gasto no encontrado")
        if "fecha" in body:
            gasto.fecha = date.fromisoformat(body["fecha"])
        if "tipo" in body:
            gasto.tipo = body["tipo"]
        if "descripcion" in body:
            gasto.descripcion = body["descripcion"]
        if "monto" in body:
            gasto.monto = float(body["monto"])
        await db.commit()
        return {"mensaje": "Gasto actualizado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.delete("/api/v1/gastos/{gasto_id}", tags=["Gastos"])
async def eliminar_gasto(gasto_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Gasto).where(Gasto.id == gasto_id))
        gasto = result.scalar_one_or_none()
        if not gasto:
            raise HTTPException(status_code=404, detail="Gasto no encontrado")
        await db.delete(gasto)
        await db.commit()
        return {"mensaje": "Gasto eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# =============================================================================
# Pagos de Gastos
# =============================================================================

from app.models.gasto_pago import GastoPago, TipoPagoEnum

@app.get("/api/v1/gastos/{gasto_id}/pagos", tags=["Gastos"])
async def listar_pagos_gasto(gasto_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(GastoPago).where(GastoPago.gasto_id == gasto_id).order_by(GastoPago.fecha.desc())
        )
        pagos = result.scalars().all()
        return {
            "total": len(pagos),
            "pagos": [
                {
                    "id": p.id,
                    "gasto_id": p.gasto_id,
                    "fecha": p.fecha.isoformat(),
                    "tipo": p.tipo,
                    "comprobante": p.comprobante,
                    "monto": p.monto,
                    "fecha_creacion": p.fecha_creacion.isoformat() if p.fecha_creacion else None,
                }
                for p in pagos
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/api/v1/gastos/{gasto_id}/pagos", tags=["Gastos"])
async def crear_pago_gasto(gasto_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        from datetime import date

        # Verificar que el gasto existe
        result = await db.execute(select(Gasto).where(Gasto.id == gasto_id))
        gasto = result.scalar_one_or_none()
        if not gasto:
            raise HTTPException(status_code=404, detail="Gasto no encontrado")

        # Crear el pago
        pago = GastoPago(
            gasto_id=gasto_id,
            fecha=date.fromisoformat(body["fecha"]),
            tipo=body["tipo"],
            comprobante=body.get("comprobante") or None,
            monto=float(body["monto"]),
        )
        db.add(pago)
        await db.flush()  # Para que el pago quede persistido antes de recalcular

        # Recalcular monto pagado sumando desde BD (ya incluye el nuevo)
        result_pagos = await db.execute(
            select(GastoPago).where(GastoPago.gasto_id == gasto_id)
        )
        todos_los_pagos = result_pagos.scalars().all()
        total_pagado = sum(p.monto for p in todos_los_pagos)

        gasto.monto_pagado = total_pagado
        if total_pagado >= gasto.monto:
            gasto.estado = "pagado"
        elif total_pagado > 0:
            gasto.estado = "parcial"
        else:
            gasto.estado = "pendiente"

        await db.commit()
        return {"mensaje": "Pago registrado correctamente", "estado_gasto": gasto.estado}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.delete("/api/v1/gastos/{gasto_id}/pagos/{pago_id}", tags=["Gastos"])
async def eliminar_pago_gasto(gasto_id: int, pago_id: int, db: AsyncSession = Depends(get_db)):
    try:
        # Eliminar pago
        result = await db.execute(
            select(GastoPago).where(GastoPago.id == pago_id, GastoPago.gasto_id == gasto_id)
        )
        pago = result.scalar_one_or_none()
        if not pago:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
        await db.delete(pago)

        # Recalcular estado del gasto
        result_gasto = await db.execute(select(Gasto).where(Gasto.id == gasto_id))
        gasto = result_gasto.scalar_one_or_none()
        if gasto:
            result_pagos = await db.execute(
                select(GastoPago).where(GastoPago.gasto_id == gasto_id, GastoPago.id != pago_id)
            )
            pagos_restantes = result_pagos.scalars().all()
            total_pagado = sum(p.monto for p in pagos_restantes)
            gasto.monto_pagado = total_pagado
            if total_pagado >= gasto.monto:
                gasto.estado = "pagado"
            elif total_pagado > 0:
                gasto.estado = "parcial"
            else:
                gasto.estado = "pendiente"

        await db.commit()
        return {"mensaje": "Pago eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# =============================================================================
# Remuneraciones
# =============================================================================

from app.models.remuneracion import Remuneracion, TipoContratoEnum
from app.models.trabajador import Trabajador as TrabajadorModel

@app.get("/api/v1/remuneraciones", tags=["Remuneraciones"])
async def listar_remuneraciones(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(Remuneracion, TrabajadorModel)
            .join(TrabajadorModel, Remuneracion.trabajador_id == TrabajadorModel.id)
            .where(Remuneracion.activo == 1)
            .order_by(TrabajadorModel.nombre_completo)
        )
        rows = result.all()
        return {
            "total": len(rows),
            "remuneraciones": [
                {
                    "id": r.id,
                    "trabajador_id": r.trabajador_id,
                    "trabajador_nombre": t.nombre_completo,
                    "trabajador_rut": t.rut,
                    "trabajador_cargo": t.cargo,
                    "sueldo_base": r.sueldo_base,
                    "tipo": r.tipo,
                    "fecha_creacion": r.fecha_creacion.isoformat() if r.fecha_creacion else None,
                    "fecha_actualizacion": r.fecha_actualizacion.isoformat() if r.fecha_actualizacion else None,
                }
                for r, t in rows
            ],
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.get("/api/v1/remuneraciones/trabajadores-sin-remuneracion", tags=["Remuneraciones"])
async def trabajadores_sin_remuneracion(db: AsyncSession = Depends(get_db)):
    try:
        # Trabajadores que ya tienen remuneracion
        result_con = await db.execute(
            select(Remuneracion.trabajador_id).where(Remuneracion.activo == 1)
        )
        ids_con = [r[0] for r in result_con.all()]

        # Trabajadores activos sin remuneracion
        query = select(TrabajadorModel).where(TrabajadorModel.activo == 1)
        if ids_con:
            query = query.where(TrabajadorModel.id.notin_(ids_con))
        query = query.order_by(TrabajadorModel.nombre_completo)

        result = await db.execute(query)
        trabajadores = result.scalars().all()
        return {
            "total": len(trabajadores),
            "trabajadores": [
                {
                    "id": t.id,
                    "nombre_completo": t.nombre_completo,
                    "rut": t.rut,
                    "cargo": t.cargo,
                }
                for t in trabajadores
            ],
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/api/v1/remuneraciones", tags=["Remuneraciones"])
async def crear_remuneracion(body: dict, db: AsyncSession = Depends(get_db)):
    try:
        # Verificar que no tenga ya una remuneracion activa
        result = await db.execute(
            select(Remuneracion).where(
                Remuneracion.trabajador_id == body["trabajador_id"],
                Remuneracion.activo == 1,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="El trabajador ya tiene una remuneración registrada")

        rem = Remuneracion(
            trabajador_id=int(body["trabajador_id"]),
            sueldo_base=float(body["sueldo_base"]),
            tipo=body["tipo"],
            activo=1,
        )
        db.add(rem)
        await db.commit()
        await db.refresh(rem)
        return {"id": rem.id, "mensaje": "Remuneración creada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.put("/api/v1/remuneraciones/{rem_id}", tags=["Remuneraciones"])
async def actualizar_remuneracion(rem_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Remuneracion).where(Remuneracion.id == rem_id))
        rem = result.scalar_one_or_none()
        if not rem:
            raise HTTPException(status_code=404, detail="Remuneración no encontrada")
        if "sueldo_base" in body:
            rem.sueldo_base = float(body["sueldo_base"])
        if "tipo" in body:
            rem.tipo = body["tipo"]
        await db.commit()
        return {"mensaje": "Remuneración actualizada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.delete("/api/v1/remuneraciones/{rem_id}", tags=["Remuneraciones"])
async def eliminar_remuneracion(rem_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Remuneracion).where(Remuneracion.id == rem_id))
        rem = result.scalar_one_or_none()
        if not rem:
            raise HTTPException(status_code=404, detail="Remuneración no encontrada")
        await db.delete(rem)
        await db.commit()
        return {"mensaje": "Remuneración eliminada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
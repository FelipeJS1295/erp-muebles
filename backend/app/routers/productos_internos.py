from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.producto_interno import ProductoInterno

router = APIRouter(prefix="/api/v1/productos-internos", tags=["Productos Internos"])


@router.get("")
async def listar_productos_internos(
    tipo: str = None,
    activo: int = 1,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = select(ProductoInterno).where(ProductoInterno.activo == activo)
        if tipo:
            query = query.where(ProductoInterno.tipo_producto == tipo)
        query = query.order_by(ProductoInterno.sku_padre, ProductoInterno.sku)
        result = await db.execute(query)
        productos = result.scalars().all()

        return {
            "total": len(productos),
            "productos": [
                {
                    "id": p.id,
                    "sku_padre": p.sku_padre,
                    "sku": p.sku,
                    "descripcion": p.descripcion,
                    "descripcion_esqueleto": p.descripcion_esqueleto,
                    "tipo_producto": p.tipo_producto,
                    "precio_venta": p.precio_venta,
                    "precio_venta_descuento": p.precio_venta_descuento,
                    "precio_costura": p.precio_costura,
                    "precio_esqueleteria": p.precio_esqueleteria,
                    "precio_tapiceria": p.precio_tapiceria,
                    "color": p.color,
                    "material": p.material,
                    "peso": p.peso,
                    "dimensiones": p.dimensiones,
                    "imagenes": p.imagenes,
                    "activo": p.activo,
                    "fecha_creacion": p.fecha_creacion.isoformat() if p.fecha_creacion else None,
                }
                for p in productos
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_producto_interno(producto: dict, db: AsyncSession = Depends(get_db)):
    try:
        nuevo = ProductoInterno(
            sku_padre=producto["sku_padre"],
            sku=producto["sku"],
            descripcion=producto["descripcion"],
            descripcion_esqueleto=producto.get("descripcion_esqueleto"),
            tipo_producto=producto["tipo_producto"],
            precio_venta=producto["precio_venta"],
            precio_venta_descuento=producto["precio_venta_descuento"],
            precio_costura=producto["precio_costura"],
            precio_esqueleteria=producto["precio_esqueleteria"],
            precio_tapiceria=producto["precio_tapiceria"],
            color=producto.get("color"),
            material=producto.get("material"),
            peso=producto.get("peso"),
            dimensiones=producto.get("dimensiones"),
            imagenes=producto.get("imagenes"),
            activo=1,
        )
        db.add(nuevo)
        await db.commit()
        await db.refresh(nuevo)
        return {"mensaje": "Producto creado", "id": nuevo.id, "sku": nuevo.sku}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{id}")
async def actualizar_producto_interno(id: int, producto: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(ProductoInterno).where(ProductoInterno.id == id))
        p = result.scalar_one_or_none()
        if not p:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        for campo in ["sku_padre", "sku", "descripcion", "descripcion_esqueleto", "tipo_producto", "precio_venta",
                      "precio_venta_descuento", "precio_costura", "precio_esqueleteria",
                      "precio_tapiceria", "color", "material", "peso", "dimensiones", "imagenes"]:
            if campo in producto:
                setattr(p, campo, producto[campo])

        await db.commit()
        return {"mensaje": "Producto actualizado", "id": p.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{id}")
async def eliminar_producto_interno(id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(ProductoInterno).where(ProductoInterno.id == id))
        p = result.scalar_one_or_none()
        if not p:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        p.activo = 0
        await db.commit()
        return {"mensaje": "Producto desactivado", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
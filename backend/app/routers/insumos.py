"""
Router de Insumos
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.insumo import Insumo
from app.models.producto_insumo import ProductoInsumo
from app.models.producto_interno import ProductoInterno

router = APIRouter(prefix="/api/v1/insumos", tags=["Insumos"])


@router.get("")
async def listar_insumos(activo: int = 1, db: AsyncSession = Depends(get_db)):
    try:
        query = select(Insumo).where(Insumo.activo == activo).order_by(Insumo.nombre)
        result = await db.execute(query)
        insumos = result.scalars().all()
        return {
            "total": len(insumos),
            "insumos": [
                {
                    "id": i.id,
                    "codigo": i.codigo,
                    "nombre": i.nombre,
                    "unidad_medida": i.unidad_medida,
                    "precio_costo": i.precio_costo,
                    "precio_venta": i.precio_venta,
                    "activo": i.activo,
                    "fecha_creacion": i.fecha_creacion.isoformat() if i.fecha_creacion else None,
                }
                for i in insumos
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_insumo(insumo: dict, db: AsyncSession = Depends(get_db)):
    try:
        nuevo = Insumo(
            codigo=insumo["codigo"],
            nombre=insumo["nombre"],
            unidad_medida=insumo["unidad_medida"],
            precio_costo=insumo["precio_costo"],
            precio_venta=insumo["precio_venta"],
            activo=1,
        )
        db.add(nuevo)
        await db.commit()
        await db.refresh(nuevo)
        return {"mensaje": "Insumo creado", "id": nuevo.id, "codigo": nuevo.codigo}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{id}")
async def actualizar_insumo(id: int, insumo: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Insumo).where(Insumo.id == id))
        i = result.scalar_one_or_none()
        if not i:
            raise HTTPException(status_code=404, detail="Insumo no encontrado")
        for campo in ["codigo", "nombre", "unidad_medida", "precio_costo", "precio_venta"]:
            if campo in insumo:
                setattr(i, campo, insumo[campo])
        await db.commit()
        return {"mensaje": "Insumo actualizado", "id": i.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{id}")
async def eliminar_insumo(id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Insumo).where(Insumo.id == id))
        i = result.scalar_one_or_none()
        if not i:
            raise HTTPException(status_code=404, detail="Insumo no encontrado")
        i.activo = 0
        await db.commit()
        return {"mensaje": "Insumo desactivado", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# -----------------------------------------------------------------------
# Relación Producto - Insumo
# -----------------------------------------------------------------------

@router.get("/producto/{producto_id}")
async def listar_insumos_producto(producto_id: int, db: AsyncSession = Depends(get_db)):
    """Lista los insumos de un producto interno con detalle."""
    try:
        query = select(ProductoInsumo, Insumo).join(
            Insumo, ProductoInsumo.insumo_id == Insumo.id
        ).where(ProductoInsumo.producto_interno_id == producto_id)
        result = await db.execute(query)
        rows = result.all()

        return {
            "producto_id": producto_id,
            "total": len(rows),
            "insumos": [
                {
                    "id": pi.id,
                    "insumo_id": i.id,
                    "codigo": i.codigo,
                    "nombre": i.nombre,
                    "unidad_medida": i.unidad_medida,
                    "cantidad": pi.cantidad,
                    "precio_costo": i.precio_costo,
                    "precio_venta": i.precio_venta,
                    "costo_total": round(i.precio_costo * pi.cantidad, 2),
                }
                for pi, i in rows
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/producto/{producto_id}")
async def agregar_insumo_producto(producto_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    """Agrega un insumo a un producto interno."""
    try:
        nuevo = ProductoInsumo(
            producto_interno_id=producto_id,
            insumo_id=data["insumo_id"],
            cantidad=data["cantidad"],
        )
        db.add(nuevo)
        await db.commit()
        return {"mensaje": "Insumo agregado al producto", "id": nuevo.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/producto/{producto_id}/{relacion_id}")
async def eliminar_insumo_producto(producto_id: int, relacion_id: int, db: AsyncSession = Depends(get_db)):
    """Elimina un insumo de un producto interno."""
    try:
        result = await db.execute(
            select(ProductoInsumo).where(
                ProductoInsumo.id == relacion_id,
                ProductoInsumo.producto_interno_id == producto_id,
            )
        )
        pi = result.scalar_one_or_none()
        if not pi:
            raise HTTPException(status_code=404, detail="Relación no encontrada")
        await db.delete(pi)
        await db.commit()
        return {"mensaje": "Insumo eliminado del producto"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
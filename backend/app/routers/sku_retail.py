from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.sku_retail import SkuRetail
from app.models.producto_interno import ProductoInterno

router = APIRouter(prefix="/api/v1/sku-retail", tags=["SKU Retail"])


@router.get("/{producto_interno_id}")
async def obtener_sku_retail(producto_interno_id: int, db: AsyncSession = Depends(get_db)):
    """Obtiene los SKUs retail de un producto interno."""
    try:
        result = await db.execute(
            select(SkuRetail).where(SkuRetail.producto_interno_id == producto_interno_id)
        )
        sr = result.scalar_one_or_none()
        if not sr:
            return {
                "producto_interno_id": producto_interno_id,
                "sku_walmart": None, "sku_paris": None,
                "sku_falabella": None, "sku_ripley": None,
                "sku_hites": None, "otros_retail": [],
            }
        return {
            "id": sr.id,
            "producto_interno_id": sr.producto_interno_id,
            "sku_walmart": sr.sku_walmart,
            "sku_paris": sr.sku_paris,
            "sku_falabella": sr.sku_falabella,
            "sku_ripley": sr.sku_ripley,
            "sku_hites": sr.sku_hites,
            "otros_retail": sr.otros_retail or [],
            "fecha_actualizacion": sr.fecha_actualizacion.isoformat() if sr.fecha_actualizacion else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/{producto_interno_id}")
async def guardar_sku_retail(producto_interno_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    """Crea o actualiza los SKUs retail de un producto interno."""
    try:
        result = await db.execute(
            select(SkuRetail).where(SkuRetail.producto_interno_id == producto_interno_id)
        )
        sr = result.scalar_one_or_none()

        if sr:
            # Actualizar
            for campo in ["sku_walmart", "sku_paris", "sku_falabella", "sku_ripley", "sku_hites", "otros_retail"]:
                if campo in data:
                    setattr(sr, campo, data[campo] or None)
        else:
            # Crear
            sr = SkuRetail(
                producto_interno_id=producto_interno_id,
                sku_walmart=data.get("sku_walmart") or None,
                sku_paris=data.get("sku_paris") or None,
                sku_falabella=data.get("sku_falabella") or None,
                sku_ripley=data.get("sku_ripley") or None,
                sku_hites=data.get("sku_hites") or None,
                otros_retail=data.get("otros_retail") or [],
            )
            db.add(sr)

        await db.commit()
        return {"mensaje": "SKUs retail guardados", "producto_interno_id": producto_interno_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("")
async def listar_todos_sku_retail(db: AsyncSession = Depends(get_db)):
    """Lista todos los mapeos SKU retail con info del producto interno."""
    try:
        result = await db.execute(
            select(SkuRetail, ProductoInterno).join(
                ProductoInterno, SkuRetail.producto_interno_id == ProductoInterno.id
            )
        )
        rows = result.all()
        return {
            "total": len(rows),
            "skus": [
                {
                    "id": sr.id,
                    "producto_interno_id": sr.producto_interno_id,
                    "sku": p.sku,
                    "descripcion": p.descripcion,
                    "sku_walmart": sr.sku_walmart,
                    "sku_paris": sr.sku_paris,
                    "sku_falabella": sr.sku_falabella,
                    "sku_ripley": sr.sku_ripley,
                    "sku_hites": sr.sku_hites,
                    "otros_retail": sr.otros_retail or [],
                }
                for sr, p in rows
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
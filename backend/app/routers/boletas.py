"""
Router Boletas
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.boleta import Boleta
from app.models.orden import Orden
from app.services.nubox import emitir_boleta, obtener_pdf_boleta

router = APIRouter(prefix="/api/v1/boletas", tags=["Boletas"])


@router.get("")
async def listar_boletas(
    marketplace: str = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = select(Boleta).order_by(Boleta.fecha_emision.desc())
        if marketplace:
            query = query.where(Boleta.marketplace == marketplace)
        result = await db.execute(query)
        boletas = result.scalars().all()
        return {
            "total": len(boletas),
            "boletas": [
                {
                    "id": b.id,
                    "orden_id": b.orden_id,
                    "marketplace": b.marketplace,
                    "orden_id_marketplace": b.orden_id_marketplace,
                    "folio": b.folio,
                    "rut_cliente": b.rut_cliente,
                    "nombre_cliente": b.nombre_cliente,
                    "total": b.total,
                    "monto_neto": b.monto_neto,
                    "iva": b.iva,
                    "url_boleta": b.url_boleta,
                    "estado": b.estado,
                    "enviada_marketplace": b.enviada_marketplace,
                    "fecha_emision": b.fecha_emision.isoformat() if b.fecha_emision else None,
                }
                for b in boletas
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/emitir/{orden_id}")
async def emitir_boleta_orden(orden_id: int, db: AsyncSession = Depends(get_db)):
    """Emite una boleta para una orden específica."""
    try:
        # Obtener la orden
        orden = await db.get(Orden, orden_id)
        if not orden:
            raise HTTPException(status_code=404, detail="Orden no encontrada")

        # Verificar que no tenga boleta ya
        result = await db.execute(
            select(Boleta).where(Boleta.orden_id == orden_id)
        )
        existente = result.scalar_one_or_none()
        if existente:
            raise HTTPException(status_code=400, detail=f"Esta orden ya tiene boleta folio {existente.folio}")

        # Armar productos desde los items de la orden
        items = orden.items or []
        productos = []
        for item in items:
            nombre = item.get("nombre") or item.get("name") or item.get("Name") or "Producto"
            cantidad = item.get("cantidad") or item.get("Quantity") or 1
            precio = item.get("precio") or item.get("ItemPrice") or item.get("basePrice") or orden.total or 0
            productos.append({
                "nombre": nombre,
                "cantidad": int(cantidad),
                "valor": int(float(precio)),
            })

        if not productos:
            productos = [{"nombre": "Venta marketplace", "cantidad": 1, "valor": int(orden.total or 0)}]

        # Emitir en Nubox
        resultado = await emitir_boleta(
            rut_cliente="66666666-6",
            nombre_cliente=orden.cliente_nombre or "Cliente Generico",
            giro_cliente="Sin Giro",
            comuna_cliente="Santiago",
            direccion_cliente="Sin Direccion",
            productos=productos,
        )

        # Guardar boleta
        boleta = Boleta(
            orden_id=orden_id,
            marketplace=str(orden.marketplace.value) if orden.marketplace else None,
            orden_id_marketplace=orden.orden_id_marketplace,
            folio=resultado["folio"],
            rut_cliente="66666666-6",
            nombre_cliente=orden.cliente_nombre,
            total=resultado["total"],
            monto_neto=resultado["monto_neto"],
            iva=resultado["iva"],
            url_boleta=resultado["url_boleta"],
            estado="emitida",
            enviada_marketplace=0,
        )
        db.add(boleta)
        await db.commit()
        await db.refresh(boleta)

        return {
            "mensaje": "Boleta emitida exitosamente",
            "folio": resultado["folio"],
            "total": resultado["total"],
            "url_boleta": resultado["url_boleta"],
            "boleta_id": boleta.id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/{boleta_id}/pdf")
async def descargar_pdf(boleta_id: int, db: AsyncSession = Depends(get_db)):
    """Descarga el PDF de una boleta."""
    try:
        boleta = await db.get(Boleta, boleta_id)
        if not boleta:
            raise HTTPException(status_code=404, detail="Boleta no encontrada")
        pdf = await obtener_pdf_boleta(boleta.folio)
        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=boleta_{boleta.folio}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
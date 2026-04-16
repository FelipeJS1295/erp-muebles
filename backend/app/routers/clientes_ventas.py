"""
Router de Clientes Ventas
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.db.base import get_db
from app.models.cliente_venta import ClienteVenta

router = APIRouter(prefix="/api/v1/clientes-ventas", tags=["Clientes Ventas"])


@router.get("")
async def listar_clientes(busqueda: str = None, db: AsyncSession = Depends(get_db)):
    try:
        query = select(ClienteVenta).where(ClienteVenta.activo == 1).order_by(ClienteVenta.nombre)
        if busqueda:
            q = f"%{busqueda}%"
            query = query.where(
                or_(
                    ClienteVenta.nombre.ilike(q),
                    ClienteVenta.rut.ilike(q),
                    ClienteVenta.email.ilike(q),
                )
            )
        result = await db.execute(query)
        clientes = result.scalars().all()
        return {
            "total": len(clientes),
            "clientes": [
                {
                    "id": c.id,
                    "rut": c.rut,
                    "nombre": c.nombre,
                    "email": c.email,
                    "telefono": c.telefono,
                    "fecha_creacion": c.fecha_creacion.isoformat() if c.fecha_creacion else None,
                }
                for c in clientes
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_cliente(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        cliente = ClienteVenta(
            rut=data.get("rut"),
            nombre=data["nombre"],
            email=data.get("email"),
            telefono=data.get("telefono"),
            activo=1,
        )
        db.add(cliente)
        await db.commit()
        await db.refresh(cliente)
        return {"mensaje": "Cliente creado", "id": cliente.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{id}")
async def actualizar_cliente(id: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(ClienteVenta).where(ClienteVenta.id == id))
        c = result.scalar_one_or_none()
        if not c:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        for campo in ["rut", "nombre", "email", "telefono"]:
            if campo in data:
                setattr(c, campo, data[campo])
        await db.commit()
        return {"mensaje": "Cliente actualizado", "id": c.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{id}")
async def eliminar_cliente(id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(ClienteVenta).where(ClienteVenta.id == id))
        c = result.scalar_one_or_none()
        if not c:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        c.activo = 0
        await db.commit()
        return {"mensaje": "Cliente eliminado", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
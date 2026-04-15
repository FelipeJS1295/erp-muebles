"""
Router de Órdenes de Trabajo
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.orden_trabajo import OrdenTrabajo
from app.models.trabajador import Trabajador
from app.models.producto_interno import ProductoInterno

router = APIRouter(prefix="/api/v1/ordenes-trabajo", tags=["Órdenes de Trabajo"])

CARGOS_PERMITIDOS = ['costura', 'tapiceria', 'esqueleteria']


def parse_fecha(fecha_str: str):
    return datetime.strptime(str(fecha_str), '%Y-%m-%d').date()


@router.get("")
async def listar_ordenes_trabajo(
    trabajador_id: int = None,
    fecha_desde: str = None,
    fecha_hasta: str = None,
    estado: str = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = select(OrdenTrabajo).order_by(OrdenTrabajo.fecha.desc(), OrdenTrabajo.numero_ot)
        if trabajador_id:
            query = query.where(OrdenTrabajo.trabajador_id == trabajador_id)
        if estado:
            query = query.where(OrdenTrabajo.estado == estado)
        if fecha_desde:
            query = query.where(OrdenTrabajo.fecha >= parse_fecha(fecha_desde))
        if fecha_hasta:
            query = query.where(OrdenTrabajo.fecha <= parse_fecha(fecha_hasta))

        result = await db.execute(query)
        ots = result.scalars().all()

        response = []
        for ot in ots:
            trabajador = await db.get(Trabajador, ot.trabajador_id)
            producto = await db.get(ProductoInterno, ot.producto_interno_id)
            response.append({
                "id": ot.id,
                "numero_ot": ot.numero_ot,
                "tipo": ot.tipo,
                "fecha": str(ot.fecha),
                "trabajador_id": ot.trabajador_id,
                "trabajador_nombre": trabajador.nombre_completo if trabajador else None,
                "trabajador_cargo": trabajador.cargo if trabajador else None,
                "producto_interno_id": ot.producto_interno_id,
                "producto_sku": producto.sku if producto else None,
                "producto_descripcion": producto.descripcion if producto else None,
                "descripcion": ot.descripcion,
                "cargo_trabajador": ot.cargo_trabajador,
                "precio_aplicado": ot.precio_aplicado,
                "estado": ot.estado,
                "fecha_creacion": ot.fecha_creacion.isoformat() if ot.fecha_creacion else None,
            })

        return {"total": len(response), "ordenes": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("")
async def crear_ordenes_trabajo(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        ordenes = data.get("ordenes", [])
        if not ordenes:
            raise HTTPException(status_code=400, detail="Se requiere al menos una OT")

        creadas = []

        for ot_data in ordenes:
            trabajador = await db.get(Trabajador, ot_data["trabajador_id"])
            if not trabajador:
                raise HTTPException(status_code=404, detail=f"Trabajador {ot_data['trabajador_id']} no encontrado")
            if trabajador.cargo not in CARGOS_PERMITIDOS:
                raise HTTPException(status_code=400, detail=f"El trabajador {trabajador.nombre_completo} no tiene cargo permitido")

            producto = await db.get(ProductoInterno, ot_data["producto_interno_id"])
            if not producto:
                raise HTTPException(status_code=404, detail=f"Producto {ot_data['producto_interno_id']} no encontrado")

            numero_ot = ot_data["numero_ot"]
            fecha = parse_fecha(ot_data["fecha"])
            cargo = trabajador.cargo

            # Validar duplicados
            result_existentes = await db.execute(
                select(OrdenTrabajo).where(OrdenTrabajo.numero_ot == numero_ot)
            )
            existentes = result_existentes.scalars().all()

            for existente in existentes:
                if existente.cargo_trabajador == cargo:
                    if cargo == 'esqueleteria':
                        if existente.fecha != fecha:
                            raise HTTPException(
                                status_code=400,
                                detail=f"OT {numero_ot} ya existe en esqueletería para una fecha diferente ({existente.fecha}). Solo se permite el mismo día."
                            )
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=f"OT {numero_ot} ya existe con cargo '{cargo}'. El mismo número de OT no puede repetirse en el mismo cargo."
                        )

            # Determinar precio y descripción
            if cargo == 'costura':
                precio = producto.precio_costura
                descripcion = ot_data.get("descripcion") or producto.descripcion
            elif cargo == 'tapiceria':
                precio = producto.precio_tapiceria
                descripcion = ot_data.get("descripcion") or producto.descripcion
            elif cargo == 'esqueleteria':
                precio = producto.precio_esqueleteria
                descripcion = ot_data.get("descripcion") or producto.descripcion_esqueleto or producto.descripcion
            else:
                precio = 0
                descripcion = ot_data.get("descripcion")

            ot = OrdenTrabajo(
                numero_ot=numero_ot,
                tipo=ot_data.get("tipo", "produccion"),
                fecha=fecha,
                trabajador_id=trabajador.id,
                producto_interno_id=producto.id,
                descripcion=descripcion,
                cargo_trabajador=cargo,
                precio_aplicado=precio,
                estado='pendiente',
            )
            db.add(ot)
            creadas.append(numero_ot)

        await db.commit()
        return {"mensaje": f"{len(creadas)} OT(s) creadas", "numeros_ot": creadas}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{id}/estado")
async def actualizar_estado_ot(id: int, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(OrdenTrabajo).where(OrdenTrabajo.id == id))
        ot = result.scalar_one_or_none()
        if not ot:
            raise HTTPException(status_code=404, detail="OT no encontrada")
        ot.estado = data.get("estado", ot.estado)
        await db.commit()
        return {"mensaje": "Estado actualizado", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/{id}")
async def eliminar_ot(id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(OrdenTrabajo).where(OrdenTrabajo.id == id))
        ot = result.scalar_one_or_none()
        if not ot:
            raise HTTPException(status_code=404, detail="OT no encontrada")
        await db.delete(ot)
        await db.commit()
        return {"mensaje": "OT eliminada", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/trabajadores-produccion")
async def listar_trabajadores_produccion(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(Trabajador).where(
                Trabajador.cargo.in_(CARGOS_PERMITIDOS),
                Trabajador.activo == 1
            ).order_by(Trabajador.nombre_completo)
        )
        trabajadores = result.scalars().all()
        return {
            "total": len(trabajadores),
            "trabajadores": [
                {
                    "id": t.id,
                    "rut": t.rut,
                    "nombre_completo": t.nombre_completo,
                    "cargo": t.cargo,
                }
                for t in trabajadores
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/productos-produccion")
async def listar_productos_produccion(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(ProductoInterno)
            .where(ProductoInterno.activo == 1)
            .order_by(ProductoInterno.sku_padre, ProductoInterno.sku)
        )
        productos = result.scalars().all()

        vistos = set()
        agrupados = []
        for p in productos:
            if p.sku_padre not in vistos:
                vistos.add(p.sku_padre)
                agrupados.append({
                    "id": p.id,
                    "sku_padre": p.sku_padre,
                    "sku": p.sku,
                    "descripcion": p.descripcion,
                    "descripcion_esqueleto": p.descripcion_esqueleto,
                    "tipo_producto": p.tipo_producto,
                    "precio_costura": p.precio_costura,
                    "precio_tapiceria": p.precio_tapiceria,
                    "precio_esqueleteria": p.precio_esqueleteria,
                })

        return {"total": len(agrupados), "productos": agrupados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/reparaciones")
async def crear_reparaciones(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        trabajador_id = data.get("trabajador_id")
        ordenes = data.get("ordenes", [])
        if not ordenes:
            raise HTTPException(status_code=400, detail="Se requiere al menos una reparación")

        trabajador = await db.get(Trabajador, trabajador_id)
        if not trabajador:
            raise HTTPException(status_code=404, detail="Trabajador no encontrado")

        creadas = []
        for ot_data in ordenes:
            numero_ot = ot_data["numero_ot"]
            fecha = parse_fecha(ot_data["fecha"])

            ot = OrdenTrabajo(
                numero_ot=numero_ot,
                fecha=fecha,
                trabajador_id=trabajador.id,
                producto_interno_id=1,
                descripcion=ot_data.get("descripcion", "Reparación"),
                cargo_trabajador=trabajador.cargo,
                precio_aplicado=float(ot_data["precio"]),
                estado='pendiente',
                tipo='reparacion',
            )
            db.add(ot)
            creadas.append(numero_ot)

        await db.commit()
        return {"mensaje": f"{len(creadas)} reparación(es) creadas", "numeros_ot": creadas}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
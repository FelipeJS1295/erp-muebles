import base64
import time
import uuid
import asyncio
import httpx
from datetime import datetime, timedelta, timezone
from typing import Optional


WALMART_BASE_URL = "https://marketplace.walmartapis.com/v3"


class WalmartChileService:

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = WALMART_BASE_URL
        self._token: Optional[str] = None
        self._token_expires_at: float = 0

    # -------------------------------------------------------------------------
    # Autenticación
    # -------------------------------------------------------------------------

    def get_basic_auth(self) -> str:
        auth_str = f"{self.client_id}:{self.client_secret}"
        return base64.b64encode(auth_str.encode()).decode()

    async def obtener_token(self) -> str:
        if self._token and time.time() < self._token_expires_at - 60:
            return self._token

        headers = {
            "Authorization": f"Basic {self.get_basic_auth()}",
            "WM_SVC.NAME": "Walmart Marketplace",
            "WM_QOS.CORRELATION_ID": str(uuid.uuid4()),
            "WM_MARKET": "cl",
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/token",
                headers=headers,
                data={"grant_type": "client_credentials"},
                timeout=30,
            )
            response.raise_for_status()
            resultado = response.json()

        self._token = resultado["access_token"]
        self._token_expires_at = time.time() + resultado.get("expires_in", 900)
        return self._token

    # -------------------------------------------------------------------------
    # Headers para requests autenticados
    # -------------------------------------------------------------------------

    async def _headers(self) -> dict:
        token = await self.obtener_token()
        return {
            "WM_SEC.ACCESS_TOKEN": token,
            "Authorization": f"Basic {self.get_basic_auth()}",
            "WM_SVC.NAME": "Walmart Marketplace",
            "WM_QOS.CORRELATION_ID": str(uuid.uuid4()),
            "WM_MARKET": "cl",
            "Accept": "application/json",
        }

    # -------------------------------------------------------------------------
    # Órdenes
    # -------------------------------------------------------------------------

    async def obtener_ordenes(
        self,
        estado: str = None,
        dias: int = 365,
    ) -> dict:
        headers = await self._headers()
        desde = "2026-01-01T00:00:00Z"
        tz_chile = timezone(timedelta(hours=-4))
        ordenes = []
        estados = [estado] if estado else ["Created", "Acknowledged", "Shipped", "Cancelled"]

        async with httpx.AsyncClient() as client:
            for est in estados:
                try:
                    next_cursor = None
                    pagina = 0
                    while True:
                        pagina += 1
                        params = {
                            "status": est,
                            "limit": 200,
                            "createdStartDate": desde,
                        }
                        if next_cursor:
                            params["nextCursor"] = next_cursor

                        response = await client.get(
                            f"{self.base_url}/orders",
                            headers=await self._headers(),
                            params=params,
                            timeout=30,
                        )
                        response.raise_for_status()
                        data = response.json()

                        meta = data.get("list", {}).get("meta", {})
                        next_cursor = meta.get("nextCursor")
                        total_count = meta.get("totalCount", 0)
                        print(f"📦 Walmart {est} página {pagina}: totalCount={total_count} nextCursor={bool(next_cursor)}")

                        ordenes_raw = (
                            data.get("list", {})
                                .get("elements", {})
                                .get("order", [])
                        )
                        if isinstance(ordenes_raw, dict):
                            ordenes_raw = [ordenes_raw]

                        for o in ordenes_raw:
                            lineas = o.get("orderLines", {}).get("orderLine", [])
                            if isinstance(lineas, dict):
                                lineas = [lineas]

                            shipping = o.get("shippingInfo", {})

                            estimated_ship_ts = shipping.get("estimatedShipDate")
                            estimated_ship_date = None
                            if estimated_ship_ts:
                                estimated_ship_date = datetime.fromtimestamp(
                                    estimated_ship_ts / 1000, tz=tz_chile
                                ).strftime('%Y-%m-%d')

                            estimated_delivery_ts = shipping.get("estimatedDeliveryDate")
                            estimated_delivery_date = None
                            if estimated_delivery_ts:
                                estimated_delivery_date = datetime.fromtimestamp(
                                    estimated_delivery_ts / 1000, tz=tz_chile
                                ).strftime('%Y-%m-%d')

                            ordenes.append({
                                "orden_id": o.get("customerOrderId"),
                                "purchase_order_id": o.get("purchaseOrderId"),
                                "fecha": datetime.fromtimestamp(
                                    o.get("orderDate", 0) / 1000
                                ).strftime('%d/%m/%Y %H:%M'),
                                "cliente": shipping.get("postalAddress", {}).get("name", "N/A"),
                                "estado": lineas[0].get("orderLineStatuses", {})
                                                .get("orderLineStatus", [{}])[0]
                                                .get("status", "N/A") if lineas else "N/A",
                                "total_items": len(lineas),
                                "fecha_despacho": estimated_ship_date,
                                "fecha_entrega_cliente": estimated_delivery_date,
                                "ciudad": shipping.get("postalAddress", {}).get("city"),
                                "region": shipping.get("postalAddress", {}).get("state"),
                                "total": o.get("orderSummary", {}).get("totalAmount", {}).get("amount"),
                                "productos": [
                                    {
                                        "sku": l.get("item", {}).get("sku"),
                                        "nombre": l.get("item", {}).get("productName"),
                                        "cantidad": l.get("orderLineQuantity", {}).get("amount"),
                                        "precio": l.get("charges", {})
                                                .get("charge", [{}])[0]
                                                .get("chargeAmount", {})
                                                .get("amount") if l.get("charges", {}).get("charge") else None,
                                    }
                                    for l in lineas
                                ],
                            })

                        if not next_cursor:
                            break

                except Exception as e:
                    print(f"⚠️ Error trayendo estado {est}: {str(e)}")
                    continue

        return {
            "marketplace": "walmart_chile",
            "desde": desde,
            "total": len(ordenes),
            "ordenes": ordenes,
        }

    async def obtener_orden(self, purchase_order_id: str) -> dict:
        """Obtiene el detalle de una orden específica."""
        headers = await self._headers()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/orders/{purchase_order_id}",
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    # -------------------------------------------------------------------------
    # Inventario
    # -------------------------------------------------------------------------

    async def obtener_inventario(self, sku: str) -> dict:
        """Obtiene el stock actual de un SKU en Walmart Chile."""
        headers = await self._headers()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/inventory",
                headers=headers,
                params={"sku": sku},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

        return {
            "marketplace": "walmart_chile",
            "sku": sku,
            "cantidad": data.get("quantity", {}).get("amount", 0),
            "unidad": data.get("quantity", {}).get("unit", "EACH"),
            "raw": data,
        }

    async def actualizar_inventario(self, sku: str, cantidad: int) -> dict:
        """Actualiza el stock de un SKU en Walmart Chile."""
        headers = await self._headers()
        headers["Content-Type"] = "application/json"

        payload = {
            "sku": sku,
            "quantity": {
                "unit": "EACH",
                "amount": cantidad,
            },
        }

        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{self.base_url}/inventory",
                headers=headers,
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            return {
                "marketplace": "walmart_chile",
                "sku": sku,
                "cantidad_actualizada": cantidad,
                "resultado": response.json(),
            }

    # -------------------------------------------------------------------------
    # Productos
    # -------------------------------------------------------------------------

    async def obtener_productos(self, limit: int = 20) -> dict:
        """
        Obtiene catálogo de productos.
        Precio e inventario se obtienen en paralelo para mayor velocidad.
        """
        headers = await self._headers()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/items",
                headers=headers,
                params={"limit": limit},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

        items_raw = data.get("ItemResponse", [])

        async def obtener_detalle(item: dict) -> dict:
            sku = item.get("sku")
            h = await self._headers()
            cantidad = None
            precio = None

            async with httpx.AsyncClient() as client:
                try:
                    inv_res = await client.get(
                        f"{self.base_url}/inventory",
                        headers=h,
                        params={"sku": sku},
                        timeout=15,
                    )
                    inv_data = inv_res.json()
                    cantidad = inv_data.get("quantity", {}).get("amount", 0)
                except Exception:
                    pass

                try:
                    item_res = await client.get(
                        f"{self.base_url}/items/{sku}",
                        headers=h,
                        timeout=15,
                    )
                    item_data = item_res.json()
                    item_detalle = item_data.get("ItemResponse", [{}])[0]
                    precio = (
                        item_detalle.get("price", {}).get("amount") or
                        item_detalle.get("price", {}).get("currentPrice", {}).get("amount") or
                        None
                    )
                except Exception:
                    pass

            return {
                "sku": sku,
                "nombre": item.get("productName"),
                "estado": item.get("publishedStatus"),
                "precio": precio,
                "stock": cantidad,
                "alerta_stock": cantidad is not None and cantidad < 5,
            }

        productos = await asyncio.gather(*[obtener_detalle(item) for item in items_raw])

        return {
            "marketplace": "walmart_chile",
            "total": len(productos),
            "productos": list(productos),
        }

    async def obtener_etiqueta(self, purchase_order_id: str) -> dict:
        """
        Obtiene la etiqueta de despacho de una orden de Walmart.
        Primero obtiene el shipmentNo desde la orden, luego descarga el PDF.
        """
        headers = await self._headers()

        # 1. Obtener el shipmentNo desde la orden
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/orders/{purchase_order_id}",
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

        order = data.get("order", {})
        lineas = order.get("orderLines", {}).get("orderLine", [])
        if isinstance(lineas, dict):
            lineas = [lineas]

        if not lineas:
            raise Exception("No se encontraron líneas en la orden")

        tracking_info = (
            lineas[0]
            .get("orderLineStatuses", {})
            .get("orderLineStatus", [{}])[0]
            .get("trackingInfo", {})
        )
        shipment_no = tracking_info.get("shipmentNo")

        if not shipment_no:
            raise Exception("Esta orden aún no tiene número de seguimiento asignado")

        # 2. Obtener la etiqueta PDF usando el shipmentNo
        async with httpx.AsyncClient() as client:
            label_response = await client.get(
                f"{self.base_url}/orders/label/{shipment_no}",
                headers=await self._headers(),
                timeout=30,
            )
            label_response.raise_for_status()

            # Walmart devuelve base64 o URL
            label_data = label_response.json()
            print(f"🏷️ Label response: {str(label_data)[:200]}")

        return {
            "purchase_order_id": purchase_order_id,
            "shipment_no": shipment_no,
            "label": label_data,
        }
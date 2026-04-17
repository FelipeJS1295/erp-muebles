"""
Servicio de integración con Paris Marketplace (Cencosud)
=========================================================
Autenticación: Bearer API Key → Access Token (dura 4 horas)
Base URL: https://api-developers.ecomm.cencosud.com
"""

import time
import httpx
from typing import Optional


class ParisMarketplaceService:

    def __init__(self, api_key: str, seller_id: str, base_url: str):
        self.api_key = api_key
        self.seller_id = seller_id
        self.base_url = base_url
        self._token: Optional[str] = None
        self._token_expires_at: float = 0

    async def obtener_token(self) -> str:
        if self._token and time.time() < self._token_expires_at - 300:
            return self._token
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v1/auth/apiKey",
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            resultado = response.json()
        self._token = (
            resultado.get("accessToken") or
            resultado.get("access_token") or
            resultado.get("token") or
            resultado.get("jwt")
        )
        self._token_expires_at = time.time() + 14400
        return self._token

    async def _headers(self) -> dict:
        token = await self.obtener_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    async def obtener_orden_padre(self, order_id: str) -> dict:
        """Obtiene datos completos de la orden padre (cliente, billing, etc)."""
        headers = await self._headers()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/v1/orders/{order_id}",
                    headers=headers,
                    timeout=30,
                )
                if response.status_code == 200:
                    return response.json()
                print(f"⚠️ Paris orden padre {order_id}: {response.status_code}")
        except Exception as e:
            print(f"⚠️ Error orden padre {order_id}: {e}")
        return {}

    async def obtener_ordenes(self, limit: int = 50, offset: int = 0) -> dict:
        """Obtiene sub-órdenes del seller en Paris Marketplace."""
        headers = await self._headers()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/sub-orders",
                headers=headers,
                params={
                    "sellerId": self.seller_id,
                    "limit": limit,
                    "offset": offset,
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

        ordenes_raw = data.get("data", data.get("orders", []))
        if isinstance(ordenes_raw, dict):
            ordenes_raw = [ordenes_raw]

    ordenes = []
    for o in ordenes_raw:
        orden_info = o.get("order", {})
        order_id = orden_info.get("originOrderNumber")

        # Obtener datos completos de la orden padre
        orden_padre = {}
        if order_id:
            orden_padre = await self.obtener_orden_padre(str(order_id))

        customer = orden_padre.get("customer", orden_info.get("customer", {}))
        billing = orden_padre.get("billingAddress", {})
        shipping_raw = {}
        business = orden_padre.get("businessInvoice") or {}
        tipo_doc = orden_padre.get("originInvoiceType") or orden_info.get("originInvoiceType", "boleta")

        # Costo despacho viene en subOrders[0].cost de la orden padre
        sub_orders = orden_padre.get("subOrders", [])
        costo_despacho = 0.0
        if sub_orders:
            try:
                costo_despacho = float(sub_orders[0].get("cost") or 0)
            except:
                costo_despacho = 0.0
        
        # Shipping desde subOrders
        if sub_orders:
            shipping_raw = sub_orders[0].get("shippingAddress", {})

        ordenes.append({
            "sub_orden_id": o.get("subOrderNumber") or o.get("id"),
            "orden_padre_id": order_id,
            "estado": o.get("status") or o.get("state"),
            "fecha_creacion": o.get("createdAt"),
            "fecha_actualizacion": o.get("updatedAt"),
            "carrier": o.get("carrier"),
            "label_url": o.get("labelUrl"),
            "fecha_despacho": o.get("dispatchDate"),
            "fecha_llegada": o.get("arrivalDate"),
            "cliente": customer.get("name"),
            "items": o.get("items", []),
            "customer": {
                "nombre": customer.get("name"),
                "email": customer.get("email"),
                "rut": customer.get("documentNumber"),
                "tipo_documento": customer.get("documentType"),
            },
            "billing": {
                "nombre": f"{billing.get('firstName', '')} {billing.get('lastName', '')}".strip(),
                "direccion": f"{billing.get('address1', '')} {billing.get('address2', '')}".strip(),
                "ciudad": billing.get("city"),
                "comuna": billing.get("communaCode"),
                "telefono": billing.get("phone"),
            },
            "shipping": {
                "nombre": f"{shipping_raw.get('firstName', '')} {shipping_raw.get('lastName', '')}".strip(),
                "direccion": f"{shipping_raw.get('address1', '')} {shipping_raw.get('address2', '')}".strip(),
                "ciudad": shipping_raw.get("city"),
                "comuna": shipping_raw.get("communaCode"),
                "telefono": shipping_raw.get("phone"),
            },
            "costo_despacho": costo_despacho,
            "tipo_documento": tipo_doc,
            "business_invoice": business,
            "raw": o,
        })

        return {
            "marketplace": "paris_chile",
            "total": data.get("total", len(ordenes)),
            "limit": limit,
            "offset": offset,
            "ordenes": ordenes,
        }

    async def obtener_orden(self, sub_order_number: str) -> dict:
        """Obtiene el detalle de una sub-orden específica."""
        headers = await self._headers()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/sub-orders/{sub_order_number}",
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    async def obtener_stock(self, sku: str = None, limit: int = 25, offset: int = 0) -> dict:
        headers = await self._headers()
        params = {"limit": limit, "offset": offset}
        if sku:
            params["sku"] = sku
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/stock",
                headers=headers,
                params=params,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
        skus = data.get("skus", [])
        return {
            "marketplace": "paris_chile",
            "total": data.get("pagging", {}).get("quantity", len(skus)),
            "skus": [
                {
                    "sku": s.get("sku") or s.get("skuSeller"),
                    "sku_seller": s.get("skuSeller"),
                    "stock": s.get("stock") or s.get("quantity", 0),
                    "nombre": s.get("name") or s.get("productName"),
                }
                for s in skus
            ],
        }

    async def actualizar_stock(self, sku: str, cantidad: int) -> dict:
        headers = await self._headers()
        payload = {"skus": [{"skuSeller": sku, "stock": cantidad}]}
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v2/stock",
                headers=headers,
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            return {
                "marketplace": "paris_chile",
                "sku": sku,
                "cantidad_actualizada": cantidad,
                "resultado": response.json(),
            }

    async def obtener_productos(self, limit: int = 50, offset: int = 0) -> dict:
        headers = await self._headers()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/products/search",
                headers=headers,
                params={"limit": limit, "offset": offset},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
        productos_raw = data.get("results", [])
        print(f"🛍️ Paris primer producto raw: {str(productos_raw[0])[:500]}" if productos_raw else "Sin productos")
        productos = []
        for p in productos_raw:
            variantes_raw = p.get("variants", p.get("variantsList", []))
            variantes = []
            skus_seller = []
            for v in variantes_raw:
                sku_paris = v.get("sku")
                sku_seller = v.get("sellerSku") or v.get("seller_sku") or v.get("refId")
                if sku_paris:
                    variantes.append(sku_paris)
                if sku_seller:
                    skus_seller.append(sku_seller)
            if not variantes:
                for v in p.get("publish", {}).get("mkp", []):
                    sku = v.get("variantSku")
                    if sku:
                        variantes.append(sku)
            productos.append({
                "sku_padre": p.get("id"),
                "nombre": p.get("name"),
                "estado": p.get("status"),
                "categoria": p.get("category", {}).get("name"),
                "familia": p.get("family", {}).get("name"),
                "variantes": variantes,
                "skus_seller": skus_seller,
            })
        return {
            "marketplace": "paris_chile",
            "total": data.get("total", len(productos)),
            "productos": productos,
        }

    async def imprimir_etiqueta(self, label_id: str) -> dict:
        headers = await self._headers()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/sub-orders/{label_id}/print-label",
                headers=headers,
                timeout=30,
            )
            print(f"🖨️ Print label {label_id}: {response.status_code}")
            response.raise_for_status()
            return {"label_id": label_id, "status": response.status_code, "resultado": "ok"}

    async def obtener_stock_bulk(self, skus: list) -> dict:
        headers = await self._headers()
        skus_str = ",".join(skus)
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/stock",
                headers=headers,
                params={"limit": len(skus) + 10, "offset": 0, "sku": skus_str},
                timeout=60,
            )
            print(f"📦 Paris bulk stock status: {response.status_code}")
            response.raise_for_status()
            data = response.json()
        resultado = {}
        for s in data.get("skus", []):
            sku = s.get("sku")
            stock = s.get("stock", 0)
            if sku:
                resultado[sku] = stock
        return resultado

    async def enviar_boleta(self, order_number: str, folio: int, pdf_bytes: bytes, emission_date: str) -> dict:
        """Envía la boleta a Paris Marketplace."""
        headers = await self._headers()
        del headers["Content-Type"]  # multipart no debe tener Content-Type manual
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v1/invoice",
                headers=headers,
                data={
                    "seller_id": self.seller_id,
                    "invoice_number": str(folio),
                    "invoice_type": "boleta",
                    "order_number": order_number,
                    "emission_date": emission_date,
                },
                files={"file": (f"boleta_{folio}.pdf", pdf_bytes, "application/pdf")},
                timeout=30,
            )
            print(f"📄 Paris boleta {folio} status: {response.status_code} - {response.text[:200]}")
            return {"status": response.status_code, "resultado": response.json() if response.status_code < 400 else response.text}
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

    # -------------------------------------------------------------------------
    # Autenticación
    # -------------------------------------------------------------------------

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

    # -------------------------------------------------------------------------
    # Headers
    # -------------------------------------------------------------------------

    async def _headers(self) -> dict:
        token = await self.obtener_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    # -------------------------------------------------------------------------
    # Órdenes
    # -------------------------------------------------------------------------

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
            ordenes.append({
                "sub_orden_id": o.get("subOrderNumber") or o.get("id"),
                "orden_padre_id": o.get("orderNumber"),
                "estado": o.get("status") or o.get("state"),
                "fecha_creacion": o.get("createdAt"),
                "fecha_actualizacion": o.get("updatedAt"),
                "carrier": o.get("carrier"),
                "label_url": o.get("labelUrl"),
                "fecha_despacho": o.get("dispatchDate"),
                "fecha_llegada": o.get("arrivalDate"),
                "cliente": o.get("order", {}).get("customer", {}).get("name"),
                "items": o.get("items", []),
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

    # -------------------------------------------------------------------------
    # Stock
    # -------------------------------------------------------------------------

    async def obtener_stock(self, sku: str = None, limit: int = 25, offset: int = 0) -> dict:
        """Obtiene el stock de Paris Marketplace."""
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
        """Actualiza el stock de un SKU en Paris Marketplace."""
        headers = await self._headers()

        payload = {
            "skus": [
                {
                    "skuSeller": sku,
                    "stock": cantidad,
                }
            ]
        }

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

    # -------------------------------------------------------------------------
    # Productos
    # -------------------------------------------------------------------------

    async def obtener_productos(self, limit: int = 50, offset: int = 0) -> dict:
        """Obtiene catálogo de productos en Paris Marketplace."""
        headers = await self._headers()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/products/search",
                headers=headers,
                params={
                    "limit": limit,
                    "offset": offset,
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

        productos_raw = data.get("results", [])
        print(f"🛍️ Paris primer producto raw: {str(productos_raw[0])[:500]}" if productos_raw else "Sin productos")

        productos = []
        for p in productos_raw:
            # Extraer SKU seller desde las variantes del producto
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

            # Si no hay variantes en variants, usar publish
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

    # -------------------------------------------------------------------------
    # Imprimir etiqueta
    # -------------------------------------------------------------------------


    async def imprimir_etiqueta(self, label_id: str) -> dict:
        """
        Registra la impresión de etiqueta en Paris/Envíame.
        Esto es necesario para que el courier actualice el estado.
        """
        headers = await self._headers()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/sub-orders/{label_id}/print-label",
                headers=headers,
                timeout=30,
            )
            print(f"🖨️ Print label {label_id}: {response.status_code}")
            response.raise_for_status()
            return {
                "label_id": label_id,
                "status": response.status_code,
                "resultado": "ok",
            }


    async def obtener_stock_bulk(self, skus: list) -> dict:
        """
        Obtiene el stock de múltiples SKUs en una sola llamada.
        """
        headers = await self._headers()
        skus_str = ",".join(skus)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/stock",
                headers=headers,
                params={
                    "limit": len(skus) + 10,
                    "offset": 0,
                    "sku": skus_str,
                },
                timeout=60,
            )
            print(f"📦 Paris bulk stock status: {response.status_code}")
            print(f"📦 Paris bulk stock response: {response.text[:300]}")
            response.raise_for_status()
            data = response.json()

        resultado = {}
        for s in data.get("skus", []):
            sku = s.get("sku")
            stock = s.get("stock", 0)
            if sku:
                resultado[sku] = stock

        return resultado
"""
Servicio de integración con Falabella Seller Center API
========================================================
Autenticación: HMAC-SHA256 signature
Base URL: https://sellercenter-api.falabella.com
"""

import hashlib
import hmac
import httpx
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode


FALABELLA_BASE_URL = "https://sellercenter-api.falabella.com"


class FalabellaService:

    def __init__(self, user_id: str, api_key: str, base_url: str = FALABELLA_BASE_URL):
        self.user_id = user_id
        self.api_key = api_key
        self.base_url = base_url

    def _get_timestamp(self) -> str:
        return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S+00:00')

    def _sign(self, params: dict) -> str:
        """
        Genera la firma HMAC-SHA256 para autenticar la request.
        Falabella requiere ordenar los parámetros alfabéticamente y firmar.
        """
        sorted_params = sorted(params.items())
        query_string = urlencode(sorted_params)
        signature = hmac.new(
            self.api_key.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature

    def _build_params(self, action: str, extra: dict = {}) -> dict:
        """Construye los parámetros base con timestamp y firma."""
        params = {
            "Action": action,
            "Format": "JSON",
            "Timestamp": self._get_timestamp(),
            "UserID": self.user_id,
            "Version": "1.0",
            **extra,
        }
        params["Signature"] = self._sign(params)
        return params

    # -------------------------------------------------------------------------
    # Órdenes
    # -------------------------------------------------------------------------

    async def obtener_ordenes(self, estado: str = "pending", limite: int = 100) -> dict:
        """Obtiene órdenes desde Falabella Seller Center."""
        params = self._build_params("GetOrders", {
            "Status": estado,
            "Limit": str(limite),
            "Offset": "0",
            "SortBy": "created_at",
            "SortDirection": "DESC",
        })

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.base_url,
                params=params,
                timeout=30,
            )
            print(f"📦 Falabella ordenes status: {response.status_code}")
            print(f"📦 Falabella ordenes response: {response.text[:300]}")
            response.raise_for_status()
            data = response.json()

        ordenes_raw = (
            data.get("SuccessResponse", {})
                .get("Body", {})
                .get("Orders", {})
                .get("Order", [])
        )
        if isinstance(ordenes_raw, dict):
            ordenes_raw = [ordenes_raw]

        ordenes = []
        for o in ordenes_raw:
            ordenes.append({
                "orden_id": str(o.get("OrderId")),
                "fecha": o.get("CreatedAt"),
                "cliente": o.get("CustomerFirstName", "") + " " + o.get("CustomerLastName", ""),
                "estado": o.get("Status"),
                "total": o.get("Price"),
                "direccion": o.get("AddressShipping", {}).get("Address1"),
                "ciudad": o.get("AddressShipping", {}).get("City"),
                "raw": o,
            })

        return {
            "marketplace": "falabella_chile",
            "total": len(ordenes),
            "ordenes": ordenes,
        }

    async def obtener_items_orden(self, orden_id: str) -> dict:
        """Obtiene los items de una orden específica."""
        params = self._build_params("GetOrderItems", {
            "OrderId": orden_id,
        })

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.base_url,
                params=params,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

        items_raw = (
            data.get("SuccessResponse", {})
                .get("Body", {})
                .get("OrderItems", {})
                .get("OrderItem", [])
        )
        if isinstance(items_raw, dict):
            items_raw = [items_raw]

        return {
            "orden_id": orden_id,
            "items": items_raw,
        }

    # -------------------------------------------------------------------------
    # Productos
    # -------------------------------------------------------------------------

    async def obtener_productos(self, limite: int = 100, offset: int = 0) -> dict:
        """Obtiene catálogo de productos en Falabella."""
        params = self._build_params("GetProducts", {
            "Limit": str(limite),
            "Offset": str(offset),
        })

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.base_url,
                params=params,
                timeout=30,
            )
            print(f"🛍️ Falabella productos status: {response.status_code}")
            print(f"🛍️ Falabella productos response: {response.text[:300]}")
            response.raise_for_status()
            data = response.json()

        productos_raw = (
            data.get("SuccessResponse", {})
                .get("Body", {})
                .get("Products", {})
                .get("Product", [])
        )
        if isinstance(productos_raw, dict):
            productos_raw = [productos_raw]

        productos = []
        for p in productos_raw:
            productos.append({
                "sku": p.get("SellerSku"),
                "nombre": p.get("Name"),
                "estado": p.get("Status"),
                "precio": p.get("Price"),
                "stock": p.get("Quantity"),
                "raw": p,
            })

        return {
            "marketplace": "falabella_chile",
            "total": len(productos),
            "productos": productos,
        }
"""
Ripley Chile - Mirakl API
"""
import httpx
from datetime import datetime, timedelta

RIPLEY_BASE_URL = "https://sellercenter.ripleylabs.com"
RIPLEY_API_KEY = "c7dc079b-2021-4ce0-8bf0-3568a7463c9d"

HEADERS = {
    "Authorization": RIPLEY_API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json",
}


async def get_ordenes(dias: int = 30, estados: list = None) -> dict:
    """Obtiene órdenes de Ripley via Mirakl API."""
    if estados is None:
        estados = ["WAITING_ACCEPTANCE", "WAITING_DEBIT", "SHIPPING", "TO_COLLECT"]

    fecha_desde = (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%dT00:00:00Z")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            params = {
                "start_date": fecha_desde,
                "order_states": ",".join(estados),
                "max": 100,
                "offset": 0,
            }
            resp = await client.get(
                f"{RIPLEY_BASE_URL}/api/orders",
                headers=HEADERS,
                params=params,
            )
            print(f"📦 Ripley ordenes status: {resp.status_code}")
            print(f"📦 Ripley ordenes response: {resp.text[:500]}")
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"⚠️ Error Ripley: {e}")
        return {}


async def get_orden_detalle(order_id: str) -> dict:
    """Obtiene detalle de una orden específica."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{RIPLEY_BASE_URL}/api/orders/{order_id}",
                headers=HEADERS,
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"⚠️ Error Ripley detalle: {e}")
        return {}
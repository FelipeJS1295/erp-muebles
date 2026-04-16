"""
Ripley Chile - Mirakl API
"""
import httpx
from datetime import datetime, timedelta

RIPLEY_BASE_URL = "https://ripley-prod.mirakl.net"
RIPLEY_API_KEY = "2a0c3020-93d8-489f-88ee-485903073972"

HEADERS = {
    "Authorization": RIPLEY_API_KEY,
    "Accept": "application/json",
}

# Mapeo de estados Ripley → ERP
ESTADOS_ACTIVOS = [
    "WAITING_ACCEPTANCE",
    "WAITING_DEBIT",
    "SHIPPING",
    "TO_COLLECT",
]


def get_estado_erp(estado: str) -> str:
    mapa = {
        "WAITING_ACCEPTANCE": "Nueva",
        "WAITING_DEBIT":      "Nueva",
        "SHIPPING":           "Nueva",      # No despachado aún
        "TO_COLLECT":         "Nueva",
        "RECEIVED":           "Despachada",
        "SHIPPED":            "Despachada",
        "CLOSED":             "Despachada",
        "REFUSED":            "Cancelada",
        "CANCELED":           "Cancelada",
    }
    return mapa.get(estado, estado)


async def get_ordenes(dias: int = 30, api_key: str = None, base_url: str = None) -> list:
    key = api_key or RIPLEY_API_KEY
    url = base_url or RIPLEY_BASE_URL
    headers = {"Authorization": key, "Accept": "application/json"}
    """Obtiene órdenes activas de Ripley."""
    fecha_desde = (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%dT00:00:00Z")
    todas = []
    offset = 0
    max_per_page = 100

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            while True:
                params = {
                    "start_update_date": fecha_desde,
                    "paginate": "true",
                    "max": max_per_page,
                    "offset": offset,
                }
                resp = await client.get(
                    f"{RIPLEY_BASE_URL}/api/orders",
                    headers=HEADERS,
                    params=params,
                )
                print(f"📦 Ripley ordenes status: {resp.status_code} offset={offset}")
                resp.raise_for_status()
                data = resp.json()
                ordenes = data.get("orders", [])
                todas.extend(ordenes)
                if len(ordenes) < max_per_page:
                    break
                offset += max_per_page

        return todas
    except Exception as e:
        print(f"⚠️ Error Ripley get_ordenes: {e}")
        return []


def parsear_orden(o: dict) -> dict:
    order_lines = o.get("order_lines", [])
    items = []
    total = 0

    for line in order_lines:
        precio = float(line.get("price", 0))
        cantidad = int(line.get("quantity", 1))
        items.append({
            "nombre": line.get("product_title", ""),
            "sku": line.get("offer_sku", ""),
            "sellerSku": line.get("offer_sku", ""),
            "cantidad": cantidad,
            "precio": precio,
            "estado_linea": line.get("status", ""),
        })
        total += precio * cantidad

    customer = o.get("customer", {})
    shipping = customer.get("shipping_address", {})
    nombre_cliente = f"{customer.get('firstname', '')} {customer.get('lastname', '')}".strip()

    # Fecha despacho desde shipping_deadline
    fecha_despacho = None
    shipping_deadline = o.get("shipping_deadline")
    if shipping_deadline:
        fecha_despacho = shipping_deadline[:10]

    # Fecha llegada desde delivery_date
    fecha_llegada = None
    delivery_date = o.get("delivery_date")
    if delivery_date:
        fecha_llegada = delivery_date[:10]

    return {
        "marketplace": "ripley",
        "orden_id": o.get("commercial_id", ""),
        "sub_orden_id": o.get("commercial_id", ""),
        "cliente": nombre_cliente,
        "estado": o.get("order_state", ""),
        "fecha_despacho": fecha_despacho,
        "fecha_llegada": fecha_llegada,
        "total": total,
        "items": items,
        "raw": {
            "ciudad": shipping.get("city", ""),
            "region": shipping.get("state", ""),
            "carrier": o.get("shipping_company", ""),
            "tracking": o.get("shipping_tracking", ""),
            "tracking_url": o.get("shipping_tracking_url", ""),
            "created_date": o.get("created_date", ""),
        }
    }
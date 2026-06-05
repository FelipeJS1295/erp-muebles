import httpx
import base64
from datetime import datetime

NUBOX_AUTH_URL = "https://api.nubox.com/nubox.api/autenticar"
NUBOX_BASE_URL = "https://api.nubox.com/Nubox.API"
NUBOX_USUARIO = "33552MzREPrd"
NUBOX_PASSWORD = "ZGK6LwxO"
NUBOX_RUT_EMPRESA = "76990942-7"
NUBOX_NUMERO_SERIE = "1"
NUBOX_RUT_FUNCIONARIO = "14183600-5"

# Credenciales en base64
NUBOX_BASIC = base64.b64encode(
    f"{NUBOX_USUARIO}:{NUBOX_PASSWORD}".encode()
).decode()


async def obtener_token() -> str:
    """Obtiene token de autenticación de Nubox."""
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            NUBOX_AUTH_URL,
            headers={"Authorization": f"Basic {NUBOX_BASIC}"},
            content=b"{}",
        )
        resp.raise_for_status()
        token = resp.headers.get("token") or resp.headers.get("Token")
        if not token:
            raise Exception("No se obtuvo token de Nubox")
        return token.strip()

def formatear_rut(rut: str) -> str:
    """Formatea RUT al formato xxxxxxxx-x requerido por Nubox."""
    if not rut:
        return "66666666-6"
    rut = rut.strip().upper().replace(".", "")
    # Si ya tiene guión está bien
    if "-" in rut:
        return rut
    # Agregar guión antes del último caracter
    return f"{rut[:-1]}-{rut[-1]}"


async def emitir_boleta(
    rut_cliente: str,
    nombre_cliente: str,
    giro_cliente: str,
    comuna_cliente: str,
    direccion_cliente: str,
    productos: list,
    fecha: str = None,
) -> dict:
    """
    Emite una boleta electrónica en Nubox.
    productos: [{"nombre": str, "cantidad": int, "valor": int}]
    Retorna: {"folio": int, "url_boleta": str, "xml_id": str, "total": int}
    """
    token = await obtener_token()
    fecha = fecha or datetime.now().strftime("%Y-%m-%d")
    fecha_iso = f"{fecha}T00:00:00.000-04:00"

    productos_nubox = []
    for i, p in enumerate(productos, 1):
        productos_nubox.append({
            "fechaEmision": fecha_iso,
            "folio": 1,
            "rutContraparte": formatear_rut(rut_cliente) or "66666666-6",
            "razonSocialContraparte": nombre_cliente or "Cliente Generico",
            "giroContraparte": giro_cliente or "Sin Giro",
            "comunaContraparte": comuna_cliente or "Santiago",
            "direccionContraparte": direccion_cliente or "Sin Direccion",
            "codigoSucursal": "1",
            "secuencia": i,
            "afecto": "SI",
            "producto": p["nombre"][:80],
            "cantidad": p["cantidad"],
            "precio": int(p["valor"]),
            "valor": int(p["valor"]),
            "fechaVencimiento": fecha_iso,
            "codigoSIITipoDeServicio": "3",
            "fechaPeriodoDesde": fecha_iso,
            "fechaPeriodoHasta": fecha_iso,
        })

    async with httpx.AsyncClient(timeout=60) as client:
        url = f"{NUBOX_BASE_URL}/factura/documento/{NUBOX_RUT_EMPRESA}/{NUBOX_NUMERO_SERIE}/{NUBOX_RUT_FUNCIONARIO}/1/39/dte/extendido"
        resp = await client.post(
            url,
            headers={"token": token, "Content-Type": "application/json"},
            json={"productos": productos_nubox, "documentoReferenciado": {}},
        )
        print(f"📄 Nubox status: {resp.status_code}")
        print(f"📄 Nubox response: {resp.text[:2000]}")
        resp.raise_for_status()
        data = resp.json()

        return {
            "folio": data.get("Folio"),
            "url_boleta": data.get("UrlBoleta"),
            "xml_id": data.get("Respuesta", {}).get("Content", {}).get("Headers", [{}]),
            "total": data.get("MontoTotal"),
            "monto_neto": data.get("MontoNeto"),
            "iva": data.get("TotalIVA"),
        }


async def obtener_pdf_boleta(folio: int) -> bytes:
    """Descarga el PDF de una boleta por folio."""
    token = await obtener_token()
    async with httpx.AsyncClient(timeout=60) as client:
        url = f"{NUBOX_BASE_URL}/factura/documento/{NUBOX_RUT_EMPRESA}/{NUBOX_NUMERO_SERIE}/{folio}/BOL-EL/pdf"
        resp = await client.get(url, headers={"token": token})
        resp.raise_for_status()
        return resp.content

async def emitir_factura(
    rut_cliente: str,
    nombre_cliente: str,
    giro_cliente: str,
    comuna_cliente: str,
    direccion_cliente: str,
    productos: list,
    fecha: str = None,
    email_cliente: str = None,
) -> dict:
    """
    Emite una factura electrónica afecta (DTE 33) en Nubox.
    productos: [{"nombre": str, "cantidad": int, "valor": int}]
    """
    token = await obtener_token()
    fecha = fecha or datetime.now().strftime("%Y-%m-%d")

    detalles = []
    for i, p in enumerate(productos, 1):
        precio_neto = round(int(p["valor"]) / 1.19)
        detalles.append({
            "order": i,
            "quantity": p["cantidad"],
            "productDescription": p["nombre"][:80],
            "productDescriptionExtended": p["nombre"][:80],
            "subjectToTax": True,
            "uom": {"code": "UNID"},
            "price": precio_neto,
            "taxes": [],
            "discountsAndSurcharges": [],
        })

    payload = [
        {
            "sequence": 1,
            "type": {"legalCode": "33"},
            "client": {
                "tradeName": nombre_cliente or "Cliente Generico",
                "identification": {
                    "type": 1,
                    "value": formatear_rut(rut_cliente) or "66666666-6",
                },
                "email": email_cliente or "",
                "contactName": nombre_cliente or "Cliente Generico",
                "mainActivity": giro_cliente or "Sin Giro",
                "address": direccion_cliente or "Sin Dirección",
                "city": comuna_cliente or "Santiago",
                "territorialDivisionLegalCode": "13",
                "territorialDivisionL2LegalCode": "13101",
            },
            "dueDate": fecha,
            "saleType": {"id": 1},
            "paymentForm": {"id": 2},
            "comment": "Venta marketplace",
            "details": detalles,
            "references": [],
        }
    ]

    async with httpx.AsyncClient(timeout=60) as client:
        url = "https://api.pyme.nubox.com/nbxpymapi-environment-pyme/v1/sales/issuance"
        resp = await client.post(
            url,
            headers={"token": token, "Content-Type": "application/json"},
            json=payload,
        )
        print(f"🧾 Nubox factura status: {resp.status_code}")
        print(f"🧾 Nubox factura response: {resp.text[:2000]}")
        resp.raise_for_status()
        data = resp.json()

        doc = data[0] if isinstance(data, list) else data
        return {
            "folio": doc.get("documentNumber") or doc.get("folio") or doc.get("Folio"),
            "url_factura": doc.get("pdfUrl") or doc.get("url") or doc.get("UrlBoleta"),
            "total": doc.get("totalAmount") or doc.get("MontoTotal"),
            "monto_neto": doc.get("netAmount") or doc.get("MontoNeto"),
            "iva": doc.get("taxAmount") or doc.get("TotalIVA"),
        }


async def obtener_pdf_factura(folio: int) -> bytes:
    """Descarga el PDF de una factura por folio."""
    token = await obtener_token()
    async with httpx.AsyncClient(timeout=60) as client:
        url = f"{NUBOX_BASE_URL}/factura/documento/{NUBOX_RUT_EMPRESA}/{NUBOX_NUMERO_SERIE}/{folio}/FAC-EL/pdf"
        resp = await client.get(url, headers={"token": token})
        resp.raise_for_status()
        return resp.content
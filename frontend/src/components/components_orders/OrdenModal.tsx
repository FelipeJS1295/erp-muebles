import { api } from '../../api/client'

interface Orden {
  id: number
  marketplace: string
  orden_id: string
  sub_orden_id: string | null
  cliente: string | null
  estado: string
  carrier: string | null
  fecha_despacho: string | null
  fecha_llegada: string | null
  label_url: string | null
  total: number | null
  items: any[]
  raw: any
  fecha_creacion: string | null
  boleta_folio?: number
  boleta_url?: string
  tipo_documento?: string
}

const estadoStyle: Record<string, { bg: string; color: string }> = {
  'Nueva':      { bg: 'var(--info-bg)',    color: 'var(--info)' },
  'Despachada': { bg: 'var(--success-bg)', color: 'var(--success)' },
  'Atrasada':   { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  'Cancelada':  { bg: 'var(--bg-3)',       color: 'var(--text-3)' },
}

function getEstadoUnificado(orden: any): string {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  if (orden.fecha_despacho) {
    const [y, m, d] = orden.fecha_despacho.split('-').map(Number)
    const fecha = new Date(y, m - 1, d)
    const activos = ['Created', 'Acknowledged', 'ready_to_ship', 'awaiting_fulfillment', 'pending', 'WAITING_ACCEPTANCE', 'WAITING_DEBIT', 'SHIPPING', 'TO_COLLECT']
    if (fecha < hoy && activos.includes(orden.estado)) return 'Atrasada'
  }
  const mapa: Record<string, string> = {
    'Created': 'Nueva', 'Acknowledged': 'Nueva',
    'Shipped': 'Despachada', 'Cancelled': 'Cancelada',
    'ready_to_ship': 'Nueva', 'awaiting_fulfillment': 'Nueva',
    'delivery_in_progress': 'Despachada', 'delivered': 'Despachada',
    'deleted': 'Cancelada',
    'pending': 'Nueva', 'shipped': 'Despachada', 'canceled': 'Cancelada',
    'WAITING_ACCEPTANCE': 'Nueva', 'WAITING_DEBIT': 'Nueva',
    'SHIPPING': 'Nueva', 'TO_COLLECT': 'Nueva',
    'RECEIVED': 'Despachada', 'CLOSED': 'Despachada',
    'REFUSED': 'Cancelada', 'CANCELED': 'Cancelada',
  }
  return mapa[orden.estado] || orden.estado
}

const mktLabel: Record<string, string> = {
  walmart_chile: 'Walmart Chile',
  paris_chile: 'Paris Chile',
  falabella: 'Falabella Chile',
  ripley: 'Ripley Chile',
  manual: 'Venta Directa',
}

const mktStyle: Record<string, { bg: string; color: string }> = {
  walmart_chile: { bg: 'var(--walmart-bg)', color: 'var(--walmart)' },
  paris_chile:   { bg: 'var(--paris-bg)',   color: 'var(--paris)' },
  falabella:     { bg: 'var(--falabella-bg)', color: 'var(--falabella)' },
  ripley:        { bg: 'var(--ripley-bg)',  color: 'var(--ripley)' },
  manual:        { bg: 'var(--bg-3)',       color: 'var(--text-2)' },
}

interface Props {
  orden: Orden
  onClose: () => void
}

export default function OrdenModal({ orden, onClose }: Props) {
  const estadoERP = getEstadoUnificado(orden)
  const est = estadoStyle[estadoERP] || { bg: 'var(--bg-3)', color: 'var(--text-3)' }
  const items = orden.items || []
  const raw = orden.raw || {}
  const mkt = mktStyle[orden.marketplace] || { bg: 'var(--bg-3)', color: 'var(--text-2)' }

  const seccion = (titulo: string, children: React.ReactNode) => (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 600, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: '10px', paddingBottom: '6px',
        borderBottom: '0.5px solid var(--border)',
      }}>{titulo}</div>
      {children}
    </div>
  )

  const campo = (label: string, value: any, mono = false) => {
    if (!value && value !== 0) return null
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '7px 0', borderBottom: '0.5px solid var(--border)',
      }}>
        <span style={{ fontSize: '13px', color: 'var(--text-3)', flexShrink: 0, marginRight: '16px' }}>{label}</span>
        <span style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right' }}>
          {value}
        </span>
      </div>
    )
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '24px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: '12px',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '640px',
        maxHeight: '88vh', overflow: 'auto', animation: 'fadeIn 0.15s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'var(--bg-2)', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 500,
              background: mkt.bg, color: mkt.color,
            }}>{mktLabel[orden.marketplace] || orden.marketplace}</span>
            <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 500, background: est.bg, color: est.color }}>
              {estadoERP}
            </span>
            {orden.boleta_folio && (
              <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 500, background: 'var(--success-bg)', color: 'var(--success)' }}>
                📄 Folio {orden.boleta_folio}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
            width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>✕</button>
        </div>

        <div style={{ padding: '20px' }}>
          {seccion('Identificadores', <>
            {campo('N° Orden', orden.orden_id, true)}
            {campo('Sub-orden ID', orden.sub_orden_id, true)}
            {orden.marketplace === 'walmart_chile' && <>
              {campo('Fecha de orden', raw.fecha)}
            </>}
            {orden.marketplace === 'paris_chile' && <>
              {campo('Orden padre', raw.order?.originOrderNumber || raw.orden_padre_id, true)}
              {campo('Label ID', orden.sub_orden_id, true)}
              {campo('Tipo documento', raw.order?.originInvoiceType)}
              {campo('Fecha creación', orden.fecha_creacion ? new Date(orden.fecha_creacion).toLocaleString('es-CL') : null)}
            </>}
          </>)}

          {seccion('Cliente', <>
            {campo('Nombre', orden.cliente)}
            {orden.marketplace === 'walmart_chile' && <>
              {campo('Ciudad', raw.ciudad)}
              {campo('Región', raw.region)}
              {campo('Teléfono', raw.shippingInfo?.phone)}
              {campo('Email', raw.customerEmailId)}
            </>}
            {orden.marketplace === 'paris_chile' && <>
              {campo('Tipo boleta', raw.order?.originInvoiceType)}
            </>}
            {orden.marketplace === 'ripley' && <>
              {campo('Ciudad', raw.ciudad)}
              {campo('Carrier', raw.carrier)}
              {campo('Tracking', raw.tracking)}
            </>}
          </>)}

          {seccion('Envío', <>
            {campo('Fecha despacho al courier', orden.fecha_despacho)}
            {campo('Fecha entrega al cliente', orden.fecha_llegada)}
            {campo('Carrier', orden.carrier)}
            {orden.marketplace === 'walmart_chile' && campo('Método de envío', raw.shippingInfo?.methodCode)}
            {orden.marketplace === 'paris_chile' && campo('Fulfillment', raw.fulfillment)}
          </>)}

          {seccion('Productos', (
            <div style={{ border: '0.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              {items.map((item: any, i: number) => {
                const nombre = item.nombre || item.name || item.Name || '—'
                const sku = item.sku || item.Sku || '—'
                const skuSeller = item.sellerSku || item.ShopSku || '—'
                const cantidad = item.cantidad || item.Quantity || 1
                const precio = item.precio || item.ItemPrice || item.basePrice || item.priceAfterDiscounts
                const tieneDescuento = item.priceAfterDiscounts && item.basePrice &&
                  Number(item.priceAfterDiscounts) < Number(item.basePrice)
                return (
                  <div key={i} style={{
                    padding: '12px 14px',
                    borderBottom: i < items.length - 1 ? '0.5px solid var(--border)' : 'none',
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                  }}>
                    {item.imagePath && (
                      <img src={item.imagePath} alt={nombre} style={{
                        width: '52px', height: '52px', objectFit: 'cover',
                        borderRadius: '6px', flexShrink: 0, border: '0.5px solid var(--border)',
                      }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'monospace', marginTop: '2px' }}>
                        SKU: {sku}{skuSeller !== sku && skuSeller !== '—' ? ` · Seller: ${skuSeller}` : ''}
                      </div>
                      {item.size && !['Talla Única', 'Tamano Unico'].includes(item.size) && (
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Talla: {item.size}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>x{cantidad}</div>
                      {precio && (
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)', marginTop: '2px' }}>
                          ${Number(precio).toLocaleString('es-CL')}
                        </div>
                      )}
                      {tieneDescuento && (
                        <div style={{ fontSize: '11px', color: 'var(--text-4)', textDecoration: 'line-through' }}>
                          ${Number(item.basePrice).toLocaleString('es-CL')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {orden.total !== null && orden.total !== undefined && seccion('Resumen', <>
            {campo('Total orden', `$${Number(orden.total).toLocaleString('es-CL')}`)}
          </>)}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            {['Nueva', 'Atrasada'].includes(estadoERP) && (
              <button style={{
                flex: 1, padding: '11px', borderRadius: '8px', border: 'none',
                background: 'var(--accent)', color: 'var(--accent-fg)',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}>Despachar orden</button>
            )}
            {orden.label_url && (
              <button onClick={() => {
                window.open(orden.label_url!, '_blank')
                if (orden.marketplace === 'paris_chile' && orden.sub_orden_id) {
                  api.post(`/marketplaces/paris/etiqueta/${orden.sub_orden_id}`).catch(console.warn)
                }
              }} style={{
                flex: 1, padding: '11px', borderRadius: '8px',
                border: '0.5px solid var(--border)', background: 'var(--bg)',
                color: 'var(--info)', fontSize: '13px', cursor: 'pointer',
              }}>📄 Ver etiqueta PDF</button>
            )}
            {orden.boleta_folio && (
              <button onClick={() => window.open(`/api/v1/boletas/${orden.id}/pdf-view`, '_blank')} style={{
                flex: 1, padding: '11px', borderRadius: '8px',
                border: '0.5px solid var(--success)', background: 'var(--success-bg)',
                color: 'var(--success)', fontSize: '13px', cursor: 'pointer',
              }}>📄 Ver boleta</button>
            )}
            <button onClick={onClose} style={{
              padding: '11px 16px', borderRadius: '8px',
              border: '0.5px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
            }}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
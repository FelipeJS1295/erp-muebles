import { useEffect, useState, useMemo } from 'react'
import { dbApi, marketplaceApi, api } from '../api/client'


// =============================================================================
// Tipos
// =============================================================================

type SortKey = 'marketplace' | 'fecha_despacho' | 'orden_id' | 'estado'
type SortDir = 'asc' | 'desc'

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
  fecha_actualizacion: string | null
}

// =============================================================================
// Helpers
// =============================================================================

function getEstadoUnificado(orden: any): string {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  if (orden.fecha_despacho) {
    const d = new Date(orden.fecha_despacho)
    d.setHours(0, 0, 0, 0)
    const activos = ['Created', 'Acknowledged', 'ready_to_ship', 'awaiting_fulfillment', 'pending']
    if (d < hoy && activos.includes(orden.estado)) return 'Atrasada'
  }

  const mapa: Record<string, string> = {
    // Walmart
    'Created': 'Nueva', 'Acknowledged': 'Nueva',
    'Shipped': 'Despachada', 'Cancelled': 'Cancelada',
    // Paris
    'ready_to_ship': 'Nueva', 'awaiting_fulfillment': 'Nueva',
    'delivery_in_progress': 'Despachada', 'delivered': 'Despachada',
    'deleted': 'Cancelada',
    // Falabella
    'pending': 'Nueva',
    'shipped': 'Despachada',
    'canceled': 'Cancelada',
    // Ripley
    'WAITING_ACCEPTANCE': 'Nueva',
    'WAITING_DEBIT': 'Nueva',
    'SHIPPING': 'Nueva',
    'TO_COLLECT': 'Nueva',
    'RECEIVED': 'Despachada',
    'CLOSED': 'Despachada',
    'REFUSED': 'Cancelada',
    'CANCELED': 'Cancelada',
  }

  return mapa[orden.estado] || orden.estado
}

const estadoStyle: Record<string, { bg: string; color: string }> = {
  'Nueva':      { bg: 'var(--info-bg)',    color: 'var(--info)' },
  'Despachada': { bg: 'var(--success-bg)', color: 'var(--success)' },
  'Atrasada':   { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  'Cancelada':  { bg: 'var(--bg-3)',       color: 'var(--text-3)' },
}

function fechaUrgencia(fecha: string | null, estado: string) {
  if (!fecha) return 'neutral'
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const d = new Date(fecha); d.setHours(0, 0, 0, 0)
  const activos = ['Created', 'Acknowledged', 'ready_to_ship', 'awaiting_fulfillment']
  if (d < hoy && activos.includes(estado)) return 'urgent'
  const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  if (diff <= 2) return 'soon'
  return 'ok'
}

const fechaBadgeStyle: Record<string, { bg: string; color: string }> = {
  urgent:  { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  soon:    { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  ok:      { bg: 'var(--bg-3)',       color: 'var(--text-2)' },
  neutral: { bg: 'var(--bg-3)',       color: 'var(--text-3)' },
}

const IS: React.CSSProperties = {
  background: 'var(--bg)', border: '0.5px solid var(--border)',
  borderRadius: '7px', padding: '7px 12px', fontSize: '13px',
  color: 'var(--text-1)', outline: 'none', cursor: 'pointer',
}

const TH: React.CSSProperties = {
  padding: '11px 14px', textAlign: 'left', fontSize: '12px',
  fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)',
  whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', background: 'var(--bg)',
}

const TD: React.CSSProperties = {
  padding: '12px 14px', borderBottom: '0.5px solid var(--border)', verticalAlign: 'middle',
}

// =============================================================================
// Checkbox
// =============================================================================

function Checkbox({ checked, indeterminate, onChange }: {
  checked: boolean, indeterminate?: boolean, onChange: () => void
}) {
  return (
    <div onClick={onChange} style={{
      width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
      border: checked || indeterminate ? '1.5px solid var(--accent)' : '1.5px solid var(--border-2)',
      background: checked || indeterminate ? 'var(--accent)' : 'transparent',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.1s',
    }}>
      {checked && (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path d="M1.5 4.5l2 2 4-4" stroke="var(--accent-fg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {indeterminate && !checked && (
        <div style={{ width: '7px', height: '1.5px', background: 'var(--accent-fg)', borderRadius: '1px' }} />
      )}
    </div>
  )
}

// =============================================================================
// SortIcon
// =============================================================================

function SortIcon({ active, dir }: { active: boolean, dir: SortDir }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: active ? 1 : 0.3 }}>
      {dir === 'asc' || !active
        ? <path d="M2 6l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        : <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      }
    </svg>
  )
}

// =============================================================================
// OrdenModal
// =============================================================================

function OrdenModal({ orden, onClose }: { orden: Orden, onClose: () => void }) {
  const isWalmart = orden.marketplace === 'walmart_chile'
  const estadoERP = getEstadoUnificado(orden)
  const est = estadoStyle[estadoERP] || { bg: 'var(--bg-3)', color: 'var(--text-3)' }
  const items = orden.items || []
  const raw = orden.raw || {}

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
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'var(--bg-2)', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 500,
              background: isWalmart ? 'var(--walmart-bg)' : 'var(--paris-bg)',
              color: isWalmart ? 'var(--walmart)' : 'var(--paris)',
            }}>{isWalmart ? 'Walmart Chile' : 'Paris Chile'}</span>
            <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 500, background: est.bg, color: est.color }}>
              {estadoERP}
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
            width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>✕</button>
        </div>

        <div style={{ padding: '20px' }}>
          {seccion('Identificadores', <>
            {isWalmart ? <>
              {campo('Customer Order ID', orden.orden_id, true)}
              {campo('Purchase Order ID', orden.sub_orden_id, true)}
              {campo('Fecha de orden', raw.fecha)}
            </> : <>
              {campo('Sub-orden ID', orden.orden_id, true)}
              {campo('Orden padre', raw.order?.originOrderNumber || raw.orden_padre_id, true)}
              {campo('Label ID', orden.sub_orden_id, true)}
              {campo('Fecha creación', orden.fecha_creacion ? new Date(orden.fecha_creacion).toLocaleString('es-CL') : null)}
            </>}
          </>)}

          {seccion('Cliente', <>
            {campo('Nombre', orden.cliente)}
            {isWalmart ? <>
              {campo('Ciudad', raw.ciudad)}
              {campo('Región', raw.region)}
              {campo('Teléfono', raw.shippingInfo?.phone)}
              {campo('Email', raw.customerEmailId)}
            </> : <>
              {campo('Tipo boleta', raw.order?.originInvoiceType)}
            </>}
          </>)}

          {seccion('Envío', <>
            {campo('Fecha despacho al courier', orden.fecha_despacho)}
            {campo('Fecha entrega al cliente', orden.fecha_llegada)}
            {campo('Carrier', orden.carrier)}
            {isWalmart
              ? campo('Método de envío', raw.shippingInfo?.methodCode)
              : campo('Fulfillment', raw.fulfillment)
            }
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
                  marketplaceApi.imprimirEtiquetaParis(orden.sub_orden_id).catch(console.warn)
                }
              }} style={{
                flex: 1, padding: '11px', borderRadius: '8px',
                border: '0.5px solid var(--border)', background: 'var(--bg)',
                color: 'var(--info)', fontSize: '13px', cursor: 'pointer',
              }}>📄 Ver etiqueta PDF</button>
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

// =============================================================================
// VistaMaestra
// =============================================================================

function VistaMaestra({ ordenes, onClose }: { ordenes: Orden[], onClose: () => void }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroMkt, setFiltroMkt] = useState('')
  const [productosInternos, setProductosInternos] = useState<any[]>([])
  const [skusRetail, setSkusRetail] = useState<any[]>([])

  useEffect(() => {
    import('../api/client').then(({ api }) => {
      api.get('/productos-internos').then(r => setProductosInternos(r.data.productos || [])).catch(() => {})
      api.get('/sku-retail').then(r => setSkusRetail(r.data.skus || [])).catch(() => {})
    })
  }, [])

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const ordenesFiltradas = useMemo(() => ordenes.filter(o => {
    const estado = getEstadoUnificado(o)
    if (!['Nueva', 'Atrasada'].includes(estado)) return false
    if (filtroMkt && o.marketplace !== filtroMkt) return false
    return true
  }), [ordenes, filtroMkt])

  const fechas = useMemo(() => {
    const set = new Set<string>()
    ordenesFiltradas.forEach(o => { if (o.fecha_despacho) set.add(o.fecha_despacho) })
    return Array.from(set).sort()
  }, [ordenesFiltradas])

  const tabla = useMemo(() => {
    const grupos: Record<string, Record<string, Record<string, number>>> = {}
    ordenesFiltradas.forEach(o => {
      const mkt = o.marketplace === 'walmart_chile' ? 'Walmart' : 
            o.marketplace === 'paris_chile' ? 'Paris' : 
            o.marketplace === 'ripley' ? 'Ripley' : 'Falabella'
      const items = o.items || []
      const primer = Array.isArray(items) ? items[0] : null
      const producto = primer?.nombre || primer?.name || primer?.Name || '—'
      const sku = primer?.sellerSku || primer?.sku || primer?.Sku || ''
      const key = `${o.marketplace === 'falabella' ? `${producto} (JAMAROFF)` : producto}|||${sku}`
      const fecha = o.fecha_despacho || 'Sin fecha'
      if (!grupos[mkt]) grupos[mkt] = {}
      if (!grupos[mkt][key]) grupos[mkt][key] = {}
      grupos[mkt][key][fecha] = (grupos[mkt][key][fecha] || 0) + 1
    })
    if (busqueda) {
      const q = busqueda.toLowerCase()
      Object.keys(grupos).forEach(mkt => {
        Object.keys(grupos[mkt]).forEach(key => {
          if (!key.toLowerCase().includes(q)) delete grupos[mkt][key]
        })
        if (Object.keys(grupos[mkt]).length === 0) delete grupos[mkt]
      })
    }
    return grupos
  }, [ordenesFiltradas, busqueda])

  const getCellStyle = (fecha: string, valor: number): React.CSSProperties => {
    if (valor === 0) return { color: 'var(--text-4)', fontSize: '12px' }
    const d = new Date(fecha); d.setHours(0, 0, 0, 0)
    const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { color: 'var(--danger)', fontWeight: 700, fontSize: '13px' }
    if (diff <= 1) return { color: 'var(--warning)', fontWeight: 600, fontSize: '13px' }
    return { color: 'var(--success)', fontWeight: 500, fontSize: '13px' }
  }

  const totalesFecha: Record<string, number> = {}
  fechas.forEach(f => {
    totalesFecha[f] = 0
    Object.values(tabla).forEach(prods =>
      Object.values(prods).forEach(fm => { totalesFecha[f] += fm[f] || 0 })
    )
  })
  const totalGeneral = Object.values(totalesFecha).reduce((a, b) => a + b, 0)

  const getDescripcionEsqueleto = (sku: string) => {
    if (!sku) return null
    const skuUpper = sku.toUpperCase()
    const skuPadre = skuUpper.split('-')[0]
    const producto = productosInternos.find(p =>
      p.sku?.toUpperCase() === skuUpper ||
      p.sku_padre?.toUpperCase() === skuPadre ||
      p.sku_padre?.toUpperCase() === skuUpper
    )
    return producto?.descripcion_esqueleto || null
  }

const imprimirMaestra = (esEsqueletos: boolean) => {
  const ventana = window.open('', '_blank')
  if (!ventana) return
  const titulo = esEsqueletos ? 'Maestra Esqueletos' : 'Vista Maestra'

  const buscarProductoInterno = (o: Orden) => {
    const items = o.items || []
    const primer = Array.isArray(items) ? items[0] : null
    const sku = primer?.sellerSku || primer?.sku || primer?.Sku || ''
    const skuUpper = sku.toUpperCase()

    if (o.marketplace === 'paris_chile') {
      // Sacar el -1 al final
      const skuSinSufijo = skuUpper.replace(/-\d+$/, '')
      const skuPadre = skuSinSufijo.split('-')[0]

      // 1. Cruzar por sku_paris en skusRetail
      let retail = skusRetail.find(r => r.sku_paris?.toUpperCase().replace(/-\d+$/, '') === skuSinSufijo)
      if (retail) return productosInternos.find(p => p.id === retail.producto_interno_id)

      // 2. Cruzar por sku directo
      retail = skusRetail.find(r => r.sku?.toUpperCase() === skuSinSufijo)
      if (retail) return productosInternos.find(p => p.id === retail.producto_interno_id)

      // 3. Cruzar por sku_padre
      return productosInternos.find(p =>
        p.sku_padre?.toUpperCase() === skuPadre ||
        p.sku?.toUpperCase() === skuSinSufijo
      )

    } else if (o.marketplace === 'falabella') {
      const skuSinSufijo = skuUpper.replace(/-\d+$/, '')
      const retail = skusRetail.find(r =>
        r.sku_falabella?.toUpperCase() === skuSinSufijo ||
        r.sku_falabella?.toUpperCase() === skuUpper
      )
      if (retail) return productosInternos.find(p => p.id === retail.producto_interno_id)
      return productosInternos.find(p => p.sku?.toUpperCase() === skuSinSufijo)

    } else {
      // Walmart
      const skuPadre = skuUpper.split('-')[0]
      const retail = skusRetail.find(r =>
        r.sku_walmart?.toUpperCase() === skuUpper ||
        r.sku?.toUpperCase() === skuUpper
      )
      if (retail) return productosInternos.find(p => p.id === retail.producto_interno_id)
      return productosInternos.find(p =>
        p.sku_padre?.toUpperCase() === skuPadre ||
        p.sku?.toUpperCase() === skuUpper
      )
    }
  }

  // Para esqueletos: agrupar SOLO por descripcion_esqueleto (sin marketplace)
  const tablaFinal = esEsqueletos ? (() => {
    const grupos: Record<string, Record<string, number>> = {}
    ordenesFiltradas.forEach(o => {
      const prodInterno = buscarProductoInterno(o)
      const items = o.items || []
      const primer = Array.isArray(items) ? items[0] : null
      const skuOrden = primer?.sellerSku || primer?.sku || primer?.Sku || 'sin-sku'
      const descEsqueleto = prodInterno?.descripcion_esqueleto || 
        (prodInterno ? `Sin esqueleto (${prodInterno.sku_padre})` : `No cruzado (${skuOrden})`)
      const fecha = o.fecha_despacho || 'Sin fecha'
      if (!grupos[descEsqueleto]) grupos[descEsqueleto] = {}
      grupos[descEsqueleto][fecha] = (grupos[descEsqueleto][fecha] || 0) + 1
    })
    return grupos
  })() : null

  // Para maestra normal: agrupar por marketplace → producto
  const tablaFinalNormal = !esEsqueletos ? tabla : null

  // Totales por fecha para esqueletos
  const totalesFinales: Record<string, number> = {}
  fechas.forEach(f => { totalesFinales[f] = 0 })

  const filasEsqueleto = esEsqueletos ? Object.entries(tablaFinal!).map(([desc, fechaMap]) => {
    const totalProd = Object.values(fechaMap).reduce((a, b) => a + b, 0)
    fechas.forEach(f => { totalesFinales[f] = (totalesFinales[f] || 0) + (fechaMap[f] || 0) })
    const sinEsqueleto = desc.startsWith('Sin esqueleto')
    return `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;min-width:260px">
          <div style="font-size:14px;font-weight:${sinEsqueleto ? '400' : '600'};color:${sinEsqueleto ? '#e85d04' : '#1a1a1a'}">${desc}</div>
        </td>
        ${fechas.map(f => {
          const val = fechaMap[f] || 0
          const d = new Date(f); d.setHours(0, 0, 0, 0)
          const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
          const color = val === 0 ? '#ccc' : diff < 0 ? '#dc2626' : diff <= 1 ? '#d97706' : '#059669'
          return `<td style="padding:10px 14px;border-bottom:1px solid #eee;border-left:1px solid #eee;text-align:center;color:${color};font-weight:${val > 0 ? '700' : '400'};font-size:14px">${val === 0 ? '—' : val}</td>`
        }).join('')}
        <td style="padding:10px 14px;border-bottom:1px solid #eee;border-left:1px solid #eee;text-align:center;font-weight:700;font-size:14px;background:#f9f9f9">${totalProd}</td>
      </tr>
    `
  }).join('') : ''

  // Filas maestra normal (por marketplace)
  const filasNormal = !esEsqueletos ? Object.entries(tablaFinalNormal!).map(([mkt, productos]) => {
    const totalMkt = Object.values(productos).reduce((sum, fm) =>
      sum + Object.values(fm).reduce((a, b) => a + b, 0), 0)
    fechas.forEach(f => {
      Object.values(productos).forEach(fm => { totalesFinales[f] = (totalesFinales[f] || 0) + (fm[f] || 0) })
    })
    const filasMkt = Object.entries(productos).map(([key, fechaMap]) => {
      const [nombre, sku] = key.split('|||')
      const totalProd = Object.values(fechaMap).reduce((a, b) => a + b, 0)
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;padding-left:24px">
            <div style="font-size:12px;font-weight:500">${nombre}</div>
            ${sku ? `<div style="font-size:10px;color:#888;font-family:monospace">${sku}</div>` : ''}
          </td>
          ${fechas.map(f => {
            const val = fechaMap[f] || 0
            const d = new Date(f); d.setHours(0, 0, 0, 0)
            const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
            const color = val === 0 ? '#ccc' : diff < 0 ? '#dc2626' : diff <= 1 ? '#d97706' : '#059669'
            return `<td style="padding:8px 12px;border-bottom:1px solid #eee;border-left:1px solid #eee;text-align:center;color:${color};font-weight:${val > 0 ? '600' : '400'};font-size:13px">${val === 0 ? '—' : val}</td>`
          }).join('')}
          <td style="padding:8px 12px;border-bottom:1px solid #eee;border-left:1px solid #eee;text-align:center;font-weight:700;background:#f9f9f9">${totalProd}</td>
        </tr>
      `
    }).join('')
    return `
      <tr style="background:#f0f0f0">
        <td style="padding:9px 12px;border-bottom:1px solid #ddd;border-top:2px solid #ddd;font-weight:700">${mkt} (${totalMkt})</td>
        ${fechas.map(() => `<td style="border-left:1px solid #eee;background:#f0f0f0"></td>`).join('')}
        <td style="padding:9px 12px;text-align:center;font-weight:700;background:#f0f0f0;border-left:1px solid #eee">${totalMkt}</td>
      </tr>
      ${filasMkt}
    `
  }).join('') : ''

  const totalFinal = Object.values(totalesFinales).reduce((a, b) => a + b, 0)

  ventana.document.write(`
    <html>
    <head>
      <title>${titulo} - Jerk Home</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:Arial,sans-serif; }
        body { padding:24px; color:#1a1a1a; }
        .header { display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:2px solid #1a1a1a; padding-bottom:14px; }
        .empresa { font-size:20px; font-weight:700; }
        .sub { font-size:12px; color:#666; margin-top:4px; }
        table { width:100%; border-collapse:collapse; border:1px solid #ddd; }
        th { padding:10px 14px; background:#1a1a1a; color:white; font-size:12px; white-space:nowrap; border-left:1px solid #444; }
        th:first-child { text-align:left; border-left:none; }
        .legend { display:flex; gap:16px; margin-bottom:14px; font-size:11px; color:#666; }
        .dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:4px; vertical-align:middle; }
        @media print { body { padding:12px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="empresa">Jerk Home · ${titulo}</div>
          <div class="sub">
            ${new Date().toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
            · ${ordenesFiltradas.length} órdenes · ${totalFinal} unidades
          </div>
        </div>
      </div>
      <div class="legend">
        <span><span class="dot" style="background:#dc2626"></span>Atrasada</span>
        <span><span class="dot" style="background:#d97706"></span>Urgente</span>
        <span><span class="dot" style="background:#059669"></span>Normal</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="min-width:260px">${esEsqueletos ? 'Descripción Esqueleto' : 'Marketplace / Producto'}</th>
            ${fechas.map(f => {
              const d = new Date(f); d.setHours(0, 0, 0, 0)
              const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
              const color = diff < 0 ? '#ef4444' : diff <= 1 ? '#f59e0b' : 'white'
              return `<th style="text-align:center;color:${color}">${f}<br><span style="font-size:9px;font-weight:400">${diff < 0 ? '⚠ Atrasada' : diff === 0 ? 'Hoy' : d.toLocaleDateString('es-CL',{weekday:'short'})}</span></th>`
            }).join('')}
            <th style="text-align:center">Total</th>
          </tr>
        </thead>
        <tbody>
          ${esEsqueletos ? filasEsqueleto : filasNormal}
          <tr style="background:#e8e8e8;border-top:2px solid #1a1a1a">
            <td style="padding:10px 14px;font-weight:700;font-size:13px">Total general</td>
            ${fechas.map(f => {
              const val = totalesFinales[f] || 0
              const d = new Date(f); d.setHours(0, 0, 0, 0)
              const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
              const color = val === 0 ? '#ccc' : diff < 0 ? '#dc2626' : diff <= 1 ? '#d97706' : '#059669'
              return `<td style="padding:10px 14px;text-align:center;font-weight:700;color:${color};border-left:1px solid #ddd;font-size:14px">${val === 0 ? '—' : val}</td>`
            }).join('')}
            <td style="padding:10px 14px;text-align:center;font-weight:700;font-size:15px;border-left:1px solid #ddd">${totalFinal}</td>
          </tr>
        </tbody>
      </table>
      <script>window.onload = () => { window.print() }</script>
    </body>
    </html>
  `)
  ventana.document.close()
}

  const thM: React.CSSProperties = {
    padding: '9px 12px', fontSize: '11px', fontWeight: 500,
    color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)',
    borderRight: '0.5px solid var(--border)', background: 'var(--bg)',
    whiteSpace: 'nowrap', textAlign: 'center',
  }
  const tdM: React.CSSProperties = {
    padding: '9px 12px', borderBottom: '0.5px solid var(--border)',
    borderRight: '0.5px solid var(--border)', textAlign: 'center',
  }
  const fS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '6px 10px', fontSize: '12px',
    color: 'var(--text-1)', outline: 'none', cursor: 'pointer',
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, padding: '24px', overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: '12px',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '1100px',
        animation: 'fadeIn 0.15s ease',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '16px', flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>Vista Maestra</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
              Órdenes activas agrupadas por producto y fecha de despacho
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
                  style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                  <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
                </svg>
                <input placeholder="Buscar producto o SKU..." value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  style={{ ...fS, paddingLeft: '26px', width: '200px' }} />
              </div>
              <select value={filtroMkt} onChange={e => setFiltroMkt(e.target.value)} style={fS}>
                <option value="">Todos los marketplaces</option>
                <option value="walmart_chile">Walmart Chile</option>
                <option value="paris_chile">Paris Chile</option>
                <option value="falabella">Falabella Chile</option>
                <option value="ripley">Ripley Chile</option>
              </select>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', marginLeft: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-3)' }}>Atrasada</span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)', display: 'inline-block', marginLeft: '8px' }} />
                <span style={{ color: 'var(--text-3)' }}>Urgente</span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', marginLeft: '8px' }} />
                <span style={{ color: 'var(--text-3)' }}>Normal</span>
              </div>
            </div>
          </div>

          {/* Botones imprimir + cerrar */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => imprimirMaestra(false)} style={{
              padding: '7px 14px', borderRadius: '7px',
              border: '0.5px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              🖨️ Imprimir maestra
            </button>
            <button onClick={() => imprimirMaestra(true)} style={{
              padding: '7px 14px', borderRadius: '7px',
              border: '0.5px solid var(--info)', background: 'var(--info-bg)',
              color: 'var(--info)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              🦴 Maestra esqueletos
            </button>
            <button onClick={onClose} style={{
              background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
              width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0,
            }}>✕</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', padding: '16px 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid var(--border)' }}>
            <thead>
              <tr>
                <th style={{ ...thM, textAlign: 'left', width: '240px' }}>Marketplace / Producto</th>
                {fechas.map(f => {
                  const d = new Date(f); d.setHours(0, 0, 0, 0)
                  const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <th key={f} style={{ ...thM, color: diff < 0 ? 'var(--danger)' : diff === 0 ? 'var(--warning)' : 'var(--text-3)' }}>
                      {f}<br/>
                      <span style={{ fontSize: '10px', fontWeight: 400 }}>
                        {diff < 0 ? '⚠ Atrasada' : diff === 0 ? 'Hoy' : d.toLocaleDateString('es-CL', { weekday: 'short' })}
                      </span>
                    </th>
                  )
                })}
                <th style={{ ...thM, background: 'var(--bg-3)', fontWeight: 700, color: 'var(--text-1)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(tabla).length === 0 ? (
                <tr><td colSpan={fechas.length + 2} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                  No hay órdenes activas para mostrar
                </td></tr>
              ) : Object.entries(tabla).map(([mkt, productos]) => {
                const totalMkt = Object.values(productos).reduce((sum, fm) =>
                  sum + Object.values(fm).reduce((a, b) => a + b, 0), 0)
                return (
                  <>
                    <tr key={mkt} style={{ background: 'var(--bg-3)' }}>
                      <td style={{ ...tdM, textAlign: 'left', fontWeight: 600 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                          background: mkt === 'Walmart' ? 'var(--walmart-bg)' : mkt === 'Paris' ? 'var(--paris-bg)' : mkt === 'Ripley' ? 'var(--ripley-bg)' : 'var(--falabella-bg)',
                          color: mkt === 'Walmart' ? 'var(--walmart)' : mkt === 'Paris' ? 'var(--paris)' : mkt === 'Ripley' ? 'var(--ripley)' : 'var(--falabella)',
                        }}>
                          {mkt}
                        </span>
                      </td>
                      {fechas.map(f => <td key={f} style={{ ...tdM, background: 'var(--bg-3)' }} />)}
                      <td style={{ ...tdM, background: 'var(--bg-3)', fontWeight: 700, color: 'var(--text-1)' }}>{totalMkt}</td>
                    </tr>
                    {Object.entries(productos).map(([key, fechaMap]) => {
                      const [nombre, sku] = key.split('|||')
                      const totalProd = Object.values(fechaMap).reduce((a, b) => a + b, 0)
                      return (
                        <tr key={key}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          style={{ transition: 'background 0.1s' }}>
                          <td style={{ ...tdM, textAlign: 'left', paddingLeft: '24px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-1)', fontWeight: 500 }}>{nombre}</div>
                            {sku && <div style={{ fontSize: '10px', color: 'var(--text-4)', fontFamily: 'monospace', marginTop: '1px' }}>{sku}</div>}
                          </td>
                          {fechas.map(f => {
                            const val = fechaMap[f] || 0
                            return <td key={f} style={{ ...tdM, ...getCellStyle(f, val) }}>{val === 0 ? '—' : val}</td>
                          })}
                          <td style={{ ...tdM, fontWeight: 700, color: 'var(--text-1)', background: 'var(--bg-3)' }}>{totalProd}</td>
                        </tr>
                      )
                    })}
                  </>
                )
              })}
              <tr style={{ background: 'var(--bg-3)', borderTop: '1px solid var(--border-2)' }}>
                <td style={{ ...tdM, textAlign: 'left', fontWeight: 700, color: 'var(--text-1)' }}>Total general</td>
                {fechas.map(f => {
                  const val = totalesFecha[f] || 0
                  return <td key={f} style={{ ...tdM, fontWeight: 700, ...getCellStyle(f, val) }}>{val === 0 ? '—' : val}</td>
                })}
                <td style={{ ...tdM, fontWeight: 700, fontSize: '14px', color: 'var(--text-1)', background: 'var(--bg-3)' }}>{totalGeneral}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Ordenes (Principal)
// =============================================================================

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('fecha_despacho')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filtroMkt, setFiltroMkt] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activas')
  const [busqueda, setBusqueda] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<Orden | null>(null)
  const [mostrarMaestra, setMostrarMaestra] = useState(false)

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await dbApi.getOrdenes(undefined, 500)
      setOrdenes(res.data.ordenes || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const sincronizar = async () => {
    try {
      setSyncing(true)
      await Promise.all([dbApi.syncWalmart(), dbApi.syncParis(), dbApi.syncFalabella(), dbApi.syncRipley()])
      await cargar()
    } catch (e) { console.error(e) }
    finally { setSyncing(false) }
  }

  useEffect(() => { cargar() }, [])

  const filtradas = useMemo(() => {
    let result = [...ordenes]
    if (filtroMkt) result = result.filter(o => o.marketplace === filtroMkt)
    if (filtroEstado === 'activas') {
      result = result.filter(o => ['Nueva', 'Atrasada'].includes(getEstadoUnificado(o)))
    } else if (filtroEstado && filtroEstado !== 'todas') {
      result = result.filter(o => getEstadoUnificado(o) === filtroEstado)
    }
    if (busqueda) {
      const q = busqueda.toLowerCase()
      result = result.filter(o =>
        o.orden_id?.toLowerCase().includes(q) ||
        o.cliente?.toLowerCase().includes(q) ||
        o.items?.some((i: any) =>
          i?.nombre?.toLowerCase().includes(q) ||
          i?.name?.toLowerCase().includes(q) ||
          i?.sellerSku?.toLowerCase().includes(q)
        )
      )
    }
    if (filtroDesde) result = result.filter(o => o.fecha_despacho && o.fecha_despacho >= filtroDesde)
    if (filtroHasta) result = result.filter(o => o.fecha_despacho && o.fecha_despacho <= filtroHasta)
    result.sort((a, b) => {
      const va = sortKey === 'estado' ? getEstadoUnificado(a) : (a as any)[sortKey] || ''
      const vb = sortKey === 'estado' ? getEstadoUnificado(b) : (b as any)[sortKey] || ''
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [ordenes, filtroMkt, filtroEstado, busqueda, filtroDesde, filtroHasta, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const toggleAll = () => {
    if (selected.size === filtradas.length) setSelected(new Set())
    else setSelected(new Set(filtradas.map(o => o.orden_id)))
  }

  const toggleOne = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  const allSelected = filtradas.length > 0 && selected.size === filtradas.length
  const someSelected = selected.size > 0 && selected.size < filtradas.length

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {ordenSeleccionada && <OrdenModal orden={ordenSeleccionada} onClose={() => setOrdenSeleccionada(null)} />}
      {mostrarMaestra && <VistaMaestra ordenes={ordenes} onClose={() => setMostrarMaestra(false)} />}

      {/* Topbar */}
      <div style={{
        padding: '16px 24px', background: 'var(--bg-2)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)' }}>
            Órdenes <span style={{ fontSize: '13px', color: 'var(--text-4)', fontWeight: 400 }}>· {filtradas.length} de {ordenes.length}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Gestión de órdenes de todos los marketplaces</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...IS, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M1 1h9v2L6 7v3l-2-1V7L1 3V1z"/></svg>
            Exportar
          </button>
          <button onClick={sincronizar} disabled={syncing} style={{ ...IS, display: 'flex', alignItems: 'center', gap: '6px', opacity: syncing ? 0.6 : 1 }}>
            <svg width="12" height="12" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3"
              style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
              <path d="M9 5.5A3.5 3.5 0 1 1 5.5 2"/><path d="M9 2v3.5H5.5"/>
            </svg>
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          <button onClick={() => setMostrarMaestra(true)} style={{
            ...IS, display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', fontWeight: 500,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="1" y="1" width="4" height="4" rx="0.5"/><rect x="7" y="1" width="4" height="4" rx="0.5"/>
              <rect x="1" y="7" width="4" height="4" rx="0.5"/><rect x="7" y="7" width="4" height="4" rx="0.5"/>
            </svg>
            Maestra
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        padding: '12px 24px', background: 'var(--bg-2)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div style={{ position: 'relative' }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
          </svg>
          <input placeholder="Buscar orden, producto, SKU..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...IS, paddingLeft: '30px', width: '220px' }} />
        </div>
        <select value={filtroMkt} onChange={e => setFiltroMkt(e.target.value)} style={IS}>
          <option value="">Todos los marketplaces</option>
          <option value="walmart_chile">Walmart Chile</option>
          <option value="paris_chile">Paris Chile</option>
          <option value="falabella">Falabella Chile</option>
          <option value="ripley">Ripley Chile</option>
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={IS}>
          <option value="activas">Activas (Nuevas + Atrasadas)</option>
          <option value="todas">Todas las órdenes</option>
          <option value="Nueva">Nueva</option>
          <option value="Atrasada">Atrasada</option>
          <option value="Despachada">Despachada</option>
          <option value="Cancelada">Cancelada</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Despacho desde</span>
          <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} style={IS} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>hasta</span>
          <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} style={IS} />
        </div>
        {(filtroMkt || filtroEstado !== 'activas' || busqueda || filtroDesde || filtroHasta) && (
          <button onClick={() => { setFiltroMkt(''); setFiltroEstado('activas'); setBusqueda(''); setFiltroDesde(''); setFiltroHasta('') }}
            style={{ ...IS, color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            Limpiar ✕
          </button>
        )}
      </div>

      {/* Barra selección */}
      {selected.size > 0 && (
        <div style={{
          padding: '10px 24px', background: 'var(--info-bg)',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
          <span style={{ fontSize: '13px', color: 'var(--info)', fontWeight: 500 }}>
            {selected.size} {selected.size === 1 ? 'orden seleccionada' : 'órdenes seleccionadas'}
          </span>
          <button style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', cursor: 'pointer', fontWeight: 500 }}>
            Marcar despachadas
          </button>
          <button style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px', border: '0.5px solid var(--border-2)', background: 'var(--bg-2)', color: 'var(--text-1)', cursor: 'pointer' }}>
            Imprimir etiquetas
          </button>
          <button style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px', border: '0.5px solid var(--danger)', background: 'var(--danger-bg)', color: 'var(--danger)', cursor: 'pointer' }}>
            Cancelar órdenes
          </button>
          <button onClick={() => setSelected(new Set())}
            style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px', border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', marginLeft: 'auto' }}>
            Limpiar selección
          </button>
        </div>
      )}

      {/* Tabla */}
      <div style={{ padding: '16px 24px' }}>
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '40px', cursor: 'default' }}>
                    <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
                  </th>
                  {([
                    { key: 'marketplace', label: 'Marketplace' },
                    { key: 'fecha_despacho', label: 'Fecha despacho' },
                    { key: 'orden_id', label: 'Orden' },
                  ] as { key: SortKey; label: string }[]).map(col => (
                    <th key={col.key} style={TH} onClick={() => toggleSort(col.key)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {col.label} <SortIcon active={sortKey === col.key} dir={sortDir} />
                      </div>
                    </th>
                  ))}
                  <th style={TH}>Producto</th>
                  <th style={TH} onClick={() => toggleSort('estado')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Estado <SortIcon active={sortKey === 'estado'} dir={sortDir} />
                    </div>
                  </th>
                  <th style={{ ...TH, cursor: 'default' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} style={TD}>
                        <div style={{ height: '14px', background: 'var(--bg-3)', borderRadius: '3px', animation: 'pulse 1.5s infinite' }} />
                      </td>
                    ))}
                  </tr>
                )) : filtradas.map((o, i) => {
                  const isSelected = selected.has(o.orden_id)
                  const items = o.items || []
                  const primer = Array.isArray(items) ? items[0] : null
                  const producto = primer?.nombre || primer?.name || primer?.Name || '—'
                  const productoDisplay = o.marketplace === 'falabella' ? `${producto} (JAMAROFF)` : producto
                  const sku = primer?.sellerSku || primer?.sku || primer?.Sku || ''
                  const estadoERP = getEstadoUnificado(o)
                  const est = estadoStyle[estadoERP] || { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                  const isWalmart = o.marketplace === 'walmart_chile'
                  const urgencia = fechaUrgencia(o.fecha_despacho, o.estado)
                  const fbs = fechaBadgeStyle[urgencia]

                  return (
                    <tr key={i}
                      style={{ background: isSelected ? 'var(--info-bg)' : 'transparent', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-3)' }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={TD}><Checkbox checked={isSelected} onChange={() => toggleOne(o.orden_id)} /></td>
                      <td style={TD}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 500,
                        background: isWalmart ? 'var(--walmart-bg)' :
                                    o.marketplace === 'paris_chile' ? 'var(--paris-bg)' :
                                    o.marketplace === 'ripley' ? 'var(--ripley-bg)' : 'var(--falabella-bg)',
                        color: isWalmart ? 'var(--walmart)' :
                              o.marketplace === 'paris_chile' ? 'var(--paris)' :
                              o.marketplace === 'ripley' ? 'var(--ripley)' : 'var(--falabella)',
                      }}>
                        {isWalmart ? 'Walmart' : o.marketplace === 'paris_chile' ? 'Paris' : o.marketplace === 'ripley' ? 'Ripley' : 'Falabella'}
                      </span>
                      </td>
                      <td style={TD}>
                        <span style={{ padding: '3px 9px', borderRadius: '5px', fontSize: '12px', fontFamily: 'monospace', background: fbs.bg, color: fbs.color, fontWeight: 500 }}>
                          {o.fecha_despacho || '—'}
                        </span>
                      </td>
                      <td style={TD}>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--info)', fontWeight: 500 }}>{o.orden_id}</span>
                      </td>
                      <td style={{ ...TD, maxWidth: '220px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{productoDisplay}</div>
                        {sku && <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '2px', fontFamily: 'monospace' }}>{sku}</div>}
                      </td>
                      <td style={TD}>
                        <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 500, background: est.bg, color: est.color, whiteSpace: 'nowrap' }}>
                          {estadoERP}
                        </span>
                      </td>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => setOrdenSeleccionada(o)} style={{
                            fontSize: '12px', padding: '5px 10px', borderRadius: '5px',
                            border: '0.5px solid var(--border)', background: 'var(--bg)',
                            color: 'var(--text-2)', cursor: 'pointer', whiteSpace: 'nowrap',
                          }}>Ver</button>
                          {['Nueva', 'Atrasada', 'Despachada'].includes(estadoERP) && (
                          <button onClick={async () => {
                            if (!confirm(`¿Emitir boleta para orden ${o.orden_id}?`)) return
                            try {
                              const res = await api.post(`/boletas/emitir/${o.id}`)
                              alert(`✅ Boleta emitida - Folio ${res.data.folio} - Total $${res.data.total?.toLocaleString('es-CL')}`)
                              if (res.data.url_boleta) window.open(res.data.url_boleta, '_blank')
                            } catch (e: any) {
                              alert(`❌ Error: ${e.response?.data?.detail || 'Error al emitir boleta'}`)
                            }
                          }} style={{
                            fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                            border: '0.5px solid var(--success)', background: 'var(--success-bg)',
                            color: 'var(--success)', cursor: 'pointer', whiteSpace: 'nowrap',
                          }}>
                            Boleta
                          </button>
                          )}
                          {['Nueva', 'Atrasada'].includes(estadoERP) && (
                            <button style={{
                              fontSize: '12px', padding: '5px 10px', borderRadius: '5px',
                              border: 'none', background: 'var(--accent)',
                              color: 'var(--accent-fg)', cursor: 'pointer', whiteSpace: 'nowrap',
                            }}>Despachar</button>
                          )}
                          {o.label_url && (
                            <button onClick={async () => {
                              window.open(o.label_url!, '_blank')
                              if (o.marketplace === 'paris_chile' && o.sub_orden_id) {
                                try { await marketplaceApi.imprimirEtiquetaParis(o.sub_orden_id) }
                                catch (e) { console.warn(e) }
                              }
                            }} style={{
                              fontSize: '12px', padding: '5px 10px', borderRadius: '5px',
                              border: '0.5px solid var(--border)', background: 'var(--bg)',
                              color: 'var(--info)', cursor: 'pointer', whiteSpace: 'nowrap',
                            }}>Etiqueta</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
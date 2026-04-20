import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'

const MKT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  walmart_chile: { label: 'Walmart',   color: 'var(--walmart)',   bg: 'var(--walmart-bg)' },
  paris_chile:   { label: 'Paris',     color: 'var(--paris)',     bg: 'var(--paris-bg)' },
  falabella:     { label: 'Falabella', color: 'var(--falabella)', bg: 'var(--falabella-bg)' },
  ripley:        { label: 'Ripley',    color: 'var(--ripley)',    bg: 'var(--ripley-bg)' },
  manual:        { label: 'Directa',   color: 'var(--text-2)',    bg: 'var(--bg-3)' },
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Nueva:      { label: 'Nueva',      color: '#2563eb', bg: '#2563eb18' },
  Despachada: { label: 'Despachada', color: '#059669', bg: '#05966918' },
  Atrasada:   { label: 'Atrasada',   color: '#dc2626', bg: '#dc262618' },
  Cancelada:  { label: 'Cancelada',  color: '#6b7280', bg: '#6b728018' },
}

interface OrdenVenta {
  id: number
  marketplace: string
  orden_id: string
  sub_orden_id: string | null
  cliente: string | null
  estado: string
  estado_unificado: string
  fecha_despacho: string | null
  fecha_llegada: string | null
  fecha_creacion: string | null
  total: number
  items: any[]
}

function getEstadoUnificado(orden: any): string {
  const now = new Date()
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (orden.fecha_despacho) {
    const [y, m, d] = orden.fecha_despacho.split('-').map(Number)
    const fecha = new Date(y, m - 1, d)
    const activos = [
      'Created', 'Acknowledged', 'ready_to_ship', 'awaiting_fulfillment',
      'pending', 'pending_by_seller', 'WAITING_ACCEPTANCE', 'WAITING_DEBIT',
      'SHIPPING', 'TO_COLLECT', 'printed_label',
    ]
    if (fecha < hoy && activos.includes(orden.estado)) return 'Atrasada'
  }
  const mapa: Record<string, string> = {
    'Created': 'Nueva', 'Acknowledged': 'Nueva',
    'Shipped': 'Despachada', 'Cancelled': 'Cancelada',
    'ready_to_ship': 'Nueva', 'awaiting_fulfillment': 'Nueva',
    'delivery_in_progress': 'Despachada', 'delivered': 'Despachada',
    'deleted': 'Cancelada', 'pending_by_seller': 'Nueva',
    'pending': 'Nueva', 'shipped': 'Despachada', 'canceled': 'Cancelada',
    'WAITING_ACCEPTANCE': 'Nueva', 'WAITING_DEBIT': 'Nueva',
    'SHIPPING': 'Despachada', 'TO_COLLECT': 'Despachada',
    'RECEIVED': 'Despachada', 'CLOSED': 'Despachada',
    'REFUSED': 'Cancelada', 'CANCELED': 'Cancelada',
    'printed_label': 'Nueva',
  }
  return mapa[orden.estado] ?? orden.estado
}

function getPrecioItem(item: any): number {
  return Number(
    item.precio || item.priceAfterDiscounts ||
    item.basePrice || item.ItemPrice || 0
  )
}

function getNombreItem(item: any): string {
  return item.nombre || item.name || item.Name || item.descripcion || '—'
}

export default function VentaOrdenes() {
  const [ordenes, setOrdenes] = useState<OrdenVenta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroMkt, setFiltroMkt] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [expandida, setExpandida] = useState<number | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await api.get('/ordenes?limit=1000')
      const raw = res.data.ordenes ?? []
      setOrdenes(raw.map((o: any) => ({
        ...o,
        estado_unificado: getEstadoUnificado(o),
      })))
    } catch {
      setOrdenes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const filtradas = useMemo(() => {
    return ordenes.filter(o => {
      if (filtroMkt && o.marketplace !== filtroMkt) return false
      if (filtroEstado && o.estado_unificado !== filtroEstado) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const items = o.items || []
        const tieneProducto = items.some((i: any) =>
          getNombreItem(i).toLowerCase().includes(q)
        )
        if (
          !o.orden_id?.toLowerCase().includes(q) &&
          !o.cliente?.toLowerCase().includes(q) &&
          !tieneProducto
        ) return false
      }
      if (filtroDesde && o.fecha_despacho && o.fecha_despacho < filtroDesde) return false
      if (filtroHasta && o.fecha_despacho && o.fecha_despacho > filtroHasta) return false
      return true
    })
  }, [ordenes, filtroMkt, filtroEstado, busqueda, filtroDesde, filtroHasta])

  const totalVentas    = filtradas.reduce((s, o) => s + (o.total || 0), 0)
  const totalNuevas    = filtradas.filter(o => o.estado_unificado === 'Nueva').length
  const totalAtrasadas = filtradas.filter(o => o.estado_unificado === 'Atrasada').length

  const IS: React.CSSProperties = {
    padding: '7px 10px', borderRadius: '7px',
    border: '0.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-1)', fontSize: '12px', outline: 'none',
  }

  const TH: React.CSSProperties = {
    padding: '9px 14px', fontSize: '11px', fontWeight: 600,
    color: 'var(--text-3)', textTransform: 'uppercase',
    letterSpacing: '0.05em', background: 'var(--bg-3)',
    textAlign: 'left', whiteSpace: 'nowrap',
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Ventas — Órdenes</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            Lista consolidada de todas las ventas por marketplace
          </div>
        </div>
        <button onClick={cargar} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--bg-2)', border: '0.5px solid var(--border)',
          borderRadius: '8px', padding: '8px 14px', fontSize: '12px',
          color: 'var(--text-2)', cursor: 'pointer',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 6A4 4 0 1 1 6 2"/><path d="M10 2v4H6"/>
          </svg>
          Actualizar
        </button>
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total órdenes',  valor: filtradas.length,                                           color: 'var(--text-1)' },
          { label: 'Ventas totales', valor: `$${Math.round(totalVentas).toLocaleString('es-CL')}`,      color: '#059669' },
          { label: 'Pendientes',     valor: totalNuevas,                                                color: '#d97706' },
          { label: 'Atrasadas',      valor: totalAtrasadas, color: totalAtrasadas > 0 ? '#dc2626' : '#059669' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{c.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: c.color }}>{c.valor}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
        background: 'var(--bg-2)', border: '0.5px solid var(--border)',
        borderRadius: '10px', padding: '12px 16px', flexWrap: 'wrap',
      }}>
        {/* Búsqueda */}
        <div style={{ position: 'relative' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
            style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
          </svg>
          <input placeholder="Buscar orden, cliente o producto..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...IS, paddingLeft: '26px', width: '240px' }} />
        </div>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {/* Marketplace */}
        {['', 'walmart_chile', 'paris_chile', 'falabella', 'ripley', 'manual'].map(m => {
          const cfg = MKT_CONFIG[m]
          return (
            <button key={m} onClick={() => setFiltroMkt(m)} style={{
              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
              border: m && cfg ? `0.5px solid ${cfg.color}44` : '0.5px solid var(--border)',
              cursor: 'pointer',
              background: filtroMkt === m ? (cfg ? cfg.bg : 'var(--accent)') : 'var(--bg)',
              color: filtroMkt === m ? (cfg ? cfg.color : 'var(--accent-fg)') : (cfg ? cfg.color : 'var(--text-3)'),
            }}>{m === '' ? 'Todos' : cfg?.label}</button>
          )
        })}

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {/* Estado */}
        {['', 'Nueva', 'Despachada', 'Atrasada', 'Cancelada'].map(e => {
          const cfg = ESTADO_CONFIG[e]
          return (
            <button key={e} onClick={() => setFiltroEstado(e)} style={{
              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
              border: '0.5px solid var(--border)', cursor: 'pointer',
              background: filtroEstado === e ? 'var(--accent)' : 'var(--bg)',
              color: filtroEstado === e ? 'var(--accent-fg)' : (cfg ? cfg.color : 'var(--text-3)'),
            }}>{e === '' ? 'Todos' : cfg?.label}</button>
          )
        })}

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {/* Fechas */}
        <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)}
          style={{ ...IS }} title="Fecha despacho desde" />
        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>→</span>
        <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)}
          style={{ ...IS }} title="Fecha despacho hasta" />

        {(filtroDesde || filtroHasta) && (
          <button onClick={() => { setFiltroDesde(''); setFiltroHasta('') }} style={{
            padding: '4px 8px', borderRadius: '6px', fontSize: '11px',
            border: '0.5px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text-3)', cursor: 'pointer',
          }}>✕</button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-3)' }}>
          {filtradas.length} órdenes
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Cargando órdenes...</div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>No hay órdenes para los filtros seleccionados</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                {['Marketplace', 'N° Orden', 'Cliente', 'Descripción', 'Fecha Despacho', 'Precio Venta', 'Estado', ''].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((o, i) => {
                const mktCfg  = MKT_CONFIG[o.marketplace] ?? { label: o.marketplace, color: 'var(--text-2)', bg: 'var(--bg-3)' }
                const estCfg  = ESTADO_CONFIG[o.estado_unificado] ?? { label: o.estado_unificado, color: 'var(--text-3)', bg: 'var(--bg-3)' }
                const items   = o.items || []
                const isExp   = expandida === o.id

                // Descripción: primer producto
                const primerItem = Array.isArray(items) ? items[0] : null
                const descripcion = primerItem ? getNombreItem(primerItem) : '—'
                const masItems = items.length > 1 ? ` +${items.length - 1} más` : ''

                // Precio total desde items
                const precioItems = items.reduce((s: number, item: any) => {
                  const qty = Number(item.cantidad || item.Quantity || 1)
                  return s + getPrecioItem(item) * qty
                }, 0)
                const precio = precioItems > 0 ? precioItems : (o.total || 0)

                // Días de atraso
                const now = new Date()
                const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                let diasAtraso = 0
                if (o.fecha_despacho && o.estado_unificado === 'Atrasada') {
                  const [y, m, d] = o.fecha_despacho.split('-').map(Number)
                  const fd = new Date(y, m - 1, d)
                  diasAtraso = Math.floor((hoy.getTime() - fd.getTime()) / (1000 * 60 * 60 * 24))
                }

                return (
                  <>
                    <tr key={o.id}
                      style={{ borderBottom: '0.5px solid var(--border)', cursor: items.length > 1 ? 'pointer' : 'default' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                      onClick={() => items.length > 1 && setExpandida(isExp ? null : o.id)}
                    >
                      {/* Marketplace */}
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: mktCfg.bg, color: mktCfg.color }}>
                          {mktCfg.label}
                        </span>
                      </td>

                      {/* N° Orden */}
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--info)', fontWeight: 500 }}>
                          {o.orden_id}
                        </div>
                        {o.sub_orden_id && o.sub_orden_id !== o.orden_id && (
                          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-3)' }}>{o.sub_orden_id}</div>
                        )}
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
                          {o.fecha_creacion ? new Date(o.fecha_creacion).toLocaleDateString('es-CL') : '—'}
                        </div>
                      </td>

                      {/* Cliente */}
                      <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-1)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.cliente || '—'}
                      </td>

                      {/* Descripción */}
                      <td style={{ padding: '11px 14px', maxWidth: '280px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-1)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {descripcion}
                        </div>
                        {masItems && (
                          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{masItems}</div>
                        )}
                      </td>

                      {/* Fecha despacho */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        {o.fecha_despacho ? (
                          <div>
                            <div style={{ fontSize: '12px', color: o.estado_unificado === 'Atrasada' ? '#dc2626' : 'var(--text-2)', fontWeight: o.estado_unificado === 'Atrasada' ? 600 : 400 }}>
                              {new Date(o.fecha_despacho + 'T00:00:00').toLocaleDateString('es-CL')}
                            </div>
                            {diasAtraso > 0 && (
                              <div style={{ fontSize: '10px', color: '#dc2626' }}>+{diasAtraso} días atraso</div>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>}
                      </td>

                      {/* Precio venta */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                          ${Math.round(precio).toLocaleString('es-CL')}
                        </div>
                        {items.length > 1 && (
                          <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{items.length} productos</div>
                        )}
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: estCfg.bg, color: estCfg.color }}>
                          {estCfg.label}
                        </span>
                      </td>

                      {/* Expandir */}
                      <td style={{ padding: '11px 14px' }}>
                        {items.length > 1 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{isExp ? '▲' : '▼'}</span>
                        )}
                      </td>
                    </tr>

                    {/* Detalle productos expandido */}
                    {isExp && items.map((item: any, idx: number) => {
                      const qty   = Number(item.cantidad || item.Quantity || 1)
                      const prec  = getPrecioItem(item)
                      const nom   = getNombreItem(item)
                      const sku   = item.sku || item.Sku || item.sellerSku || ''
                      return (
                        <tr key={`${o.id}-item-${idx}`} style={{ background: '#05966908', borderBottom: '0.5px solid var(--border)' }}>
                          <td colSpan={2} />
                          <td colSpan={2} style={{ padding: '7px 14px 7px 28px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-1)' }}>└ {nom}</div>
                            {sku && <div style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'monospace' }}>{sku}</div>}
                          </td>
                          <td style={{ padding: '7px 14px', fontSize: '12px', color: 'var(--text-3)' }}>
                            ×{qty}
                          </td>
                          <td style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 600, color: '#059669' }}>
                            ${Math.round(prec * qty).toLocaleString('es-CL')}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      )
                    })}
                  </>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                <td colSpan={5} style={{ padding: '11px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>
                  Total ({filtradas.length} órdenes)
                </td>
                <td style={{ padding: '11px 14px', fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                  ${Math.round(totalVentas).toLocaleString('es-CL')}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
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
    // Walmart
    'Created': 'Nueva', 'Acknowledged': 'Nueva',
    'Shipped': 'Despachada', 'Cancelled': 'Cancelada',
    // Paris
    'ready_to_ship': 'Nueva', 'awaiting_fulfillment': 'Nueva',
    'delivery_in_progress': 'Despachada', 'delivered': 'Despachada',
    'deleted': 'Cancelada', 'cancelled': 'Cancelada',
    'canceled_by_seller': 'Cancelada', 'canceled_by_customer': 'Cancelada',
    'refused': 'Cancelada', 'incident': 'Cancelada',
    // Ripley / Falabella
    'pending_by_seller': 'Nueva', 'pending': 'Nueva',
    'shipped': 'Despachada', 'canceled': 'Cancelada',
    'WAITING_ACCEPTANCE': 'Nueva', 'WAITING_DEBIT': 'Nueva',
    'SHIPPING': 'Despachada', 'TO_COLLECT': 'Despachada',
    'RECEIVED': 'Despachada', 'CLOSED': 'Despachada',
    'REFUSED': 'Cancelada', 'CANCELED': 'Cancelada',
    'printed_label': 'Nueva',
  }
  return mapa[orden.estado] ?? orden.estado
}

function getPrecio(o: OrdenVenta): number {
  const items = o.items || []
  const desdeItems = items.reduce((s: number, item: any) => {
    const qty = Number(item.cantidad || item.Quantity || 1)
    const p = Number(item.precio || item.priceAfterDiscounts || item.basePrice || item.ItemPrice || 0)
    return s + p * qty
  }, 0)
  return desdeItems > 0 ? desdeItems : (o.total || 0)
}

function getNombreItem(item: any): string {
  return item.nombre || item.name || item.Name || item.descripcion || '—'
}

function getPrecioItem(item: any): number {
  return Number(item.precio || item.priceAfterDiscounts || item.basePrice || item.ItemPrice || 0)
}

function getMesPorDefecto() {
  const now = new Date()
  const desde = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const hasta = now.toISOString().split('T')[0]
  return { desde, hasta }
}

export default function VentaOrdenes() {
  const { desde: defaultDesde, hasta: defaultHasta } = getMesPorDefecto()

  const [ordenes, setOrdenes] = useState<OrdenVenta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroMkt, setFiltroMkt] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroDesde, setFiltroDesde] = useState(defaultDesde)
  const [filtroHasta, setFiltroHasta] = useState(defaultHasta)
  const [expandida, setExpandida] = useState<number | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await api.get('/ordenes?limit=2000')
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

  // Órdenes del mes filtradas por fecha_creacion
    const ordenesMes = useMemo(() => {
    return ordenes.filter(o => {
        const fechaRef = o.fecha_despacho || ''
        if (!fechaRef) return false
        if (filtroDesde && fechaRef < filtroDesde) return false
        if (filtroHasta && fechaRef > filtroHasta) return false
        return true
    })
    }, [ordenes, filtroDesde, filtroHasta])

  // Canceladas del mes (para el card)
    const canceladasMes = useMemo(() =>
    ordenesMes.filter(o => {
        if (o.estado_unificado !== 'Cancelada') return false
        if (o.marketplace === 'falabella') return false
        const items = o.items || []
        const tieneJamaroff = items.some((item: any) => {
        const nombre = (item.nombre || item.name || item.Name || item.descripcion || '').toLowerCase()
        return nombre.includes('jamaroff')
        })
        return !tieneJamaroff
    }),
    [ordenesMes]
    )

  // Activas del mes (sin canceladas) — estas son las que se muestran en tabla
    const activasMes = useMemo(() =>
    ordenesMes.filter(o => {
        if (o.estado_unificado === 'Cancelada') return false
        if (o.marketplace === 'falabella') return false
        const items = o.items || []
        const tieneJamaroff = items.some((item: any) => {
        const nombre = (item.nombre || item.name || item.Name || item.descripcion || '').toLowerCase()
        return nombre.includes('jamaroff')
        })
        if (tieneJamaroff) return false
        return true
    }),
    [ordenesMes]
    )

  // Filtros adicionales sobre activas
  const filtradas = useMemo(() => {
    return activasMes.filter(o => {
      if (filtroMkt && o.marketplace !== filtroMkt) return false
      if (filtroEstado && o.estado_unificado !== filtroEstado) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const items = o.items || []
        const tieneProducto = items.some((i: any) => getNombreItem(i).toLowerCase().includes(q))
        if (
          !o.orden_id?.toLowerCase().includes(q) &&
          !o.cliente?.toLowerCase().includes(q) &&
          !tieneProducto
        ) return false
      }
      return true
    })
  }, [activasMes, filtroMkt, filtroEstado, busqueda])

  // Totales
  const totalVentas      = filtradas.reduce((s, o) => s + getPrecio(o), 0)
  const totalCanceladas  = canceladasMes.reduce((s, o) => s + getPrecio(o), 0)
  const totalNuevas      = filtradas.filter(o => o.estado_unificado === 'Nueva').length
  const totalAtrasadas   = filtradas.filter(o => o.estado_unificado === 'Atrasada').length
  const totalDespachadas = filtradas.filter(o => o.estado_unificado === 'Despachada').length

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

  const now = new Date()
  const nombreMes = now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Venta Órdenes</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            {nombreMes} · Órdenes activas del período
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} style={IS} />
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>→</span>
          <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} style={IS} />
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
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Total órdenes',   valor: filtradas.length,                                              color: 'var(--text-1)', bg: 'var(--bg-3)' },
          { label: 'Ventas del mes',  valor: `$${Math.round(totalVentas).toLocaleString('es-CL')}`,        color: '#059669', bg: '#05966918' },
          { label: 'Nuevas',          valor: totalNuevas,                                                   color: '#2563eb', bg: '#2563eb18' },
          { label: 'Despachadas',     valor: totalDespachadas,                                              color: '#059669', bg: '#05966918' },
          { label: 'Atrasadas',       valor: totalAtrasadas, color: totalAtrasadas > 0 ? '#dc2626' : '#059669', bg: totalAtrasadas > 0 ? '#dc262618' : '#05966918' },
          { label: 'Cancelaciones',   valor: `-$${Math.round(totalCanceladas).toLocaleString('es-CL')}`,   color: '#dc2626', bg: '#dc262618' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-2)', border: `0.5px solid ${c.bg === 'var(--bg-3)' ? 'var(--border)' : c.bg}`, borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{c.label}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: c.color }}>{c.valor}</div>
            {c.label === 'Cancelaciones' && canceladasMes.length > 0 && (
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{canceladasMes.length} órdenes</div>
            )}
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
        {(['', 'walmart_chile', 'paris_chile', 'falabella', 'ripley', 'manual'] as const).map(m => {
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

        {/* Estado (sin cancelada) */}
        {(['', 'Nueva', 'Despachada', 'Atrasada'] as const).map(e => {
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

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-3)' }}>
          {filtradas.length} órdenes · <strong style={{ color: '#059669' }}>${Math.round(totalVentas).toLocaleString('es-CL')}</strong>
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
                {['Marketplace', 'N° Orden', 'Cliente', 'Descripción', 'Fecha Creación', 'Fecha Despacho', 'Precio Venta', 'Estado', ''].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((o, i) => {
                const mktCfg = MKT_CONFIG[o.marketplace] ?? { label: o.marketplace, color: 'var(--text-2)', bg: 'var(--bg-3)' }
                const estCfg = ESTADO_CONFIG[o.estado_unificado] ?? { label: o.estado_unificado, color: 'var(--text-3)', bg: 'var(--bg-3)' }
                const items  = o.items || []
                const isExp  = expandida === o.id
                const primerItem = Array.isArray(items) ? items[0] : null
                const descripcion = primerItem ? getNombreItem(primerItem) : '—'
                const masItems = items.length > 1 ? ` +${items.length - 1} más` : ''
                const precio = getPrecio(o)

                const now2 = new Date()
                const hoy2 = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate())
                let diasAtraso = 0
                if (o.fecha_despacho && o.estado_unificado === 'Atrasada') {
                  const [y, m2, d] = o.fecha_despacho.split('-').map(Number)
                  const fd = new Date(y, m2 - 1, d)
                  diasAtraso = Math.floor((hoy2.getTime() - fd.getTime()) / (1000 * 60 * 60 * 24))
                }

                return (
                  <>
                    <tr key={o.id}
                      style={{ borderBottom: '0.5px solid var(--border)', cursor: items.length > 1 ? 'pointer' : 'default' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                      onClick={() => items.length > 1 && setExpandida(isExp ? null : o.id)}
                    >
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: mktCfg.bg, color: mktCfg.color }}>
                          {mktCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--info)', fontWeight: 500 }}>{o.orden_id}</div>
                        {o.sub_orden_id && o.sub_orden_id !== o.orden_id && (
                          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-3)' }}>{o.sub_orden_id}</div>
                        )}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-1)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.cliente || '—'}
                      </td>
                      <td style={{ padding: '11px 14px', maxWidth: '260px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-1)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {descripcion}
                        </div>
                        {masItems && <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{masItems}</div>}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                        {o.fecha_creacion ? new Date(o.fecha_creacion).toLocaleDateString('es-CL') : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        {o.fecha_despacho ? (
                          <div>
                            <div style={{ fontSize: '12px', color: o.estado_unificado === 'Atrasada' ? '#dc2626' : 'var(--text-2)', fontWeight: o.estado_unificado === 'Atrasada' ? 600 : 400 }}>
                              {new Date(o.fecha_despacho + 'T00:00:00').toLocaleDateString('es-CL')}
                            </div>
                            {diasAtraso > 0 && <div style={{ fontSize: '10px', color: '#dc2626' }}>+{diasAtraso}d</div>}
                          </div>
                        ) : <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                          ${Math.round(precio).toLocaleString('es-CL')}
                        </div>
                        {items.length > 1 && <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{items.length} productos</div>}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: estCfg.bg, color: estCfg.color }}>
                          {estCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {items.length > 1 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{isExp ? '▲' : '▼'}</span>
                        )}
                      </td>
                    </tr>

                    {/* Detalle productos */}
                    {isExp && items.map((item: any, idx: number) => {
                      const qty  = Number(item.cantidad || item.Quantity || 1)
                      const prec = getPrecioItem(item)
                      const nom  = getNombreItem(item)
                      const sku  = item.sku || item.Sku || item.sellerSku || ''
                      return (
                        <tr key={`${o.id}-${idx}`} style={{ background: '#05966908', borderBottom: '0.5px solid var(--border)' }}>
                          <td colSpan={2} />
                          <td colSpan={2} style={{ padding: '7px 14px 7px 28px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-1)' }}>└ {nom}</div>
                            {sku && <div style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'monospace' }}>{sku}</div>}
                          </td>
                          <td />
                          <td style={{ padding: '7px 14px', fontSize: '12px', color: 'var(--text-3)' }}>×{qty}</td>
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
                <td colSpan={6} style={{ padding: '11px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>
                  Total activas ({filtradas.length}) · Canceladas mes: {canceladasMes.length}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                    ${Math.round(totalVentas).toLocaleString('es-CL')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>
                    -{`$${Math.round(totalCanceladas).toLocaleString('es-CL')}`} cancelado
                  </div>
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
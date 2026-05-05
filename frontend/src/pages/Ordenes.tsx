import { useEffect, useState, useMemo } from 'react'
import { dbApi, marketplaceApi, api } from '../api/client'
import VistaMaestra from '../components/components_orders/VistaMaestra'
import ModalEmitirBoleta from '../components/components_orders/ModalEmitirBoleta'
import OrdenModal from '../components/components_orders/OrdenModal'
import ManifiestoDespacho from '../components/components_orders/ManifiestoDespacho'

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
  fulfillment?: string
  total: number | null
  items: any[]
  raw: any
  fecha_creacion: string | null
  fecha_actualizacion: string | null
  tipo_documento?: string
  boleta_folio?: number
  boleta_url?: string
}

// =============================================================================
// Helpers
// =============================================================================

function getEstadoUnificado(orden: any): string {
  // Órdenes de fulfillment se consideran siempre despachadas
  if (orden.fulfillment === 'by-paris') return 'Despachada'

  const now = new Date()
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (orden.fecha_despacho) {
    const [y, m, d] = orden.fecha_despacho.split('-').map(Number)
    const fecha = new Date(y, m - 1, d)
    const activos = [
      'Created', 'Acknowledged',
      'ready_to_ship', 'awaiting_fulfillment',
      'pending', 'pending_by_seller',
      'WAITING_ACCEPTANCE', 'WAITING_DEBIT', 'SHIPPING', 'TO_COLLECT','printed_label'
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
    'SHIPPING': 'Nueva', 'TO_COLLECT': 'Nueva',
    'RECEIVED': 'Despachada', 'CLOSED': 'Despachada',
    'REFUSED': 'Cancelada', 'CANCELED': 'Cancelada','printed_label': 'Nueva',
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
  const now = new Date()
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const [y, m, d] = fecha.split('-').map(Number)
  const df = new Date(y, m - 1, d)
  const activos = ['Created', 'Acknowledged', 'ready_to_ship', 'awaiting_fulfillment']
  if (df < hoy && activos.includes(estado)) return 'urgent'
  const diff = Math.ceil((df.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
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
  const [ordenParaBoleta, setOrdenParaBoleta] = useState<Orden | null>(null)
  const [mostrarManifiesto, setMostrarManifiesto] = useState(false)

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
      
      // Sync marketplaces propios
      await Promise.all([
        dbApi.syncWalmart(),
        dbApi.syncParis(),
        dbApi.syncFalabella(),
        dbApi.syncRipley()
      ])

      // Sync APIs de clientes externos
      const resApis = await api.get('/api-clientes')
      const apis = resApis.data.apis || []
      await Promise.all(apis.map((a: any) => 
        api.post(`/api-clientes/${a.id}/sync`).catch(e => console.warn(`Error sync cliente ${a.id}:`, e))
      ))

      await cargar()
    } catch (e) { console.error(e) }
    finally { setSyncing(false) }
  }

  useEffect(() => { cargar() }, [])

  const usuarioGuardado = localStorage.getItem('usuario')
  const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null
  const soloLectura = usuario?.rol === 'view'
  const esAdminMaster = usuario?.rol === 'admin_master'

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

  const eliminar = async (id: number) => {
  if (!confirm('¿Eliminar esta orden? Esta acción no se puede deshacer.')) return
  try {
    await api.delete(`/ordenes/${id}`)
    setOrdenes(prev => prev.filter(o => o.id !== id))
  } catch (e) {
    console.error(e)
    alert('Error al eliminar la orden')
  }
}

  return (
  <div style={{ animation: 'fadeIn 0.2s ease' }}>
    {ordenSeleccionada && <OrdenModal orden={ordenSeleccionada} onClose={() => setOrdenSeleccionada(null)} />}
    {mostrarMaestra && <VistaMaestra ordenes={ordenes} onClose={() => setMostrarMaestra(false)} />}
    {mostrarManifiesto && <ManifiestoDespacho ordenes={ordenes} onClose={() => setMostrarManifiesto(false)} />}
    {ordenParaBoleta && (
      <ModalEmitirBoleta
        orden={ordenParaBoleta}
        onClose={() => setOrdenParaBoleta(null)}
        onEmitida={() => cargar()}
      />
    )}

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
                    <button onClick={() => setMostrarManifiesto(true)} style={{
            ...IS, display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--danger)', color: '#fff', border: 'none', fontWeight: 500,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M2 2h8v8H2zM4 5h4M4 7h2"/>
            </svg>
            Manifiesto
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
                          {!soloLectura && ['Nueva', 'Atrasada', 'Despachada'].includes(estadoERP) && o.fulfillment !== 'by-paris' && (
                            o.boleta_folio ? (
                              <button onClick={() => window.open(`/api/v1/boletas/${o.id}/pdf-view`, '_blank')} style={{
                                fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                                border: '0.5px solid var(--info)', background: 'var(--info-bg)',
                                color: 'var(--info)', cursor: 'pointer', whiteSpace: 'nowrap',
                              }}>📄 Folio {o.boleta_folio}</button>
                            ) : o.tipo_documento === 'factura' ? (
                              <button disabled style={{
                                fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                                border: '0.5px solid var(--warning)', background: 'var(--warning-bg)',
                                color: 'var(--warning)', cursor: 'not-allowed', whiteSpace: 'nowrap',
                                opacity: 0.7,
                              }}>🧾 Facturar</button>
                            ) : (
                              <button onClick={() => setOrdenParaBoleta(o)} style={{
                                fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                                border: '0.5px solid var(--success)', background: 'var(--success-bg)',
                                color: 'var(--success)', cursor: 'pointer', whiteSpace: 'nowrap',
                              }}>Boleta</button>
                            )
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
                          {esAdminMaster && (
                            <button onClick={() => eliminar(o.id)} style={{
                              fontSize: '12px', padding: '5px 10px', borderRadius: '5px',
                              border: '0.5px solid var(--danger)', background: 'var(--danger-bg)',
                              color: 'var(--danger)', cursor: 'pointer', whiteSpace: 'nowrap',
                            }}>Eliminar</button>
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
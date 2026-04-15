import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'

interface Trabajador {
  id: number
  rut: string
  nombre_completo: string
  cargo: string
}

interface Producto {
  id: number
  sku_padre: string
  sku: string
  descripcion: string
  descripcion_esqueleto?: string
  tipo_producto: string
  precio_costura: number
  precio_tapiceria: number
  precio_esqueleteria: number
}

interface LineaOT {
  id: string
  numero_ot: string
  fecha: string
  trabajador_id: string
  producto_interno_id: string
  descripcion: string
}

interface OrdenTrabajo {
  id: number
  numero_ot: string
  fecha: string
  trabajador_id: number
  trabajador_nombre: string
  trabajador_cargo: string
  producto_interno_id: number
  producto_sku: string
  producto_descripcion: string
  descripcion: string
  cargo_trabajador: string
  precio_aplicado: number
  estado: string
  fecha_creacion: string
}

const cargoColor: Record<string, { bg: string; color: string }> = {
  costura:      { bg: 'var(--success-bg)', color: 'var(--success)' },
  tapiceria:    { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  esqueleteria: { bg: 'var(--info-bg)',    color: 'var(--info)' },
}

const estadoColor: Record<string, { bg: string; color: string }> = {
  pendiente:  { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  completada: { bg: 'var(--success-bg)', color: 'var(--success)' },
  cancelada:  { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
}

const emptyLinea = (): LineaOT => ({
  id: Date.now().toString(),
  numero_ot: '',
  fecha: new Date().toISOString().split('T')[0],
  trabajador_id: '',
  producto_interno_id: '',
  descripcion: '',
})

// =============================================================================
// Modal Ingreso OT
// =============================================================================
function IngresoOTModal({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [trabajadorId, setTrabajadorId] = useState('')
  const [lineas, setLineas] = useState<LineaOT[]>([emptyLinea()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/ordenes-trabajo/trabajadores-produccion').then(r => setTrabajadores(r.data.trabajadores || []))
    api.get('/ordenes-trabajo/productos-produccion').then(r => setProductos(r.data.productos || []))
  }, [])

  const trabajador = trabajadores.find(t => t.id === Number(trabajadorId))

  const getDescripcion = (productoId: string) => {
    const producto = productos.find(p => p.id === Number(productoId))
    if (!producto || !trabajador) return ''
    if (trabajador.cargo === 'esqueleteria') return producto.descripcion_esqueleto || producto.descripcion
    return producto.descripcion
  }

  const getPrecio = (productoId: string) => {
    const producto = productos.find(p => p.id === Number(productoId))
    if (!producto || !trabajador) return null
    if (trabajador.cargo === 'costura') return producto.precio_costura
    if (trabajador.cargo === 'tapiceria') return producto.precio_tapiceria
    if (trabajador.cargo === 'esqueleteria') return producto.precio_esqueleteria
    return null
  }

  const updateLinea = (id: string, key: string, value: string) => {
    setLineas(prev => prev.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, [key]: value }
      if (key === 'producto_interno_id' && value) {
        updated.descripcion = getDescripcion(value)
      }
      return updated
    }))
  }

  // Re-calcular descripciones cuando cambia el trabajador
  useEffect(() => {
    if (!trabajadorId) return
    setLineas(prev => prev.map(l => ({
      ...l,
      descripcion: l.producto_interno_id ? getDescripcion(l.producto_interno_id) : l.descripcion
    })))
  }, [trabajadorId])

  const agregarLinea = () => setLineas(prev => [...prev, emptyLinea()])
  const eliminarLinea = (id: string) => {
    if (lineas.length === 1) return
    setLineas(prev => prev.filter(l => l.id !== id))
  }

  const guardar = async () => {
    setError('')
    if (!trabajadorId) { setError('Debes seleccionar un trabajador'); return }
    for (const l of lineas) {
      if (!l.numero_ot || !l.fecha || !l.producto_interno_id) {
        setError('N° OT, fecha y producto son obligatorios en cada línea')
        return
      }
    }
    try {
      setSaving(true)
      await api.post('/ordenes-trabajo', {
        ordenes: lineas.map(l => ({
          numero_ot: l.numero_ot,
          fecha: l.fecha,
          trabajador_id: Number(trabajadorId),
          producto_interno_id: Number(l.producto_interno_id),
          descripcion: l.descripcion,
        }))
      })
      onSave(); onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '7px 10px', fontSize: '13px',
    color: 'var(--text-1)', outline: 'none', width: '100%',
  }

  const totalPrecio = lineas.reduce((sum, l) => sum + (getPrecio(l.producto_interno_id) || 0), 0)
  const cargoCol = trabajador ? cargoColor[trabajador.cargo] : null

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, padding: '24px', overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: '12px',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '960px',
        animation: 'fadeIn 0.15s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'var(--bg-2)', zIndex: 1, borderRadius: '12px 12px 0 0',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>
              Ingreso de Órdenes de Trabajo
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
              {lineas.length} OT{lineas.length > 1 ? 's' : ''}
              {totalPrecio > 0 && ` · Total: $${totalPrecio.toLocaleString('es-CL')}`}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
            width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>

          {/* Selección trabajador */}
          <div style={{
            background: 'var(--bg)', border: '0.5px solid var(--border)',
            borderRadius: '10px', padding: '16px', marginBottom: '20px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Trabajador
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
              <select value={trabajadorId} onChange={e => setTrabajadorId(e.target.value)} style={{ ...IS, fontSize: '14px', padding: '10px 12px' }}>
                <option value="">Seleccionar trabajador...</option>
                {trabajadores.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre_completo} — {t.cargo}</option>
                ))}
              </select>
              {trabajador && cargoCol && (
                <span style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  background: cargoCol.bg, color: cargoCol.color, whiteSpace: 'nowrap',
                }}>
                  {trabajador.cargo.charAt(0).toUpperCase() + trabajador.cargo.slice(1)}
                </span>
              )}
            </div>
          </div>

          {/* Tabla OTs */}
          <div style={{ border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Producto {trabajador?.cargo === 'esqueleteria' ? '(SKU Padre)' : ''}
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', width: '130px' }}>
                    N° Orden
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', width: '140px' }}>
                    Fecha
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Descripción
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em', width: '110px' }}>
                    Precio
                  </th>
                  <th style={{ width: '40px', borderBottom: '0.5px solid var(--border)' }}></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((linea, idx) => {
                  const precio = getPrecio(linea.producto_interno_id)
                  return (
                    <tr key={linea.id} style={{
                      borderBottom: idx < lineas.length - 1 ? '0.5px solid var(--border)' : 'none',
                      background: idx % 2 === 0 ? 'transparent' : 'var(--bg)',
                    }}>
                      <td style={{ padding: '10px 14px' }}>
                        <select value={linea.producto_interno_id}
                          onChange={e => updateLinea(linea.id, 'producto_interno_id', e.target.value)}
                          style={IS} disabled={!trabajadorId}>
                          <option value="">Seleccionar producto...</option>
                          {productos.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.sku_padre} — {trabajador?.cargo === 'esqueleteria'
                                ? (p.descripcion_esqueleto || p.descripcion)
                                : p.descripcion}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <input value={linea.numero_ot}
                          onChange={e => updateLinea(linea.id, 'numero_ot', e.target.value)}
                          style={{ ...IS, fontFamily: 'monospace', fontSize: '12px' }}
                          placeholder="OT-001" disabled={!trabajadorId} />
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <input type="date" value={linea.fecha}
                          onChange={e => updateLinea(linea.id, 'fecha', e.target.value)}
                          style={IS} disabled={!trabajadorId} />
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <input value={linea.descripcion}
                          onChange={e => updateLinea(linea.id, 'descripcion', e.target.value)}
                          style={{ ...IS, fontSize: '12px', color: 'var(--text-2)' }}
                          placeholder={trabajadorId ? 'Auto-llenado al seleccionar producto' : '—'} />
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {precio !== null ? (
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)' }}>
                            ${precio.toLocaleString('es-CL')}
                          </span>
                        ) : <span style={{ color: 'var(--text-4)', fontSize: '12px' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {lineas.length > 1 && (
                          <button onClick={() => eliminarLinea(linea.id)} style={{
                            background: 'none', border: 'none', color: 'var(--danger)',
                            cursor: 'pointer', fontSize: '16px', padding: '0', lineHeight: 1,
                          }}>🗑</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {totalPrecio > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--bg)', borderTop: '0.5px solid var(--border)' }}>
                    <td colSpan={4} style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>
                      Total {lineas.length} OT{lineas.length > 1 ? 's' : ''}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '15px', fontWeight: 700, color: 'var(--success)' }}>
                      ${totalPrecio.toLocaleString('es-CL')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Agregar línea */}
          <button onClick={agregarLinea} disabled={!trabajadorId} style={{
            padding: '8px 16px', borderRadius: '7px',
            border: '0.5px dashed var(--border)', background: 'transparent',
            color: trabajadorId ? 'var(--text-2)' : 'var(--text-4)',
            fontSize: '12px', cursor: trabajadorId ? 'pointer' : 'not-allowed',
            width: '100%', marginBottom: '20px',
          }}>
            + Agregar otra OT
          </button>

          {error && (
            <div style={{ padding: '10px', background: 'var(--danger-bg)', borderRadius: '7px', color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: '8px',
              border: '0.5px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
            }}>Cancelar</button>
            <button onClick={guardar} disabled={saving || !trabajadorId} style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              background: 'var(--accent)', color: 'var(--accent-fg)',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              opacity: (saving || !trabajadorId) ? 0.6 : 1,
            }}>
              {saving ? 'Guardando...' : `Guardar ${lineas.length} OT${lineas.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Página Principal
// =============================================================================
export default function OrdenesTrabajo() {
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarIngreso, setMostrarIngreso] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await api.get('/ordenes-trabajo')
      setOrdenes(res.data.ordenes || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const filtradas = useMemo(() => {
    let result = [...ordenes]
    if (busqueda) {
      const q = busqueda.toLowerCase()
      result = result.filter(o =>
        o.numero_ot?.toLowerCase().includes(q) ||
        o.trabajador_nombre?.toLowerCase().includes(q) ||
        o.producto_sku?.toLowerCase().includes(q) ||
        o.descripcion?.toLowerCase().includes(q)
      )
    }
    if (filtroCargo) result = result.filter(o => o.cargo_trabajador === filtroCargo)
    if (filtroEstado) result = result.filter(o => o.estado === filtroEstado)
    if (filtroDesde) result = result.filter(o => o.fecha >= filtroDesde)
    if (filtroHasta) result = result.filter(o => o.fecha <= filtroHasta)
    return result
  }, [ordenes, busqueda, filtroCargo, filtroEstado, filtroDesde, filtroHasta])

  const totalPagado = filtradas.reduce((sum, o) => sum + (o.precio_aplicado || 0), 0)

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '7px 12px', fontSize: '13px',
    color: 'var(--text-1)', outline: 'none', cursor: 'pointer',
  }

  const TH: React.CSSProperties = {
    padding: '11px 14px', textAlign: 'left', fontSize: '12px',
    fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)',
    whiteSpace: 'nowrap', background: 'var(--bg)',
  }

  const TD: React.CSSProperties = {
    padding: '11px 14px', borderBottom: '0.5px solid var(--border)', verticalAlign: 'middle',
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {mostrarIngreso && (
        <IngresoOTModal onClose={() => setMostrarIngreso(false)} onSave={cargar} />
      )}

      {/* Topbar */}
      <div style={{
        padding: '16px 24px', background: 'var(--bg-2)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)' }}>
            Órdenes de Trabajo
            <span style={{ fontSize: '13px', color: 'var(--text-4)', fontWeight: 400 }}> · {filtradas.length} de {ordenes.length}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            Registro de producción por trabajador
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
              </svg>
              <input placeholder="Buscar OT, trabajador, SKU..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...IS, paddingLeft: '30px', width: '220px' }} />
            </div>
            <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)} style={IS}>
              <option value="">Todos los cargos</option>
              <option value="costura">Costura</option>
              <option value="tapiceria">Tapicería</option>
              <option value="esqueleteria">Esqueletería</option>
            </select>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={IS}>
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Desde</span>
              <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} style={IS} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Hasta</span>
              <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} style={IS} />
            </div>
          </div>
        </div>
        <button onClick={() => setMostrarIngreso(true)} style={{
          ...IS, display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          fontWeight: 500, marginTop: '4px', whiteSpace: 'nowrap',
        }}>
          + Ingresar OT
        </button>
      </div>

      {/* KPIs */}
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Total OTs', value: filtradas.length, color: 'var(--text-1)' },
            { label: 'Costura', value: filtradas.filter(o => o.cargo_trabajador === 'costura').length, color: 'var(--success)' },
            { label: 'Tapicería', value: filtradas.filter(o => o.cargo_trabajador === 'tapiceria').length, color: 'var(--warning)' },
            { label: 'Total pagado', value: `$${totalPagado.toLocaleString('es-CL')}`, color: 'var(--success)' },
          ].map((k, i) => (
            <div key={i} style={{
              background: 'var(--bg-2)', border: '0.5px solid var(--border)',
              borderRadius: '10px', padding: '14px',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>N° OT</th>
                  <th style={TH}>Fecha</th>
                  <th style={TH}>Trabajador</th>
                  <th style={TH}>Cargo</th>
                  <th style={TH}>Producto</th>
                  <th style={TH}>Descripción</th>
                  <th style={TH}>Precio</th>
                  <th style={TH}>Estado</th>
                  <th style={{ ...TH, cursor: 'default' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(9)].map((_, j) => (
                    <td key={j} style={TD}>
                      <div style={{ height: '14px', background: 'var(--bg-3)', borderRadius: '3px', animation: 'pulse 1.5s infinite' }} />
                    </td>
                  ))}</tr>
                )) : filtradas.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                    No hay órdenes de trabajo.{' '}
                    <button onClick={() => setMostrarIngreso(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' }}>
                      Ingresar la primera
                    </button>
                  </td></tr>
                ) : filtradas.map((o, i) => {
                  const col = cargoColor[o.cargo_trabajador] || { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                  const estCol = estadoColor[o.estado] || { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                  return (
                    <tr key={i}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{ transition: 'background 0.1s' }}>
                      <td style={{ ...TD, fontFamily: 'monospace', fontSize: '12px', color: 'var(--info)', fontWeight: 500 }}>
                        {o.numero_ot}
                      </td>
                      <td style={{ ...TD, fontSize: '12px', color: 'var(--text-2)' }}>{o.fecha}</td>
                      <td style={{ ...TD, fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>
                        {o.trabajador_nombre}
                      </td>
                      <td style={TD}>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: col.bg, color: col.color }}>
                          {o.cargo_trabajador}
                        </span>
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-3)' }}>
                        {o.producto_sku}
                      </td>
                      <td style={{ ...TD, fontSize: '12px', color: 'var(--text-2)', maxWidth: '200px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {o.descripcion || '—'}
                        </div>
                      </td>
                      <td style={{ ...TD, fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>
                        ${(o.precio_aplicado || 0).toLocaleString('es-CL')}
                      </td>
                      <td style={TD}>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: estCol.bg, color: estCol.color }}>
                          {o.estado}
                        </span>
                      </td>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {o.estado === 'pendiente' && (
                            <button onClick={async () => {
                              await api.put(`/ordenes-trabajo/${o.id}/estado`, { estado: 'completada' })
                              cargar()
                            }} style={{
                              fontSize: '11px', padding: '4px 8px', borderRadius: '5px',
                              border: 'none', background: 'var(--success)', color: '#fff', cursor: 'pointer',
                            }}>✓ Completar</button>
                          )}
                          <button onClick={async () => {
                            if (!confirm(`¿Eliminar OT ${o.numero_ot}?`)) return
                            await api.delete(`/ordenes-trabajo/${o.id}`)
                            cargar()
                          }} style={{
                            fontSize: '11px', padding: '4px 8px', borderRadius: '5px',
                            border: '0.5px solid var(--danger)', background: 'var(--danger-bg)',
                            color: 'var(--danger)', cursor: 'pointer',
                          }}>Eliminar</button>
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
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
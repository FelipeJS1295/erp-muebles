import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'

interface Cliente {
  id: number
  rut?: string
  nombre: string
  email?: string
  telefono?: string
}

interface ItemOrden {
  id: string
  sku: string
  nombre: string
  cantidad: number
  precio: number
}

interface OrdenManual {
  id: number
  orden_id: string
  cliente_id?: number
  cliente_nombre?: string
  cliente_rut?: string
  cliente_email?: string
  estado: string
  fecha_despacho?: string
  fecha_llegada?: string
  total: number
  items: any[]
  notas?: string
  fecha_creacion: string
}

const estadoColor: Record<string, { bg: string; color: string }> = {
  pendiente:  { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  despachada: { bg: 'var(--success-bg)', color: 'var(--success)' },
  entregada:  { bg: 'var(--info-bg)',    color: 'var(--info)' },
  cancelada:  { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
}

const emptyItem = (): ItemOrden => ({
  id: Date.now().toString() + Math.random(),
  sku: '', nombre: '', cantidad: 1, precio: 0,
})

// =============================================================================
// Modal Cliente
// =============================================================================
function ClienteModal({ onClose, onSave }: { onClose: () => void, onSave: (c: Cliente) => void }) {
  const [form, setForm] = useState({ rut: '', nombre: '', email: '', telefono: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const formatRut = (rut: string) => {
    const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase()
    if (clean.length < 2) return clean
    const body = clean.slice(0, -1)
    const dv = clean.slice(-1)
    return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
  }

  const guardar = async () => {
    if (!form.nombre) { setError('El nombre es obligatorio'); return }
    try {
      setSaving(true)
      const res = await api.post('/clientes-ventas', form)
      onSave({ id: res.data.id, ...form })
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '7px 10px', fontSize: '13px',
    color: 'var(--text-1)', outline: 'none', width: '100%',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-2)', borderRadius: '12px', border: '0.5px solid var(--border)', width: '100%', maxWidth: '420px', animation: 'fadeIn 0.15s ease' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>Nuevo cliente</div>
          <button onClick={onClose} style={{ background: 'var(--bg-3)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '14px' }}>✕</button>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>RUT</div>
            <input value={form.rut} onChange={e => setForm(f => ({ ...f, rut: formatRut(e.target.value) }))} style={IS} placeholder="12.345.678-9" maxLength={12} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Nombre *</div>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} style={IS} placeholder="Nombre completo o empresa" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Email</div>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={IS} placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Teléfono</div>
            <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} style={IS} placeholder="+56 9 1234 5678" />
          </div>
          {error && <div style={{ padding: '8px', background: 'var(--danger-bg)', borderRadius: '6px', color: 'var(--danger)', fontSize: '12px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: '7px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={{ padding: '8px 16px', borderRadius: '7px', border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              {saving ? 'Guardando...' : 'Crear cliente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Modal Ingreso Orden Manual
// =============================================================================
function IngresoOrdenModal({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState('')
  const [clienteBusqueda, setClienteBusqueda] = useState('')
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)
  const [numeroOrden, setNumeroOrden] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [fechaDespacho, setFechaDespacho] = useState('')
  const [estado, setEstado] = useState('pendiente')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<ItemOrden[]>([emptyItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [productosInternos, setProductosInternos] = useState<any[]>([])

  useEffect(() => {
    api.get('/clientes-ventas').then(r => setClientes(r.data.clientes || []))
    api.get('/ordenes-trabajo/productos-produccion-todos').then(r => setProductosInternos(r.data.productos || []))
  }, [])

  const clientesFiltrados = useMemo(() => {
    if (!clienteBusqueda) return clientes
    const q = clienteBusqueda.toLowerCase()
    return clientes.filter(c =>
      c.nombre?.toLowerCase().includes(q) ||
      c.rut?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  }, [clientes, clienteBusqueda])

  const clienteSeleccionado = clientes.find(c => c.id === Number(clienteId))
  const total = items.reduce((sum, i) => sum + (i.precio * i.cantidad), 0)

    const updateItem = (id: string, key: string, value: any) => {
    setItems(prev => prev.map(i => {
        if (i.id !== id) return i
        const updated = { ...i, [key]: value }
        if (key === 'sku' && value) {
        const prod = productosInternos.find(p => p.sku === value)
        if (prod) {
            updated.nombre = prod.descripcion
            updated.precio = prod.precio_venta || 0
        }
        }
        return updated
    }))
    }

  const guardar = async () => {
    setError('')
    if (!clienteId) { setError('Debes seleccionar un cliente'); return }
    if (items.some(i => !i.nombre || i.precio <= 0)) {
      setError('Todos los productos deben tener nombre y precio mayor a 0')
      return
    }
    try {
      setSaving(true)
      await api.post('/ordenes-manuales', {
        numero_orden: numeroOrden || undefined,
        cliente_id: Number(clienteId),
        cliente_nombre: clienteSeleccionado?.nombre,
        estado,
        fecha_despacho: fechaDespacho || undefined,
        total,
        items: items.map(i => ({
          sku: i.sku,
          nombre: i.nombre,
          cantidad: i.cantidad,
          precio: i.precio,
          sellerSku: i.sku,
        })),
        notas: notas || undefined,
      })
      onSave()
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '7px 10px', fontSize: '13px',
    color: 'var(--text-1)', outline: 'none', width: '100%',
  }

  return (
    <>
      {mostrarNuevoCliente && (
        <ClienteModal
          onClose={() => setMostrarNuevoCliente(false)}
          onSave={c => {
            setClientes(prev => [...prev, c])
            setClienteId(String(c.id))
            setMostrarNuevoCliente(false)
          }}
        />
      )}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '24px', overflowY: 'auto' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-2)', borderRadius: '12px', border: '0.5px solid var(--border)', width: '100%', maxWidth: '900px', animation: 'fadeIn 0.15s ease' }}>
          {/* Header */}
          <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-2)', zIndex: 1, borderRadius: '12px 12px 0 0' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>Nueva orden manual</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                {total > 0 && `Total: $${total.toLocaleString('es-CL')}`}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg-3)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '14px' }}>✕</button>
          </div>

          <div style={{ padding: '24px' }}>
            {/* Cliente */}
            <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Cliente
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={{ ...IS, fontSize: '14px', padding: '10px 12px' }}>
                    <option value="">Seleccionar cliente...</option>
                    {clientesFiltrados.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}{c.rut ? ` · ${c.rut}` : ''}</option>
                    ))}
                  </select>
                </div>
                <input value={clienteBusqueda} onChange={e => setClienteBusqueda(e.target.value)}
                  placeholder="Filtrar..." style={{ ...IS, width: '140px', fontSize: '12px' }} />
                <button onClick={() => setMostrarNuevoCliente(true)} style={{
                  padding: '10px 14px', borderRadius: '7px', border: '0.5px dashed var(--border)',
                  background: 'transparent', color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
                }}>+ Nuevo cliente</button>
              </div>
              {clienteSeleccionado && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-3)', display: 'flex', gap: '16px' }}>
                  {clienteSeleccionado.rut && <span>RUT: {clienteSeleccionado.rut}</span>}
                  {clienteSeleccionado.email && <span>Email: {clienteSeleccionado.email}</span>}
                  {clienteSeleccionado.telefono && <span>Tel: {clienteSeleccionado.telefono}</span>}
                </div>
              )}
            </div>

            {/* Datos orden */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>N° Orden (opcional)</div>
                <input value={numeroOrden} onChange={e => setNumeroOrden(e.target.value)} style={IS} placeholder="Auto-generado" />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Fecha</div>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={IS} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Fecha despacho</div>
                <input type="date" value={fechaDespacho} onChange={e => setFechaDespacho(e.target.value)} style={IS} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Estado</div>
                <select value={estado} onChange={e => setEstado(e.target.value)} style={IS}>
                  <option value="pendiente">Pendiente</option>
                  <option value="despachada">Despachada</option>
                  <option value="entregada">Entregada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            {/* Productos */}
            <div style={{ border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    {['SKU', 'Producto', 'Cantidad', 'Precio unit.', 'Total', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: idx < items.length - 1 ? '0.5px solid var(--border)' : 'none', background: idx % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
                      <td style={{ padding: '8px 14px', width: '140px' }}>
                        <select value={item.sku} onChange={e => updateItem(item.id, 'sku', e.target.value)} style={{ ...IS, fontSize: '12px' }}>
                          <option value="">SKU...</option>
                          {productosInternos.map(p => (
                            <option key={p.id} value={p.sku}>{p.sku}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <input value={item.nombre} onChange={e => updateItem(item.id, 'nombre', e.target.value)}
                          style={IS} placeholder="Nombre del producto" />
                      </td>
                      <td style={{ padding: '8px 14px', width: '90px' }}>
                        <input type="number" value={item.cantidad} onChange={e => updateItem(item.id, 'cantidad', Number(e.target.value))}
                          style={{ ...IS, textAlign: 'center' }} min="1" />
                      </td>
                      <td style={{ padding: '8px 14px', width: '120px', fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>
                        ${(item.precio).toLocaleString('es-CL')}
                      </td>
                      <td style={{ padding: '8px 14px', width: '110px', fontWeight: 600, color: 'var(--success)', fontSize: '13px' }}>
                        ${(item.precio * item.cantidad).toLocaleString('es-CL')}
                      </td>
                      <td style={{ padding: '8px 8px', width: '40px', textAlign: 'center' }}>
                        {items.length > 1 && (
                          <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '16px' }}>🗑</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {total > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--bg)', borderTop: '0.5px solid var(--border)' }}>
                      <td colSpan={4} style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>
                        {items.length} producto{items.length > 1 ? 's' : ''}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '15px', fontWeight: 700, color: 'var(--success)' }}>
                        ${total.toLocaleString('es-CL')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <button onClick={() => setItems(prev => [...prev, emptyItem()])} style={{
              padding: '8px 16px', borderRadius: '7px', border: '0.5px dashed var(--border)',
              background: 'transparent', color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer',
              width: '100%', marginBottom: '16px',
            }}>
              + Agregar producto
            </button>

            {/* Notas */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Notas (opcional)</div>
              <textarea value={notas} onChange={e => setNotas(e.target.value)}
                style={{ ...IS, height: '70px', resize: 'vertical' as const }}
                placeholder="Observaciones, instrucciones de entrega, etc." />
            </div>

            {error && <div style={{ padding: '10px', background: 'var(--danger-bg)', borderRadius: '7px', color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Guardando...' : 'Crear orden'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// =============================================================================
// Modal Vista Maestra Manual
// =============================================================================
function MaestraManual({ ordenes, onClose }: { ordenes: OrdenManual[], onClose: () => void }) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

  const ordenesFiltradas = ordenes.filter(o => ['pendiente', 'despachada'].includes(o.estado))

  const fechas = useMemo(() => {
    const set = new Set<string>()
    ordenesFiltradas.forEach(o => { if (o.fecha_despacho) set.add(o.fecha_despacho) })
    return Array.from(set).sort()
  }, [ordenesFiltradas])

  const tabla = useMemo(() => {
    const grupos: Record<string, Record<string, number>> = {}
    ordenesFiltradas.forEach(o => {
      const items = o.items || []
      items.forEach((item: any) => {
        const nombre = item.nombre || '—'
        const fecha = o.fecha_despacho || 'Sin fecha'
        if (!grupos[nombre]) grupos[nombre] = {}
        grupos[nombre][fecha] = (grupos[nombre][fecha] || 0) + (item.cantidad || 1)
      })
    })
    return grupos
  }, [ordenesFiltradas])

  const totalesFecha: Record<string, number> = {}
  fechas.forEach(f => {
    totalesFecha[f] = 0
    Object.values(tabla).forEach(fm => { totalesFecha[f] += fm[f] || 0 })
  })
  const totalGeneral = Object.values(totalesFecha).reduce((a, b) => a + b, 0)

  const getCellStyle = (fecha: string, valor: number): React.CSSProperties => {
    if (valor === 0) return { color: 'var(--text-4)', fontSize: '12px' }
    const d = new Date(fecha); d.setHours(0, 0, 0, 0)
    const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { color: 'var(--danger)', fontWeight: 700, fontSize: '13px' }
    if (diff <= 1) return { color: 'var(--warning)', fontWeight: 600, fontSize: '13px' }
    return { color: 'var(--success)', fontWeight: 500, fontSize: '13px' }
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

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '24px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-2)', borderRadius: '12px', border: '0.5px solid var(--border)', width: '100%', maxWidth: '1000px', animation: 'fadeIn 0.15s ease' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>Maestra Ventas Directas</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Órdenes activas por producto y fecha de despacho · {totalGeneral} unidades</div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-3)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '14px' }}>✕</button>
        </div>
        <div style={{ overflowX: 'auto', padding: '16px 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid var(--border)' }}>
            <thead>
              <tr>
                <th style={{ ...thM, textAlign: 'left', width: '260px' }}>Producto</th>
                {fechas.map(f => {
                  const d = new Date(f); d.setHours(0, 0, 0, 0)
                  const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <th key={f} style={{ ...thM, color: diff < 0 ? 'var(--danger)' : diff === 0 ? 'var(--warning)' : 'var(--text-3)' }}>
                      {f}<br/><span style={{ fontSize: '10px', fontWeight: 400 }}>{diff < 0 ? '⚠ Atrasada' : diff === 0 ? 'Hoy' : d.toLocaleDateString('es-CL', { weekday: 'short' })}</span>
                    </th>
                  )
                })}
                <th style={{ ...thM, background: 'var(--bg-3)', fontWeight: 700, color: 'var(--text-1)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(tabla).length === 0 ? (
                <tr><td colSpan={fechas.length + 2} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>No hay órdenes activas</td></tr>
              ) : Object.entries(tabla).map(([nombre, fechaMap]) => {
                const totalProd = Object.values(fechaMap).reduce((a, b) => a + b, 0)
                return (
                  <tr key={nombre} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} style={{ transition: 'background 0.1s' }}>
                    <td style={{ ...tdM, textAlign: 'left', paddingLeft: '14px', fontSize: '12px', fontWeight: 500, color: 'var(--text-1)' }}>{nombre}</td>
                    {fechas.map(f => {
                      const val = fechaMap[f] || 0
                      return <td key={f} style={{ ...tdM, ...getCellStyle(f, val) }}>{val === 0 ? '—' : val}</td>
                    })}
                    <td style={{ ...tdM, fontWeight: 700, color: 'var(--text-1)', background: 'var(--bg-3)' }}>{totalProd}</td>
                  </tr>
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
// Página Principal
// =============================================================================
export default function OrdenesManual() {
  const [ordenes, setOrdenes] = useState<OrdenManual[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarIngreso, setMostrarIngreso] = useState(false)
  const [mostrarMaestra, setMostrarMaestra] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenManual | null>(null)

  const usuarioGuardado = localStorage.getItem('usuario')
  const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null
  const soloLectura = usuario?.rol === 'view'

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await api.get('/ordenes-manuales')
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
        o.orden_id?.toLowerCase().includes(q) ||
        o.cliente_nombre?.toLowerCase().includes(q) ||
        o.cliente_rut?.toLowerCase().includes(q) ||
        o.items?.some((i: any) => i.nombre?.toLowerCase().includes(q))
      )
    }
    if (filtroEstado) result = result.filter(o => o.estado === filtroEstado)
    if (filtroDesde) result = result.filter(o => o.fecha_despacho && o.fecha_despacho >= filtroDesde)
    if (filtroHasta) result = result.filter(o => o.fecha_despacho && o.fecha_despacho <= filtroHasta)
    return result
  }, [ordenes, busqueda, filtroEstado, filtroDesde, filtroHasta])

  const totalVentas = filtradas.reduce((sum, o) => sum + (o.total || 0), 0)

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
      {mostrarIngreso && <IngresoOrdenModal onClose={() => setMostrarIngreso(false)} onSave={cargar} />}
      {mostrarMaestra && <MaestraManual ordenes={ordenes} onClose={() => setMostrarMaestra(false)} />}

      {/* Topbar */}
      <div style={{ padding: '16px 24px', background: 'var(--bg-2)', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)' }}>
            Ventas Directas
            <span style={{ fontSize: '13px', color: 'var(--text-4)', fontWeight: 400 }}> · {filtradas.length} órdenes</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Órdenes manuales sin marketplace</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
              </svg>
              <input placeholder="Buscar orden, cliente, producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...IS, paddingLeft: '30px', width: '240px' }} />
            </div>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={IS}>
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="despachada">Despachada</option>
              <option value="entregada">Entregada</option>
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
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button onClick={() => setMostrarMaestra(true)} style={{ ...IS, fontWeight: 500, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none' }}>
            Maestra
          </button>
          {!soloLectura && (
            <button onClick={() => setMostrarIngreso(true)} style={{ ...IS, fontWeight: 500, background: 'var(--success)', color: '#fff', border: 'none' }}>
              + Nueva orden
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Total órdenes', value: filtradas.length, color: 'var(--text-1)' },
            { label: 'Pendientes', value: filtradas.filter(o => o.estado === 'pendiente').length, color: 'var(--warning)' },
            { label: 'Despachadas', value: filtradas.filter(o => o.estado === 'despachada').length, color: 'var(--success)' },
            { label: 'Total ventas', value: `$${totalVentas.toLocaleString('es-CL')}`, color: 'var(--success)' },
          ].map((k, i) => (
            <div key={i} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
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
                  <th style={TH}>N° Orden</th>
                  <th style={TH}>Cliente</th>
                  <th style={TH}>Productos</th>
                  <th style={TH}>Fecha despacho</th>
                  <th style={TH}>Total</th>
                  <th style={TH}>Estado</th>
                  <th style={{ ...TH, cursor: 'default' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => (
                    <td key={j} style={TD}><div style={{ height: '14px', background: 'var(--bg-3)', borderRadius: '3px', animation: 'pulse 1.5s infinite' }} /></td>
                  ))}</tr>
                )) : filtradas.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                    No hay órdenes.{' '}
                    {!soloLectura && <button onClick={() => setMostrarIngreso(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' }}>Crear la primera</button>}
                  </td></tr>
                ) : filtradas.map((o, i) => {
                  const estCol = estadoColor[o.estado] || { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                  const productosNombres = (o.items || []).map((item: any) => item.nombre).filter(Boolean).join(', ')
                  return (
                    <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} style={{ transition: 'background 0.1s' }}>
                      <td style={{ ...TD, fontFamily: 'monospace', fontSize: '12px', color: 'var(--info)', fontWeight: 500 }}>{o.orden_id}</td>
                      <td style={TD}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>{o.cliente_nombre || '—'}</div>
                        {o.cliente_rut && <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '1px' }}>{o.cliente_rut}</div>}
                      </td>
                      <td style={{ ...TD, maxWidth: '220px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{productosNombres || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '1px' }}>{(o.items || []).length} producto{(o.items || []).length !== 1 ? 's' : ''}</div>
                      </td>
                      <td style={{ ...TD, fontSize: '12px', color: 'var(--text-2)' }}>{o.fecha_despacho || '—'}</td>
                      <td style={{ ...TD, fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>${(o.total || 0).toLocaleString('es-CL')}</td>
                      <td style={TD}>
                        <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: estCol.bg, color: estCol.color }}>{o.estado}</span>
                      </td>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => setOrdenSeleccionada(o)} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '5px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', cursor: 'pointer' }}>Ver</button>
                          {!soloLectura && o.estado === 'pendiente' && (
                            <button onClick={async () => {
                              await api.put(`/ordenes-manuales/${o.id}`, { estado: 'despachada' })
                              cargar()
                            }} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '5px', border: 'none', background: 'var(--success)', color: '#fff', cursor: 'pointer' }}>
                              Despachar
                            </button>
                          )}
                          {!soloLectura && (
                            <button onClick={async () => {
                              if (!confirm(`¿Cancelar orden ${o.orden_id}?`)) return
                              await api.delete(`/ordenes-manuales/${o.id}`)
                              cargar()
                            }} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '5px', border: '0.5px solid var(--danger)', background: 'var(--danger-bg)', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
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
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
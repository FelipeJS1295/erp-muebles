import { useEffect, useState } from 'react'
import { api } from '../../api/client'

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
  unidades?: number
  estado: string
  tipo: string
}

interface Props {
  orden: OrdenTrabajo
  onClose: () => void
  onSave: () => void
}

const IS: React.CSSProperties = {
  background: 'var(--bg)', border: '0.5px solid var(--border)',
  borderRadius: '7px', padding: '7px 10px', fontSize: '13px',
  color: 'var(--text-1)', outline: 'none', width: '100%',
}

const cargoColor: Record<string, { bg: string; color: string }> = {
  costura:      { bg: 'var(--success-bg)', color: 'var(--success)' },
  tapiceria:    { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  esqueleteria: { bg: 'var(--info-bg)',    color: 'var(--info)' },
}

export default function EditarOTModal({ orden, onClose, onSave }: Props) {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [productosPadre, setProductosPadre] = useState<Producto[]>([])
  const [productosAll, setProductosAll] = useState<Producto[]>([])
  const [trabajadorId, setTrabajadorId] = useState(String(orden.trabajador_id))
  const [productoId, setProductoId] = useState(String(orden.producto_interno_id))
  const [numeroOt, setNumeroOt] = useState(orden.numero_ot)
  const [fecha, setFecha] = useState(orden.fecha)
  const [descripcion, setDescripcion] = useState(orden.descripcion)
  const [unidades, setUnidades] = useState(String(orden.unidades || 1))
  const [estado, setEstado] = useState(orden.estado)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/ordenes-trabajo/trabajadores-produccion').then(r => setTrabajadores(r.data.trabajadores || []))
    api.get('/ordenes-trabajo/productos-produccion').then(r => setProductosPadre(r.data.productos || []))
    api.get('/ordenes-trabajo/productos-produccion-todos').then(r => setProductosAll(r.data.productos || []))
  }, [])

  const trabajador = trabajadores.find(t => t.id === Number(trabajadorId))
  const cargoCol = trabajador ? cargoColor[trabajador.cargo] : null
  const esEsqueleto = trabajador?.cargo === 'esqueleteria'
  const productos = esEsqueleto ? productosPadre : productosAll

  const getPrecio = () => {
    const producto = productos.find(p => p.id === Number(productoId))
    if (!producto || !trabajador) return null
    const u = parseInt(unidades) || 1
    if (trabajador.cargo === 'costura') return producto.precio_costura
    if (trabajador.cargo === 'tapiceria') return producto.precio_tapiceria
    if (trabajador.cargo === 'esqueleteria') return producto.precio_esqueleteria * u
    return null
  }

  const getDescripcion = (pid: string) => {
    const producto = productos.find(p => p.id === Number(pid))
    if (!producto || !trabajador) return ''
    if (trabajador.cargo === 'esqueleteria') return producto.descripcion_esqueleto || producto.descripcion
    return producto.descripcion
  }

  const precio = getPrecio()

  const guardar = async () => {
    setError('')
    if (!trabajadorId || !productoId || !numeroOt || !fecha) {
      setError('Todos los campos son obligatorios')
      return
    }
    try {
      setSaving(true)
      await api.put(`/ordenes-trabajo/${orden.id}`, {
        numero_ot: numeroOt,
        fecha,
        trabajador_id: Number(trabajadorId),
        producto_interno_id: Number(productoId),
        descripcion,
        unidades: parseInt(unidades) || 1,
        estado,
      })
      onSave()
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1100, padding: '24px', overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: '12px',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '640px',
        animation: 'fadeIn 0.15s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>Editar OT de Producción</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px', fontFamily: 'monospace' }}>{orden.numero_ot}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
            width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Trabajador */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Trabajador</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
              <select value={trabajadorId} onChange={e => { setTrabajadorId(e.target.value); setProductoId('') }} style={IS}>
                <option value="">Seleccionar...</option>
                {trabajadores.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre_completo} — {t.cargo}</option>
                ))}
              </select>
              {trabajador && cargoCol && (
                <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: cargoCol.bg, color: cargoCol.color, whiteSpace: 'nowrap' }}>
                  {trabajador.cargo}
                </span>
              )}
            </div>
          </div>

          {/* N° OT y Fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>N° Orden</div>
              <input value={numeroOt} onChange={e => setNumeroOt(e.target.value)} style={{ ...IS, fontFamily: 'monospace' }} placeholder="OT-001" />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Fecha</div>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={IS} />
            </div>
          </div>

          {/* Producto */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Producto</div>
            <select value={productoId} onChange={e => {
              setProductoId(e.target.value)
              setDescripcion(getDescripcion(e.target.value))
            }} style={IS} disabled={!trabajadorId}>
              <option value="">Seleccionar producto...</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>
                  {esEsqueleto ? `${p.sku_padre} — ${p.descripcion_esqueleto || p.descripcion}` : `${p.sku} — ${p.descripcion}`}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción y Unidades */}
          <div style={{ display: 'grid', gridTemplateColumns: esEsqueleto ? '1fr auto' : '1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Descripción</div>
              <input value={descripcion} onChange={e => setDescripcion(e.target.value)} style={IS} placeholder="Descripción..." />
            </div>
            {esEsqueleto && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Unidades</div>
                <input type="number" value={unidades} onChange={e => setUnidades(e.target.value)} style={{ ...IS, width: '80px', textAlign: 'center', fontWeight: 600 }} min="1" />
              </div>
            )}
          </div>

          {/* Estado y Precio */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Estado</div>
              <select value={estado} onChange={e => setEstado(e.target.value)} style={IS}>
                <option value="pendiente">Pendiente</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Precio calculado</div>
              <div style={{
                padding: '7px 10px', borderRadius: '7px', border: '0.5px solid var(--border)',
                background: 'var(--bg-3)', fontSize: '15px', fontWeight: 700, color: 'var(--success)',
              }}>
                {precio !== null ? `$${precio.toLocaleString('es-CL')}` : '—'}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px', background: 'var(--danger-bg)', borderRadius: '7px', color: 'var(--danger)', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: '8px',
              border: '0.5px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
            }}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              background: 'var(--accent)', color: 'var(--accent-fg)',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  )
}
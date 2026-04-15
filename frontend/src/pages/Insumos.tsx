import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'

const UNIDADES = ['kg', 'metros', 'centimetros', 'unidades', 'litros', 'gramos', 'metros2']

interface Insumo {
  id?: number
  codigo: string
  nombre: string
  unidad_medida: string
  precio_costo: number
  precio_venta: number
  activo?: number
  fecha_creacion?: string
}

const emptyInsumo = (): Insumo => ({
  codigo: '', nombre: '', unidad_medida: 'unidades',
  precio_costo: 0, precio_venta: 0,
})

// =============================================================================
// Modal Insumo
// =============================================================================
function InsumoModal({ insumo, onClose, onSave }: {
  insumo: Insumo | null, onClose: () => void, onSave: () => void
}) {
  const [form, setForm] = useState<Insumo>(insumo || emptyInsumo())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!insumo?.id

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const guardar = async () => {
    if (!form.codigo || !form.nombre) {
      setError('Código y nombre son obligatorios')
      return
    }
    try {
      setSaving(true)
      setError('')
      if (isEdit) {
        await api.put(`/insumos/${insumo!.id}`, form)
      } else {
        await api.post('/insumos', form)
      }
      onSave()
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '7px 10px', fontSize: '13px',
    color: 'var(--text-1)', outline: 'none', width: '100%',
  }

  const label = (texto: string, requerido = false) => (
    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px', fontWeight: 500 }}>
      {texto} {requerido && <span style={{ color: 'var(--danger)' }}>*</span>}
    </div>
  )

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '24px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: '12px',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '500px',
        animation: 'fadeIn 0.15s ease',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>
            {isEdit ? 'Editar insumo' : 'Nuevo insumo'}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
            width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>✕</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              {label('Código', true)}
              <input value={form.codigo} onChange={e => set('codigo', e.target.value)}
                style={IS} placeholder="Ej: TEL-GRIS-001" />
            </div>
            <div>
              {label('Unidad de medida', true)}
              <select value={form.unidad_medida} onChange={e => set('unidad_medida', e.target.value)} style={IS}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            {label('Nombre', true)}
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
              style={IS} placeholder="Ej: Tela felpa gris oscuro" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              {label('Precio costo x unidad', true)}
              <input type="number" value={form.precio_costo}
                onChange={e => set('precio_costo', Number(e.target.value))} style={IS} />
            </div>
            <div>
              {label('Precio venta x unidad', true)}
              <input type="number" value={form.precio_venta}
                onChange={e => set('precio_venta', Number(e.target.value))} style={IS} />
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px', background: 'var(--danger-bg)', borderRadius: '7px', color: 'var(--danger)', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button onClick={onClose} style={{
              padding: '10px 16px', borderRadius: '8px',
              border: '0.5px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
            }}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: 'var(--accent)', color: 'var(--accent-fg)',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear insumo'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Página Principal
// =============================================================================
export default function Insumos() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroUnidad, setFiltroUnidad] = useState('')
  const [modalInsumo, setModalInsumo] = useState<Insumo | null>(null)
  const [mostrarModal, setMostrarModal] = useState(false)

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await api.get('/insumos')
      setInsumos(res.data.insumos || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const filtrados = useMemo(() => {
    let result = [...insumos]
    if (busqueda) {
      const q = busqueda.toLowerCase()
      result = result.filter(i =>
        i.codigo?.toLowerCase().includes(q) ||
        i.nombre?.toLowerCase().includes(q)
      )
    }
    if (filtroUnidad) result = result.filter(i => i.unidad_medida === filtroUnidad)
    return result
  }, [insumos, busqueda, filtroUnidad])

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
      {mostrarModal && (
        <InsumoModal
          insumo={modalInsumo}
          onClose={() => setMostrarModal(false)}
          onSave={cargar}
        />
      )}

      {/* Topbar */}
      <div style={{
        padding: '16px 24px', background: 'var(--bg-2)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)' }}>
            Insumos
            <span style={{ fontSize: '13px', color: 'var(--text-4)', fontWeight: 400 }}> · {filtrados.length} de {insumos.length}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            Materiales y materias primas de producción
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <div style={{ position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
              </svg>
              <input placeholder="Buscar código o nombre..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...IS, paddingLeft: '30px', width: '220px' }} />
            </div>
            <select value={filtroUnidad} onChange={e => setFiltroUnidad(e.target.value)} style={IS}>
              <option value="">Todas las unidades</option>
              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => { setModalInsumo(null); setMostrarModal(true) }} style={{
          ...IS, display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          fontWeight: 500, marginTop: '4px',
        }}>
          + Nuevo insumo
        </button>
      </div>

      {/* Tabla */}
      <div style={{ padding: '16px 24px' }}>
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Código</th>
                  <th style={TH}>Nombre</th>
                  <th style={TH}>Unidad</th>
                  <th style={TH}>Precio costo</th>
                  <th style={TH}>Precio venta</th>
                  <th style={{ ...TH, cursor: 'default' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} style={TD}>
                        <div style={{ height: '14px', background: 'var(--bg-3)', borderRadius: '3px', animation: 'pulse 1.5s infinite' }} />
                      </td>
                    ))}
                  </tr>
                )) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                      No hay insumos.{' '}
                      <button onClick={() => { setModalInsumo(null); setMostrarModal(true) }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' }}>
                        Crear el primero
                      </button>
                    </td>
                  </tr>
                ) : filtrados.map((i, idx) => (
                  <tr key={idx}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ transition: 'background 0.1s' }}
                  >
                    <td style={TD}>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--info)', fontWeight: 500 }}>
                        {i.codigo}
                      </span>
                    </td>
                    <td style={{ ...TD, fontSize: '13px', color: 'var(--text-1)', fontWeight: 500 }}>
                      {i.nombre}
                    </td>
                    <td style={TD}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                        background: 'var(--bg-3)', color: 'var(--text-2)',
                      }}>
                        {i.unidad_medida}
                      </span>
                    </td>
                    <td style={{ ...TD, fontSize: '13px', color: 'var(--danger)', fontWeight: 600 }}>
                      ${Number(i.precio_costo).toLocaleString('es-CL')}
                    </td>
                    <td style={{ ...TD, fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                      ${Number(i.precio_venta).toLocaleString('es-CL')}
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => { setModalInsumo(i); setMostrarModal(true) }} style={{
                          fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                          border: '0.5px solid var(--border)', background: 'var(--bg)',
                          color: 'var(--text-2)', cursor: 'pointer',
                        }}>Editar</button>
                        <button onClick={async () => {
                          if (!confirm(`¿Eliminar el insumo "${i.nombre}"?`)) return
                          try {
                            await api.delete(`/insumos/${i.id}`)
                            cargar()
                          } catch (e) { console.error(e) }
                        }} style={{
                          fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                          border: '0.5px solid var(--danger)', background: 'var(--danger-bg)',
                          color: 'var(--danger)', cursor: 'pointer',
                        }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
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
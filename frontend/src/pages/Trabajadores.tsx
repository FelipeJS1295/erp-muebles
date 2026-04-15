import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'

const CARGOS = ['corte', 'costura', 'tapiceria', 'esqueleteria', 'bodega', 'cojineria', 'embalaje', 'oficina']

interface Trabajador {
  id?: number
  rut: string
  nombre_completo: string
  email?: string
  password?: string
  cargo?: string
  activo?: number
  fecha_creacion?: string
}

const emptyTrabajador = (): Trabajador => ({
  rut: '', nombre_completo: '', email: '', password: '', cargo: 'corte',
})

// =============================================================================
// Modal Trabajador
// =============================================================================
function TrabajadorModal({ trabajador, onClose, onSave }: {
  trabajador: Trabajador | null, onClose: () => void, onSave: () => void
}) {
  const [form, setForm] = useState<Trabajador>(trabajador || emptyTrabajador())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!trabajador?.id

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const formatRut = (rut: string) => {
    const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase()
    if (clean.length < 2) return clean
    const body = clean.slice(0, -1)
    const dv = clean.slice(-1)
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `${formatted}-${dv}`
  }

  const guardar = async () => {
    if (!form.rut || !form.nombre_completo) {
      setError('RUT y nombre son obligatorios')
      return
    }
    if (!isEdit && !form.password) {
      setError('La contraseña es obligatoria para nuevos trabajadores')
      return
    }
    try {
      setSaving(true); setError('')
      if (isEdit) {
        await api.put(`/trabajadores/${trabajador!.id}`, form)
      } else {
        await api.post('/trabajadores', form)
      }
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
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>
            {isEdit ? 'Editar trabajador' : 'Nuevo trabajador'}
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
              {label('RUT', true)}
              <input value={form.rut} onChange={e => set('rut', formatRut(e.target.value))}
                style={IS} placeholder="Ej: 12.345.678-9" maxLength={12} />
            </div>
            <div>
              {label('Cargo')}
              <select value={form.cargo || 'cortador'} onChange={e => set('cargo', e.target.value)} style={IS}>
                {CARGOS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div>
            {label('Nombre completo', true)}
            <input value={form.nombre_completo} onChange={e => set('nombre_completo', e.target.value)}
              style={IS} placeholder="Ej: Juan Carlos Pérez" />
          </div>

          <div>
            {label('Email')}
            <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)}
              style={IS} placeholder="Ej: juan@empresa.com" />
          </div>

          <div>
            {label(isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña', !isEdit)}
            <input type="password" value={form.password || ''} onChange={e => set('password', e.target.value)}
              style={IS} placeholder={isEdit ? 'Dejar vacío para mantener' : 'Mínimo 6 caracteres'} />
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
            }}>{saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear trabajador'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Página Principal
// =============================================================================
export default function Trabajadores() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('')
  const [modalTrabajador, setModalTrabajador] = useState<Trabajador | null>(null)
  const [mostrarModal, setMostrarModal] = useState(false)

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await api.get('/trabajadores')
      setTrabajadores(res.data.trabajadores || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const filtrados = useMemo(() => {
    let result = [...trabajadores]
    if (busqueda) {
      const q = busqueda.toLowerCase()
      result = result.filter(t =>
        t.rut?.toLowerCase().includes(q) ||
        t.nombre_completo?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
      )
    }
    if (filtroCargo) result = result.filter(t => t.cargo === filtroCargo)
    return result
  }, [trabajadores, busqueda, filtroCargo])

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

  const cargoColor: Record<string, { bg: string; color: string }> = {
    corte:        { bg: 'var(--info-bg)',    color: 'var(--info)' },
    costura:      { bg: 'var(--success-bg)', color: 'var(--success)' },
    tapiceria:    { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    esqueleteria: { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
    bodega:       { bg: 'var(--bg-3)',       color: 'var(--text-2)' },
    cojineria:    { bg: 'var(--paris-bg)',   color: 'var(--paris)' },
    embalaje:     { bg: 'var(--walmart-bg)', color: 'var(--walmart)' },
    oficina:      { bg: 'var(--bg-3)',       color: 'var(--text-3)' },
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {mostrarModal && (
        <TrabajadorModal
          trabajador={modalTrabajador}
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
            Trabajadores
            <span style={{ fontSize: '13px', color: 'var(--text-4)', fontWeight: 400 }}> · {filtrados.length} de {trabajadores.length}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            Personal de producción de la fábrica
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <div style={{ position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
              </svg>
              <input placeholder="Buscar por RUT o nombre..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...IS, paddingLeft: '30px', width: '220px' }} />
            </div>
            <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)} style={IS}>
              <option value="">Todos los cargos</option>
              {CARGOS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => { setModalTrabajador(null); setMostrarModal(true) }} style={{
          ...IS, display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          fontWeight: 500, marginTop: '4px',
        }}>
          + Nuevo trabajador
        </button>
      </div>

      {/* KPIs */}
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {CARGOS.map(c => {
          const count = trabajadores.filter(w => w.cargo === c).length
            const col = cargoColor[c]
            return (
              <div key={c} style={{
                background: 'var(--bg-2)', border: '0.5px solid var(--border)',
                borderRadius: '10px', padding: '12px',
                cursor: 'pointer', transition: 'all 0.1s',
              }} onClick={() => setFiltroCargo(filtroCargo === c ? '' : c)}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: col.color }}>{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>RUT</th>
                <th style={TH}>Nombre</th>
                <th style={TH}>Cargo</th>
                <th style={TH}>Email</th>
                <th style={{ ...TH, cursor: 'default' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(4)].map((_, i) => (
                <tr key={i}>{[...Array(5)].map((_, j) => (
                  <td key={j} style={TD}>
                    <div style={{ height: '14px', background: 'var(--bg-3)', borderRadius: '3px', animation: 'pulse 1.5s infinite' }} />
                  </td>
                ))}</tr>
              )) : filtrados.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                  No hay trabajadores.{' '}
                  <button onClick={() => { setModalTrabajador(null); setMostrarModal(true) }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' }}>
                    Agregar el primero
                  </button>
                </td></tr>
              ) : filtrados.map((t, i) => {
                const col = cargoColor[t.cargo || 'otro'] || { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                const iniciales = t.nombre_completo.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                return (
                  <tr key={i}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ transition: 'background 0.1s' }}>
                    <td style={{ ...TD, fontFamily: 'monospace', fontSize: '12px', color: 'var(--info)', fontWeight: 500 }}>
                      {t.rut}
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: col.bg, color: col.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 600, flexShrink: 0,
                        }}>{iniciales}</div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>
                          {t.nombre_completo}
                        </span>
                      </div>
                    </td>
                    <td style={TD}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                        background: col.bg, color: col.color,
                      }}>
                        {t.cargo?.charAt(0).toUpperCase()}{t.cargo?.slice(1)}
                      </span>
                    </td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-3)' }}>
                      {t.email || '—'}
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => { setModalTrabajador(t); setMostrarModal(true) }} style={{
                          fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                          border: '0.5px solid var(--border)', background: 'var(--bg)',
                          color: 'var(--text-2)', cursor: 'pointer',
                        }}>Editar</button>
                        <button onClick={async () => {
                          if (!confirm(`¿Desactivar a ${t.nombre_completo}?`)) return
                          await api.delete(`/trabajadores/${t.id}`)
                          cargar()
                        }} style={{
                          fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                          border: '0.5px solid var(--danger)', background: 'var(--danger-bg)',
                          color: 'var(--danger)', cursor: 'pointer',
                        }}>Desactivar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'

interface Cliente {
  id: number
  rut?: string
  nombre: string
  email?: string
  telefono?: string
  fecha_creacion?: string
}

const emptyCliente = () => ({ rut: '', nombre: '', email: '', telefono: '' })

function ClienteModal({ cliente, onClose, onSave }: {
  cliente: Cliente | null, onClose: () => void, onSave: () => void
}) {
  const [form, setForm] = useState(cliente || emptyCliente())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!cliente?.id

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
      setSaving(true); setError('')
      if (isEdit) {
        await api.put(`/clientes-ventas/${cliente!.id}`, form)
      } else {
        await api.post('/clientes-ventas', form)
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

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-2)', borderRadius: '12px', border: '0.5px solid var(--border)', width: '100%', maxWidth: '460px', animation: 'fadeIn 0.15s ease' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</div>
          <button onClick={onClose} style={{ background: 'var(--bg-3)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '14px' }}>✕</button>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>RUT</div>
            <input value={form.rut || ''} onChange={e => setForm(f => ({ ...f, rut: formatRut(e.target.value) }))} style={IS} placeholder="12.345.678-9" maxLength={12} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Nombre *</div>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} style={IS} placeholder="Nombre completo o empresa" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Email</div>
            <input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={IS} placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Teléfono</div>
            <input value={form.telefono || ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} style={IS} placeholder="+56 9 1234 5678" />
          </div>
          {error && <div style={{ padding: '8px', background: 'var(--danger-bg)', borderRadius: '6px', color: 'var(--danger)', fontSize: '12px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalCliente, setModalCliente] = useState<Cliente | null>(null)
  const [mostrarModal, setMostrarModal] = useState(false)

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await api.get('/clientes-ventas')
      setClientes(res.data.clientes || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const filtrados = useMemo(() => {
    if (!busqueda) return clientes
    const q = busqueda.toLowerCase()
    return clientes.filter(c =>
      c.nombre?.toLowerCase().includes(q) ||
      c.rut?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  }, [clientes, busqueda])

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
        <ClienteModal
          cliente={modalCliente}
          onClose={() => setMostrarModal(false)}
          onSave={cargar}
        />
      )}

      {/* Topbar */}
      <div style={{ padding: '16px 24px', background: 'var(--bg-2)', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)' }}>
            Clientes
            <span style={{ fontSize: '13px', color: 'var(--text-4)', fontWeight: 400 }}> · {filtrados.length} de {clientes.length}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Clientes para ventas directas</div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
              </svg>
              <input placeholder="Buscar por nombre, RUT o email..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...IS, paddingLeft: '30px', width: '280px' }} />
            </div>
          </div>
        </div>
        <button onClick={() => { setModalCliente(null); setMostrarModal(true) }} style={{
          ...IS, display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          fontWeight: 500, marginTop: '4px',
        }}>+ Nuevo cliente</button>
      </div>

      {/* Tabla */}
      <div style={{ padding: '16px 24px' }}>
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>RUT</th>
                <th style={TH}>Nombre</th>
                <th style={TH}>Email</th>
                <th style={TH}>Teléfono</th>
                <th style={TH}>Fecha creación</th>
                <th style={{ ...TH, cursor: 'default' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(4)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => (
                  <td key={j} style={TD}><div style={{ height: '14px', background: 'var(--bg-3)', borderRadius: '3px', animation: 'pulse 1.5s infinite' }} /></td>
                ))}</tr>
              )) : filtrados.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                  No hay clientes.{' '}
                  <button onClick={() => { setModalCliente(null); setMostrarModal(true) }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' }}>
                    Agregar el primero
                  </button>
                </td></tr>
              ) : filtrados.map((c, i) => {
                const iniciales = c.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                return (
                  <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} style={{ transition: 'background 0.1s' }}>
                    <td style={{ ...TD, fontFamily: 'monospace', fontSize: '12px', color: 'var(--info)', fontWeight: 500 }}>{c.rut || '—'}</td>
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>{iniciales}</div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>{c.nombre}</span>
                      </div>
                    </td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-3)' }}>{c.email || '—'}</td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-3)' }}>{c.telefono || '—'}</td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-3)' }}>
                      {c.fecha_creacion ? new Date(c.fecha_creacion).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => { setModalCliente(c); setMostrarModal(true) }} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '5px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', cursor: 'pointer' }}>Editar</button>
                        <button onClick={async () => {
                          if (!confirm(`¿Eliminar a ${c.nombre}?`)) return
                          await api.delete(`/clientes-ventas/${c.id}`)
                          cargar()
                        }} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '5px', border: '0.5px solid var(--danger)', background: 'var(--danger-bg)', color: 'var(--danger)', cursor: 'pointer' }}>Eliminar</button>
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
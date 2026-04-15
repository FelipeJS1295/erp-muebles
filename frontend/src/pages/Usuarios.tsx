import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'

const ROLES = ['admin_master', 'admin', 'user', 'view']

interface Usuario {
  id?: number
  nombre_usuario: string
  email: string
  password?: string
  rol: string
  activo?: number
  fecha_creacion?: string
}

const emptyUsuario = (): Usuario => ({
  nombre_usuario: '', email: '', password: '', rol: 'user',
})

const rolConfig: Record<string, { label: string; bg: string; color: string }> = {
  admin_master: { label: 'Admin Master', bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  admin:        { label: 'Admin',        bg: 'var(--warning-bg)', color: 'var(--warning)' },
  user:         { label: 'Usuario',      bg: 'var(--info-bg)',    color: 'var(--info)' },
  view:         { label: 'Solo lectura', bg: 'var(--bg-3)',       color: 'var(--text-3)' },
}

// =============================================================================
// Modal Usuario
// =============================================================================
function UsuarioModal({ usuario, onClose, onSave }: {
  usuario: Usuario | null, onClose: () => void, onSave: () => void
}) {
  const [form, setForm] = useState<Usuario>(usuario || emptyUsuario())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!usuario?.id

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const guardar = async () => {
    if (!form.nombre_usuario || !form.email) {
      setError('Nombre de usuario y email son obligatorios')
      return
    }
    if (!isEdit && !form.password) {
      setError('La contraseña es obligatoria para nuevos usuarios')
      return
    }
    try {
      setSaving(true); setError('')
      if (isEdit) {
        await api.put(`/usuarios/${usuario!.id}`, form)
      } else {
        await api.post('/usuarios', form)
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
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '480px',
        animation: 'fadeIn 0.15s ease',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>
            {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
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
              {label('Nombre de usuario', true)}
              <input value={form.nombre_usuario} onChange={e => set('nombre_usuario', e.target.value)}
                style={IS} placeholder="Ej: jsilva" />
            </div>
            <div>
              {label('Rol', true)}
              <select value={form.rol} onChange={e => set('rol', e.target.value)} style={IS}>
                {ROLES.map(r => <option key={r} value={r}>{rolConfig[r].label}</option>)}
              </select>
            </div>
          </div>

          <div>
            {label('Email', true)}
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              style={IS} placeholder="Ej: juan@empresa.com" />
          </div>

          <div>
            {label(isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña', !isEdit)}
            <input type="password" value={form.password || ''} onChange={e => set('password', e.target.value)}
              style={IS} placeholder={isEdit ? 'Dejar vacío para mantener' : 'Mínimo 6 caracteres'} />
          </div>

          {/* Info roles */}
          <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Permisos por rol
            </div>
            {[
              { rol: 'admin_master', desc: 'Acceso total al sistema, gestión de usuarios y configuración' },
              { rol: 'admin', desc: 'Acceso a todas las secciones excepto gestión de usuarios' },
              { rol: 'user', desc: 'Puede crear y editar registros pero no eliminar' },
              { rol: 'view', desc: 'Solo lectura, no puede modificar nada' },
            ].map(r => {
              const cfg = rolConfig[r.rol]
              return (
                <div key={r.rol} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 500, background: cfg.bg, color: cfg.color, flexShrink: 0, minWidth: '80px', textAlign: 'center' }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{r.desc}</span>
                </div>
              )
            })}
          </div>

          {error && (
            <div style={{ padding: '10px', background: 'var(--danger-bg)', borderRadius: '7px', color: 'var(--danger)', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              padding: '10px 16px', borderRadius: '8px',
              border: '0.5px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
            }}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: 'var(--accent)', color: 'var(--accent-fg)',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Página Principal
// =============================================================================
export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [modalUsuario, setModalUsuario] = useState<Usuario | null>(null)
  const [mostrarModal, setMostrarModal] = useState(false)

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await api.get('/usuarios')
      setUsuarios(res.data.usuarios || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const filtrados = useMemo(() => {
    let result = [...usuarios]
    if (busqueda) {
      const q = busqueda.toLowerCase()
      result = result.filter(u =>
        u.nombre_usuario?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      )
    }
    if (filtroRol) result = result.filter(u => u.rol === filtroRol)
    return result
  }, [usuarios, busqueda, filtroRol])

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
        <UsuarioModal
          usuario={modalUsuario}
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
            Usuarios del sistema
            <span style={{ fontSize: '13px', color: 'var(--text-4)', fontWeight: 400 }}> · {filtrados.length} de {usuarios.length}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            Gestión de accesos y permisos
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <div style={{ position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
              </svg>
              <input placeholder="Buscar usuario o email..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...IS, paddingLeft: '30px', width: '220px' }} />
            </div>
            <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)} style={IS}>
              <option value="">Todos los roles</option>
              {ROLES.map(r => <option key={r} value={r}>{rolConfig[r].label}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => { setModalUsuario(null); setMostrarModal(true) }} style={{
          ...IS, display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          fontWeight: 500, marginTop: '4px',
        }}>
          + Nuevo usuario
        </button>
      </div>

      {/* KPIs */}
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {ROLES.map(r => {
            const count = usuarios.filter(u => u.rol === r).length
            const cfg = rolConfig[r]
            return (
              <div key={r} style={{
                background: 'var(--bg-2)', border: '0.5px solid var(--border)',
                borderRadius: '10px', padding: '14px', cursor: 'pointer',
              }} onClick={() => setFiltroRol(filtroRol === r ? '' : r)}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>{cfg.label}</div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: cfg.color }}>{count}</div>
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
                <th style={TH}>Usuario</th>
                <th style={TH}>Email</th>
                <th style={TH}>Rol</th>
                <th style={TH}>Fecha creación</th>
                <th style={{ ...TH, cursor: 'default' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(3)].map((_, i) => (
                <tr key={i}>{[...Array(5)].map((_, j) => (
                  <td key={j} style={TD}>
                    <div style={{ height: '14px', background: 'var(--bg-3)', borderRadius: '3px', animation: 'pulse 1.5s infinite' }} />
                  </td>
                ))}</tr>
              )) : filtrados.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                  No hay usuarios.{' '}
                  <button onClick={() => { setModalUsuario(null); setMostrarModal(true) }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' }}>
                    Crear el primero
                  </button>
                </td></tr>
              ) : filtrados.map((u, i) => {
                const cfg = rolConfig[u.rol] || { label: u.rol, bg: 'var(--bg-3)', color: 'var(--text-3)' }
                const iniciales = u.nombre_usuario.slice(0, 2).toUpperCase()
                return (
                  <tr key={i}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ transition: 'background 0.1s' }}>
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: cfg.bg, color: cfg.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 600, flexShrink: 0,
                        }}>{iniciales}</div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>
                          {u.nombre_usuario}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-3)' }}>{u.email}</td>
                    <td style={TD}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                        background: cfg.bg, color: cfg.color,
                      }}>{cfg.label}</span>
                    </td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-3)' }}>
                      {u.fecha_creacion ? new Date(u.fecha_creacion).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => { setModalUsuario(u); setMostrarModal(true) }} style={{
                          fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                          border: '0.5px solid var(--border)', background: 'var(--bg)',
                          color: 'var(--text-2)', cursor: 'pointer',
                        }}>Editar</button>
                        <button onClick={async () => {
                          if (!confirm(`¿Desactivar a ${u.nombre_usuario}?`)) return
                          await api.delete(`/usuarios/${u.id}`)
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
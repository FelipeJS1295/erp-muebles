import { useState, useEffect } from 'react'
import { api } from '../api/client'

interface Contador {
  id: number
  nombre: string
  email: string
  activo: boolean
  fecha_creacion: string
}

interface ModalProps {
  contador: Contador | null
  onClose: () => void
  onSave: () => void
}

function ContadorModal({ contador, onClose, onSave }: ModalProps) {
  const isEdit = !!contador
  const [nombre, setNombre] = useState(contador?.nombre || '')
  const [email, setEmail] = useState(contador?.email || '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!nombre || !email) { setError('Nombre y email son requeridos'); return }
    if (!isEdit && !password) { setError('La contraseña es requerida'); return }
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await api.put(`/contadores/${contador!.id}`, { nombre, email, password: password || undefined })
      } else {
        await api.post('/contadores', { nombre, email, password })
      }
      onSave()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const IS: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: '7px',
    border: '0.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-1)', fontSize: '13px', outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-2)', borderRadius: '12px', padding: '24px',
        width: '400px', border: '0.5px solid var(--border)',
      }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '20px' }}>
          {isEdit ? 'Editar contador' : 'Nuevo contador'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} style={IS} placeholder="Nombre completo" />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={IS} placeholder="email@empresa.cl" />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>
              {isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={IS} placeholder="••••••••" />
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: '12px', padding: '8px 12px', background: 'var(--danger-bg)',
            borderRadius: '6px', fontSize: '12px', color: 'var(--danger)',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '7px 16px', borderRadius: '7px', border: '0.5px solid var(--border)',
            background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '7px 16px', borderRadius: '7px', border: 'none',
            background: 'var(--accent)', color: 'var(--accent-fg)',
            fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1, fontWeight: 500,
          }}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear contador'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Contadores() {
  const [contadores, setContadores] = useState<Contador[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Contador | null | undefined>(undefined)
  const [eliminando, setEliminando] = useState<number | null>(null)

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await api.get('/contadores')
      setContadores(res.data.contadores || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar este contador?')) return
    setEliminando(id)
    try {
      await api.delete(`/contadores/${id}`)
      cargar()
    } catch (e) { console.error(e) }
    finally { setEliminando(null) }
  }

  const TH: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: '11px',
    fontWeight: 600, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }

  const TD: React.CSSProperties = {
    padding: '11px 14px', borderBottom: '0.5px solid var(--border)',
    fontSize: '13px', color: 'var(--text-2)',
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {modal !== undefined && (
        <ContadorModal
          contador={modal}
          onClose={() => setModal(undefined)}
          onSave={cargar}
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
            Contadores
            <span style={{ fontSize: '13px', color: 'var(--text-4)', fontWeight: 400 }}> · {contadores.length}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
            Usuarios del portal de contabilidad
          </div>
        </div>
        <button onClick={() => setModal(null)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--accent)', color: 'var(--accent-fg)',
          border: 'none', borderRadius: '7px', padding: '7px 14px',
          fontSize: '13px', fontWeight: 500, cursor: 'pointer',
        }}>
          + Nuevo contador
        </button>
      </div>

      {/* Tabla */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{
          background: 'var(--bg-2)', border: '0.5px solid var(--border)',
          borderRadius: '10px', overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              Cargando...
            </div>
          ) : contadores.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              No hay contadores registrados
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Nombre</th>
                  <th style={TH}>Email</th>
                  <th style={TH}>Estado</th>
                  <th style={TH}>Creado</th>
                  <th style={TH}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contadores.map(c => (
                  <tr key={c.id}>
                    <td style={TD}>{c.nombre}</td>
                    <td style={TD}>{c.email}</td>
                    <td style={TD}>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '3px 10px',
                        borderRadius: '20px',
                        background: c.activo ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: c.activo ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={TD}>
                      {c.fecha_creacion ? new Date(c.fecha_creacion).toLocaleDateString('es-CL') : '-'}
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setModal(c)} style={{
                          padding: '4px 10px', borderRadius: '5px', fontSize: '12px',
                          border: '0.5px solid var(--border)', background: 'var(--bg)',
                          color: 'var(--text-2)', cursor: 'pointer',
                        }}>
                          Editar
                        </button>
                        <button onClick={() => eliminar(c.id)} disabled={eliminando === c.id} style={{
                          padding: '4px 10px', borderRadius: '5px', fontSize: '12px',
                          border: 'none', background: 'var(--danger-bg)',
                          color: 'var(--danger)', cursor: 'pointer',
                        }}>
                          {eliminando === c.id ? '...' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
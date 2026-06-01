import { useState } from 'react'
import { api } from '../../api/client'

interface Props {
  ids: number[]
  onClose: () => void
  onSave: () => void
}

const IS: React.CSSProperties = {
  background: 'var(--bg)', border: '0.5px solid var(--border)',
  borderRadius: '7px', padding: '7px 10px', fontSize: '13px',
  color: 'var(--text-1)', outline: 'none', width: '100%',
}

export default function EditarFechaLoteModal({ ids, onClose, onSave }: Props) {
  const [fecha, setFecha] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    setError('')
    if (!fecha) { setError('Debes seleccionar una fecha'); return }
    try {
      setSaving(true)
      await Promise.all(ids.map(id => api.put(`/ordenes-trabajo/${id}`, { fecha })))
      onSave()
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1200, padding: '24px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: '12px',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '400px',
        animation: 'fadeIn 0.15s ease',
      }}>
        <div style={{
          padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>Editar fecha</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>{ids.length} OT{ids.length > 1 ? 's' : ''} seleccionadas</div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
            width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>✕</button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Nueva fecha</div>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={IS} />
          </div>

          {error && (
            <div style={{ padding: '10px', background: 'var(--danger-bg)', borderRadius: '7px', color: 'var(--danger)', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
              {saving ? 'Guardando...' : `Aplicar a ${ids.length} OT${ids.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  )
}
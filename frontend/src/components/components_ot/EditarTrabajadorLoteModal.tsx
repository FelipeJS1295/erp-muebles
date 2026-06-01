import { useEffect, useState } from 'react'
import { api } from '../../api/client'

interface Trabajador {
  id: number
  rut: string
  nombre_completo: string
  cargo: string
}

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

const cargoColor: Record<string, { bg: string; color: string }> = {
  costura:      { bg: 'var(--success-bg)', color: 'var(--success)' },
  tapiceria:    { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  esqueleteria: { bg: 'var(--info-bg)',    color: 'var(--info)' },
}

export default function EditarTrabajadorLoteModal({ ids, onClose, onSave }: Props) {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [trabajadorId, setTrabajadorId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/ordenes-trabajo/trabajadores-produccion').then(r => setTrabajadores(r.data.trabajadores || []))
  }, [])

  const trabajador = trabajadores.find(t => t.id === Number(trabajadorId))
  const cargoCol = trabajador ? cargoColor[trabajador.cargo] : null

  const guardar = async () => {
    setError('')
    if (!trabajadorId) { setError('Debes seleccionar un trabajador'); return }
    try {
      setSaving(true)
      await Promise.all(ids.map(id => api.put(`/ordenes-trabajo/${id}`, { trabajador_id: Number(trabajadorId) })))
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
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '420px',
        animation: 'fadeIn 0.15s ease',
      }}>
        <div style={{
          padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>Editar trabajador</div>
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
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Nuevo trabajador</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
              <select value={trabajadorId} onChange={e => setTrabajadorId(e.target.value)} style={IS}>
                <option value="">Seleccionar trabajador...</option>
                {trabajadores.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre_completo} — {t.cargo}</option>
                ))}
              </select>
              {trabajador && cargoCol && (
                <span style={{
                  padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  background: cargoCol.bg, color: cargoCol.color, whiteSpace: 'nowrap',
                }}>
                  {trabajador.cargo}
                </span>
              )}
            </div>
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
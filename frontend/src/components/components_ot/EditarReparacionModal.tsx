import { useState } from 'react'
import { api } from '../../api/client'

interface OrdenTrabajo {
  id: number
  numero_ot: string
  fecha: string
  trabajador_id: number
  trabajador_nombre: string
  trabajador_cargo: string
  descripcion: string
  precio_aplicado: number
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

export default function EditarReparacionModal({ orden, onClose, onSave }: Props) {
  const [numeroOt, setNumeroOt] = useState(orden.numero_ot)
  const [fecha, setFecha] = useState(orden.fecha)
  const [descripcion, setDescripcion] = useState(orden.descripcion)
  const [precio, setPrecio] = useState(String(orden.precio_aplicado))
  const [estado, setEstado] = useState(orden.estado)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    setError('')
    if (!numeroOt || !fecha || !descripcion || !precio) {
      setError('Todos los campos son obligatorios')
      return
    }
    if (isNaN(parseFloat(precio)) || parseFloat(precio) <= 0) {
      setError('El precio debe ser mayor a 0')
      return
    }
    try {
      setSaving(true)
      await api.put(`/ordenes-trabajo/${orden.id}`, {
        numero_ot: numeroOt,
        fecha,
        descripcion,
        precio: parseFloat(precio),
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
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '520px',
        animation: 'fadeIn 0.15s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>🔧 Editar Reparación</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
              {orden.trabajador_nombre} — <span style={{ fontFamily: 'monospace' }}>{orden.numero_ot}</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
            width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* N° OT y Fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>N° Orden</div>
              <input value={numeroOt} onChange={e => setNumeroOt(e.target.value)}
                style={{ ...IS, fontFamily: 'monospace' }} placeholder="OT-001" />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Fecha</div>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={IS} />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Descripción</div>
            <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
              style={IS} placeholder="Ej: Reparación costura espaldar" />
          </div>

          {/* Precio y Estado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Precio ($)</div>
              <input type="number" value={precio} onChange={e => setPrecio(e.target.value)}
                style={{ ...IS, fontWeight: 600 }} placeholder="0" min="0" />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Estado</div>
              <select value={estado} onChange={e => setEstado(e.target.value)} style={IS}>
                <option value="pendiente">Pendiente</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
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
              background: '#e85d04', color: '#fff',
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
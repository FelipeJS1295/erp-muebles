import { useState, useEffect } from 'react'
import { api } from '../../api/client'

interface Orden {
  id: number
  marketplace: string
  orden_id: string
  cliente: string | null
  total: number | null
  items: any[]
  raw: any
  boleta_folio?: number
}

interface Props {
  ordenes: Orden[]
  onClose: () => void
  onCompletado: () => void
}

type EstadoOrden = 'pendiente' | 'emitiendo' | 'ok' | 'error' | 'ya_tiene'

interface FilaOrden {
  orden: Orden
  estado: EstadoOrden
  folio?: number
  error?: string
  total?: number
}

export default function ModalBoletasMasivo({ ordenes, onClose, onCompletado }: Props) {
  const [fase, setFase] = useState<'confirmar' | 'emitiendo' | 'completado'>('confirmar')
  const [filas, setFilas] = useState<FilaOrden[]>([])
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    const iniciales: FilaOrden[] = ordenes.map(o => ({
      orden: o,
      estado: o.boleta_folio ? 'ya_tiene' : 'pendiente',
      folio: o.boleta_folio,
    }))
    setFilas(iniciales)
  }, [ordenes])

  const pendientes = filas.filter(f => f.estado === 'pendiente')
  const yaEmitidas = filas.filter(f => f.estado === 'ya_tiene')
  const exitosas = filas.filter(f => f.estado === 'ok')
  const conError = filas.filter(f => f.estado === 'error')

  const calcTotal = (o: Orden) => {
    const esWalmart = o.marketplace === 'walmart_chile'
    const items = o.items || []
    const totalItems = items.reduce((sum: number, item: any) => {
      const precioRaw = Number(item.precio || item.priceAfterDiscounts || item.basePrice || item.ItemPrice || 0)
      const precio = esWalmart ? Math.round(precioRaw * 1.19) : precioRaw
      const cantidad = Number(item.cantidad || item.Quantity || 1)
      return sum + precio * cantidad
    }, 0)
    return totalItems || o.total || 0
  }

  const emitir = async () => {
    setFase('emitiendo')
    for (const fila of filas) {
      if (fila.estado !== 'pendiente') continue
      setFilas(prev => prev.map(f =>
        f.orden.id === fila.orden.id ? { ...f, estado: 'emitiendo' } : f
      ))
      try {
        const res = await api.post(`/boletas/emitir/${fila.orden.id}`)
        setFilas(prev => prev.map(f =>
          f.orden.id === fila.orden.id
            ? { ...f, estado: 'ok', folio: res.data.folio, total: res.data.total }
            : f
        ))
      } catch (e: any) {
        const msg = e.response?.data?.detail || 'Error al emitir'
        setFilas(prev => prev.map(f =>
          f.orden.id === fila.orden.id ? { ...f, estado: 'error', error: msg } : f
        ))
      }
    }
    setFase('completado')
    onCompletado()
  }

  const descargarTodo = async () => {
    setDescargando(true)
    try {
      const foliosParaDescargar = filas.filter(f => f.estado === 'ok' || f.estado === 'ya_tiene').filter(f => f.folio)

      // Importar JSZip dinámicamente
      const JSZip = (await import('jszip')).default

      const zip = new JSZip()

      for (const fila of foliosParaDescargar) {
        try {
          const res = await api.get(`/boletas/${fila.orden.id}/pdf-view`, { responseType: 'arraybuffer' })
          const nombreArchivo = `${fila.orden.orden_id}.pdf`
          zip.file(nombreArchivo, res.data)
        } catch (e) {
          console.error(`Error descargando folio ${fila.folio}:`, e)
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `boletas_${new Date().toISOString().split('T')[0]}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error generando zip:', e)
      alert('Error al generar el archivo ZIP')
    } finally {
      setDescargando(false)
    }
  }

  const iconEstado = (estado: EstadoOrden) => {
    if (estado === 'pendiente') return <span style={{ color: 'var(--text-3)' }}>⏳</span>
    if (estado === 'emitiendo') return <span style={{ color: 'var(--info)', fontSize: '11px' }}>Emitiendo...</span>
    if (estado === 'ok') return <span style={{ color: 'var(--success)' }}>✓</span>
    if (estado === 'ya_tiene') return <span style={{ color: 'var(--text-3)', fontSize: '11px' }}>Ya emitida</span>
    if (estado === 'error') return <span style={{ color: 'var(--danger)' }}>✗</span>
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: '24px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: '12px',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '680px',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 0.15s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>
              {fase === 'confirmar' && '🧾 Emitir boletas masivamente'}
              {fase === 'emitiendo' && '⏳ Emitiendo boletas...'}
              {fase === 'completado' && '✅ Boletas emitidas'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
              {fase === 'confirmar' && `${pendientes.length} boleta${pendientes.length !== 1 ? 's' : ''} a emitir${yaEmitidas.length > 0 ? ` · ${yaEmitidas.length} ya emitida${yaEmitidas.length !== 1 ? 's' : ''}` : ''}`}
              {fase === 'emitiendo' && `Procesando ${pendientes.length} boletas...`}
              {fase === 'completado' && `${exitosas.length} emitidas · ${conError.length} con error`}
            </div>
          </div>
          {fase !== 'emitiendo' && (
            <button onClick={onClose} style={{
              background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
              width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '14px',
            }}>✕</button>
          )}
        </div>

        {/* Lista */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th style={{ padding: '9px 16px', fontSize: '11px', color: 'var(--text-3)', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid var(--border)' }}>Orden</th>
                <th style={{ padding: '9px 16px', fontSize: '11px', color: 'var(--text-3)', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid var(--border)' }}>Marketplace</th>
                <th style={{ padding: '9px 16px', fontSize: '11px', color: 'var(--text-3)', fontWeight: 500, textAlign: 'left', borderBottom: '0.5px solid var(--border)' }}>Cliente</th>
                <th style={{ padding: '9px 16px', fontSize: '11px', color: 'var(--text-3)', fontWeight: 500, textAlign: 'right', borderBottom: '0.5px solid var(--border)' }}>Total</th>
                <th style={{ padding: '9px 16px', fontSize: '11px', color: 'var(--text-3)', fontWeight: 500, textAlign: 'center', borderBottom: '0.5px solid var(--border)' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i} style={{
                  background: fila.estado === 'error' ? 'var(--danger-bg)' : fila.estado === 'ok' ? 'var(--success-bg)' : 'transparent',
                  borderBottom: '0.5px solid var(--border)',
                }}>
                  <td style={{ padding: '10px 16px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--info)' }}>
                    {fila.orden.orden_id}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-3)' }}>
                    {fila.orden.marketplace === 'walmart_chile' ? 'Walmart' :
                     fila.orden.marketplace === 'paris_chile' ? 'Paris' :
                     fila.orden.marketplace === 'ripley' ? 'Ripley' : 'Falabella'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-1)' }}>
                    {fila.orden.cliente || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '12px', textAlign: 'right', fontWeight: 500, color: 'var(--success)' }}>
                    ${calcTotal(fila.orden).toLocaleString('es-CL')}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '12px', textAlign: 'center' }}>
                    {iconEstado(fila.estado)}
                    {fila.estado === 'error' && (
                      <div style={{ fontSize: '10px', color: 'var(--danger)', marginTop: '2px' }}>{fila.error}</div>
                    )}
                    {(fila.estado === 'ok' || fila.estado === 'ya_tiene') && fila.folio && (
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>Folio {fila.folio}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px', borderTop: '0.5px solid var(--border)',
          display: 'flex', gap: '8px', justifyContent: 'flex-end', flexShrink: 0,
        }}>
          {fase === 'confirmar' && (
            <>
              <button onClick={onClose} style={{
                padding: '10px 20px', borderRadius: '8px',
                border: '0.5px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={emitir} disabled={pendientes.length === 0} style={{
                padding: '10px 24px', borderRadius: '8px', border: 'none',
                background: 'var(--success)', color: '#fff',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                opacity: pendientes.length === 0 ? 0.5 : 1,
              }}>
                Emitir {pendientes.length} boleta{pendientes.length !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {fase === 'completado' && (
            <>
              <button onClick={onClose} style={{
                padding: '10px 20px', borderRadius: '8px',
                border: '0.5px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
              }}>Cerrar</button>
              {(exitosas.length > 0 || yaEmitidas.filter(f => f.folio).length > 0) && (
                <button onClick={descargarTodo} disabled={descargando} style={{
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  background: 'var(--info)', color: '#fff',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  opacity: descargando ? 0.6 : 1,
                }}>
                  {descargando ? 'Generando ZIP...' : `⬇ Descargar ${exitosas.length + yaEmitidas.filter(f => f.folio).length} PDF${exitosas.length + yaEmitidas.filter(f => f.folio).length !== 1 ? 's' : ''} como ZIP`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
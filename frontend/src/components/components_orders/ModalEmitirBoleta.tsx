import { useState, useEffect } from 'react'
import { api } from '../../api/client'

interface Orden {
  id: number
  marketplace: string
  orden_id: string
  cliente: string | null
  estado: string
  fecha_despacho: string | null
  total: number | null
  items: any[]
  raw: any
  boleta_folio?: number
  boleta_url?: string
  tipo_documento?: string
}

interface Props {
  orden: Orden
  onClose: () => void
  onEmitida: () => void
}

export default function ModalEmitirBoleta({ orden, onClose, onEmitida }: Props) {
  const [emitiendo, setEmitiendo] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<any>(null)
  const [ordenData, setOrdenData] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    api.get(`/ordenes/${orden.id}/data`)
      .then(r => setOrdenData(r.data.data))
      .catch(() => setOrdenData(null))
      .finally(() => setLoadingData(false))
  }, [orden.id])

  const items = orden.items || []

  const totalItems = items.reduce((sum: number, item: any) => {
    const precio = Number(item.precio || item.priceAfterDiscounts || item.basePrice || item.ItemPrice || 0)
    const cantidad = Number(item.cantidad || item.Quantity || 1)
    return sum + (precio * cantidad)
  }, 0)

  const costoDespacho = ordenData?.costo_despacho || 0
  const total = ordenData?.total || (totalItems + costoDespacho) || orden.total || 0
  const monto_neto = total > 0 ? Math.round(total / 1.19) : 0
  const iva = total > 0 ? total - monto_neto : 0

  const emitir = async () => {
    try {
      setEmitiendo(true); setError('')
      const res = await api.post(`/boletas/emitir/${orden.id}`)
      setResultado(res.data)
      onEmitida()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al emitir boleta')
    } finally { setEmitiendo(false) }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: '24px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: '12px',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '560px',
        maxHeight: '90vh', overflowY: 'auto',
        animation: 'fadeIn 0.15s ease',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: 'var(--bg-2)', zIndex: 1,
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>
            {resultado ? '✅ Boleta emitida' : 'Emitir Boleta Electrónica'}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
            width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '14px',
          }}>✕</button>
        </div>

        <div style={{ padding: '20px' }}>
          {loadingData ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              Cargando datos de la orden...
            </div>
          ) : !resultado ? <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Orden</div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Marketplace: </span>
                    <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{orden.marketplace}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>N° Orden: </span>
                    <span style={{ fontWeight: 500, color: 'var(--info)', fontFamily: 'monospace' }}>{orden.orden_id}</span>
                  </div>
                </div>
                {ordenData?.tipo_documento && (
                  <div style={{ marginTop: '6px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-3)' }}>Tipo documento: </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                      background: ordenData.tipo_documento === 'factura' ? 'var(--warning-bg)' : 'var(--info-bg)',
                      color: ordenData.tipo_documento === 'factura' ? 'var(--warning)' : 'var(--info)',
                    }}>
                      {ordenData.tipo_documento === 'factura' ? '📄 Factura' : '🧾 Boleta'}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Cliente</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', marginBottom: '4px' }}>
                  {ordenData?.cliente_nombre || orden.cliente || 'Cliente Generico'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span>RUT: <strong>{ordenData?.cliente_rut || '66.666.666-6'}</strong></span>
                  {ordenData?.cliente_email && <span>Email: {ordenData.cliente_email}</span>}
                </div>
                {ordenData?.billing_direccion && (
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>
                    {ordenData.billing_direccion}, {ordenData.billing_ciudad}
                    {ordenData.billing_comuna && ` · Comuna: ${ordenData.billing_comuna}`}
                  </div>
                )}
              </div>

              {ordenData?.tipo_documento === 'factura' && ordenData?.factura_rut && (
                <div style={{ background: 'var(--warning-bg)', border: '0.5px solid var(--warning)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Datos Factura</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', marginBottom: '4px' }}>{ordenData.factura_razon_social}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <span>RUT: <strong>{ordenData.factura_rut}</strong></span>
                    {ordenData.factura_giro && <span>Giro: {ordenData.factura_giro}</span>}
                    {ordenData.factura_email && <span>Email: {ordenData.factura_email}</span>}
                  </div>
                  {ordenData.factura_direccion && (
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>
                      {ordenData.factura_direccion}, {ordenData.factura_ciudad}
                    </div>
                  )}
                </div>
              )}

              <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '0.5px solid var(--border)' }}>
                  Productos
                </div>
                {items.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-3)' }}>Sin productos detallados</div>
                ) : items.map((item: any, i: number) => {
                  const nombre = item.nombre || item.name || item.Name || 'Producto'
                  const cantidad = Number(item.cantidad || item.Quantity || 1)
                  const precio = Number(item.precio || item.priceAfterDiscounts || item.basePrice || item.ItemPrice || 0)
                  return (
                    <div key={i} style={{
                      padding: '10px 12px',
                      borderBottom: i < items.length - 1 ? '0.5px solid var(--border)' : 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>{nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Cantidad: {cantidad}</div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>
                        ${precio.toLocaleString('es-CL')}
                      </div>
                    </div>
                  )
                })}
                {costoDespacho > 0 && (
                  <div style={{
                    padding: '10px 12px', borderTop: '0.5px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--bg-3)',
                  }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>🚚 Costo de despacho</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>
                      ${costoDespacho.toLocaleString('es-CL')}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Resumen</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-3)' }}>Neto</span>
                    <span style={{ color: 'var(--text-1)' }}>${monto_neto.toLocaleString('es-CL')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-3)' }}>IVA (19%)</span>
                    <span style={{ color: 'var(--text-1)' }}>${iva.toLocaleString('es-CL')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, borderTop: '0.5px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                    <span style={{ color: 'var(--text-1)' }}>Total</span>
                    <span style={{ color: 'var(--success)' }}>${total.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-3)', padding: '8px', background: 'var(--warning-bg)', borderRadius: '6px' }}>
                ⚠️ Esta boleta se emitirá ante el SII y quedará registrada en Nubox. Esta acción no se puede deshacer.
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px', background: 'var(--danger-bg)', borderRadius: '7px', color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{
                padding: '10px 20px', borderRadius: '8px', border: '0.5px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={emitir} disabled={emitiendo} style={{
                padding: '10px 24px', borderRadius: '8px', border: 'none',
                background: 'var(--success)', color: '#fff',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                opacity: emitiendo ? 0.6 : 1,
              }}>
                {emitiendo ? 'Emitiendo...' : '📄 Emitir boleta'}
              </button>
            </div>
          </> : <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--success-bg)', border: '0.5px solid var(--success)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--success)' }}>Boleta emitida exitosamente</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-1)', marginTop: '8px' }}>Folio N° {resultado.folio}</div>
                <div style={{ fontSize: '18px', color: 'var(--success)', marginTop: '4px' }}>Total: ${resultado.total?.toLocaleString('es-CL')}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => window.open(resultado.url_boleta, '_blank')} style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: '0.5px solid var(--info)', background: 'var(--info-bg)',
                  color: 'var(--info)', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
                }}>🔗 Ver boleta online</button>
                <button onClick={async () => {
                  const res = await api.get(`/boletas/${resultado.boleta_id}/pdf`, { responseType: 'blob' })
                  const url = window.URL.createObjectURL(new Blob([res.data]))
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${orden.orden_id}.pdf`
                  a.click()
                }} style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: '0.5px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
                }}>⬇️ Descargar PDF</button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{
                padding: '10px 20px', borderRadius: '8px', border: '0.5px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
              }}>Cerrar</button>
            </div>
          </>}
        </div>
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { api } from '../api/client'

interface Cliente {
  id: number
  rut?: string
  nombre: string
}

interface ApiClienteConfig {
  id: number
  cliente_id: number
  cliente_nombre: string
  cliente_rut?: string
  marketplace: string
  client_id?: string
  seller_id?: string
  base_url?: string
  tiene_api_key: boolean
  tiene_api_secret: boolean
  extra?: any
  fecha_creacion?: string
}

const MARKETPLACES = [
  { id: 'walmart_chile', label: 'Walmart Chile' },
  { id: 'paris_chile', label: 'Paris Chile' },
  { id: 'falabella', label: 'Falabella Chile' },
  { id: 'ripley', label: 'Ripley Chile' },
]

const mktColor: Record<string, { bg: string; color: string }> = {
  walmart_chile: { bg: 'var(--walmart-bg)', color: 'var(--walmart)' },
  paris_chile:   { bg: 'var(--paris-bg)',   color: 'var(--paris)' },
  falabella:     { bg: 'var(--falabella-bg)', color: 'var(--falabella)' },
  ripley:        { bg: 'var(--ripley-bg)',  color: 'var(--ripley)' },
}

const mktLabel: Record<string, string> = {
  walmart_chile: 'Walmart',
  paris_chile:   'Paris',
  falabella:     'Falabella',
  ripley:        'Ripley',
}

// =============================================================================
// Modal configurar API
// =============================================================================
function ApiModal({ config, onClose, onSave }: {
  config: ApiClienteConfig | null, onClose: () => void, onSave: () => void
}) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState(config?.cliente_id?.toString() || '')
  const [marketplace, setMarketplace] = useState(config?.marketplace || '')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [clientIdVal, setClientIdVal] = useState(config?.client_id || '')
  const [sellerId, setSellerId] = useState(config?.seller_id || '')
  const [baseUrl, setBaseUrl] = useState(config?.base_url || '')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [syncMsg, setSyncMsg] = useState('')
  const isEdit = !!config?.id

  useEffect(() => {
    api.get('/clientes-ventas').then(r => setClientes(r.data.clientes || []))
  }, [])

  // Defaults de base_url por marketplace
  useEffect(() => {
    if (marketplace === 'paris_chile' && !baseUrl) setBaseUrl('https://api-developers.ecomm.cencosud.com')
    if (marketplace === 'falabella' && !baseUrl) setBaseUrl('https://sellercenter-api.falabella.com')
    if (marketplace === 'ripley' && !baseUrl) setBaseUrl('https://ripley-prod.mirakl.net')
  }, [marketplace])

  const guardar = async () => {
    if (!clienteId) { setError('Selecciona un cliente'); return }
    if (!marketplace) { setError('Selecciona un marketplace'); return }
    try {
      setSaving(true); setError('')
      const payload: any = {
        cliente_id: Number(clienteId),
        marketplace,
        client_id: clientIdVal || undefined,
        seller_id: sellerId || undefined,
        base_url: baseUrl || undefined,
      }
      if (apiKey) payload.api_key = apiKey
      if (apiSecret) payload.api_secret = apiSecret

      if (isEdit) {
        await api.put(`/api-clientes/${config!.id}`, payload)
      } else {
        await api.post('/api-clientes', payload)
      }
      onSave(); onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const sincronizar = async () => {
    if (!config?.id) return
    try {
      setSyncing(true); setSyncMsg(''); setError('')
      const res = await api.post(`/api-clientes/${config.id}/sync`)
      setSyncMsg(`✅ ${res.data.mensaje} · ${res.data.creadas} nuevas · ${res.data.actualizadas} actualizadas`)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al sincronizar')
    } finally { setSyncing(false) }
  }

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '7px 10px', fontSize: '13px',
    color: 'var(--text-1)', outline: 'none', width: '100%',
  }

  const renderCampos = () => {
    if (!marketplace) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(marketplace === 'walmart_chile') && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Client ID *</div>
            <input value={clientIdVal} onChange={e => setClientIdVal(e.target.value)} style={IS} placeholder="Client ID de Walmart" />
          </div>
        )}
        {(marketplace === 'paris_chile') && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Seller ID *</div>
            <input value={sellerId} onChange={e => setSellerId(e.target.value)} style={IS} placeholder="Seller ID de Paris" />
          </div>
        )}
        {(marketplace === 'falabella') && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>User ID *</div>
            <input value={clientIdVal} onChange={e => setClientIdVal(e.target.value)} style={IS} placeholder="User ID de Falabella" />
          </div>
        )}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>
            API Key * {isEdit && config?.tiene_api_key && <span style={{ color: 'var(--success)' }}>(configurada — dejar vacío para no cambiar)</span>}
          </div>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} style={IS}
            placeholder={isEdit && config?.tiene_api_key ? '••••••••' : 'API Key'} />
        </div>
        {marketplace === 'walmart_chile' && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>
              Client Secret * {isEdit && config?.tiene_api_secret && <span style={{ color: 'var(--success)' }}>(configurado)</span>}
            </div>
            <input type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} style={IS}
              placeholder={isEdit && config?.tiene_api_secret ? '••••••••' : 'Client Secret'} />
          </div>
        )}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Base URL</div>
          <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} style={IS} placeholder="https://..." />
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-2)', borderRadius: '12px', border: '0.5px solid var(--border)', width: '100%', maxWidth: '500px', animation: 'fadeIn 0.15s ease' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>{isEdit ? 'Editar API' : 'Configurar API de cliente'}</div>
          <button onClick={onClose} style={{ background: 'var(--bg-3)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '14px' }}>✕</button>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!isEdit && (
            <>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Cliente *</div>
                <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={IS}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}{c.rut ? ` · ${c.rut}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Marketplace *</div>
                <select value={marketplace} onChange={e => setMarketplace(e.target.value)} style={IS}>
                  <option value="">Seleccionar marketplace...</option>
                  {MARKETPLACES.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {isEdit && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px', background: 'var(--bg)', borderRadius: '8px', border: '0.5px solid var(--border)' }}>
              <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 500, background: mktColor[config!.marketplace]?.bg, color: mktColor[config!.marketplace]?.color }}>
                {mktLabel[config!.marketplace] || config!.marketplace}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>{config!.cliente_nombre}</span>
            </div>
          )}

          {renderCampos()}

          {error && <div style={{ padding: '8px', background: 'var(--danger-bg)', borderRadius: '6px', color: 'var(--danger)', fontSize: '12px' }}>{error}</div>}
          {syncMsg && <div style={{ padding: '8px', background: 'var(--success-bg)', borderRadius: '6px', color: 'var(--success)', fontSize: '12px' }}>{syncMsg}</div>}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: '4px' }}>
            <div>
              {isEdit && (
                <button onClick={sincronizar} disabled={syncing} style={{
                  padding: '10px 16px', borderRadius: '8px', border: '0.5px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
                  opacity: syncing ? 0.6 : 1,
                }}>
                  {syncing ? 'Sincronizando...' : '🔄 Sync ahora'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Configurar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Página principal
// =============================================================================
export default function ApiClientes() {
  const [apis, setApis] = useState<ApiClienteConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [apiSeleccionada, setApiSeleccionada] = useState<ApiClienteConfig | null>(null)
  const [syncingId, setSyncingId] = useState<number | null>(null)

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api-clientes')
      setApis(res.data.apis || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const sincronizar = async (apiConfig: ApiClienteConfig) => {
    try {
      setSyncingId(apiConfig.id)
      await api.post(`/api-clientes/${apiConfig.id}/sync`)
      cargar()
    } catch (e) { console.error(e) }
    finally { setSyncingId(null) }
  }

  const eliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar la configuración de ${nombre}?`)) return
    await api.delete(`/api-clientes/${id}`)
    cargar()
  }

  const TH: React.CSSProperties = {
    padding: '11px 14px', textAlign: 'left', fontSize: '12px',
    fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)',
    whiteSpace: 'nowrap', background: 'var(--bg)',
  }
  const TD: React.CSSProperties = {
    padding: '11px 14px', borderBottom: '0.5px solid var(--border)', verticalAlign: 'middle',
  }

  // Agrupar por cliente
  const porCliente: Record<string, ApiClienteConfig[]> = {}
  apis.forEach(a => {
    if (!porCliente[a.cliente_nombre]) porCliente[a.cliente_nombre] = []
    porCliente[a.cliente_nombre].push(a)
  })

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {mostrarModal && (
        <ApiModal
          config={apiSeleccionada}
          onClose={() => { setMostrarModal(false); setApiSeleccionada(null) }}
          onSave={cargar}
        />
      )}

      {/* Topbar */}
      <div style={{ padding: '16px 24px', background: 'var(--bg-2)', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)' }}>
            APIs de Clientes
            <span style={{ fontSize: '13px', color: 'var(--text-4)', fontWeight: 400 }}> · {apis.length} configuradas</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            Integración de marketplaces de clientes externos
          </div>
        </div>
        <button onClick={() => { setApiSeleccionada(null); setMostrarModal(true) }} style={{
          padding: '8px 16px', borderRadius: '7px', border: 'none',
          background: 'var(--accent)', color: 'var(--accent-fg)',
          fontSize: '13px', fontWeight: 500, cursor: 'pointer', marginTop: '4px',
        }}>+ Configurar API</button>
      </div>

      {/* Contenido */}
      <div style={{ padding: '16px 24px' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)' }}>Cargando...</div>
        ) : apis.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            No hay APIs configuradas.{' '}
            <button onClick={() => setMostrarModal(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' }}>
              Configurar la primera
            </button>
          </div>
        ) : Object.entries(porCliente).map(([clienteNombre, clienteApis]) => (
          <div key={clienteNombre} style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                {clienteNombre.slice(0, 2).toUpperCase()}
              </div>
              {clienteNombre}
              <span style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: 400 }}>· {clienteApis.length} marketplace{clienteApis.length > 1 ? 's' : ''}</span>
            </div>
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Marketplace</th>
                    <th style={TH}>Client ID / Seller ID</th>
                    <th style={TH}>API Key</th>
                    <th style={TH}>Base URL</th>
                    <th style={TH}>Configurado</th>
                    <th style={{ ...TH, cursor: 'default' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clienteApis.map((a, i) => {
                    const col = mktColor[a.marketplace] || { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                    return (
                      <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} style={{ transition: 'background 0.1s' }}>
                        <td style={TD}>
                          <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 500, background: col.bg, color: col.color }}>
                            {mktLabel[a.marketplace] || a.marketplace}
                          </span>
                        </td>
                        <td style={{ ...TD, fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-2)' }}>
                          {a.client_id || a.seller_id || '—'}
                        </td>
                        <td style={TD}>
                          {a.tiene_api_key
                            ? <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 500 }}>✓ Configurada</span>
                            : <span style={{ fontSize: '11px', color: 'var(--danger)' }}>✗ No configurada</span>}
                        </td>
                        <td style={{ ...TD, fontSize: '11px', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                          {a.base_url ? a.base_url.replace('https://', '') : '—'}
                        </td>
                        <td style={{ ...TD, fontSize: '11px', color: 'var(--text-4)' }}>
                          {a.fecha_creacion ? new Date(a.fecha_creacion).toLocaleDateString('es-CL') : '—'}
                        </td>
                        <td style={TD}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => sincronizar(a)} disabled={syncingId === a.id} style={{
                              fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                              border: '0.5px solid var(--border)', background: 'var(--bg)',
                              color: syncingId === a.id ? 'var(--text-4)' : 'var(--info)', cursor: 'pointer',
                            }}>
                              {syncingId === a.id ? '...' : '🔄 Sync'}
                            </button>
                            <button onClick={() => { setApiSeleccionada(a); setMostrarModal(true) }} style={{
                              fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                              border: '0.5px solid var(--border)', background: 'var(--bg)',
                              color: 'var(--text-2)', cursor: 'pointer',
                            }}>Editar</button>
                            <button onClick={() => eliminar(a.id, `${clienteNombre} - ${mktLabel[a.marketplace]}`)} style={{
                              fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                              border: '0.5px solid var(--danger)', background: 'var(--danger-bg)',
                              color: 'var(--danger)', cursor: 'pointer',
                            }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
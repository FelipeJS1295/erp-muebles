import { useEffect, useState, useRef } from 'react'
import { api } from '../api/client'

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  venta:          { label: 'Venta',              color: '#059669', bg: '#05966918' },
  cobro_despacho: { label: 'Cobro por Despacho', color: '#dc2626', bg: '#dc262618' },
  devolucion:     { label: 'Devolución',          color: '#d97706', bg: '#d9770618' },
  despacho:       { label: 'Despacho',            color: '#6b7280', bg: '#6b728018' },
}

interface Liquidacion {
  id: number
  marketplace: string
  nro_suborden: string | null
  orden_id: number | null
  descripcion: string | null
  tipo: string
  monto: number
  comision_pct: number
  monto_a_pagar: number
  fecha_transaccion: string | null
  archivo_origen: string | null
  nro_solicitud: string | null
}

interface ResumenArchivo {
  nombre: string
  total: number
  ventas: number
  cobros_despacho: number
  devoluciones: number
  neto: number
  encontradas: number
  no_encontradas: number
  fecha_min: string | null
  fecha_max: string | null
}

export default function LiquidacionWalmart() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)
  const [archivoDetalle, setArchivoDetalle] = useState<string | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await api.get('/liquidaciones?marketplace=walmart_chile')
      setLiquidaciones(res.data.liquidaciones ?? [])
    } catch {
      setLiquidaciones([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const subirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/liquidaciones/walmart/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const d = res.data
      let texto = `✓ ${d.insertadas} registros procesados`
      if (d.total_no_encontradas > 0) texto += ` · ${d.total_no_encontradas} órdenes no encontradas en BD`
      setUploadMsg({ tipo: 'ok', texto })
      cargar()
    } catch (e: any) {
      setUploadMsg({ tipo: 'err', texto: e.response?.data?.detail || 'Error al procesar el archivo' })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const eliminarArchivo = async (nombre: string) => {
    try {
      await api.delete(`/liquidaciones/archivo/${encodeURIComponent(nombre)}`)
      setConfirmEliminar(null)
      setArchivoDetalle(null)
      cargar()
    } catch {}
  }

  // Agrupar por archivo
  const archivos = (() => {
    const map: Record<string, ResumenArchivo> = {}
    for (const l of liquidaciones) {
      const nombre = l.archivo_origen || 'Sin nombre'
      if (!map[nombre]) {
        map[nombre] = {
          nombre, total: 0, ventas: 0, cobros_despacho: 0,
          devoluciones: 0, neto: 0,
          encontradas: 0, no_encontradas: 0,
          fecha_min: null, fecha_max: null,
        }
      }
      const r = map[nombre]
      r.total++
      const m = l.monto_a_pagar ?? 0
      if (l.tipo === 'venta')          { r.ventas += m; r.neto += m }
      if (l.tipo === 'cobro_despacho') { r.cobros_despacho += m; r.neto += m }
      if (l.tipo === 'devolucion')     { r.devoluciones += m; r.neto += m }
      if (l.orden_id)  r.encontradas++
      else             r.no_encontradas++
      if (l.fecha_transaccion) {
        if (!r.fecha_min || l.fecha_transaccion < r.fecha_min) r.fecha_min = l.fecha_transaccion
        if (!r.fecha_max || l.fecha_transaccion > r.fecha_max) r.fecha_max = l.fecha_transaccion
      }
    }
    return Object.values(map).sort((a, b) => (b.fecha_max || '') > (a.fecha_max || '') ? 1 : -1)
  })()

  // Totales generales
  const totalNeto   = archivos.reduce((s, a) => s + a.neto, 0)
  const totalVentas = archivos.reduce((s, a) => s + a.ventas, 0)
  const totalCobros = archivos.reduce((s, a) => s + a.cobros_despacho, 0)
  const totalDevol  = archivos.reduce((s, a) => s + a.devoluciones, 0)

  // Detalle del archivo seleccionado
  const detalleRows = liquidaciones.filter(l => {
    if (l.archivo_origen !== archivoDetalle) return false
    if (filtroTipo && l.tipo !== filtroTipo) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!l.nro_suborden?.includes(q) && !l.descripcion?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const IS: React.CSSProperties = {
    padding: '7px 10px', borderRadius: '7px',
    border: '0.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-1)', fontSize: '12px', outline: 'none',
  }

  const TH: React.CSSProperties = {
    padding: '9px 14px', fontSize: '11px', fontWeight: 600,
    color: 'var(--text-3)', textTransform: 'uppercase',
    letterSpacing: '0.05em', background: 'var(--bg-3)',
    textAlign: 'left', whiteSpace: 'nowrap',
  }

  const TD: React.CSSProperties = {
    padding: '10px 14px', fontSize: '12px', color: 'var(--text-2)',
    borderBottom: '0.5px solid var(--border)',
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Liquidación Walmart</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            {archivos.length} archivo{archivos.length !== 1 ? 's' : ''} importado{archivos.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input ref={fileRef} type="file" accept=".csv" onChange={subirArchivo}
            style={{ display: 'none' }} id="upload-walmart" />
          <label htmlFor="upload-walmart" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--accent)', color: 'var(--accent-fg)',
            borderRadius: '8px', padding: '9px 16px', fontSize: '13px',
            fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {uploading ? 'Procesando...' : 'Subir liquidación CSV'}
          </label>
        </div>
      </div>

      {/* Mensaje upload */}
      {uploadMsg && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '10px',
          background: uploadMsg.tipo === 'ok' ? '#05966918' : '#dc262618',
          border: `0.5px solid ${uploadMsg.tipo === 'ok' ? '#05966944' : '#dc262644'}`,
          color: uploadMsg.tipo === 'ok' ? '#059669' : '#dc2626',
          fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{uploadMsg.texto}</span>
          <button onClick={() => setUploadMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '14px' }}>✕</button>
        </div>
      )}

      {/* Cards resumen general */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Ventas netas',        valor: `$${Math.round(totalVentas).toLocaleString('es-CL')}`, color: '#059669', bg: '#05966918' },
          { label: 'Cobros por despacho', valor: `$${Math.round(totalCobros).toLocaleString('es-CL')}`, color: '#dc2626', bg: '#dc262618' },
          { label: 'Devoluciones',         valor: `$${Math.round(totalDevol).toLocaleString('es-CL')}`,  color: '#d97706', bg: '#d9770618' },
          { label: 'Total neto',           valor: `$${Math.round(totalNeto).toLocaleString('es-CL')}`,   color: totalNeto >= 0 ? '#2563eb' : '#dc2626', bg: totalNeto >= 0 ? '#2563eb18' : '#dc262618' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-2)', border: `0.5px solid ${c.bg}`, borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{c.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: c.color }}>{c.valor}</div>
          </div>
        ))}
      </div>

      {/* Lista de archivos */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Cargando...</div>
      ) : archivos.length === 0 ? (
        <div style={{ padding: '64px', textAlign: 'center', background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-2)" strokeWidth="1"
            style={{ margin: '0 auto 16px', display: 'block' }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '8px' }}>Sin liquidaciones</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Sube un archivo CSV de liquidación de Walmart para comenzar</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {archivos.map(a => (
            <div key={a.nombre} style={{
              background: 'var(--bg-2)', border: '0.5px solid var(--border)',
              borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
            >
              {/* Cabecera del archivo */}
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--walmart-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--walmart)" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.nombre}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    {a.total} registros
                    {a.fecha_min && a.fecha_max && ` · ${new Date(a.fecha_min + 'T00:00:00').toLocaleDateString('es-CL')} → ${new Date(a.fecha_max + 'T00:00:00').toLocaleDateString('es-CL')}`}
                    {' · '}
                    <span style={{ color: '#059669' }}>{a.encontradas} encontradas</span>
                    {a.no_encontradas > 0 && <span style={{ color: '#d97706' }}> · {a.no_encontradas} no encontradas</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
                  {[
                    { label: 'Ventas',   valor: a.ventas,         color: '#059669' },
                    { label: 'Despacho', valor: a.cobros_despacho, color: '#dc2626' },
                    { label: 'Devol.',   valor: a.devoluciones,   color: '#d97706' },
                    { label: 'Neto',     valor: a.neto,            color: a.neto >= 0 ? '#2563eb' : '#dc2626' },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '2px' }}>{m.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: m.color }}>
                        ${Math.round(m.valor).toLocaleString('es-CL')}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => setArchivoDetalle(archivoDetalle === a.nombre ? null : a.nombre)} style={{
                    padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 500,
                    border: '0.5px solid var(--accent)',
                    background: archivoDetalle === a.nombre ? 'var(--accent)' : 'var(--bg)',
                    color: archivoDetalle === a.nombre ? 'var(--accent-fg)' : 'var(--accent)',
                    cursor: 'pointer',
                  }}>
                    {archivoDetalle === a.nombre ? 'Cerrar' : 'Ver detalle'}
                  </button>
                  <button onClick={() => setConfirmEliminar(a.nombre)} style={{
                    padding: '6px 10px', borderRadius: '7px', fontSize: '12px',
                    border: '0.5px solid var(--danger-bg)', background: 'var(--danger-bg)',
                    color: 'var(--danger)', cursor: 'pointer',
                  }}>Eliminar</button>
                </div>
              </div>

              {/* Detalle expandido */}
              {archivoDetalle === a.nombre && (
                <div style={{ borderTop: '0.5px solid var(--border)' }}>
                  <div style={{ padding: '12px 20px', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg)', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
                        style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }}>
                        <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
                      </svg>
                      <input placeholder="Buscar orden..." value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        style={{ ...IS, paddingLeft: '26px', width: '200px' }} />
                    </div>
                    {['', 'venta', 'cobro_despacho', 'devolucion'].map(t => {
                      const cfg = TIPO_CONFIG[t]
                      return (
                        <button key={t} onClick={() => setFiltroTipo(t)} style={{
                          padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                          border: t && cfg ? `0.5px solid ${cfg.color}44` : '0.5px solid var(--border)',
                          cursor: 'pointer',
                          background: filtroTipo === t ? (cfg ? cfg.bg : 'var(--accent)') : 'var(--bg)',
                          color: filtroTipo === t ? (cfg ? cfg.color : 'var(--accent-fg)') : (cfg ? cfg.color : 'var(--text-3)'),
                        }}>{t === '' ? 'Todos' : cfg?.label}</button>
                      )
                    })}
                    <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-3)' }}>
                      {detalleRows.length} registros
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                      <thead>
                        <tr>
                          {['Fecha', 'N° Orden', 'SKU / Descripción', 'Tipo', 'Comisión', 'Monto', 'A Pagar', 'Orden BD'].map(h => (
                            <th key={h} style={TH}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detalleRows.map((l, i) => {
                          const tipoCfg = TIPO_CONFIG[l.tipo] ?? { label: l.tipo, color: 'var(--text-3)', bg: 'var(--bg-3)' }
                          const esNeg   = (l.monto_a_pagar ?? 0) < 0
                          return (
                            <tr key={l.id}
                              onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'}
                              onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                            >
                              <td style={TD}>
                                {l.fecha_transaccion
                                  ? new Date(l.fecha_transaccion + 'T00:00:00').toLocaleDateString('es-CL')
                                  : '—'}
                              </td>
                              <td style={TD}>
                                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--info)' }}>
                                  {l.nro_suborden || '—'}
                                </span>
                              </td>
                              <td style={{ ...TD, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {l.descripcion || '—'}
                              </td>
                              <td style={TD}>
                                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 500, background: tipoCfg.bg, color: tipoCfg.color }}>
                                  {tipoCfg.label}
                                </span>
                              </td>
                              <td style={TD}>{l.comision_pct ? `${l.comision_pct}%` : '—'}</td>
                              <td style={{ ...TD, color: 'var(--text-1)', fontWeight: 500 }}>
                                {l.monto ? `$${Math.round(l.monto).toLocaleString('es-CL')}` : '—'}
                              </td>
                              <td style={{ ...TD, fontWeight: 700, color: esNeg ? '#dc2626' : '#059669', whiteSpace: 'nowrap' }}>
                                {l.monto_a_pagar !== null
                                  ? `${esNeg ? '' : '+'}$${Math.round(l.monto_a_pagar).toLocaleString('es-CL')}`
                                  : '—'}
                              </td>
                              <td style={TD}>
                                {l.orden_id ? (
                                  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500, background: '#05966918', color: '#059669' }}>
                                    ✓ #{l.orden_id}
                                  </span>
                                ) : (
                                  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', background: 'var(--bg-3)', color: 'var(--text-3)' }}>
                                    No encontrada
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                          <td colSpan={6} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>
                            Total ({detalleRows.length})
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                            ${Math.round(detalleRows.reduce((s, l) => s + (l.monto_a_pagar ?? 0), 0)).toLocaleString('es-CL')}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirm eliminar */}
      {confirmEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '400px', border: '0.5px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Eliminar liquidación?</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px' }}>Se eliminarán todos los registros de:</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '20px', wordBreak: 'break-all' }}>
              {confirmEliminar}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmEliminar(null)} style={{ padding: '9px 16px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminarArchivo(confirmEliminar)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--danger)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
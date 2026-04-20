import { useEffect, useState, useRef } from 'react'
import { api } from '../api/client'

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  venta:            { label: 'Venta',              color: '#059669', bg: '#05966918' },
  cobro_despacho:   { label: 'Cobro por Despacho', color: '#dc2626', bg: '#dc262618' },
  devolucion:       { label: 'Devolución',          color: '#d97706', bg: '#d9770618' },
  despacho:         { label: 'Despacho',            color: '#6b7280', bg: '#6b728018' },
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

interface Resumen {
  total_ventas: number
  total_cobro_despacho: number
  total_devoluciones: number
  total_neto: number
}

export default function LiquidacionParis() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [resumen, setResumen] = useState<Resumen>({ total_ventas: 0, total_cobro_despacho: 0, total_devoluciones: 0, total_neto: 0 })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [archivosSubidos, setArchivosSubidos] = useState<string[]>([])
  const [confirmEliminarArchivo, setConfirmEliminarArchivo] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ marketplace: 'paris_chile' })
      if (filtroTipo) params.append('tipo', filtroTipo)
      if (filtroDesde) params.append('desde', filtroDesde)
      if (filtroHasta) params.append('hasta', filtroHasta)
      const res = await api.get(`/liquidaciones?${params}`)
      setLiquidaciones(res.data.liquidaciones ?? [])
      setResumen(res.data.resumen ?? {})
      // Archivos únicos subidos
      const archivos = [...new Set((res.data.liquidaciones ?? []).map((l: Liquidacion) => l.archivo_origen).filter(Boolean))] as string[]
      setArchivosSubidos(archivos)
    } catch {
      setLiquidaciones([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [filtroTipo, filtroDesde, filtroHasta])

  const subirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/liquidaciones/paris/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const d = res.data
      let texto = `✓ ${d.insertadas} registros procesados`
      if (d.total_no_encontradas > 0) texto += ` · ${d.total_no_encontradas} subórdenes no encontradas en BD`
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
      setConfirmEliminarArchivo(null)
      cargar()
    } catch {}
  }

  const filtradas = liquidaciones.filter(l => {
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (
        !l.nro_suborden?.includes(q) &&
        !l.descripcion?.toLowerCase().includes(q) &&
        !l.archivo_origen?.toLowerCase().includes(q)
      ) return false
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
    <div style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Liquidación Paris</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            Importa y revisa los pagos de Paris Marketplace
          </div>
        </div>

        {/* Botón subir */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={subirArchivo}
            style={{ display: 'none' }} id="upload-paris" />
          <label htmlFor="upload-paris" style={{
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
            {uploading ? 'Procesando...' : 'Subir liquidación Excel'}
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

      {/* Archivos subidos */}
      {archivosSubidos.length > 0 && (
        <div style={{ marginBottom: '20px', background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Archivos importados
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {archivosSubidos.map(a => (
              <div key={a} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--bg)', border: '0.5px solid var(--border)',
                borderRadius: '8px', padding: '5px 10px',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ fontSize: '12px', color: 'var(--text-1)' }}>{a}</span>
                <button onClick={() => setConfirmEliminarArchivo(a)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--danger)', fontSize: '13px', lineHeight: 1,
                }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Ventas netas',       valor: `$${Math.round(resumen.total_ventas).toLocaleString('es-CL')}`,         color: '#059669', bg: '#05966918' },
          { label: 'Cobros por despacho', valor: `$${Math.round(resumen.total_cobro_despacho).toLocaleString('es-CL')}`, color: '#dc2626', bg: '#dc262618' },
          { label: 'Devoluciones',        valor: `$${Math.round(resumen.total_devoluciones).toLocaleString('es-CL')}`,   color: '#d97706', bg: '#d9770618' },
          {
            label: 'Total neto a recibir',
            valor: `$${Math.round(resumen.total_neto).toLocaleString('es-CL')}`,
            color: resumen.total_neto >= 0 ? '#2563eb' : '#dc2626',
            bg: resumen.total_neto >= 0 ? '#2563eb18' : '#dc262618',
          },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-2)', border: `0.5px solid ${c.bg}`, borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{c.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: c.color }}>{c.valor}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
        background: 'var(--bg-2)', border: '0.5px solid var(--border)',
        borderRadius: '10px', padding: '12px 16px', flexWrap: 'wrap',
      }}>
        {/* Búsqueda */}
        <div style={{ position: 'relative' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
            style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
          </svg>
          <input placeholder="Buscar suborden, descripción..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...IS, paddingLeft: '26px', width: '220px' }} />
        </div>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {/* Tipo */}
        {['', 'venta', 'cobro_despacho', 'devolucion', 'despacho'].map(t => {
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

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {/* Fechas */}
        <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} style={IS} title="Desde" />
        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>→</span>
        <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} style={IS} title="Hasta" />
        {(filtroDesde || filtroHasta) && (
          <button onClick={() => { setFiltroDesde(''); setFiltroHasta('') }} style={{
            padding: '4px 8px', borderRadius: '6px', fontSize: '11px',
            border: '0.5px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text-3)', cursor: 'pointer',
          }}>✕</button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-3)' }}>
          {filtradas.length} registros
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Cargando...</div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            {liquidaciones.length === 0 ? 'Sube un archivo Excel para comenzar' : 'No hay registros para los filtros seleccionados'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                {['Fecha', 'N° Suborden', 'Descripción', 'Tipo', 'Comisión', 'Monto Original', 'Monto a Pagar', 'Orden BD', ''].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((l, i) => {
                const tipoCfg = TIPO_CONFIG[l.tipo] ?? { label: l.tipo, color: 'var(--text-3)', bg: 'var(--bg-3)' }
                const esNegativo = (l.monto_a_pagar ?? 0) < 0
                return (
                  <tr key={l.id}
                    style={{ borderBottom: i < filtradas.length - 1 ? '0.5px solid var(--border)' : 'none' }}
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
                    <td style={{ ...TD, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.descripcion || '—'}
                    </td>
                    <td style={TD}>
                      <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: tipoCfg.bg, color: tipoCfg.color }}>
                        {tipoCfg.label}
                      </span>
                    </td>
                    <td style={TD}>
                      {l.comision_pct ? `${l.comision_pct}%` : '—'}
                    </td>
                    <td style={{ ...TD, fontWeight: 500, color: 'var(--text-1)' }}>
                      {l.monto ? `$${Math.round(l.monto).toLocaleString('es-CL')}` : '—'}
                    </td>
                    <td style={{ ...TD, fontWeight: 700, color: esNegativo ? '#dc2626' : '#059669', whiteSpace: 'nowrap' }}>
                      {l.monto_a_pagar !== null
                        ? `${esNegativo ? '' : '+'}$${Math.round(l.monto_a_pagar).toLocaleString('es-CL')}`
                        : '—'}
                    </td>
                    <td style={TD}>
                      {l.orden_id ? (
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500, background: '#05966918', color: '#059669' }}>
                          ✓ #{l.orden_id}
                        </span>
                      ) : (
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500, background: 'var(--bg-3)', color: 'var(--text-3)' }}>
                          No encontrada
                        </span>
                      )}
                    </td>
                    <td style={TD} />
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                <td colSpan={6} style={{ padding: '11px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>
                  Total ({filtradas.length} registros)
                </td>
                <td style={{ padding: '11px 14px', fontSize: '14px', fontWeight: 700, color: resumen.total_neto >= 0 ? '#059669' : '#dc2626' }}>
                  ${Math.round(filtradas.reduce((s, l) => s + (l.monto_a_pagar ?? 0), 0)).toLocaleString('es-CL')}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Confirm eliminar archivo */}
      {confirmEliminarArchivo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '400px', border: '0.5px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Eliminar archivo?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '6px' }}>
              Se eliminarán todos los registros de:
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '20px', wordBreak: 'break-all' }}>
              {confirmEliminarArchivo}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmEliminarArchivo(null)} style={{
                padding: '9px 16px', borderRadius: '8px', border: '0.5px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={() => eliminarArchivo(confirmEliminarArchivo)} style={{
                padding: '9px 20px', borderRadius: '8px', border: 'none',
                background: 'var(--danger)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
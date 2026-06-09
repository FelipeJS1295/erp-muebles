import { useState, useEffect, useMemo } from 'react'
import { dbApi } from '../../api/client'

interface Props {
  ordenes: any[]
  onClose: () => void
}

interface AliasInfo {
  alias: string
  hora_despacho: string
  transporte: string
  empresa: string
}

const parseFecha = (fecha: string) => {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const getHoy = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getEstadoUnificado(orden: any): string {
  if (orden.estado_interno === 'despachada') return 'Despachada'
  if (orden.estado_interno === 'cancelada') return 'Cancelada'
  if (orden.estado_interno === 'entregada') return 'Despachada'
  if (orden.estado_interno === 'confirmada') return 'Nueva'
  if (orden.fulfillment === 'by-paris') return 'Despachada'
  const hoy = getHoy()
  if (orden.fecha_despacho) {
    const d = parseFecha(orden.fecha_despacho)
    const activos = ['Created','Acknowledged','ready_to_ship','awaiting_fulfillment','pending','pending_by_seller','WAITING_ACCEPTANCE','WAITING_DEBIT','SHIPPING','TO_COLLECT','printed_label','EN_PREPARACION']
    if (d < hoy && activos.includes(orden.estado)) return 'Atrasada'
  }
  const mapa: Record<string, string> = {
    'Created':'Nueva','Acknowledged':'Nueva','Shipped':'Despachada','Cancelled':'Cancelada',
    'ready_to_ship':'Nueva','awaiting_fulfillment':'Nueva','delivery_in_progress':'Despachada',
    'delivered':'Despachada','deleted':'Cancelada','pending_by_seller':'Nueva','pending':'Nueva',
    'shipped':'Despachada','canceled':'Cancelada','WAITING_ACCEPTANCE':'Nueva','WAITING_DEBIT':'Nueva',
    'SHIPPING':'Nueva','TO_COLLECT':'Nueva','RECEIVED':'Despachada','CLOSED':'Despachada',
    'REFUSED':'Cancelada','CANCELED':'Cancelada','printed_label':'Nueva','Delivered':'Despachada',
    'EN_PREPARACION':'Nueva','DELIVERED':'Despachada','CANCELLED':'Cancelada',
  }
  return mapa[orden.estado] || orden.estado
}

const mktLabel: Record<string, string> = {
  walmart_chile: 'Walmart', paris_chile: 'Paris', falabella: 'Falabella',
  ripley: 'Ripley', hites: 'Hites', manual: 'Directa',
}

export default function MaestraResumidaTransporte({ ordenes, onClose }: Props) {
  const [alias, setAlias] = useState<Record<string, AliasInfo>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalAlias, setModalAlias] = useState(false)
  const [nuevoAlias, setNuevoAlias] = useState('')
  const [horaDespacho, setHoraDespacho] = useState('')
  const [transporte, setTransporte] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [sugerencia, setSugerencia] = useState<AliasInfo | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [soloResumen, setSoloResumen] = useState(false)
  const hoy = getHoy()

  useEffect(() => {
    dbApi.getAliasTransporte().then(res => {
      const map: Record<string, AliasInfo> = {}
      for (const a of res.data.alias || []) {
        map[a.sku] = { alias: a.alias, hora_despacho: a.hora_despacho || '', transporte: a.transporte || '', empresa: a.empresa || '' }
      }
      setAlias(map)
    }).catch(() => {})
  }, [])

  // Filas por SKU con info de órdenes
  const { filas, fechas } = useMemo(() => {
    const activas = ordenes.filter(o => {
      const est = getEstadoUnificado(o)
      if (o.orden_id === '1157568943') console.log('DEBUG orden falta:', est, o.estado, o.estado_interno, o.fecha_despacho)
      return ['Nueva','Atrasada'].includes(est)
    })
    const skuMap: Record<string, { sku: string; nombre: string; marketplace: string; fechas: Record<string, number> }> = {}
    for (const o of activas) {
      const items = o.items || []
      const itemsArr = Array.isArray(items) && items.length > 0 ? items : [null]
      const fecha = o.fecha_despacho || 'Sin fecha'
      for (const item of itemsArr) {
        if (!item) continue
        const sku = item.sellerSku || item.Sku || item.sku || item.ShopSku || 'sin-sku'
        const nombre = (o.marketplace === 'falabella'
          ? `${item.nombre || item.name || item.Name || '—'} (JAMAROFF)`
          : item.nombre || item.name || item.Name || '—')
        if (!skuMap[sku]) skuMap[sku] = { sku, nombre, fechas: {} }
        skuMap[sku].fechas[fecha] = (skuMap[sku].fechas[fecha] || 0) + 1
      }
    }
    const fechasSet = new Set<string>()
    Object.values(skuMap).forEach(f => Object.keys(f.fechas).forEach(f2 => fechasSet.add(f2)))
    return { filas: Object.values(skuMap), fechas: Array.from(fechasSet).sort() }
  }, [ordenes])

  // Filas agrupadas por transporte para la vista resumen
  const filasResumidas = useMemo(() => {
    const grupos: Record<string, {
      transporte: string; empresa: string; hora_despacho: string;
      productos: { nombre: string; marketplace: string; fechas: Record<string, number>; total: number }[]
    }> = {}

    for (const fila of filas) {
      const info = alias[fila.sku]
      if (!info) continue
      const key = `${info.transporte}|||${info.empresa}|||${info.hora_despacho}`
      if (!grupos[key]) grupos[key] = { transporte: info.transporte, empresa: info.empresa, hora_despacho: info.hora_despacho, productos: [] }
      const nombre = info.alias || fila.nombre
      const existing = grupos[key].productos.find(p => p.nombre === nombre && p.marketplace === fila.marketplace)
      if (existing) {
        for (const [f, c] of Object.entries(fila.fechas)) existing.fechas[f] = (existing.fechas[f] || 0) + c
        existing.total += Object.values(fila.fechas).reduce((a, b) => a + b, 0)
      } else {
        grupos[key].productos.push({ nombre, marketplace: fila.marketplace, fechas: { ...fila.fechas }, total: Object.values(fila.fechas).reduce((a, b) => a + b, 0) })
      }
    }
    return Object.values(grupos).sort((a, b) => a.hora_despacho.localeCompare(b.hora_despacho))
  }, [filas, alias])

  const toggleSelect = (sku: string) => {
    const s = new Set(selected)
    s.has(sku) ? s.delete(sku) : s.add(sku)
    setSelected(s)
  }

  const abrirAsignar = () => {
    if (selected.size === 0) return
    const skusArr = Array.from(selected)
    let sug: AliasInfo | null = null
    for (const sku of skusArr) {
      if (alias[sku]) { sug = alias[sku]; break }
    }
    setSugerencia(sug)
    setNuevoAlias(sug?.alias || '')
    setHoraDespacho(sug?.hora_despacho || '')
    setTransporte(sug?.transporte || '')
    setEmpresa(sug?.empresa || '')
    setModalAlias(true)
  }

  const guardarAlias = async () => {
    if (!nuevoAlias.trim()) return
    setGuardando(true)
    try {
      const skusArr = Array.from(selected)
      await Promise.all(skusArr.map(sku => {
        const f = filas.find(x => x.sku === sku)
        return dbApi.guardarAliasTransporte(sku, f?.nombre || sku, nuevoAlias.trim(), horaDespacho, transporte, empresa)
      }))
      const newAlias = { ...alias }
      skusArr.forEach(sku => { newAlias[sku] = { alias: nuevoAlias.trim(), hora_despacho: horaDespacho, transporte, empresa } })
      setAlias(newAlias)
      setSelected(new Set())
      setModalAlias(false)
      setNuevoAlias('')
      setHoraDespacho('')
      setTransporte('')
      setEmpresa('')
    } catch (e) {
      alert('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const quitarAlias = async (sku: string) => {
    try {
      await dbApi.eliminarAliasTransporte(sku)
      const newAlias = { ...alias }
      delete newAlias[sku]
      setAlias(newAlias)
    } catch (e) { alert('Error al quitar') }
  }

  const getCellStyle = (fecha: string, valor: number): React.CSSProperties => {
    if (valor === 0) return { color: 'var(--text-4)', fontSize: '12px' }
    const d = parseFecha(fecha)
    const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { color: 'var(--danger)', fontWeight: 700, fontSize: '13px' }
    if (diff <= 1) return { color: 'var(--warning)', fontWeight: 600, fontSize: '13px' }
    return { color: 'var(--success)', fontWeight: 500, fontSize: '13px' }
  }

  const imprimir = () => {
    const ventana = window.open('', '_blank')
    if (!ventana) return
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Maestra Transporte</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
      th { background: #f3f4f6; padding: 8px 10px; text-align: left; border: 1px solid #e5e7eb; font-size: 11px; }
      td { padding: 7px 10px; border: 1px solid #e5e7eb; }
      .grupo-header { background: #111; color: #fff; padding: 10px 14px; border-radius: 6px; margin-bottom: 8px; display: flex; gap: 24px; align-items: center; }
      .grupo-title { font-size: 14px; font-weight: 800; }
      .grupo-meta { font-size: 12px; opacity: 0.8; }
      h2 { margin-bottom: 16px; }
    </style></head><body>
    <h2>Maestra Transporte · ${new Date().toLocaleDateString('es-CL')}</h2>
    ${filasResumidas.map(grupo => `
      <div class="grupo-header">
        <span class="grupo-title">🚚 ${grupo.transporte || 'Sin transporte'}</span>
        <span class="grupo-meta">⏰ ${grupo.hora_despacho || 'Sin hora'}</span>
        <span class="grupo-meta">🏢 ${grupo.empresa || 'Sin empresa'}</span>
      </div>
      <table>
        <thead><tr>
          <th>Producto</th>
          <th>Marketplace</th>
          ${fechas.map(f => `<th style="text-align:center">${f}</th>`).join('')}
          <th style="text-align:center">Total</th>
        </tr></thead>
        <tbody>
          ${grupo.productos.map(p => `<tr>
            <td style="font-weight:600">${p.nombre}</td>
            <td>${mktLabel[p.marketplace] || p.marketplace}</td>
            ${fechas.map(f => `<td style="text-align:center;font-weight:${(p.fechas[f]||0)>0?'700':'400'};color:${(p.fechas[f]||0)===0?'#bbb':'#000'}">${p.fechas[f] || '—'}</td>`).join('')}
            <td style="text-align:center;font-weight:800">${p.total}</td>
          </tr>`).join('')}
          <tr style="background:#f3f4f6;font-weight:800">
            <td colspan="2">TOTAL</td>
            ${fechas.map(f => `<td style="text-align:center">${grupo.productos.reduce((a,p) => a+(p.fechas[f]||0),0)||'—'}</td>`).join('')}
            <td style="text-align:center">${grupo.productos.reduce((a,p) => a+p.total,0)}</td>
          </tr>
        </tbody>
      </table>
    `).join('')}
    <script>window.print()</script></body></html>`)
    ventana.document.close()
  }

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '7px 12px', fontSize: '13px',
    color: 'var(--text-1)', outline: 'none', cursor: 'pointer',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: '0.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px', overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--bg-2)', borderRadius: '12px', width: '100%', maxWidth: '1200px',
        border: '0.5px solid var(--border)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>Maestra Transporte</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Asigna hora, transporte y empresa a cada producto</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {selected.size > 0 && (
              <button onClick={abrirAsignar} style={{ ...IS, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', fontWeight: 500 }}>
                Asignar ({selected.size})
              </button>
            )}
            <button onClick={() => setSoloResumen(v => !v)} style={{
              ...IS,
              background: soloResumen ? 'var(--success-bg)' : 'var(--bg)',
              color: soloResumen ? 'var(--success)' : 'var(--text-2)',
              border: soloResumen ? '0.5px solid var(--success)' : '0.5px solid var(--border)',
              fontWeight: soloResumen ? 600 : 400,
            }}>
              {soloResumen ? '✓ Ver resumen' : 'Ver resumen'}
            </button>
            <button onClick={imprimir} style={{ ...IS }}>🖨️ Imprimir</button>
            <button onClick={onClose} style={{ ...IS }}>✕ Cerrar</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', padding: '16px 24px' }}>
          {soloResumen ? (
            // Vista resumen agrupada por transporte
            filasResumidas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)', fontSize: '13px' }}>
                No hay productos asignados aún. Selecciona productos y usa "Asignar".
              </div>
            ) : filasResumidas.map((grupo, i) => (
              <div key={i} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-3)', borderRadius: '8px', marginBottom: '8px', border: '0.5px solid var(--border)' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>🚚 {grupo.transporte || 'Sin transporte'}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>⏰ {grupo.hora_despacho || 'Sin hora'}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>🏢 {grupo.empresa || 'Sin empresa'}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: 'auto' }}>{grupo.productos.reduce((a, p) => a + p.total, 0)} unidades</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', minWidth: '200px' }}>Producto</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)' }}>Marketplace</th>
                      {fechas.map(f => (
                        <th key={f} style={{ padding: '8px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap' }}>{f}</th>
                      ))}
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.productos.map((p, j) => (
                      <tr key={j}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '9px 12px', borderBottom: '0.5px solid var(--border)', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{p.nombre}</td>
                        <td style={{ padding: '9px 12px', borderBottom: '0.5px solid var(--border)', fontSize: '12px', color: 'var(--text-3)' }}>{mktLabel[p.marketplace] || p.marketplace}</td>
                        {fechas.map(f => (
                          <td key={f} style={{ padding: '9px 12px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', ...getCellStyle(f, p.fechas[f] || 0) }}>
                            {p.fechas[f] || '—'}
                          </td>
                        ))}
                        <td style={{ padding: '9px 12px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', fontWeight: 700, color: 'var(--text-1)' }}>{p.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          ) : (
            // Vista normal con checkboxes
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', width: '32px', borderBottom: '0.5px solid var(--border)' }}></th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', minWidth: '200px' }}>Producto</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)' }}>Marketplace</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)' }}>Transporte</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)' }}>Hora</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)' }}>Empresa</th>
                  {fechas.map(f => (
                    <th key={f} style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap' }}>{f}</th>
                  ))}
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)' }}>Total</th>
                  <th style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)' }}></th>
                </tr>
              </thead>
              <tbody>
                {filas.map(fila => {
                  const isSelected = selected.has(fila.sku)
                  const info = alias[fila.sku]
                  const total = Object.values(fila.fechas).reduce((a, b) => a + b, 0)
                  return (
                    <tr key={fila.sku}
                      style={{ background: isSelected ? 'var(--info-bg)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => toggleSelect(fila.sku)}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-3)' }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)' }}>
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '4px',
                          border: isSelected ? '1.5px solid var(--accent)' : '1.5px solid var(--border-2)',
                          background: isSelected ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isSelected && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="var(--accent-fg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{info?.alias || fila.nombre}</div>
                        {info && <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '2px' }}>Original: {fila.nombre}</div>}
                        {!info && <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '2px', fontFamily: 'monospace' }}>{fila.sku}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)', fontSize: '12px', color: 'var(--text-3)' }}>
                        {mktLabel[fila.marketplace] || fila.marketplace}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)', fontSize: '12px', color: info?.transporte ? 'var(--text-1)' : 'var(--text-4)' }}>
                        {info?.transporte || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)', fontSize: '12px', color: info?.hora_despacho ? 'var(--text-1)' : 'var(--text-4)' }}>
                        {info?.hora_despacho || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)', fontSize: '12px', color: info?.empresa ? 'var(--text-1)' : 'var(--text-4)' }}>
                        {info?.empresa || '—'}
                      </td>
                      {fechas.map(f => (
                        <td key={f} style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', ...getCellStyle(f, fila.fechas[f] || 0) }}>
                          {fila.fechas[f] || '—'}
                        </td>
                      ))}
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', fontWeight: 700, color: 'var(--text-1)' }}>{total}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                        {info && (
                          <button onClick={() => quitarAlias(fila.sku)} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}>
                            Quitar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal asignar */}
      {modalAlias && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '12px', padding: '24px', width: '440px', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>Asignar transporte</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px' }}>{selected.size} producto{selected.size > 1 ? 's' : ''} seleccionado{selected.size > 1 ? 's' : ''}</div>
            {sugerencia && (
              <div style={{ padding: '10px 12px', background: 'var(--info-bg)', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>¿Usar configuración anterior? <strong>{sugerencia.transporte} · {sugerencia.hora_despacho}</strong></span>
                <button onClick={() => { setNuevoAlias(sugerencia.alias); setHoraDespacho(sugerencia.hora_despacho); setTransporte(sugerencia.transporte); setEmpresa(sugerencia.empresa) }}
                  style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '5px', border: 'none', background: 'var(--info)', color: '#fff', cursor: 'pointer' }}>Usar</button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '4px', display: 'block' }}>Nombre del producto</label>
                <input autoFocus value={nuevoAlias} onChange={e => setNuevoAlias(e.target.value)} placeholder="Ej: Sofá 3 cuerpos" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '4px', display: 'block' }}>Transporte</label>
                <input value={transporte} onChange={e => setTransporte(e.target.value)} placeholder="Ej: Bluexpress" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '4px', display: 'block' }}>Hora de despacho</label>
                <input type="time" value={horaDespacho} onChange={e => setHoraDespacho(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '4px', display: 'block' }}>Empresa</label>
                <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ej: Jerk Home" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalAlias(false)} style={{ padding: '8px 16px', borderRadius: '7px', border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarAlias} disabled={guardando || !nuevoAlias.trim()} style={{ padding: '8px 16px', borderRadius: '7px', border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', cursor: 'pointer', fontWeight: 500, opacity: guardando || !nuevoAlias.trim() ? 0.6 : 1 }}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
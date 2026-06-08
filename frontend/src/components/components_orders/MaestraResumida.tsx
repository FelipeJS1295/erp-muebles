import { useState, useEffect, useMemo } from 'react'
import { dbApi } from '../../api/client'

interface Props {
  ordenes: any[]
  onClose: () => void
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

export default function MaestraResumida({ ordenes, onClose }: Props) {
  const [alias, setAlias] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalAlias, setModalAlias] = useState(false)
  const [nuevoAlias, setNuevoAlias] = useState('')
  const [sugerencia, setSugerencia] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [soloResumen, setSoloResumen] = useState(false)
  const hoy = getHoy()

  useEffect(() => {
    dbApi.getAlias().then(res => {
      const map: Record<string, string> = {}
      for (const a of res.data.alias || []) map[a.sku] = a.alias
      setAlias(map)
    }).catch(() => {})
  }, [])

  // Construir filas: una por SKU con cantidades por fecha
  const { filas, fechas } = useMemo(() => {
    const activas = ordenes.filter(o => ['Nueva','Atrasada'].includes(getEstadoUnificado(o)))
    const skuMap: Record<string, { sku: string; nombre: string; fechas: Record<string, number> }> = {}
    for (const o of activas) {
      const items = o.items || []
      const primer = Array.isArray(items) ? items[0] : null
      if (!primer) continue
      const sku = primer.sellerSku || primer.sku || primer.Sku || 'sin-sku'
      const nombre = (o.marketplace === 'falabella'
        ? `${primer.nombre || primer.name || primer.Name || '—'} (JAMAROFF)`
        : primer.nombre || primer.name || primer.Name || '—')
      const fecha = o.fecha_despacho || 'Sin fecha'
      if (!skuMap[sku]) skuMap[sku] = { sku, nombre, fechas: {} }
      skuMap[sku].fechas[fecha] = (skuMap[sku].fechas[fecha] || 0) + 1
    }
    const fechasSet = new Set<string>()
    Object.values(skuMap).forEach(f => Object.keys(f.fechas).forEach(f2 => fechasSet.add(f2)))
    const fechasArr = Array.from(fechasSet).sort()
    return { filas: Object.values(skuMap), fechas: fechasArr }
  }, [ordenes])

  // Filas agrupadas con alias aplicados
  const filasResumidas = useMemo(() => {
    const grupos: Record<string, { nombre: string; skus: string[]; fechas: Record<string, number> }> = {}
    for (const fila of filas) {
      const nombre = alias[fila.sku] || fila.nombre
      if (!grupos[nombre]) grupos[nombre] = { nombre, skus: [fila.sku], fechas: {} }
      else grupos[nombre].skus.push(fila.sku)
      for (const [f, c] of Object.entries(fila.fechas)) {
        grupos[nombre].fechas[f] = (grupos[nombre].fechas[f] || 0) + c
      }
    }
    return Object.values(grupos)
  }, [filas, alias])

  const toggleSelect = (sku: string) => {
    const s = new Set(selected)
    s.has(sku) ? s.delete(sku) : s.add(sku)
    setSelected(s)
  }

  const abrirAsignar = () => {
    if (selected.size === 0) return
    // Buscar si alguno de los seleccionados ya tiene alias
    const skusArr = Array.from(selected)
    let sug: string | null = null
    for (const sku of skusArr) {
      if (alias[sku]) { sug = alias[sku]; break }
    }
    setSugerencia(sug)
    setNuevoAlias(sug || '')
    setModalAlias(true)
  }

  const guardarAlias = async () => {
    if (!nuevoAlias.trim()) return
    setGuardando(true)
    try {
      const skusArr = Array.from(selected)
      const fila = filas.find(f => f.sku === skusArr[0])
      await Promise.all(skusArr.map(sku => {
        const f = filas.find(x => x.sku === sku)
        return dbApi.guardarAlias(sku, f?.nombre || sku, nuevoAlias.trim())
      }))
      const newAlias = { ...alias }
      skusArr.forEach(sku => { newAlias[sku] = nuevoAlias.trim() })
      setAlias(newAlias)
      setSelected(new Set())
      setModalAlias(false)
      setNuevoAlias('')
    } catch (e) {
      alert('Error al guardar alias')
    } finally {
      setGuardando(false)
    }
  }

  const quitarAlias = async (sku: string) => {
    try {
      await dbApi.eliminarAlias(sku)
      const newAlias = { ...alias }
      delete newAlias[sku]
      setAlias(newAlias)
    } catch (e) { alert('Error al quitar alias') }
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
    const totales: Record<string, number> = {}
    fechas.forEach(f => { totales[f] = 0 })
    filasResumidas.forEach(fila => fechas.forEach(f => { totales[f] = (totales[f] || 0) + (fila.fechas[f] || 0) }))
    const totalGeneral = Object.values(totales).reduce((a, b) => a + b, 0)
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Maestra Resumida</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th { background: #f3f4f6; padding: 8px 10px; text-align: center; border: 1px solid #e5e7eb; font-size: 11px; }
      td { padding: 7px 10px; border: 1px solid #e5e7eb; }
      .td-prod { text-align: left; font-weight: 700; min-width: 200px; }
      .td-num { text-align: center; font-weight: 700; }
      .td-total { text-align: center; font-weight: 800; background: #f9fafb; }
      .total-row { background: #f3f4f6; font-weight: 800; }
      h2 { margin-bottom: 12px; }
    </style></head><body>
    <h2>Maestra Resumida · ${new Date().toLocaleDateString('es-CL')}</h2>
    <table>
      <thead><tr>
        <th class="td-prod">Producto</th>
        ${fechas.map(f => `<th>${f}</th>`).join('')}
        <th>Total</th>
      </tr></thead>
      <tbody>
        ${filasResumidas.map(fila => {
          const total = Object.values(fila.fechas).reduce((a, b) => a + b, 0)
          return `<tr>
            <td class="td-prod">${fila.nombre}</td>
            ${fechas.map(f => `<td class="td-num" style="color:${(fila.fechas[f]||0)===0?'#bbb':'#000'}">${fila.fechas[f] || '—'}</td>`).join('')}
            <td class="td-total">${total}</td>
          </tr>`
        }).join('')}
        <tr class="total-row">
          <td class="td-prod">TOTAL</td>
          ${fechas.map(f => `<td class="td-num">${totales[f] || 0}</td>`).join('')}
          <td class="td-total">${totalGeneral}</td>
        </tr>
      </tbody>
    </table>
    <script>window.print()</script></body></html>`)
    ventana.document.close()
  }

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '7px 12px', fontSize: '13px',
    color: 'var(--text-1)', outline: 'none', cursor: 'pointer',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px', overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--bg-2)', borderRadius: '12px', width: '100%', maxWidth: '1100px',
        border: '0.5px solid var(--border)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>Maestra Resumida</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Selecciona productos y asígnales un nombre agrupado</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {selected.size > 0 && (
              <button onClick={abrirAsignar} style={{ ...IS, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', fontWeight: 500 }}>
                Asignar nombre ({selected.size})
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
            <button onClick={imprimir} style={{ ...IS, display: 'flex', alignItems: 'center', gap: '6px' }}>
              🖨️ Imprimir
            </button>
            <button onClick={onClose} style={{ ...IS }}>✕ Cerrar</button>
          </div>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto', padding: '16px 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', width: '32px' }}></th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', minWidth: '220px' }}>Producto</th>
                {fechas.map(f => (
                  <th key={f} style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap' }}>{f}</th>
                ))}
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)' }}>Total</th>
                <th style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)' }}></th>
              </tr>
            </thead>
            <tbody>
              {filas.filter(fila => !soloResumen || !!alias[fila.sku]).map(fila => {
                const isSelected = selected.has(fila.sku)
                const tieneAlias = !!alias[fila.sku]
                const nombreMostrar = alias[fila.sku] || fila.nombre
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
                        width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                        border: isSelected ? '1.5px solid var(--accent)' : '1.5px solid var(--border-2)',
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="var(--accent-fg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{nombreMostrar}</div>
                      {tieneAlias && (
                        <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '2px' }}>
                          Original: {fila.nombre} · <span style={{ fontFamily: 'monospace' }}>{fila.sku}</span>
                        </div>
                      )}
                      {!tieneAlias && <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '2px', fontFamily: 'monospace' }}>{fila.sku}</div>}
                    </td>
                    {fechas.map(f => (
                      <td key={f} style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', ...getCellStyle(f, fila.fechas[f] || 0) }}>
                        {fila.fechas[f] || '—'}
                      </td>
                    ))}
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', fontWeight: 700, color: 'var(--text-1)' }}>{total}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                      {tieneAlias && (
                        <button onClick={() => quitarAlias(fila.sku)} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}>
                          Quitar alias
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal asignar alias */}
      {modalAlias && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '12px', padding: '24px', width: '420px', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>Asignar nombre</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px' }}>
              {selected.size} producto{selected.size > 1 ? 's' : ''} seleccionado{selected.size > 1 ? 's' : ''} se mostrarán como una sola línea con este nombre.
            </div>
            {sugerencia && (
              <div style={{ padding: '10px 12px', background: 'var(--info-bg)', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>¿Usar nombre anterior? <strong>{sugerencia}</strong></span>
                <button onClick={() => setNuevoAlias(sugerencia)} style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '5px', border: 'none', background: 'var(--info)', color: '#fff', cursor: 'pointer' }}>Usar</button>
              </div>
            )}
            <input
              autoFocus
              value={nuevoAlias}
              onChange={e => setNuevoAlias(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && guardarAlias()}
              placeholder="Ej: Sofá 3 cuerpos"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
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
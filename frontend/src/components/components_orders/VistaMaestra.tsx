import { useState, useEffect, useMemo } from 'react'
import { api } from '../../api/client'

interface Orden {
  id: number
  marketplace: string
  orden_id: string
  estado: string
  fecha_despacho: string | null
  items: any[]
  raw: any
}

// Helper fuera del componente
const parseFecha = (fecha: string) => {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const getHoy = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getEstadoUnificado(orden: any): string {
  const hoy = getHoy()
  if (orden.fecha_despacho) {
    const d = parseFecha(orden.fecha_despacho)
        const activos = [
      'Created', 'Acknowledged',
      'ready_to_ship', 'awaiting_fulfillment',
      'pending', 'pending_by_seller',
      'WAITING_ACCEPTANCE', 'WAITING_DEBIT', 'SHIPPING', 'TO_COLLECT','printed_label'
    ]
    if (d < hoy && activos.includes(orden.estado)) return 'Atrasada'
  }
  const mapa: Record<string, string> = {
    'Created': 'Nueva', 'Acknowledged': 'Nueva',
    'Shipped': 'Despachada', 'Cancelled': 'Cancelada',
    'ready_to_ship': 'Nueva', 'awaiting_fulfillment': 'Nueva',
    'delivery_in_progress': 'Despachada', 'delivered': 'Despachada',
    'deleted': 'Cancelada', 'pending_by_seller': 'Nueva',
    'pending': 'Nueva', 'shipped': 'Despachada', 'canceled': 'Cancelada',
    'WAITING_ACCEPTANCE': 'Nueva', 'WAITING_DEBIT': 'Nueva',
    'SHIPPING': 'Nueva', 'TO_COLLECT': 'Nueva',
    'RECEIVED': 'Despachada', 'CLOSED': 'Despachada',
    'REFUSED': 'Cancelada', 'CANCELED': 'Cancelada','printed_label': 'Nueva',
  }
  return mapa[orden.estado] || orden.estado
}

export default function VistaMaestra({ ordenes, onClose }: { ordenes: Orden[], onClose: () => void }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroMkt, setFiltroMkt] = useState('')
  const [productosInternos, setProductosInternos] = useState<any[]>([])
  const [skusRetail, setSkusRetail] = useState<any[]>([])

  useEffect(() => {
    api.get('/productos-internos').then(r => setProductosInternos(r.data.productos || [])).catch(() => {})
    api.get('/sku-retail').then(r => setSkusRetail(r.data.skus || [])).catch(() => {})
  }, [])

  const hoy = getHoy()

  const ordenesFiltradas = useMemo(() => ordenes.filter(o => {
    const estado = getEstadoUnificado(o)
    if (!['Nueva', 'Atrasada'].includes(estado)) return false
    if (filtroMkt && o.marketplace !== filtroMkt) return false
    return true
  }), [ordenes, filtroMkt])

  const fechas = useMemo(() => {
    const set = new Set<string>()
    ordenesFiltradas.forEach(o => { if (o.fecha_despacho) set.add(o.fecha_despacho) })
    return Array.from(set).sort()
  }, [ordenesFiltradas])

  const tabla = useMemo(() => {
    const grupos: Record<string, Record<string, Record<string, number>>> = {}
    ordenesFiltradas.forEach(o => {
      const mkt = o.marketplace === 'walmart_chile' ? 'Walmart' :
            o.marketplace === 'paris_chile' ? 'Paris' :
            o.marketplace === 'ripley' ? 'Ripley' : 'Falabella'
      const items = o.items || []
      const primer = Array.isArray(items) ? items[0] : null
      const producto = primer?.nombre || primer?.name || primer?.Name || '—'
      const sku = primer?.sellerSku || primer?.sku || primer?.Sku || ''
      const key = `${o.marketplace === 'falabella' ? `${producto} (JAMAROFF)` : producto}|||${sku}`
      const fecha = o.fecha_despacho || 'Sin fecha'
      if (!grupos[mkt]) grupos[mkt] = {}
      if (!grupos[mkt][key]) grupos[mkt][key] = {}
      grupos[mkt][key][fecha] = (grupos[mkt][key][fecha] || 0) + 1
    })
    if (busqueda) {
      const q = busqueda.toLowerCase()
      Object.keys(grupos).forEach(mkt => {
        Object.keys(grupos[mkt]).forEach(key => {
          if (!key.toLowerCase().includes(q)) delete grupos[mkt][key]
        })
        if (Object.keys(grupos[mkt]).length === 0) delete grupos[mkt]
      })
    }
    return grupos
  }, [ordenesFiltradas, busqueda])

  const getCellStyle = (fecha: string, valor: number): React.CSSProperties => {
    if (valor === 0) return { color: 'var(--text-4)', fontSize: '12px' }
    const d = parseFecha(fecha)
    const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { color: 'var(--danger)', fontWeight: 700, fontSize: '13px' }
    if (diff <= 1) return { color: 'var(--warning)', fontWeight: 600, fontSize: '13px' }
    return { color: 'var(--success)', fontWeight: 500, fontSize: '13px' }
  }

  const totalesFecha: Record<string, number> = {}
  fechas.forEach(f => {
    totalesFecha[f] = 0
    Object.values(tabla).forEach(prods =>
      Object.values(prods).forEach(fm => { totalesFecha[f] += fm[f] || 0 })
    )
  })
  const totalGeneral = Object.values(totalesFecha).reduce((a, b) => a + b, 0)

  const buscarProductoInterno = (o: Orden) => {
    const items = o.items || []
    const primer = Array.isArray(items) ? items[0] : null
    const sku = primer?.sellerSku || primer?.sku || primer?.Sku || ''
    const skuUpper = sku.toUpperCase()

    if (o.marketplace === 'paris_chile') {
      const skuSinSufijo = skuUpper.replace(/-\d+$/, '')
      const skuPadre = skuSinSufijo.split('-')[0]
      let retail = skusRetail.find(r => r.sku_paris?.toUpperCase().replace(/-\d+$/, '') === skuSinSufijo)
      if (retail) return productosInternos.find(p => p.id === retail.producto_interno_id)
      retail = skusRetail.find(r => r.sku?.toUpperCase() === skuSinSufijo)
      if (retail) return productosInternos.find(p => p.id === retail.producto_interno_id)
      return productosInternos.find(p =>
        p.sku_padre?.toUpperCase() === skuPadre || p.sku?.toUpperCase() === skuSinSufijo
      )
    } else if (o.marketplace === 'falabella') {
      const skuSinSufijo = skuUpper.replace(/-\d+$/, '')
      const retail = skusRetail.find(r =>
        r.sku_falabella?.toUpperCase() === skuSinSufijo ||
        r.sku_falabella?.toUpperCase() === skuUpper
      )
      if (retail) return productosInternos.find(p => p.id === retail.producto_interno_id)
      return productosInternos.find(p => p.sku?.toUpperCase() === skuSinSufijo)
    } else {
      const skuPadre = skuUpper.split('-')[0]
      const retail = skusRetail.find(r =>
        r.sku_walmart?.toUpperCase() === skuUpper || r.sku?.toUpperCase() === skuUpper
      )
      if (retail) return productosInternos.find(p => p.id === retail.producto_interno_id)
      return productosInternos.find(p =>
        p.sku_padre?.toUpperCase() === skuPadre || p.sku?.toUpperCase() === skuUpper
      )
    }
  }

  const imprimirMaestra = (esEsqueletos: boolean) => {
    const ventana = window.open('', '_blank')
    if (!ventana) return
    const titulo = esEsqueletos ? 'Maestra Esqueletos' : 'Vista Maestra'

    const tablaFinal = esEsqueletos ? (() => {
      const grupos: Record<string, Record<string, number>> = {}
      ordenesFiltradas.forEach(o => {
        const prodInterno = buscarProductoInterno(o)
        const items = o.items || []
        const primer = Array.isArray(items) ? items[0] : null
        const skuOrden = primer?.sellerSku || primer?.sku || primer?.Sku || 'sin-sku'
        const descEsqueleto = prodInterno?.descripcion_esqueleto ||
          (prodInterno ? `Sin esqueleto (${prodInterno.sku_padre})` : `No cruzado (${skuOrden})`)
        const fecha = o.fecha_despacho || 'Sin fecha'
        if (!grupos[descEsqueleto]) grupos[descEsqueleto] = {}
        grupos[descEsqueleto][fecha] = (grupos[descEsqueleto][fecha] || 0) + 1
      })
      return grupos
    })() : null

    const tablaFinalNormal = !esEsqueletos ? tabla : null
    const totalesFinales: Record<string, number> = {}
    fechas.forEach(f => { totalesFinales[f] = 0 })

    const filasEsqueleto = esEsqueletos ? Object.entries(tablaFinal!).map(([desc, fechaMap]) => {
      const totalProd = Object.values(fechaMap).reduce((a, b) => a + b, 0)
      fechas.forEach(f => { totalesFinales[f] = (totalesFinales[f] || 0) + (fechaMap[f] || 0) })
      const sinEsqueleto = desc.startsWith('Sin esqueleto') || desc.startsWith('No cruzado')
      return `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #eee;min-width:260px">
            <div style="font-size:14px;font-weight:${sinEsqueleto ? '400' : '600'};color:${sinEsqueleto ? '#e85d04' : '#1a1a1a'}">${desc}</div>
          </td>
          ${fechas.map(f => {
            const val = fechaMap[f] || 0
            const d = parseFecha(f)
            const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
            const color = val === 0 ? '#ccc' : diff < 0 ? '#dc2626' : diff <= 1 ? '#d97706' : '#059669'
            return `<td style="padding:10px 14px;border-bottom:1px solid #eee;border-left:1px solid #eee;text-align:center;color:${color};font-weight:${val > 0 ? '700' : '400'};font-size:14px">${val === 0 ? '—' : val}</td>`
          }).join('')}
          <td style="padding:10px 14px;border-bottom:1px solid #eee;border-left:1px solid #eee;text-align:center;font-weight:700;font-size:14px;background:#f9f9f9">${totalProd}</td>
        </tr>
      `
    }).join('') : ''

    const filasNormal = !esEsqueletos ? Object.entries(tablaFinalNormal!).map(([mkt, productos]) => {
      const totalMkt = Object.values(productos).reduce((sum, fm) =>
        sum + Object.values(fm).reduce((a, b) => a + b, 0), 0)
      fechas.forEach(f => {
        Object.values(productos).forEach(fm => { totalesFinales[f] = (totalesFinales[f] || 0) + (fm[f] || 0) })
      })
      const filasMkt = Object.entries(productos).map(([key, fechaMap]) => {
        const [nombre, sku] = key.split('|||')
        const totalProd = Object.values(fechaMap).reduce((a, b) => a + b, 0)
        return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;padding-left:24px">
              <div style="font-size:12px;font-weight:500">${nombre}</div>
              ${sku ? `<div style="font-size:10px;color:#888;font-family:monospace">${sku}</div>` : ''}
            </td>
            ${fechas.map(f => {
              const val = fechaMap[f] || 0
              const d = parseFecha(f)
              const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
              const color = val === 0 ? '#ccc' : diff < 0 ? '#dc2626' : diff <= 1 ? '#d97706' : '#059669'
              return `<td style="padding:8px 12px;border-bottom:1px solid #eee;border-left:1px solid #eee;text-align:center;color:${color};font-weight:${val > 0 ? '600' : '400'};font-size:13px">${val === 0 ? '—' : val}</td>`
            }).join('')}
            <td style="padding:8px 12px;border-bottom:1px solid #eee;border-left:1px solid #eee;text-align:center;font-weight:700;background:#f9f9f9">${totalProd}</td>
          </tr>
        `
      }).join('')
      return `
        <tr style="background:#f0f0f0">
          <td style="padding:9px 12px;border-bottom:1px solid #ddd;border-top:2px solid #ddd;font-weight:700">${mkt} (${totalMkt})</td>
          ${fechas.map(() => `<td style="border-left:1px solid #eee;background:#f0f0f0"></td>`).join('')}
          <td style="padding:9px 12px;text-align:center;font-weight:700;background:#f0f0f0;border-left:1px solid #eee">${totalMkt}</td>
        </tr>
        ${filasMkt}
      `
    }).join('') : ''

    const totalFinal = Object.values(totalesFinales).reduce((a, b) => a + b, 0)

    ventana.document.write(`
      <html>
      <head>
        <title>${titulo} - Jerk Home</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; font-family:Arial,sans-serif; }
          body { padding:24px; color:#1a1a1a; }
          .header { display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:2px solid #1a1a1a; padding-bottom:14px; }
          .empresa { font-size:20px; font-weight:700; }
          .sub { font-size:12px; color:#666; margin-top:4px; }
          table { width:100%; border-collapse:collapse; border:1px solid #ddd; }
          th { padding:10px 14px; background:#1a1a1a; color:white; font-size:12px; white-space:nowrap; border-left:1px solid #444; }
          th:first-child { text-align:left; border-left:none; }
          .legend { display:flex; gap:16px; margin-bottom:14px; font-size:11px; color:#666; }
          .dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:4px; vertical-align:middle; }
          @media print { body { padding:12px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="empresa">Jerk Home · ${titulo}</div>
            <div class="sub">
              ${new Date().toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
              · ${ordenesFiltradas.length} órdenes · ${totalFinal} unidades
            </div>
          </div>
        </div>
        <div class="legend">
          <span><span class="dot" style="background:#dc2626"></span>Atrasada</span>
          <span><span class="dot" style="background:#d97706"></span>Urgente</span>
          <span><span class="dot" style="background:#059669"></span>Normal</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="min-width:260px">${esEsqueletos ? 'Descripción Esqueleto' : 'Marketplace / Producto'}</th>
              ${fechas.map(f => {
                const d = parseFecha(f)
                const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                const color = diff < 0 ? '#ef4444' : diff <= 1 ? '#f59e0b' : 'white'
                return `<th style="text-align:center;color:${color}">${f}<br><span style="font-size:9px;font-weight:400">${diff < 0 ? '⚠ Atrasada' : diff === 0 ? 'Hoy' : d.toLocaleDateString('es-CL',{weekday:'short'})}</span></th>`
              }).join('')}
              <th style="text-align:center">Total</th>
            </tr>
          </thead>
          <tbody>
            ${esEsqueletos ? filasEsqueleto : filasNormal}
            <tr style="background:#e8e8e8;border-top:2px solid #1a1a1a">
              <td style="padding:10px 14px;font-weight:700;font-size:13px">Total general</td>
              ${fechas.map(f => {
                const val = totalesFinales[f] || 0
                const d = parseFecha(f)
                const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                const color = val === 0 ? '#ccc' : diff < 0 ? '#dc2626' : diff <= 1 ? '#d97706' : '#059669'
                return `<td style="padding:10px 14px;text-align:center;font-weight:700;color:${color};border-left:1px solid #ddd;font-size:14px">${val === 0 ? '—' : val}</td>`
              }).join('')}
              <td style="padding:10px 14px;text-align:center;font-weight:700;font-size:15px;border-left:1px solid #ddd">${totalFinal}</td>
            </tr>
          </tbody>
        </table>
        <script>window.onload = () => { window.print() }</script>
      </body>
      </html>
    `)
    ventana.document.close()
  }

  const thM: React.CSSProperties = {
    padding: '9px 12px', fontSize: '11px', fontWeight: 500,
    color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)',
    borderRight: '0.5px solid var(--border)', background: 'var(--bg)',
    whiteSpace: 'nowrap', textAlign: 'center',
  }
  const tdM: React.CSSProperties = {
    padding: '9px 12px', borderBottom: '0.5px solid var(--border)',
    borderRight: '0.5px solid var(--border)', textAlign: 'center',
  }
  const fS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '6px 10px', fontSize: '12px',
    color: 'var(--text-1)', outline: 'none', cursor: 'pointer',
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, padding: '24px', overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: '12px',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '1100px',
        animation: 'fadeIn 0.15s ease',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '16px', flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>Vista Maestra</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
              Órdenes activas agrupadas por producto y fecha de despacho
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
                  style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                  <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
                </svg>
                <input placeholder="Buscar producto o SKU..." value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  style={{ ...fS, paddingLeft: '26px', width: '200px' }} />
              </div>
              <select value={filtroMkt} onChange={e => setFiltroMkt(e.target.value)} style={fS}>
                <option value="">Todos los marketplaces</option>
                <option value="walmart_chile">Walmart Chile</option>
                <option value="paris_chile">Paris Chile</option>
                <option value="falabella">Falabella Chile</option>
                <option value="ripley">Ripley Chile</option>
              </select>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', marginLeft: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-3)' }}>Atrasada</span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)', display: 'inline-block', marginLeft: '8px' }} />
                <span style={{ color: 'var(--text-3)' }}>Urgente</span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', marginLeft: '8px' }} />
                <span style={{ color: 'var(--text-3)' }}>Normal</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => imprimirMaestra(false)} style={{
              padding: '7px 14px', borderRadius: '7px',
              border: '0.5px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>🖨️ Imprimir maestra</button>
            <button onClick={() => imprimirMaestra(true)} style={{
              padding: '7px 14px', borderRadius: '7px',
              border: '0.5px solid var(--info)', background: 'var(--info-bg)',
              color: 'var(--info)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>🦴 Maestra esqueletos</button>
            <button onClick={onClose} style={{
              background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
              width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0,
            }}>✕</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', padding: '16px 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid var(--border)' }}>
            <thead>
              <tr>
                <th style={{ ...thM, textAlign: 'left', width: '240px' }}>Marketplace / Producto</th>
                {fechas.map(f => {
                  const d = parseFecha(f)
                  const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <th key={f} style={{ ...thM, color: diff < 0 ? 'var(--danger)' : diff === 0 ? 'var(--warning)' : 'var(--text-3)' }}>
                      {f}<br/>
                      <span style={{ fontSize: '10px', fontWeight: 400 }}>
                        {diff < 0 ? '⚠ Atrasada' : diff === 0 ? 'Hoy' : d.toLocaleDateString('es-CL', { weekday: 'short' })}
                      </span>
                    </th>
                  )
                })}
                <th style={{ ...thM, background: 'var(--bg-3)', fontWeight: 700, color: 'var(--text-1)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(tabla).length === 0 ? (
                <tr><td colSpan={fechas.length + 2} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                  No hay órdenes activas para mostrar
                </td></tr>
              ) : Object.entries(tabla).map(([mkt, productos]) => {
                const totalMkt = Object.values(productos).reduce((sum, fm) =>
                  sum + Object.values(fm).reduce((a, b) => a + b, 0), 0)
                return (
                  <>
                    <tr key={mkt} style={{ background: 'var(--bg-3)' }}>
                      <td style={{ ...tdM, textAlign: 'left', fontWeight: 600 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                          background: mkt === 'Walmart' ? 'var(--walmart-bg)' : mkt === 'Paris' ? 'var(--paris-bg)' : mkt === 'Ripley' ? 'var(--ripley-bg)' : 'var(--falabella-bg)',
                          color: mkt === 'Walmart' ? 'var(--walmart)' : mkt === 'Paris' ? 'var(--paris)' : mkt === 'Ripley' ? 'var(--ripley)' : 'var(--falabella)',
                        }}>{mkt}</span>
                      </td>
                      {fechas.map(f => <td key={f} style={{ ...tdM, background: 'var(--bg-3)' }} />)}
                      <td style={{ ...tdM, background: 'var(--bg-3)', fontWeight: 700, color: 'var(--text-1)' }}>{totalMkt}</td>
                    </tr>
                    {Object.entries(productos).map(([key, fechaMap]) => {
                      const [nombre, sku] = key.split('|||')
                      const totalProd = Object.values(fechaMap).reduce((a, b) => a + b, 0)
                      return (
                        <tr key={key}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          style={{ transition: 'background 0.1s' }}>
                          <td style={{ ...tdM, textAlign: 'left', paddingLeft: '24px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-1)', fontWeight: 500 }}>{nombre}</div>
                            {sku && <div style={{ fontSize: '10px', color: 'var(--text-4)', fontFamily: 'monospace', marginTop: '1px' }}>{sku}</div>}
                          </td>
                          {fechas.map(f => {
                            const val = fechaMap[f] || 0
                            return <td key={f} style={{ ...tdM, ...getCellStyle(f, val) }}>{val === 0 ? '—' : val}</td>
                          })}
                          <td style={{ ...tdM, fontWeight: 700, color: 'var(--text-1)', background: 'var(--bg-3)' }}>{totalProd}</td>
                        </tr>
                      )
                    })}
                  </>
                )
              })}
              <tr style={{ background: 'var(--bg-3)', borderTop: '1px solid var(--border-2)' }}>
                <td style={{ ...tdM, textAlign: 'left', fontWeight: 700, color: 'var(--text-1)' }}>Total general</td>
                {fechas.map(f => {
                  const val = totalesFecha[f] || 0
                  return <td key={f} style={{ ...tdM, fontWeight: 700, ...getCellStyle(f, val) }}>{val === 0 ? '—' : val}</td>
                })}
                <td style={{ ...tdM, fontWeight: 700, fontSize: '14px', color: 'var(--text-1)', background: 'var(--bg-3)' }}>{totalGeneral}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
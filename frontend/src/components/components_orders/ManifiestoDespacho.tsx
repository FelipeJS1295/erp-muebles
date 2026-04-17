import { useMemo } from 'react'

interface Orden {
  id: number
  marketplace: string
  orden_id: string
  cliente: string | null
  estado: string
  fecha_despacho: string | null
  fecha_llegada: string | null
  items: any[]
  boleta_folio?: number
}

interface Props {
  ordenes: Orden[]
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

const mktLabel: Record<string, string> = {
  walmart_chile: 'Walmart',
  paris_chile: 'Paris',
  falabella: 'Falabella',
  ripley: 'Ripley',
  manual: 'Directa',
}

const mktStyle: Record<string, { bg: string; color: string }> = {
  walmart_chile: { bg: 'var(--walmart-bg)', color: 'var(--walmart)' },
  paris_chile:   { bg: 'var(--paris-bg)',   color: 'var(--paris)' },
  falabella:     { bg: 'var(--falabella-bg)', color: 'var(--falabella)' },
  ripley:        { bg: 'var(--ripley-bg)',  color: 'var(--ripley)' },
  manual:        { bg: 'var(--bg-3)',       color: 'var(--text-2)' },
}

function getEstadoUnificado(orden: any): string {
  const hoy = getHoy()
  if (orden.fecha_despacho) {
    const d = parseFecha(orden.fecha_despacho)
    const activos = ['Created', 'Acknowledged', 'ready_to_ship', 'awaiting_fulfillment', 'pending',
      'WAITING_ACCEPTANCE', 'WAITING_DEBIT', 'SHIPPING', 'TO_COLLECT']
    if (d < hoy && activos.includes(orden.estado)) return 'Atrasada'
  }
  const mapa: Record<string, string> = {
    'Created': 'Nueva', 'Acknowledged': 'Nueva',
    'Shipped': 'Despachada', 'Cancelled': 'Cancelada',
    'ready_to_ship': 'Nueva', 'awaiting_fulfillment': 'Nueva',
    'delivery_in_progress': 'Despachada', 'delivered': 'Despachada',
    'deleted': 'Cancelada', 'pending': 'Nueva', 'shipped': 'Despachada',
    'canceled': 'Cancelada', 'WAITING_ACCEPTANCE': 'Nueva', 'WAITING_DEBIT': 'Nueva',
    'SHIPPING': 'Nueva', 'TO_COLLECT': 'Nueva', 'RECEIVED': 'Despachada',
    'CLOSED': 'Despachada', 'REFUSED': 'Cancelada', 'CANCELED': 'Cancelada',
  }
  return mapa[orden.estado] || orden.estado
}

export default function ManifiestoDespacho({ ordenes, onClose }: Props) {
  const hoy = getHoy()

  const ordenesManifiesto = useMemo(() => {
    return ordenes
      .filter(o => {
        const estado = getEstadoUnificado(o)
        if (!['Nueva', 'Atrasada'].includes(estado)) return false
        if (!o.fecha_despacho) return false
        const d = parseFecha(o.fecha_despacho)
        return d <= hoy
      })
      .map(o => {
        const d = parseFecha(o.fecha_despacho!)
        const diff = Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        const items = o.items || []
        const primer = Array.isArray(items) ? items[0] : null
        const descripcion = primer?.nombre || primer?.name || primer?.Name || '—'
        return { ...o, diff, descripcion }
      })
      .sort((a, b) => a.diff - b.diff)
  }, [ordenes])

  const atrasadas = ordenesManifiesto.filter(o => o.diff < 0)
  const hoyOrden = ordenesManifiesto.filter(o => o.diff === 0)

  const imprimir = () => {
    const ventana = window.open('', '_blank')
    if (!ventana) return

    const filas = ordenesManifiesto.map(o => {
      const mkt = mktLabel[o.marketplace] || o.marketplace
      const diasLabel = o.diff < 0
        ? `<span style="color:#dc2626;font-weight:700">${Math.abs(o.diff)} día${Math.abs(o.diff) > 1 ? 's' : ''} atrasado</span>`
        : `<span style="color:#d97706;font-weight:600">Hoy</span>`

      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${mkt}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace;font-size:11px">${o.orden_id}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${o.descripcion}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${o.cliente || '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${o.fecha_despacho}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${o.fecha_llegada || '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${diasLabel}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${o.boleta_folio ? `Folio ${o.boleta_folio}` : '—'}</td>
        </tr>
      `
    }).join('')

    ventana.document.write(`
      <html>
      <head>
        <title>Manifiesto de Despacho - Jerk Home</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; font-family:Arial,sans-serif; }
          body { padding:24px; color:#1a1a1a; }
          .header { display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:2px solid #1a1a1a; padding-bottom:14px; }
          .empresa { font-size:20px; font-weight:700; }
          .sub { font-size:12px; color:#666; margin-top:4px; }
          .stats { display:flex; gap:24px; margin-bottom:16px; font-size:12px; }
          .stat { padding:8px 16px; border-radius:6px; font-weight:600; }
          table { width:100%; border-collapse:collapse; border:1px solid #ddd; font-size:12px; }
          th { padding:9px 12px; background:#1a1a1a; color:white; font-size:11px; text-align:left; }
          th:last-child, th:nth-child(5), th:nth-child(6), th:nth-child(7) { text-align:center; }
          @media print { body { padding:12px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="empresa">Jerk Home · Manifiesto de Despacho</div>
            <div class="sub">
              ${new Date().toLocaleDateString('es-CL', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' })}
              · ${ordenesManifiesto.length} órdenes pendientes
            </div>
          </div>
        </div>
        <div class="stats">
          <div class="stat" style="background:#fee2e2;color:#dc2626">${atrasadas.length} Atrasadas</div>
          <div class="stat" style="background:#fef3c7;color:#d97706">${hoyOrden.length} Para hoy</div>
          <div class="stat" style="background:#f0f0f0;color:#444">${ordenesManifiesto.length} Total</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Marketplace</th>
              <th>N° Orden</th>
              <th>Producto</th>
              <th>Cliente</th>
              <th style="text-align:center">F. Despacho</th>
              <th style="text-align:center">F. Entrega</th>
              <th style="text-align:center">Estado</th>
              <th style="text-align:center">Boleta</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        <script>window.onload = () => { window.print() }</script>
      </body>
      </html>
    `)
    ventana.document.close()
  }

  const TH: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: '11px',
    fontWeight: 600, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)',
    whiteSpace: 'nowrap', background: 'var(--bg)', textTransform: 'uppercase', letterSpacing: '0.05em',
  }
  const TD: React.CSSProperties = {
    padding: '10px 14px', borderBottom: '0.5px solid var(--border)', verticalAlign: 'middle',
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, padding: '24px', overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: '12px',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '1200px',
        animation: 'fadeIn 0.15s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>Manifiesto de Despacho</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
              {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            {/* KPIs */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <div style={{ padding: '6px 14px', borderRadius: '20px', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '12px', fontWeight: 600 }}>
                ⚠️ {atrasadas.length} Atrasadas
              </div>
              <div style={{ padding: '6px 14px', borderRadius: '20px', background: 'var(--warning-bg)', color: 'var(--warning)', fontSize: '12px', fontWeight: 600 }}>
                📦 {hoyOrden.length} Para hoy
              </div>
              <div style={{ padding: '6px 14px', borderRadius: '20px', background: 'var(--bg-3)', color: 'var(--text-2)', fontSize: '12px', fontWeight: 600 }}>
                Total: {ordenesManifiesto.length}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={imprimir} style={{
              padding: '7px 14px', borderRadius: '7px',
              border: '0.5px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer',
            }}>🖨️ Imprimir</button>
            <button onClick={onClose} style={{
              background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
              width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '14px',
            }}>✕</button>
          </div>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto', padding: '16px 20px' }}>
          {ordenesManifiesto.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              ✅ No hay órdenes pendientes de despacho para hoy
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid var(--border)' }}>
              <thead>
                <tr>
                  <th style={TH}>Marketplace</th>
                  <th style={TH}>N° Orden</th>
                  <th style={{ ...TH, minWidth: '200px' }}>Producto</th>
                  <th style={TH}>Cliente</th>
                  <th style={{ ...TH, textAlign: 'center' as const }}>F. Despacho</th>
                  <th style={{ ...TH, textAlign: 'center' as const }}>F. Entrega</th>
                  <th style={{ ...TH, textAlign: 'center' as const }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ordenesManifiesto.map((o, i) => {
                  const mkt = mktStyle[o.marketplace] || { bg: 'var(--bg-3)', color: 'var(--text-2)' }
                  const esAtrasada = o.diff < 0
                  return (
                    <tr key={i}
                      style={{ background: esAtrasada ? 'var(--danger-bg)' : 'transparent', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!esAtrasada) e.currentTarget.style.background = 'var(--bg-3)' }}
                      onMouseLeave={e => { if (!esAtrasada) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={TD}>
                        <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: mkt.bg, color: mkt.color }}>
                          {mktLabel[o.marketplace] || o.marketplace}
                        </span>
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontSize: '11px', color: 'var(--info)' }}>{o.orden_id}</td>
                      <td style={{ ...TD, maxWidth: '220px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {o.descripcion}
                        </div>
                      </td>
                      <td style={{ ...TD, fontSize: '12px', color: 'var(--text-2)' }}>{o.cliente || '—'}</td>
                      <td style={{ ...TD, textAlign: 'center', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-2)' }}>
                        {o.fecha_despacho}
                      </td>
                      <td style={{ ...TD, textAlign: 'center', fontSize: '12px', color: 'var(--text-3)' }}>
                        {o.fecha_llegada || '—'}
                      </td>
                      <td style={{ ...TD, textAlign: 'center' }}>
                        {o.diff < 0 ? (
                          <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                            ⚠️ {Math.abs(o.diff)} día{Math.abs(o.diff) > 1 ? 's' : ''} atrasado
                          </span>
                        ) : (
                          <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                            📦 Hoy
                          </span>
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
    </div>
  )
}
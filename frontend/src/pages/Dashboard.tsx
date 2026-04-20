import { useEffect, useState, useRef } from 'react'
import { api } from '../api/client'

const MKT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  walmart_chile: { label: 'Walmart',   color: 'var(--walmart)',   bg: 'var(--walmart-bg)' },
  paris_chile:   { label: 'Paris',     color: 'var(--paris)',     bg: 'var(--paris-bg)' },
  falabella:     { label: 'Falabella', color: 'var(--falabella)', bg: 'var(--falabella-bg)' },
  ripley:        { label: 'Ripley',    color: 'var(--ripley)',    bg: 'var(--ripley-bg)' },
  manual:        { label: 'Directa',   color: 'var(--text-2)',    bg: 'var(--bg-3)' },
}

interface Stats {
  kpis: {
    total_ordenes: number
    nuevas: number
    atrasadas: number
    ordenes_hoy: number
    ventas_mes_actual: number
    ventas_mes_anterior: number
    variacion_pct: number
  }
  por_marketplace: { marketplace: string; ordenes: number; monto: number; pct: number }[]
  por_cliente: { cliente_id: number; cliente_nombre: string; marketplace: string; total_ordenes: number; monto_total: number }[]
  grafico: { dia: number; actual: number; anterior: number }[]
  top_productos: { nombre: string; sku: string; cantidad: number; monto: number }[]
  ordenes_atrasadas: { id: number; orden_id: string; marketplace: string; cliente: string; fecha_despacho: string; estado: string; total: number }[]
  ordenes_hoy_lista: { id: number; orden_id: string; marketplace: string; cliente: string; estado: string; total: number }[]
}

// Gráfico de líneas SVG simple
function GraficoVentas({ grafico }: { grafico: Stats['grafico'] }) {
  const W = 600, H = 140, PAD = 32
  const datos = grafico.filter(d => d.actual > 0 || d.anterior > 0)
  if (datos.length === 0) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
      Sin datos para graficar
    </div>
  )

  const maxVal = Math.max(...grafico.map(d => Math.max(d.actual, d.anterior)), 1)
  const xStep = (W - PAD * 2) / Math.max(grafico.length - 1, 1)

  const toX = (i: number) => PAD + i * xStep
  const toY = (v: number) => PAD + (H - PAD * 2) * (1 - v / maxVal)

  const pathActual = grafico.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.actual).toFixed(1)}`).join(' ')
  const pathAnterior = grafico.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.anterior).toFixed(1)}`).join(' ')

  // Area bajo curva actual
  const areaActual = `${pathActual} L${toX(grafico.length - 1).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`

  const fmt = (v: number) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, overflow: 'visible' }}>
      <defs>
        <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Líneas guía */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = PAD + (H - PAD * 2) * (1 - pct)
        return (
          <g key={pct}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
            <text x={PAD - 4} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-3)">{fmt(maxVal * pct)}</text>
          </g>
        )
      })}

      {/* Área actual */}
      <path d={areaActual} fill="url(#gradActual)"/>

      {/* Línea mes anterior */}
      <path d={pathAnterior} fill="none" stroke="var(--border-2)" strokeWidth="1.5" strokeDasharray="4,3"/>

      {/* Línea mes actual */}
      <path d={pathActual} fill="none" stroke="#2563eb" strokeWidth="2"/>

      {/* Puntos en días con datos */}
      {grafico.filter(d => d.actual > 0).map((d, i) => {
        const idx = grafico.indexOf(d)
        return <circle key={i} cx={toX(idx)} cy={toY(d.actual)} r="2.5" fill="#2563eb"/>
      })}

      {/* Eje X — días seleccionados */}
      {grafico.filter((_, i) => i % 5 === 0).map((d, i) => (
        <text key={i} x={toX(grafico.indexOf(d))} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--text-3)">
          {d.dia}
        </text>
      ))}
    </svg>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await api.get('/dashboard/stats')
      setStats(res.data)
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const sincronizar = async () => {
    setSyncing(true)
    try {
      await Promise.all([
        api.post('/ordenes/sync/walmart'),
        api.post('/ordenes/sync/paris'),
      ])
      await cargar()
    } catch {}
    finally { setSyncing(false) }
  }

  const sk = (h = '20px', w = '100%') => (
    <div style={{ height: h, width: w, background: 'var(--bg-3)', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
  )

  const kpis = stats?.kpis
  const variacion = kpis?.variacion_pct ?? 0

  const TH: React.CSSProperties = {
    padding: '9px 12px', fontSize: '10px', fontWeight: 600, color: 'var(--text-3)',
    textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg-3)',
    textAlign: 'left', whiteSpace: 'nowrap',
  }
  const TD: React.CSSProperties = {
    padding: '9px 12px', fontSize: '12px', color: 'var(--text-2)',
    borderBottom: '0.5px solid var(--border)',
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>

      {/* Topbar */}
      <div style={{
        padding: '16px 24px', background: 'var(--bg-2)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)' }}>Dashboard</div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <button onClick={sincronizar} disabled={syncing} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--bg-3)', border: '0.5px solid var(--border)',
          borderRadius: '7px', padding: '7px 14px', fontSize: '12px',
          color: 'var(--text-2)', cursor: syncing ? 'not-allowed' : 'pointer',
          opacity: syncing ? 0.6 : 1,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
            <path d="M10 6A4 4 0 1 1 6 2"/><path d="M10 2v4H6"/>
          </svg>
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* KPIs principales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            {
              label: 'Órdenes hoy',
              valor: kpis?.ordenes_hoy ?? 0,
              sub: 'Ingresadas hoy',
              color: '#2563eb', bg: '#2563eb18',
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
            },
            {
              label: 'Pendientes',
              valor: kpis?.nuevas ?? 0,
              sub: 'Por despachar',
              color: '#d97706', bg: '#d9770618',
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
            },
            {
              label: 'Atrasadas',
              valor: kpis?.atrasadas ?? 0,
              sub: 'Vencieron fecha',
              color: (kpis?.atrasadas ?? 0) > 0 ? '#dc2626' : '#059669',
              bg: (kpis?.atrasadas ?? 0) > 0 ? '#dc262618' : '#05966918',
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
            },
            {
              label: 'Ventas este mes',
              valor: `$${Math.round(kpis?.ventas_mes_actual ?? 0).toLocaleString('es-CL')}`,
              sub: variacion >= 0 ? `▲ ${variacion}% vs mes anterior` : `▼ ${Math.abs(variacion)}% vs mes anterior`,
              color: '#059669', bg: '#05966918',
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>,
            },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color }}>
                  {k.icon}
                </div>
              </div>
              {loading ? sk('28px', '80%') : (
                <div style={{ fontSize: '24px', fontWeight: 700, color: k.color }}>{k.valor}</div>
              )}
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Gráfico ventas + Por marketplace */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>

          {/* Gráfico */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>Ventas diarias</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Mes actual vs mes anterior</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '16px', height: '2px', background: '#2563eb', borderRadius: '2px' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Este mes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '16px', height: '2px', background: 'var(--border-2)', borderRadius: '2px', borderTop: '1px dashed var(--border-2)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Mes anterior</span>
                </div>
              </div>
            </div>
            {loading ? sk('140px') : <GraficoVentas grafico={stats?.grafico ?? []} />}
          </div>

          {/* Por marketplace */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>Por marketplace</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '16px' }}>Órdenes del mes actual</div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{[...Array(4)].map((_, i) => sk('40px', '100%'))}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(stats?.por_marketplace ?? []).map(m => {
                  const cfg = MKT_CONFIG[m.marketplace] ?? { label: m.marketplace, color: 'var(--text-2)', bg: 'var(--bg-3)' }
                  const pct = m.pct ?? 0
                  return (
                    <div key={m.marketplace}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)' }}>{m.ordenes}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: '4px' }}>({pct}%)</span>
                        </div>
                      </div>
                      <div style={{ height: '4px', background: 'var(--bg-3)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: '4px', transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
                        ${Math.round(m.monto).toLocaleString('es-CL')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Por cliente API + Atrasadas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Por cliente API */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>Por cliente API</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Órdenes por cliente externo</div>
            </div>
            {loading ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...Array(3)].map((_, i) => sk('36px'))}
              </div>
            ) : (stats?.por_cliente ?? []).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Sin clientes API registrados</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Cliente</th>
                    <th style={TH}>Marketplace</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Órdenes</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.por_cliente ?? []).map((c, i) => {
                    const cfg = MKT_CONFIG[c.marketplace] ?? { label: c.marketplace, color: 'var(--text-2)', bg: 'var(--bg-3)' }
                    return (
                      <tr key={i}>
                        <td style={TD}><span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{c.cliente_nombre}</span></td>
                        <td style={TD}>
                          <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 500, background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </td>
                        <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: 'var(--text-1)' }}>{c.total_ordenes}</td>
                        <td style={{ ...TD, textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                          ${Math.round(c.monto_total).toLocaleString('es-CL')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Órdenes atrasadas */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>Órdenes atrasadas</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Vencieron fecha de despacho</div>
              </div>
              {(stats?.kpis.atrasadas ?? 0) > 0 && (
                <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: '#dc262618', color: '#dc2626' }}>
                  {stats?.kpis.atrasadas} atrasadas
                </span>
              )}
            </div>
            {loading ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...Array(3)].map((_, i) => sk('36px'))}
              </div>
            ) : (stats?.ordenes_atrasadas ?? []).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#059669', fontSize: '13px' }}>
                ✓ Sin órdenes atrasadas
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Orden</th>
                    <th style={TH}>Cliente</th>
                    <th style={TH}>Despacho</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.ordenes_atrasadas ?? []).map((o, i) => {
                    const cfg = MKT_CONFIG[o.marketplace] ?? { label: o.marketplace, color: 'var(--text-2)', bg: 'var(--bg-3)' }
                    const hoy = new Date()
                    const fd = o.fecha_despacho ? new Date(o.fecha_despacho + 'T00:00:00') : null
                    const diasAtraso = fd ? Math.floor((hoy.getTime() - fd.getTime()) / (1000 * 60 * 60 * 24)) : 0
                    return (
                      <tr key={i}>
                        <td style={TD}>
                          <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 500, background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{o.orden_id}</div>
                        </td>
                        <td style={{ ...TD, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.cliente || '—'}
                        </td>
                        <td style={TD}>
                          <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                            {o.fecha_despacho ? new Date(o.fecha_despacho + 'T00:00:00').toLocaleDateString('es-CL') : '—'}
                          </div>
                          {diasAtraso > 0 && (
                            <div style={{ fontSize: '10px', color: '#dc2626' }}>+{diasAtraso}d</div>
                          )}
                        </td>
                        <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: 'var(--text-1)' }}>
                          ${Math.round(o.total).toLocaleString('es-CL')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Órdenes del día + Top productos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Órdenes del día */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>Órdenes del día</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Ingresadas hoy</div>
              </div>
              <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: '#2563eb18', color: '#2563eb' }}>
                {stats?.kpis.ordenes_hoy ?? 0} hoy
              </span>
            </div>
            {loading ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...Array(3)].map((_, i) => sk('36px'))}
              </div>
            ) : (stats?.ordenes_hoy_lista ?? []).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Sin órdenes hoy</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Orden</th>
                    <th style={TH}>Cliente</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.ordenes_hoy_lista ?? []).map((o, i) => {
                    const cfg = MKT_CONFIG[o.marketplace] ?? { label: o.marketplace, color: 'var(--text-2)', bg: 'var(--bg-3)' }
                    return (
                      <tr key={i}>
                        <td style={TD}>
                          <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 500, background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{o.orden_id}</div>
                        </td>
                        <td style={{ ...TD, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.cliente || '—'}
                        </td>
                        <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                          ${Math.round(o.total).toLocaleString('es-CL')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Top productos */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>Productos más vendidos</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Por cantidad de unidades</div>
            </div>
            {loading ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...Array(5)].map((_, i) => sk('36px'))}
              </div>
            ) : (stats?.top_productos ?? []).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Sin datos de productos</div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {(stats?.top_productos ?? []).slice(0, 8).map((p, i) => {
                  const maxQty = stats!.top_productos[0].cantidad
                  const pct = Math.round((p.cantidad / maxQty) * 100)
                  return (
                    <div key={i} style={{ padding: '8px 16px', borderBottom: i < 7 ? '0.5px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '260px' }}>
                            {p.nombre}
                          </div>
                          {p.sku && <div style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'monospace' }}>{p.sku}</div>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>{p.cantidad}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}> uds</span>
                        </div>
                      </div>
                      <div style={{ height: '3px', background: 'var(--bg-3)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: '3px', transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { dbApi } from '../api/client'

const estadoLabel: Record<string, string> = {
  ready_to_ship: 'Listo envío',
  awaiting_fulfillment: 'En preparación',
  delivered: 'Entregada',
  Created: 'Creada',
  Shipped: 'Enviada',
  Cancelled: 'Cancelada',
  delivery_in_progress: 'En camino',
}

const estadoStyle: Record<string, { bg: string; color: string }> = {
  ready_to_ship: { bg: 'var(--success-bg)', color: 'var(--success)' },
  Created: { bg: 'var(--info-bg)', color: 'var(--info)' },
  awaiting_fulfillment: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  delivery_in_progress: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  delivered: { bg: 'var(--bg-3)', color: 'var(--text-3)' },
  Shipped: { bg: 'var(--info-bg)', color: 'var(--info)' },
  Cancelled: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
}

function getInitials(name: string) {
  return name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
}

function Avatar({ name }: { name: string }) {
  const colors = ['#f0fdf4', '#eff6ff', '#fff7ed', '#fdf2f8', '#fefce8']
  const textColors = ['#16a34a', '#2563eb', '#ea580c', '#c026d3', '#ca8a04']
  const idx = name?.charCodeAt(0) % 5 || 0
  return (
    <div style={{
      width: '32px', height: '32px', borderRadius: '8px',
      background: colors[idx], display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '11px', fontWeight: 600,
      color: textColors[idx], flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  )
}

function KPICard({ label, value, sub, icon, iconBg, trend, trendType }: {
  label: string, value: number, sub: string,
  icon: React.ReactNode, iconBg: string,
  trend?: string, trendType?: 'up' | 'warn' | 'neutral'
}) {
  const trendBg = trendType === 'up' ? 'var(--success-bg)' : trendType === 'warn' ? 'var(--warning-bg)' : 'var(--bg-3)'
  const trendColor = trendType === 'up' ? 'var(--success)' : trendType === 'warn' ? 'var(--warning)' : 'var(--text-3)'

  return (
    <div style={{
      background: 'var(--bg-2)', border: '0.5px solid var(--border)',
      borderRadius: '10px', padding: '14px',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        {trend && (
          <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 7px', borderRadius: '10px', background: trendBg, color: trendColor }}>
            {trend}
          </span>
        )}
      </div>
      <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>{label}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-4)', marginTop: '2px' }}>{sub}</div>
    </div>
  )
}

export default function Dashboard() {
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState('')

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await dbApi.getOrdenes(undefined, 100)
      setOrdenes(res.data.ordenes || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const sincronizar = async () => {
    try {
      setSyncing(true)
      await Promise.all([dbApi.syncWalmart(), dbApi.syncParis()])
      setLastSync(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }))
      await cargar()
    } catch (e) { console.error(e) }
    finally { setSyncing(false) }
  }

  useEffect(() => { cargar() }, [])

  const walmart = ordenes.filter(o => o.marketplace === 'walmart_chile')
  const paris = ordenes.filter(o => o.marketplace === 'paris_chile')
  const urgentes = ordenes.filter(o => ['ready_to_ship', 'Created'].includes(o.estado))
  const pendientes = ordenes.filter(o => o.estado !== 'delivered' && o.estado !== 'Cancelled').slice(0, 5)

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Topbar */}
      <div style={{
        padding: '16px 24px', background: 'var(--bg-2)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>
            {saludo}, Felipe 👋
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px', textTransform: 'capitalize' }}>
            {fecha} {lastSync && `· Sync: ${lastSync}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={sincronizar} disabled={syncing} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--bg-2)', color: 'var(--text-1)',
            border: '0.5px solid var(--border-2)', borderRadius: '7px',
            padding: '7px 14px', fontSize: '12px', cursor: 'pointer',
            opacity: syncing ? 0.6 : 1, transition: 'opacity 0.1s',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
              <path d="M10 6A4 4 0 1 1 6 2"/><path d="M10 2v4H6"/>
            </svg>
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          <button style={{
            background: 'var(--accent)', color: 'var(--accent-fg)',
            border: 'none', borderRadius: '7px', padding: '7px 14px',
            fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          }}>
            + Nueva orden
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {loading ? [...Array(4)].map((_, i) => (
            <div key={i} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', height: '110px', animation: 'pulse 1.5s infinite' }} />
          )) : <>
            <KPICard label="Órdenes totales" value={ordenes.length} sub="En base de datos" iconBg="var(--success-bg)" trend="+3 hoy" trendType="up"
              icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--success)" strokeWidth="1.3"><path d="M1 4h12M1 7h12M1 10h12"/></svg>}
            />
            <KPICard label="Walmart Chile" value={walmart.length} sub="Últimos 30 días" iconBg="var(--walmart-bg)"
              icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--walmart)" strokeWidth="1.3"><circle cx="7" cy="7" r="5.5"/></svg>}
            />
            <KPICard label="Paris Chile" value={paris.length} sub="Últimas 50" iconBg="var(--paris-bg)"
              icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--paris)" strokeWidth="1.3"><circle cx="7" cy="7" r="5.5"/></svg>}
            />
            <KPICard label="Para despachar" value={urgentes.length} sub="Requieren acción" iconBg="var(--warning-bg)" trend="Urgente" trendType="warn"
              icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--warning)" strokeWidth="1.3"><path d="M7 1l5.5 3v6L7 13 1.5 10V4z"/></svg>}
            />
          </>}
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Órdenes pendientes */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Órdenes pendientes</div>
              <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '10px', background: 'var(--danger)', color: '#fff' }}>
                {urgentes.length} urgentes
              </span>
            </div>
            {loading ? [...Array(4)].map((_, i) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-3)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: '12px', background: 'var(--bg-3)', borderRadius: '4px', marginBottom: '6px', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: '10px', background: 'var(--bg-3)', borderRadius: '4px', width: '60%', animation: 'pulse 1.5s infinite' }} />
                </div>
              </div>
            )) : pendientes.map((o, i) => {
              const items = o.items || []
              const primer = Array.isArray(items) ? items[0] : null
              const producto = primer?.nombre || primer?.name || '—'
              const est = estadoStyle[o.estado] || { bg: 'var(--bg-3)', color: 'var(--text-3)' }
              const isWalmart = o.marketplace === 'walmart_chile'

              return (
                <div key={i} style={{
                  padding: '10px 16px', borderBottom: '0.5px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Avatar name={o.cliente || '?'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-1)' }}>{o.cliente || '—'}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{producto}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-4)', marginBottom: '3px' }}>
                      {isWalmart ? '🟡' : '🟣'} {o.orden_id}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 6px', borderRadius: '10px', background: est.bg, color: est.color }}>
                      {estadoLabel[o.estado] || o.estado}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Stock */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Stock Walmart</div>
              <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '10px', background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                En tiempo real
              </span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {[
                { sku: 'SECCRICHCHO', nombre: 'Seccional Richter Chocolate', stock: 1, max: 100 },
                { sku: 'SECALZ1420', nombre: 'Seccional Alaska Terracota', stock: 92, max: 100 },
                { sku: 'SECKEN1805', nombre: 'Seccional Kenia Felpa Negro', stock: 100, max: 100 },
                { sku: 'POLELIB1222', nombre: 'Poltrona Eliza Beige', stock: 55, max: 100 },
                { sku: 'NWALFLNEG', nombre: 'New Alaska Felpa Negro', stock: 100, max: 100 },
              ].map((p, i) => {
                const pct = (p.stock / p.max) * 100
                const color = p.stock <= 5 ? 'var(--danger)' : p.stock <= 20 ? 'var(--warning)' : 'var(--success)'
                return (
                  <div key={i} style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-4)', width: '90px', flexShrink: 0 }}>{p.sku}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-1)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                    <div style={{ width: '60px', height: '5px', background: 'var(--bg-3)', borderRadius: '3px', flexShrink: 0 }}>
                      <div style={{ width: `${pct}%`, height: '5px', borderRadius: '3px', background: color, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color, width: '30px', textAlign: 'right', flexShrink: 0 }}>{p.stock}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
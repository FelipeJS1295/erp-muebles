import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'

interface Producto {
  sku_seller: string
  nombre: string
  en_walmart: boolean
  en_paris: boolean
  stock_walmart: number | null
  stock_paris: number | null
  precio_walmart: number | null
  estado_walmart: string | null
  estado_paris: string | null
  alerta_stock: boolean
}

function StockCell({ stock, alerta }: { stock: number | null, alerta?: boolean }) {
  if (stock === null || stock === undefined) {
    return <span style={{ color: 'var(--text-4)', fontSize: '12px' }}>—</span>
  }
  const max = 200
  const pct = Math.min((stock / max) * 100, 100)
  const color = stock === 0 ? 'var(--danger)' : stock < 5 ? 'var(--danger)' : stock < 20 ? 'var(--warning)' : 'var(--success)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '13px', fontWeight: 600, color, minWidth: '32px' }}>{stock}</span>
      <div style={{ width: '50px', height: '4px', background: 'var(--bg-3)', borderRadius: '2px', flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: '4px', borderRadius: '2px', background: color, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroMkt, setFiltroMkt] = useState('')
  const [filtroStock, setFiltroStock] = useState('')
  const [stats, setStats] = useState({ total: 0, criticos: 0, sin_stock: 0, en_ambos: 0 })

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await api.get('/productos/consolidado')
      setProductos(res.data.productos || [])
      setStats({
        total: res.data.total || 0,
        criticos: res.data.criticos || 0,
        sin_stock: res.data.sin_stock || 0,
        en_ambos: res.data.en_ambos || 0,
      })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const filtrados = useMemo(() => {
    let result = [...productos]

    if (busqueda) {
      const q = busqueda.toLowerCase()
      result = result.filter(p =>
        p.sku_seller?.toLowerCase().includes(q) ||
        p.nombre?.toLowerCase().includes(q)
      )
    }

    if (filtroMkt === 'walmart') result = result.filter(p => p.en_walmart)
    if (filtroMkt === 'paris') result = result.filter(p => p.en_paris)
    if (filtroMkt === 'ambos') result = result.filter(p => p.en_walmart && p.en_paris)

    if (filtroStock === 'critico') result = result.filter(p => p.alerta_stock)
    if (filtroStock === 'sin_stock') result = result.filter(p =>
      (p.stock_walmart !== null && p.stock_walmart === 0) ||
      (p.stock_paris !== null && p.stock_paris === 0)
    )

    return result
  }, [productos, busqueda, filtroMkt, filtroStock])

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '7px 12px', fontSize: '13px',
    color: 'var(--text-1)', outline: 'none', cursor: 'pointer',
  }

  const TH: React.CSSProperties = {
    padding: '11px 14px', textAlign: 'left', fontSize: '12px',
    fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)',
    whiteSpace: 'nowrap', background: 'var(--bg)',
  }

  const TD: React.CSSProperties = {
    padding: '11px 14px', borderBottom: '0.5px solid var(--border)', verticalAlign: 'middle',
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Topbar */}
      <div style={{
        padding: '16px 24px', background: 'var(--bg-2)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)' }}>
            Productos e Inventario
            <span style={{ fontSize: '13px', color: 'var(--text-4)', fontWeight: 400 }}> · {filtrados.length} de {stats.total}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            Stock consolidado de Walmart y Paris
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
              </svg>
              <input placeholder="Buscar SKU o producto..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...IS, paddingLeft: '30px', width: '210px' }} />
            </div>
            <select value={filtroMkt} onChange={e => setFiltroMkt(e.target.value)} style={IS}>
              <option value="">Todos los canales</option>
              <option value="ambos">En ambos marketplaces</option>
              <option value="walmart">Solo Walmart</option>
              <option value="paris">Solo Paris</option>
            </select>
            <select value={filtroStock} onChange={e => setFiltroStock(e.target.value)} style={IS}>
              <option value="">Todo el stock</option>
              <option value="critico">Stock crítico (&lt;5)</option>
              <option value="sin_stock">Sin stock</option>
            </select>
            {(busqueda || filtroMkt || filtroStock) && (
              <button onClick={() => { setBusqueda(''); setFiltroMkt(''); setFiltroStock('') }}
                style={{ ...IS, color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                Limpiar ✕
              </button>
            )}
          </div>
        </div>
        <button onClick={cargar} disabled={loading} style={{
          ...IS, display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          fontWeight: 500, opacity: loading ? 0.6 : 1, marginTop: '4px',
        }}>
          <svg width="12" height="12" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3"
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
            <path d="M9 5.5A3.5 3.5 0 1 1 5.5 2"/><path d="M9 2v3.5H5.5"/>
          </svg>
          {loading ? 'Cargando...' : 'Actualizar stock'}
        </button>
      </div>

      <div style={{ padding: '16px 24px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Total productos', value: stats.total, sub: 'Únicos por SKU', color: 'var(--text-1)' },
            { label: 'En ambos canales', value: stats.en_ambos, sub: 'Walmart + Paris', color: 'var(--success)' },
            { label: 'Stock crítico', value: stats.criticos, sub: 'Menos de 5 uds', color: 'var(--danger)' },
            { label: 'Sin stock', value: stats.sin_stock, sub: 'Requieren reposición', color: 'var(--warning)' },
          ].map((k, i) => (
            <div key={i} style={{
              background: 'var(--bg-2)', border: '0.5px solid var(--border)',
              borderRadius: '10px', padding: '14px',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '6px' }}>{k.label}</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: k.color, letterSpacing: '-0.5px' }}>
                {loading ? '—' : k.value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '2px' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>SKU Seller</th>
                  <th style={TH}>Producto</th>
                  <th style={TH}>Canales</th>
                  <th style={TH}>Stock Walmart</th>
                  <th style={TH}>Stock Paris</th>
                  <th style={TH}>Total</th>
                  <th style={{ ...TH, cursor: 'default' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} style={TD}>
                        <div style={{ height: '14px', background: 'var(--bg-3)', borderRadius: '3px', animation: 'pulse 1.5s infinite' }} />
                      </td>
                    ))}
                  </tr>
                )) : filtrados.map((p, i) => {
                  const totalStock = (p.stock_walmart || 0) + (p.stock_paris || 0)
                  const isAlerta = p.alerta_stock

                  return (
                    <tr key={i}
                      style={{ background: isAlerta ? 'var(--danger-bg)' : 'transparent', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!isAlerta) e.currentTarget.style.background = 'var(--bg-3)' }}
                      onMouseLeave={e => { if (!isAlerta) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={TD}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-3)' }}>
                          {p.sku_seller}
                        </span>
                      </td>
                      <td style={{ ...TD, maxWidth: '260px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isAlerta && <span style={{ marginRight: '6px' }}>⚠️</span>}
                          {p.nombre}
                        </div>
                        {p.precio_walmart && (
                          <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '2px' }}>
                            ${Number(p.precio_walmart).toLocaleString('es-CL')}
                          </div>
                        )}
                      </td>
                      <td style={TD}>
                        {p.en_walmart && p.en_paris ? (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500, background: 'var(--success-bg)', color: 'var(--success)' }}>
                            W + P
                          </span>
                        ) : p.en_walmart ? (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500, background: 'var(--walmart-bg)', color: 'var(--walmart)' }}>
                            Walmart
                          </span>
                        ) : (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500, background: 'var(--paris-bg)', color: 'var(--paris)' }}>
                            Paris
                          </span>
                        )}
                      </td>
                      <td style={TD}>
                        <StockCell stock={p.stock_walmart} alerta={p.alerta_stock} />
                      </td>
                      <td style={TD}>
                        <StockCell stock={p.stock_paris} alerta={p.alerta_stock} />
                      </td>
                      <td style={TD}>
                        <span style={{
                          fontSize: '13px', fontWeight: 700,
                          color: totalStock === 0 ? 'var(--danger)' : totalStock < 10 ? 'var(--warning)' : 'var(--text-1)',
                        }}>
                          {(p.stock_walmart !== null || p.stock_paris !== null) ? totalStock : '—'}
                        </span>
                      </td>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button style={{
                            fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                            border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', cursor: 'pointer',
                          }}>
                            Actualizar
                          </button>
                          <button style={{
                            fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                            border: '0.5px solid var(--border)', background: 'var(--bg)',
                            color: 'var(--text-2)', cursor: 'pointer',
                          }}>
                            Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
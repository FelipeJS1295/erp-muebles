import { useEffect, useState } from 'react'
import { api } from '../api/client'

const CARGO_CONFIG: Record<string, { color: string; bg: string }> = {
  corte:        { bg: 'var(--info-bg)',    color: 'var(--info)' },
  costura:      { bg: 'var(--success-bg)', color: 'var(--success)' },
  tapiceria:    { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  esqueleteria: { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  bodega:       { bg: 'var(--bg-3)',       color: 'var(--text-2)' },
  cojineria:    { bg: 'var(--bg-3)',       color: 'var(--text-2)' },
  embalaje:     { bg: 'var(--bg-3)',       color: 'var(--text-2)' },
  oficina:      { bg: 'var(--bg-3)',       color: 'var(--text-3)' },
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface ResumenTrabajador {
  trabajador_id: number
  trabajador_nombre: string
  trabajador_rut: string
  trabajador_cargo: string
  es_produccion: boolean
  sueldo_base: number
  sueldo_base_registrado: number
  horas_extras_qty: number
  total_horas_extras: number
  dias_extras_qty: number
  total_dias_extras: number
  bonos_qty: number
  total_bonos: number
  dias_faltantes_qty: number
  total_descuentos: number
  total: number
}

export default function ResumenMensual() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [resumen, setResumen] = useState<ResumenTrabajador[]>([])
  const [totalPlanilla, setTotalPlanilla] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filtroCargo, setFiltroCargo] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/resumen-mensual?mes=${mes}&anio=${anio}`)
      setResumen(res.data.resumen ?? [])
      setTotalPlanilla(res.data.total_planilla ?? 0)
    } catch {
      setResumen([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [mes, anio])

  const filtrados = resumen
    .filter(r => filtroCargo ? r.trabajador_cargo === filtroCargo : true)
    .filter(r => busqueda
      ? r.trabajador_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.trabajador_rut.includes(busqueda)
      : true
    )

  const totalFiltrado = filtrados.reduce((s, r) => s + r.total, 0)

  // Cargos únicos presentes
  const cargosPresentes = [...new Set(resumen.map(r => r.trabajador_cargo).filter(Boolean))]

  const IS: React.CSSProperties = {
    padding: '7px 10px', borderRadius: '7px',
    border: '0.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-1)', fontSize: '13px', outline: 'none',
  }

  const imprimir = () => {
    const ventana = window.open('', '_blank')
    if (!ventana) return
    ventana.document.write(`
      <html><head>
        <title>Resumen Mensual ${MESES[mes-1]} ${anio}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; font-family:Arial,sans-serif; }
          body { padding:32px; color:#1a1a1a; font-size:12px; }
          h1 { font-size:20px; margin-bottom:4px; }
          .sub { color:#666; margin-bottom:24px; font-size:12px; }
          table { width:100%; border-collapse:collapse; }
          th { background:#1a1a1a; color:#fff; padding:8px 10px; text-align:left; font-size:10px; text-transform:uppercase; }
          td { padding:8px 10px; border-bottom:1px solid #eee; font-size:11px; }
          tr:nth-child(even) td { background:#f9f9f9; }
          .neg { color:#dc2626; }
          .pos { color:#059669; }
          .total-row td { font-weight:700; background:#f0f0f0 !important; font-size:12px; }
          .badge { display:inline-block; padding:2px 6px; border-radius:10px; font-size:9px; font-weight:600; background:#f0f0f0; }
          .prod { background:#dcfce7; color:#166534; }
        </style>
      </head><body>
        <h1>Resumen Mensual RRHH</h1>
        <div class="sub">${MESES[mes-1]} ${anio} · ${filtrados.length} trabajadores · Total planilla: $${totalFiltrado.toLocaleString('es-CL')}</div>
        <table>
          <thead>
            <tr>
              <th>Trabajador</th><th>Cargo</th><th>Sueldo Base</th>
              <th>Hrs Extra</th><th>Días Extra</th><th>Bonos</th>
              <th>Descuentos</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${filtrados.map(r => `
              <tr>
                <td>
                  <strong>${r.trabajador_nombre}</strong><br/>
                  <span style="color:#888;font-size:10px">${r.trabajador_rut}</span>
                </td>
                <td>
                  <span class="badge ${['costura','tapiceria','esqueleteria'].includes(r.trabajador_cargo) ? 'prod' : ''}">
                    ${r.trabajador_cargo || '—'}
                  </span>
                </td>
                <td>
                  $${Math.round(r.sueldo_base).toLocaleString('es-CL')}
                  ${r.es_produccion ? '<br/><span style="color:#888;font-size:9px">Por producción</span>' : ''}
                </td>
                <td>${r.horas_extras_qty > 0 ? `$${Math.round(r.total_horas_extras).toLocaleString('es-CL')}<br/><span style="color:#888;font-size:9px">${r.horas_extras_qty} hrs</span>` : '—'}</td>
                <td>${r.dias_extras_qty > 0 ? `$${Math.round(r.total_dias_extras).toLocaleString('es-CL')}<br/><span style="color:#888;font-size:9px">${r.dias_extras_qty} días</span>` : '—'}</td>
                <td>${r.bonos_qty > 0 ? `$${Math.round(r.total_bonos).toLocaleString('es-CL')}<br/><span style="color:#888;font-size:9px">${r.bonos_qty} bonos</span>` : '—'}</td>
                <td class="neg">${r.dias_faltantes_qty > 0 ? `-$${Math.round(r.total_descuentos).toLocaleString('es-CL')}<br/><span style="font-size:9px">${r.dias_faltantes_qty} días</span>` : '—'}</td>
                <td><strong>$${Math.round(r.total).toLocaleString('es-CL')}</strong></td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2">TOTAL PLANILLA</td>
              <td colspan="5"></td>
              <td>$${Math.round(totalFiltrado).toLocaleString('es-CL')}</td>
            </tr>
          </tbody>
        </table>
      </body></html>
    `)
    ventana.document.close()
    ventana.print()
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Resumen Mensual</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Planilla de remuneraciones del período</div>
        </div>
        <button onClick={imprimir} style={{
          background: 'var(--bg-2)', color: 'var(--text-1)', border: '0.5px solid var(--border)',
          borderRadius: '8px', padding: '9px 18px', fontSize: '13px',
          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          🖨️ Imprimir
        </button>
      </div>

      {/* Selector período */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
        background: 'var(--bg-2)', border: '0.5px solid var(--border)',
        borderRadius: '10px', padding: '14px 16px',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>Período:</div>
        <select value={mes} onChange={e => setMes(Number(e.target.value))} style={IS}>
          {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={IS}>
          {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
          Total planilla: <span style={{ color: '#059669' }}>${Math.round(totalPlanilla).toLocaleString('es-CL')}</span>
        </div>
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Trabajadores',   valor: resumen.length,                                                              color: 'var(--text-1)' },
          { label: 'Total sueldos',  valor: `$${Math.round(resumen.reduce((s,r) => s+r.sueldo_base,0)).toLocaleString('es-CL')}`,  color: 'var(--text-1)' },
          { label: 'Extras y bonos', valor: `$${Math.round(resumen.reduce((s,r) => s+r.total_horas_extras+r.total_dias_extras+r.total_bonos,0)).toLocaleString('es-CL')}`, color: '#059669' },
          { label: 'Descuentos',     valor: `-$${Math.round(resumen.reduce((s,r) => s+r.total_descuentos,0)).toLocaleString('es-CL')}`, color: '#dc2626' },
          { label: 'Total planilla', valor: `$${Math.round(totalPlanilla).toLocaleString('es-CL')}`,                    color: '#2563eb' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{c.label}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: c.color }}>{c.valor}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
        background: 'var(--bg-2)', border: '0.5px solid var(--border)',
        borderRadius: '10px', padding: '12px 16px', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative' }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
            style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
          </svg>
          <input placeholder="Buscar trabajador..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...IS, paddingLeft: '28px', width: '220px' }} />
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        <button onClick={() => setFiltroCargo('')} style={{
          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
          border: '0.5px solid var(--border)', cursor: 'pointer',
          background: filtroCargo === '' ? 'var(--accent)' : 'var(--bg)',
          color: filtroCargo === '' ? 'var(--accent-fg)' : 'var(--text-3)',
        }}>Todos</button>
        {cargosPresentes.map(c => {
          const cfg = CARGO_CONFIG[c] ?? { bg: 'var(--bg-3)', color: 'var(--text-3)' }
          return (
            <button key={c} onClick={() => setFiltroCargo(filtroCargo === c ? '' : c)} style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
              border: `0.5px solid ${cfg.color}44`, cursor: 'pointer',
              background: filtroCargo === c ? cfg.bg : 'var(--bg)',
              color: cfg.color,
            }}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>
          )
        })}
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-3)' }}>
          {filtrados.length} trabajadores · <strong style={{ color: '#059669' }}>${Math.round(totalFiltrado).toLocaleString('es-CL')}</strong>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Calculando resumen...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Sin datos para este período</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                {['Trabajador', 'Cargo', 'Sueldo Base', 'Horas Extra', 'Días Extra', 'Bonos', 'Descuentos', 'Total'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: '11px',
                    fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase',
                    letterSpacing: '0.05em', background: 'var(--bg-3)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r, i) => {
                const cargoCfg = CARGO_CONFIG[r.trabajador_cargo] ?? { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                return (
                  <tr key={r.trabajador_id}
                    style={{ borderBottom: i < filtrados.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    {/* Trabajador */}
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{r.trabajador_nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'monospace' }}>{r.trabajador_rut}</div>
                    </td>

                    {/* Cargo */}
                    <td style={{ padding: '13px 14px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: cargoCfg.bg, color: cargoCfg.color }}>
                        {r.trabajador_cargo ? r.trabajador_cargo.charAt(0).toUpperCase() + r.trabajador_cargo.slice(1) : '—'}
                      </span>
                    </td>

                    {/* Sueldo base */}
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                        ${Math.round(r.sueldo_base).toLocaleString('es-CL')}
                      </div>
                      {r.es_produccion && (
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>Por producción</div>
                      )}
                      {r.es_produccion && r.sueldo_base_registrado > 0 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                          Base reg: ${Math.round(r.sueldo_base_registrado).toLocaleString('es-CL')}
                        </div>
                      )}
                    </td>

                    {/* Horas extras */}
                    <td style={{ padding: '13px 14px' }}>
                      {r.total_horas_extras > 0 ? (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                            +${Math.round(r.total_horas_extras).toLocaleString('es-CL')}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{r.horas_extras_qty} hrs</div>
                        </div>
                      ) : <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>—</span>}
                    </td>

                    {/* Días extras */}
                    <td style={{ padding: '13px 14px' }}>
                      {r.total_dias_extras > 0 ? (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                            +${Math.round(r.total_dias_extras).toLocaleString('es-CL')}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{r.dias_extras_qty} días</div>
                        </div>
                      ) : <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>—</span>}
                    </td>

                    {/* Bonos */}
                    <td style={{ padding: '13px 14px' }}>
                      {r.total_bonos > 0 ? (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                            +${Math.round(r.total_bonos).toLocaleString('es-CL')}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{r.bonos_qty} bonos</div>
                        </div>
                      ) : <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>—</span>}
                    </td>

                    {/* Descuentos */}
                    <td style={{ padding: '13px 14px' }}>
                      {r.total_descuentos > 0 ? (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>
                            -${Math.round(r.total_descuentos).toLocaleString('es-CL')}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{r.dias_faltantes_qty} días</div>
                        </div>
                      ) : <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>—</span>}
                    </td>

                    {/* Total */}
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{
                        fontSize: '15px', fontWeight: 700,
                        color: r.total >= 0 ? 'var(--text-1)' : '#dc2626',
                        background: r.total >= 0 ? 'var(--bg-3)' : '#dc262618',
                        padding: '4px 10px', borderRadius: '8px', whiteSpace: 'nowrap',
                        display: 'inline-block',
                      }}>
                        ${Math.round(r.total).toLocaleString('es-CL')}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                <td colSpan={2} style={{ padding: '13px 14px', fontSize: '13px', fontWeight: 700, color: 'var(--text-2)' }}>
                  Total ({filtrados.length} trabajadores)
                </td>
                <td style={{ padding: '13px 14px', fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>
                  ${Math.round(filtrados.reduce((s,r) => s+r.sueldo_base,0)).toLocaleString('es-CL')}
                </td>
                <td style={{ padding: '13px 14px', fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                  +${Math.round(filtrados.reduce((s,r) => s+r.total_horas_extras,0)).toLocaleString('es-CL')}
                </td>
                <td style={{ padding: '13px 14px', fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                  +${Math.round(filtrados.reduce((s,r) => s+r.total_dias_extras,0)).toLocaleString('es-CL')}
                </td>
                <td style={{ padding: '13px 14px', fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                  +${Math.round(filtrados.reduce((s,r) => s+r.total_bonos,0)).toLocaleString('es-CL')}
                </td>
                <td style={{ padding: '13px 14px', fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
                  -${Math.round(filtrados.reduce((s,r) => s+r.total_descuentos,0)).toLocaleString('es-CL')}
                </td>
                <td style={{ padding: '13px 14px', fontSize: '15px', fontWeight: 700, color: '#2563eb' }}>
                  ${Math.round(totalFiltrado).toLocaleString('es-CL')}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
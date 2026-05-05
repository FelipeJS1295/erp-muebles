import { useEffect, useState } from 'react'
import { api } from '../api/client'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

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

interface AnticipoDetalle {
  id: number
  fecha: string
  monto: number
  estado: string
  tipo_pago: string | null
  observacion: string | null
}

interface OtroDescDetalle {
  id: number
  tipo: string
  descripcion: string | null
  documento: string | null
  monto_cuota: number
  cuotas_pagadas: number
  cuotas: number
}

interface CierreTrabajador {
  trabajador_id: number
  trabajador_nombre: string
  trabajador_rut: string
  trabajador_cargo: string
  tipo_contrato: string
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
  otros_desc_qty: number
  total_otros_descuentos: number
  otros_desc_detalle: OtroDescDetalle[]
  anticipos_qty: number
  total_anticipos: number
  anticipos_detalle: AnticipoDetalle[]
  total: number
}

type ModoFiltro = 'mes' | 'rango'

function getMesActual() {
  const now = new Date()
  return { mes: now.getMonth() + 1, anio: now.getFullYear() }
}

function getRangoMesActual() {
  const now = new Date()
  const desde = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const hasta = now.toISOString().split('T')[0]
  return { desde, hasta }
}

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

export default function CierreRemuneraciones() {
  const { mes: mesInit, anio: anioInit } = getMesActual()
  const { desde: desdeInit, hasta: hastaInit } = getRangoMesActual()

  const [modo, setModo] = useState<ModoFiltro>('mes')
  const [mes, setMes] = useState(mesInit)
  const [anio, setAnio] = useState(anioInit)
  const [desde, setDesde] = useState(desdeInit)
  const [hasta, setHasta] = useState(hastaInit)

  const [resumen, setResumen] = useState<CierreTrabajador[]>([])
  const [totalPlanilla, setTotalPlanilla] = useState(0)
  const [totalProduccion, setTotalProduccion] = useState(0)
  const [totalResto, setTotalResto] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filtroCargo, setFiltroCargo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState<number | null>(null)

    const cargar = async () => {
    setLoading(true)
    try {
        let url = ''
        if (modo === 'mes') {
        url = `/cierre-remuneraciones?mes=${mes}&anio=${anio}`
        } else {
        if (!desde || !hasta) return
        url = `/cierre-remuneraciones?fecha_desde=${desde}&fecha_hasta=${hasta}`
        }
        const res = await api.get(url)
        setResumen(res.data.resumen ?? [])
        setTotalPlanilla(res.data.total_planilla ?? 0)
        setTotalProduccion(res.data.total_produccion ?? 0)
        setTotalResto(res.data.total_resto ?? 0)
    } catch {
        setResumen([])
    } finally {
        setLoading(false)
    }
    }

  useEffect(() => {
    if (modo === 'mes') {
        cargar()
    }
  }, [mes, anio, modo])

  const filtrados = resumen
    .filter(r => filtroCargo ? r.trabajador_cargo === filtroCargo : true)
    .filter(r => busqueda
      ? r.trabajador_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.trabajador_rut.includes(busqueda)
      : true
    )

  const totalFiltrado = filtrados.reduce((s, r) => s + r.total, 0)
  const cargosUnicos = [...new Set(resumen.map(r => r.trabajador_cargo))].sort()

  const aniosDisponibles = Array.from({ length: 3 }, (_, i) => anioInit - i)

  return (
    <div style={{ padding: '32px', maxWidth: '1300px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Cierre Remuneraciones</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
            Resumen completo de haberes, descuentos y anticipos por trabajador
          </div>
        </div>
      </div>

      {/* Controles de período */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '16px 20px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
      }}>
        {/* Toggle modo */}
        <div style={{ display: 'flex', background: 'var(--bg-3)', borderRadius: '7px', padding: '3px', gap: '2px' }}>
          {(['mes', 'rango'] as ModoFiltro[]).map(m => (
            <button key={m} onClick={() => setModo(m)} style={{
              padding: '5px 14px', borderRadius: '5px', border: 'none', fontSize: '12px',
              fontWeight: 500, cursor: 'pointer',
              background: modo === m ? 'var(--accent)' : 'transparent',
              color: modo === m ? 'var(--accent-fg)' : 'var(--text-2)',
            }}>
              {m === 'mes' ? 'Por mes' : 'Fecha desde/hasta'}
            </button>
          ))}
        </div>

        {modo === 'mes' ? (
          <>
            <select value={mes} onChange={e => setMes(Number(e.target.value))} style={selStyle}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={selStyle}>
              {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Desde</span>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Hasta</span>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={cargar} style={{
              background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
              borderRadius: '7px', padding: '7px 16px', fontSize: '12px',
              fontWeight: 500, cursor: 'pointer',
            }}>
              Buscar
            </button>
          </>
        )}

        {/* Filtros */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            placeholder="Buscar trabajador o RUT..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...inputStyle, width: '200px' }}
          />
          <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)} style={selStyle}>
            <option value="">Todos los cargos</option>
            {cargosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <CardResumen label="Total Planilla" valor={totalPlanilla} color="#2563eb" />
        <CardResumen label="Total Producción" valor={totalProduccion} color="#059669" />
        <CardResumen label="Total Contrato" valor={totalResto} color="#7c3aed" />
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-3)', fontSize: '14px' }}>
            Cargando cierre...
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-3)', fontSize: '14px' }}>
            Sin resultados para el período seleccionado
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)' }}>
                <th style={th}>Trabajador</th>
                <th style={th}>Sueldo / Producción</th>
                <th style={{ ...th, color: '#059669' }}>H. Extras</th>
                <th style={{ ...th, color: '#059669' }}>D. Extras</th>
                <th style={{ ...th, color: '#059669' }}>Bonos</th>
                <th style={{ ...th, color: '#dc2626' }}>D. Faltantes</th>
                <th style={{ ...th, color: '#dc2626' }}>Descuentos</th>
                <th style={{ ...th, color: '#dc2626' }}>Anticipos</th>
                <th style={{ ...th, color: '#2563eb' }}>Total Líquido</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(r => {
                const cfg = CARGO_CONFIG[r.trabajador_cargo] ?? { bg: 'var(--bg-3)', color: 'var(--text-2)' }
                const abierto = expandido === r.trabajador_id
                return (
                  <>
                    <tr key={r.trabajador_id} style={{
                      borderBottom: '1px solid var(--border)',
                      background: abierto ? 'var(--bg-3)' : 'transparent',
                    }}>
                      {/* Trabajador */}
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '13px' }}>
                          {r.trabajador_nombre}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                          {r.trabajador_rut}
                        </div>
                        <span style={{
                          display: 'inline-block', marginTop: '4px',
                          fontSize: '10px', fontWeight: 600,
                          padding: '2px 7px', borderRadius: '4px',
                          background: cfg.bg, color: cfg.color,
                        }}>
                          {r.trabajador_cargo}
                        </span>
                      </td>

                      {/* Sueldo */}
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{clp(r.sueldo_base)}</div>
                        {r.es_produccion && (
                          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>Producción</div>
                        )}
                        {!r.es_produccion && r.tipo_contrato && (
                          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px', textTransform: 'capitalize' }}>
                            {r.tipo_contrato}
                          </div>
                        )}
                      </td>

                      {/* H. Extras */}
                      <td style={{ padding: '12px 12px' }}>
                        {r.total_horas_extras > 0 ? (
                          <>
                            <div style={{ fontWeight: 600, color: '#059669' }}>+{clp(r.total_horas_extras)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{r.horas_extras_qty}h</div>
                          </>
                        ) : <span style={{ color: 'var(--text-4)' }}>—</span>}
                      </td>

                      {/* D. Extras */}
                      <td style={{ padding: '12px 12px' }}>
                        {r.total_dias_extras > 0 ? (
                          <>
                            <div style={{ fontWeight: 600, color: '#059669' }}>+{clp(r.total_dias_extras)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{r.dias_extras_qty}d</div>
                          </>
                        ) : <span style={{ color: 'var(--text-4)' }}>—</span>}
                      </td>

                      {/* Bonos */}
                      <td style={{ padding: '12px 12px' }}>
                        {r.total_bonos > 0 ? (
                          <>
                            <div style={{ fontWeight: 600, color: '#059669' }}>+{clp(r.total_bonos)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{r.bonos_qty} bono{r.bonos_qty !== 1 ? 's' : ''}</div>
                          </>
                        ) : <span style={{ color: 'var(--text-4)' }}>—</span>}
                      </td>

                      {/* D. Faltantes */}
                      <td style={{ padding: '12px 12px' }}>
                        {r.total_descuentos > 0 ? (
                          <>
                            <div style={{ fontWeight: 600, color: '#dc2626' }}>-{clp(r.total_descuentos)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{r.dias_faltantes_qty}d</div>
                          </>
                        ) : <span style={{ color: 'var(--text-4)' }}>—</span>}
                      </td>

                      {/* Otros descuentos */}
                      <td style={{ padding: '12px 12px' }}>
                        {r.total_otros_descuentos > 0 ? (
                          <>
                            <div style={{ fontWeight: 600, color: '#dc2626' }}>-{clp(r.total_otros_descuentos)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{r.otros_desc_qty} desc.</div>
                          </>
                        ) : <span style={{ color: 'var(--text-4)' }}>—</span>}
                      </td>

                      {/* Anticipos */}
                      <td style={{ padding: '12px 12px' }}>
                        {r.total_anticipos > 0 ? (
                          <>
                            <div style={{ fontWeight: 600, color: '#dc2626' }}>-{clp(r.total_anticipos)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{r.anticipos_qty} anticipo{r.anticipos_qty !== 1 ? 's' : ''}</div>
                          </>
                        ) : <span style={{ color: 'var(--text-4)' }}>—</span>}
                      </td>

                      {/* Total líquido */}
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: r.total >= 0 ? '#2563eb' : '#dc2626' }}>
                          {clp(r.total)}
                        </div>
                      </td>

                      {/* Expandir */}
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => setExpandido(abierto ? null : r.trabajador_id)}
                          style={{
                            background: 'none', border: '1px solid var(--border)',
                            borderRadius: '5px', cursor: 'pointer', padding: '3px 8px',
                            color: 'var(--text-3)', fontSize: '11px',
                          }}
                        >
                          {abierto ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>

                    {/* Detalle expandido */}
                    {abierto && (
                      <tr key={`det-${r.trabajador_id}`}>
                        <td colSpan={10} style={{ padding: '0', background: 'var(--bg-3)', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ padding: '16px 24px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>

                            {/* Anticipos detalle */}
                            {r.anticipos_detalle.length > 0 && (
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Anticipos
                                </div>
                                {r.anticipos_detalle.map(a => (
                                  <div key={a.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{a.fecha}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>-{clp(a.monto)}</span>
                                    <span style={{
                                      fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                                      background: a.estado === 'pagado' ? 'var(--success-bg)' : 'var(--warning-bg)',
                                      color: a.estado === 'pagado' ? 'var(--success)' : 'var(--warning)',
                                    }}>
                                      {a.estado}
                                    </span>
                                    {a.tipo_pago && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{a.tipo_pago}</span>}
                                    {a.observacion && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{a.observacion}</span>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Otros descuentos detalle */}
                            {r.otros_desc_detalle.length > 0 && (
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Otros Descuentos
                                </div>
                                {r.otros_desc_detalle.map(od => (
                                  <div key={od.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                                      {od.tipo === 'compra' ? `Compra · Doc: ${od.documento || '—'}` : od.descripcion || od.tipo}
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>-{clp(od.monto_cuota)}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                                      Cuota {od.cuotas_pagadas + 1} / {od.cuotas}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Sin detalles */}
                            {r.anticipos_detalle.length === 0 && r.otros_desc_detalle.length === 0 && (
                              <div style={{ fontSize: '12px', color: 'var(--text-4)' }}>Sin detalles adicionales</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                <td style={{ padding: '12px 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
                  Total ({filtrados.length} trabajadores)
                </td>
                <td style={{ padding: '12px 12px', fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>
                  {clp(filtrados.reduce((s, r) => s + r.sueldo_base, 0))}
                </td>
                <td style={{ padding: '12px 12px', fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                  +{clp(filtrados.reduce((s, r) => s + r.total_horas_extras, 0))}
                </td>
                <td style={{ padding: '12px 12px', fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                  +{clp(filtrados.reduce((s, r) => s + r.total_dias_extras, 0))}
                </td>
                <td style={{ padding: '12px 12px', fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                  +{clp(filtrados.reduce((s, r) => s + r.total_bonos, 0))}
                </td>
                <td style={{ padding: '12px 12px', fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
                  -{clp(filtrados.reduce((s, r) => s + r.total_descuentos, 0))}
                </td>
                <td style={{ padding: '12px 12px', fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
                  -{clp(filtrados.reduce((s, r) => s + r.total_otros_descuentos, 0))}
                </td>
                <td style={{ padding: '12px 12px', fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
                  -{clp(filtrados.reduce((s, r) => s + r.total_anticipos, 0))}
                </td>
                <td style={{ padding: '12px 12px', fontSize: '15px', fontWeight: 700, color: '#2563eb' }}>
                  {clp(totalFiltrado)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function CardResumen({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '16px 20px',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color }}>
        ${Math.round(valor).toLocaleString('es-CL')}
      </div>
    </div>
  )
}

// ── Estilos inline reutilizables ──────────────────────────────────────────────

const th: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: '11px',
  fontWeight: 600, color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
}

const selStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: '7px',
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text-1)', fontSize: '13px', cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: '7px',
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text-1)', fontSize: '13px',
}
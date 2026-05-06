import { useState, useEffect } from 'react'
import { api } from '../../api/client'

interface Props {
  mes: number
  anio: number
}

interface Trabajador {
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
  otros_desc_qty: number
  total_otros_descuentos: number
  otros_desc_detalle: any[]
  total: number
  descuento_boleta?: number
}

interface Resumen {
  contrato: Trabajador[]
  boleta: Trabajador[]
  total_contrato: number
  total_boleta: number
  gran_total: number
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function ContadorResumen({ mes, anio }: Props) {
  const [data, setData] = useState<Resumen | null>(null)
  const [tipos, setTipos] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'contrato' | 'boleta'>('contrato')

  const cargar = async () => {
    setLoading(true)
    setError('')
    try {
      const [resumenRes, tiposRes] = await Promise.all([
        api.get('/resumen-mensual', { params: { mes, anio } }),
        api.get('/contadores/tipos-contrato'),
      ])

      const todosLosT: Trabajador[] = resumenRes.data.resumen || []
      const tiposMap: Record<string, string> = tiposRes.data.tipos || {}
      setTipos(tiposMap)

    const contrato = todosLosT.filter(t => tiposMap[String(t.trabajador_id)] === 'contrato')
    const boletaRaw = todosLosT.filter(t => tiposMap[String(t.trabajador_id)] === 'boleta')

    // Para boleta: solo sueldo base con descuento 15.25%
    const DESCUENTO_BOLETA = 0.1525
    const boleta = boletaRaw.map(t => {
    const bruto = t.sueldo_base_registrado > 0 ? t.sueldo_base_registrado : t.sueldo_base
    return {
        ...t,
        sueldo_base: bruto,
        descuento_boleta: Math.round(bruto * DESCUENTO_BOLETA),
        total: Math.round(bruto * (1 - DESCUENTO_BOLETA)),
    }
    })

    setData({
    contrato,
    boleta,
    total_contrato: contrato.reduce((a, t) => a + t.total, 0),
    total_boleta: boleta.reduce((a, t) => a + t.total, 0),
    gran_total: contrato.reduce((a, t) => a + t.total, 0) + boleta.reduce((a, t) => a + t.total, 0),
    })
    } catch {
      setError('No se pudo cargar el resumen')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [mes, anio])

  const TH: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: '11px',
    fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb',
    textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    background: '#f9fafb',
  }

  const TD: React.CSSProperties = {
    padding: '11px 14px', fontSize: '13px', color: '#374151',
    borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap',
  }

  const renderTabla = (trabajadores: Trabajador[], tipo: 'contrato' | 'boleta') => {
    const total = trabajadores.reduce((a, t) => a + t.total, 0)

    if (trabajadores.length === 0) return (
      <div style={{
        padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px',
        background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
      }}>
        No hay trabajadores con {tipo === 'contrato' ? 'contrato' : 'boleta'} este mes
      </div>
    )

    return (
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Nombre</th>
              <th style={TH}>RUT</th>
              <th style={TH}>Cargo</th>
                <th style={{ ...TH, textAlign: 'right' }}>
                {tipo === 'boleta' ? 'Monto Bruto' : 'Sueldo Base'}
                </th>
                {tipo === 'contrato' && <>
                <th style={{ ...TH, textAlign: 'right' }}>Hrs Extra</th>
                <th style={{ ...TH, textAlign: 'right' }}>Días Extra</th>
                <th style={{ ...TH, textAlign: 'right' }}>Bonos</th>
                </>}
                {tipo === 'boleta' ? (
                <th style={{ ...TH, textAlign: 'right', color: '#dc2626' }}>Desc. Boleta (15.25%)</th>
                ) : (
                <>
                    <th style={{ ...TH, textAlign: 'right', color: '#dc2626' }}>Días Faltantes</th>
                    <th style={{ ...TH, textAlign: 'right', color: '#dc2626' }}>Otros Desc.</th>
                </>
                )}
                <th style={{ ...TH, textAlign: 'right', color: '#059669' }}>Total Líquido</th>
            </tr>
          </thead>
          <tbody>
            {trabajadores.map(t => (
              <tr key={t.trabajador_id} style={{ transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <td style={{ ...TD, fontWeight: 500, color: '#111827' }}>
                  {t.trabajador_nombre}
                  {t.es_produccion && (
                    <span style={{
                      marginLeft: '6px', fontSize: '10px', padding: '1px 6px',
                      borderRadius: '20px', background: '#dbeafe', color: '#1d4ed8',
                      fontWeight: 600,
                    }}>
                      Producción
                    </span>
                  )}
                </td>
                <td style={{ ...TD, color: '#6b7280' }}>{t.trabajador_rut}</td>
                <td style={TD}>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                    background: '#f3f4f6', color: '#374151', fontWeight: 500,
                  }}>
                    {t.trabajador_cargo}
                  </span>
                </td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 500 }}>
                  {fmt(t.sueldo_base)}
                </td>
                {tipo === 'contrato' && <>
                  <td style={{ ...TD, textAlign: 'right', color: t.total_horas_extras > 0 ? '#059669' : '#9ca3af' }}>
                    {t.total_horas_extras > 0 ? fmt(t.total_horas_extras) : '—'}
                    {t.horas_extras_qty > 0 && (
                      <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '4px' }}>
                        ({t.horas_extras_qty}h)
                      </span>
                    )}
                  </td>
                  <td style={{ ...TD, textAlign: 'right', color: t.total_dias_extras > 0 ? '#059669' : '#9ca3af' }}>
                    {t.total_dias_extras > 0 ? fmt(t.total_dias_extras) : '—'}
                    {t.dias_extras_qty > 0 && (
                      <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '4px' }}>
                        ({t.dias_extras_qty}d)
                      </span>
                    )}
                  </td>
                  <td style={{ ...TD, textAlign: 'right', color: t.total_bonos > 0 ? '#059669' : '#9ca3af' }}>
                    {t.total_bonos > 0 ? fmt(t.total_bonos) : '—'}
                  </td>
                </>}
                    {tipo === 'boleta' ? (
                    <td style={{ ...TD, textAlign: 'right', color: '#dc2626', fontWeight: 500 }}>
                        -{fmt(t.descuento_boleta ?? 0)}
                    </td>
                    ) : (
                    <>
                        <td style={{ ...TD, textAlign: 'right', color: t.total_descuentos > 0 ? '#dc2626' : '#9ca3af' }}>
                        {t.total_descuentos > 0 ? `-${fmt(t.total_descuentos)}` : '—'}
                        {t.dias_faltantes_qty > 0 && (
                            <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '4px' }}>
                            ({t.dias_faltantes_qty}d)
                            </span>
                        )}
                        </td>
                        <td style={{ ...TD, textAlign: 'right', color: t.total_otros_descuentos > 0 ? '#dc2626' : '#9ca3af' }}>
                        {t.total_otros_descuentos > 0 ? (
                            <span title={t.otros_desc_detalle?.map((d: any) => d.descripcion).join(', ')}>
                            -{fmt(t.total_otros_descuentos)}
                            </span>
                        ) : '—'}
                        </td>
                    </>
                    )}
                <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '14px' }}>
                  {fmt(t.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f0fdf4' }}>
              <td colSpan={tipo === 'contrato' ? 9 : 5} style={{
                padding: '12px 14px', fontWeight: 700, fontSize: '13px', color: '#065f46',
                textAlign: 'right', borderTop: '2px solid #d1fae5',
              }}>
                Total {tipo === 'contrato' ? 'Contrato' : 'Boleta'}
              </td>
              <td style={{
                padding: '12px 14px', textAlign: 'right', fontWeight: 800,
                fontSize: '15px', color: '#059669', borderTop: '2px solid #d1fae5',
              }}>
                {fmt(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af' }}>
      <div style={{
        width: '32px', height: '32px', border: '3px solid #e5e7eb',
        borderTopColor: '#059669', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
      }} />
      Cargando resumen de {MESES[mes - 1]} {anio}...
    </div>
  )

  if (error) return (
    <div style={{
      textAlign: 'center', padding: '60px', color: '#dc2626',
      background: 'white', borderRadius: '12px', border: '1px solid #fecaca',
    }}>
      {error}
    </div>
  )

  if (!data) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Contratos', valor: data.total_contrato, count: data.contrato.length, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Total Boletas', valor: data.total_boleta, count: data.boleta.length, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Gran Total', valor: data.gran_total, count: data.contrato.length + data.boleta.length, color: '#059669', bg: '#d1fae5' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'white', borderRadius: '12px', padding: '20px 24px',
            border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {k.label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: k.color }}>{fmt(k.valor)}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{k.count} trabajadores</div>
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={k.color} strokeWidth="1.5">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/>
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden', width: 'fit-content' }}>
        {(['contrato', 'boleta'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 24px', border: 'none', cursor: 'pointer',
            background: tab === t ? '#059669' : 'white',
            color: tab === t ? 'white' : '#6b7280',
            fontSize: '13px', fontWeight: 600,
            transition: 'all 0.2s',
          }}>
            {t === 'contrato' ? `📄 Contratos (${data.contrato.length})` : `🧾 Boletas (${data.boleta.length})`}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {tab === 'contrato' && renderTabla(data.contrato, 'contrato')}
      {tab === 'boleta' && renderTabla(data.boleta, 'boleta')}

    </div>
  )
}
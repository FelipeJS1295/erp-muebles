import { useState, useEffect } from 'react'
import { api } from '../../api/client'

interface Props {
  trabajadorId: number
}

interface ResumenMes {
  trabajador_id: number
  trabajador_nombre: string
  sueldo_base: number
  horas_extras: { total_horas: number; monto_total: number }
  dias_extras: { total_dias: number; monto_total: number }
  bonos: { monto_total: number }
  dias_faltantes: { total_dias: number; monto_total: number }
  otros_descuentos: { monto_total: number }
  anticipos: { monto_total: number }
  total_haberes: number
  total_descuentos: number
  liquido: number
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function WorkerSueldo({ trabajadorId }: Props) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [data, setData] = useState<ResumenMes | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cargar = async () => {
    setLoading(true)
    setError('')
    setData(null)
    try {
    const res = await api.get(`/resumen-mensual`, {
      params: { mes, anio }
    })
    const trabajador = res.data.resumen?.find(
      (t: any) => t.trabajador_id === trabajadorId
    )
    if (!trabajador) { setError('Sin datos para este período'); setLoading(false); return }
    setData({
      trabajador_id: trabajador.trabajador_id,
      trabajador_nombre: trabajador.trabajador_nombre,
      sueldo_base: trabajador.sueldo_base,
      horas_extras: { total_horas: trabajador.horas_extras_qty, monto_total: trabajador.total_horas_extras },
      dias_extras: { total_dias: trabajador.dias_extras_qty, monto_total: trabajador.total_dias_extras },
      bonos: { monto_total: trabajador.total_bonos },
      dias_faltantes: { total_dias: trabajador.dias_faltantes_qty, monto_total: trabajador.total_descuentos },
      otros_descuentos: { monto_total: trabajador.total_otros_descuentos },
      anticipos: { monto_total: 0 },
      total_haberes: trabajador.sueldo_base + trabajador.total_horas_extras + trabajador.total_dias_extras + trabajador.total_bonos,
      total_descuentos: trabajador.total_descuentos + trabajador.total_otros_descuentos,
      liquido: trabajador.total,
    })
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'No se pudo cargar el resumen')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [mes, anio])

  const anios = [hoy.getFullYear() - 1, hoy.getFullYear()]

  const IS: React.CSSProperties = {
    background: 'white', border: '1px solid #e2e8f0',
    borderRadius: '10px', padding: '10px 12px',
    fontSize: '14px', color: '#111', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Selector mes/año */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mes</label>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} style={IS}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Año</label>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={IS}>
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          <div style={{
            width: '24px', height: '24px', border: '2px solid #e2e8f0',
            borderTopColor: '#3b82f6', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          Cargando...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '12px', padding: '20px', textAlign: 'center',
          color: '#dc2626', fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {/* Contenido */}
      {data && !loading && (
        <>
          {/* Líquido destacado */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
            borderRadius: '16px', padding: '24px', textAlign: 'center', color: 'white',
          }}>
            <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Líquido a pagar — {MESES[mes - 1]} {anio}
            </div>
            <div style={{ fontSize: '36px', fontWeight: 800 }}>
              {fmt(data.liquido)}
            </div>
          </div>

          {/* Haberes */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{
              padding: '14px 16px', background: '#f0fdf4',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '13px', fontWeight: 700, color: '#065f46',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span>📈</span> Haberes
            </div>

            <Fila label="Sueldo base" valor={data.sueldo_base} />

            {data.horas_extras?.monto_total > 0 && (
              <Fila
                label={`Horas extras (${data.horas_extras.total_horas}h)`}
                valor={data.horas_extras.monto_total}
              />
            )}

            {data.dias_extras?.monto_total > 0 && (
              <Fila
                label={`Días extras (${data.dias_extras.total_dias} días)`}
                valor={data.dias_extras.monto_total}
              />
            )}

            {data.bonos?.monto_total > 0 && (
              <Fila label="Bonos" valor={data.bonos.monto_total} />
            )}

            <Fila label="Total haberes" valor={data.total_haberes} bold highlight="green" />
          </div>

          {/* Descuentos */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{
              padding: '14px 16px', background: '#fef2f2',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '13px', fontWeight: 700, color: '#991b1b',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span>📉</span> Descuentos
            </div>

            {data.dias_faltantes?.monto_total > 0 ? (
              <Fila
                label={`Días faltantes (${data.dias_faltantes.total_dias} días)`}
                valor={data.dias_faltantes.monto_total}
                negativo
              />
            ) : (
              <FilaVacia label="Días faltantes" />
            )}

            {data.otros_descuentos?.monto_total > 0 ? (
              <Fila label="Otros descuentos" valor={data.otros_descuentos.monto_total} negativo />
            ) : (
              <FilaVacia label="Otros descuentos" />
            )}

            {data.anticipos?.monto_total > 0 ? (
              <Fila label="Anticipos" valor={data.anticipos.monto_total} negativo />
            ) : (
              <FilaVacia label="Anticipos" />
            )}

            <Fila label="Total descuentos" valor={data.total_descuentos} bold highlight="red" negativo />
          </div>

          {/* Nota */}
          <div style={{
            fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '4px',
          }}>
            Este resumen es informativo. Consulta con administración ante cualquier duda.
          </div>
        </>
      )}

      {/* Sin datos */}
      {!data && !loading && !error && (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
          <div style={{ color: '#64748b', fontSize: '14px' }}>Sin datos para este período</div>
        </div>
      )}

    </div>
  )
}

// Componentes auxiliares
function Fila({ label, valor, negativo, bold, highlight }: {
  label: string
  valor: number
  negativo?: boolean
  bold?: boolean
  highlight?: 'green' | 'red'
}) {
  const bg = highlight === 'green' ? '#f0fdf4' : highlight === 'red' ? '#fef2f2' : 'white'
  const color = highlight === 'green' ? '#059669' : highlight === 'red' ? '#dc2626' : negativo ? '#ef4444' : '#1e293b'

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: bg,
    }}>
      <span style={{ fontSize: '13px', color: '#475569', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: bold ? 700 : 500, color }}>
        {negativo && valor > 0 ? '-' : ''}{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor)}
      </span>
    </div>
  )
}

function FilaVacia({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
    }}>
      <span style={{ fontSize: '13px', color: '#475569' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Sin registros</span>
    </div>
  )
}
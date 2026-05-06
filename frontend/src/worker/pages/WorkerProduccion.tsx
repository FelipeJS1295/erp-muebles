import { useState, useEffect } from 'react'
import { api } from '../../api/client'

interface OT {
  id: number
  orden_id: string
  producto_nombre: string
  cantidad: number
  estado: string
  fecha_asignacion: string
  fecha_entrega?: string
}

interface Props {
  trabajadorId: number
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:   { label: 'Pendiente',   color: '#92400e', bg: '#fef3c7' },
  en_proceso:  { label: 'En proceso',  color: '#1e40af', bg: '#dbeafe' },
  terminado:   { label: 'Terminado',   color: '#065f46', bg: '#d1fae5' },
  cancelado:   { label: 'Cancelado',   color: '#6b7280', bg: '#f3f4f6' },
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

export default function WorkerProduccion({ trabajadorId }: Props) {
  const hoy = new Date()
  const [modo, setModo] = useState<'mes' | 'rango'>('mes')
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [ots, setOts] = useState<OT[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cargar = async () => {
    setLoading(true)
    setError('')
    try {
      let params: Record<string, string> = { trabajador_id: String(trabajadorId) }

      if (modo === 'mes') {
        const primerDia = new Date(anio, mes, 1)
        const ultimoDia = new Date(anio, mes + 1, 0)
        params.fecha_desde = primerDia.toISOString().split('T')[0]
        params.fecha_hasta = ultimoDia.toISOString().split('T')[0]
      } else {
        if (!desde || !hasta) { setLoading(false); return }
        params.fecha_desde = desde
        params.fecha_hasta = hasta
      }

      const res = await api.get('/ordenes-trabajo', { params })
      setOts(res.data.ordenes || [])
    } catch {
      setError('No se pudo cargar la producción')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [mes, anio, modo])

  const anios = [hoy.getFullYear() - 1, hoy.getFullYear()]

  const totalUnidades = ots.reduce((acc, ot) => acc + (ot.cantidad || 0), 0)
  const terminadas = ots.filter(ot => ot.estado === 'terminado').length

  const IS: React.CSSProperties = {
    background: 'white', border: '1px solid #e2e8f0',
    borderRadius: '10px', padding: '10px 12px',
    fontSize: '14px', color: '#111', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Selector modo */}
      <div style={{
        display: 'flex', background: 'white', borderRadius: '12px',
        padding: '4px', border: '1px solid #e2e8f0',
      }}>
        {(['mes', 'rango'] as const).map(m => (
          <button key={m} onClick={() => setModo(m)} style={{
            flex: 1, padding: '8px', border: 'none', borderRadius: '8px',
            background: modo === m ? '#2563eb' : 'none',
            color: modo === m ? 'white' : '#64748b',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            {m === 'mes' ? 'Por mes' : 'Rango de fechas'}
          </button>
        ))}
      </div>

      {/* Filtros */}
      {modo === 'mes' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mes</label>
            <select value={mes} onChange={e => setMes(Number(e.target.value))} style={IS}>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Año</label>
            <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={IS}>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={IS} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={IS} />
          </div>
          <button onClick={cargar} style={{
            padding: '11px', background: '#2563eb', border: 'none',
            borderRadius: '10px', color: 'white', fontSize: '14px',
            fontWeight: 600, cursor: 'pointer',
          }}>
            Buscar
          </button>
        </div>
      )}

      {/* Resumen */}
      {!loading && ots.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[
            { label: 'Órdenes', valor: ots.length, color: '#2563eb' },
            { label: 'Unidades', valor: totalUnidades, color: '#7c3aed' },
            { label: 'Terminadas', valor: terminadas, color: '#059669' },
          ].map(k => (
            <div key={k.label} style={{
              background: 'white', borderRadius: '12px', padding: '14px 10px',
              textAlign: 'center', border: '1px solid #e2e8f0',
            }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: k.color }}>{k.valor}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Lista OTs */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          <div style={{ width: '24px', height: '24px', border: '2px solid #e2e8f0',
            borderTopColor: '#3b82f6', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Cargando...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#ef4444', fontSize: '14px' }}>{error}</div>
      ) : ots.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
          <div style={{ color: '#64748b', fontSize: '14px' }}>Sin órdenes en este período</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ots.map(ot => {
            const cfg = ESTADO_CONFIG[ot.estado] ?? ESTADO_CONFIG.pendiente
            return (
              <div key={ot.id} style={{
                background: 'white', borderRadius: '14px',
                border: '1px solid #e2e8f0', padding: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                    OT #{ot.id}
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '3px 10px',
                    borderRadius: '20px', color: cfg.color, background: cfg.bg,
                  }}>
                    {cfg.label}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#334155', marginBottom: '8px', fontWeight: 500 }}>
                  {ot.producto_nombre || 'Sin nombre'}
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Cantidad: <span style={{ color: '#475569', fontWeight: 600 }}>{ot.cantidad}</span>
                  </div>
                  {ot.fecha_asignacion && (
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Asignada: <span style={{ color: '#475569' }}>
                        {new Date(ot.fecha_asignacion).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
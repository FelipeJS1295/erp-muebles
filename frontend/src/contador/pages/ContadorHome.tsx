import { useState } from 'react'
import type { ContadorData } from '../ContadorApp'
import ContadorResumen from './ContadorResumen'

interface Props {
  contador: ContadorData
  onLogout: () => void
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

export default function ContadorHome({ contador, onLogout }: Props) {
    const hoy = new Date()
    const dia = hoy.getDate()
    const mesPorDefecto = dia <= 15
    ? (hoy.getMonth() === 0 ? 12 : hoy.getMonth())
    : hoy.getMonth() + 1
    const anioPorDefecto = dia <= 15 && hoy.getMonth() === 0
    ? hoy.getFullYear() - 1
    : hoy.getFullYear()
    const [mes, setMes] = useState(mesPorDefecto)
    const [anio, setAnio] = useState(anioPorDefecto)
  const anios = [hoy.getFullYear() - 1, hoy.getFullYear()]

  const IS: React.CSSProperties = {
    padding: '7px 12px', borderRadius: '8px',
    border: '1px solid #d1fae5', background: 'white',
    fontSize: '13px', color: '#111', outline: 'none', cursor: 'pointer',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
        padding: '16px 32px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12h6M9 16h4"/>
            </svg>
          </div>
          <div>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: 700 }}>Portal Contabilidad</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{contador.nombre}</div>
          </div>
        </div>

        {/* Selector mes/año */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} style={IS}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={IS}>
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={onLogout} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none',
            borderRadius: '8px', padding: '7px 14px', color: 'white',
            fontSize: '13px', cursor: 'pointer',
          }}>
            Salir
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: '28px 32px' }}>
        <ContadorResumen mes={mes} anio={anio} />
      </div>

    </div>
  )
}
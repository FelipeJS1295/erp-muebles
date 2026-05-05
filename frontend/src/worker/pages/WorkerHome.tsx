import { useState } from 'react'
import type { WorkerData } from '../WorkerApp'
import WorkerProduccion from './WorkerProduccion'
import WorkerSueldo from './WorkerSueldo'

interface Props {
  trabajador: WorkerData
  onLogout: () => void
}

const CARGOS_PRODUCCION = ['cortador', 'costurero', 'tapicero', 'terminaciones', 'bodega']

export default function WorkerHome({ trabajador, onLogout }: Props) {
  const esProduccion = CARGOS_PRODUCCION.includes(trabajador.cargo)
  const [tab, setTab] = useState<'produccion' | 'sueldo'>(esProduccion ? 'produccion' : 'sueldo')

  const CARGO_LABEL: Record<string, string> = {
    cortador: 'Cortador', costurero: 'Costurero', tapicero: 'Tapicero',
    terminaciones: 'Terminaciones', bodega: 'Bodega', otro: 'Trabajador',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      maxWidth: '480px', margin: '0 auto',
    }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
        padding: '20px 20px 24px', color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', opacity: 0.7 }}>Portal Trabajadores</div>
          <button onClick={onLogout} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none',
            borderRadius: '8px', padding: '6px 12px', color: 'white',
            fontSize: '12px', cursor: 'pointer',
          }}>
            Salir
          </button>
        </div>
        <div style={{ fontSize: '20px', fontWeight: 700 }}>
          Hola, {trabajador.nombre_completo.split(' ')[0]} 👋
        </div>
        <div style={{
          display: 'inline-block', marginTop: '6px',
          background: 'rgba(255,255,255,0.15)', borderRadius: '20px',
          padding: '3px 10px', fontSize: '12px',
        }}>
          {CARGO_LABEL[trabajador.cargo] || trabajador.cargo}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', background: 'white',
        borderBottom: '1px solid #e2e8f0', padding: '0 20px',
      }}>
        {esProduccion && (
          <button onClick={() => setTab('produccion')} style={{
            flex: 1, padding: '14px 0', border: 'none', background: 'none',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            color: tab === 'produccion' ? '#2563eb' : '#94a3b8',
            borderBottom: tab === 'produccion' ? '2px solid #2563eb' : '2px solid transparent',
            transition: 'all 0.2s',
          }}>
            📦 Mi Producción
          </button>
        )}
        <button onClick={() => setTab('sueldo')} style={{
          flex: 1, padding: '14px 0', border: 'none', background: 'none',
          fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          color: tab === 'sueldo' ? '#2563eb' : '#94a3b8',
          borderBottom: tab === 'sueldo' ? '2px solid #2563eb' : '2px solid transparent',
          transition: 'all 0.2s',
        }}>
          💰 Mi Sueldo
        </button>
      </div>

      {/* Contenido */}
      <div style={{ padding: '20px' }}>
        {tab === 'produccion' && esProduccion && (
          <WorkerProduccion trabajadorId={trabajador.id} />
        )}
        {tab === 'sueldo' && (
          <WorkerSueldo trabajadorId={trabajador.id} />
        )}
      </div>

    </div>
  )
}
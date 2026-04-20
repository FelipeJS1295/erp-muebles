import { useEffect, useState } from 'react'
import { api } from '../api/client'

interface Modulo {
  id: string
  nombre: string
  descripcion: string
  icono: React.ReactNode
  color: string
  activo: boolean
}

interface DashboardData {
  ventasTotales: number
  ordenesNuevas: number
  proximosEnvios: number
  atrasadas: number
  loading: boolean
}

function getEstadoUnificado(orden: any): string {
  const now = new Date()
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (orden.fecha_despacho) {
    const [y, m, d] = orden.fecha_despacho.split('-').map(Number)
    const fecha = new Date(y, m - 1, d)
    const activos = [
      'Created', 'Acknowledged', 'ready_to_ship', 'awaiting_fulfillment',
      'pending', 'pending_by_seller', 'WAITING_ACCEPTANCE', 'WAITING_DEBIT',
      'SHIPPING', 'TO_COLLECT', 'printed_label'
    ]
    if (fecha < hoy && activos.includes(orden.estado)) return 'Atrasada'
  }

  const mapa: Record<string, string> = {
    'Created': 'Nueva', 'Acknowledged': 'Nueva',
    'Shipped': 'Despachada', 'Cancelled': 'Cancelada',
    'ready_to_ship': 'Nueva', 'awaiting_fulfillment': 'Nueva',
    'delivery_in_progress': 'Despachada', 'delivered': 'Despachada',
    'deleted': 'Cancelada', 'pending_by_seller': 'Nueva',
    'pending': 'Nueva', 'shipped': 'Despachada', 'canceled': 'Cancelada',
    'WAITING_ACCEPTANCE': 'Nueva', 'WAITING_DEBIT': 'Nueva',
    'SHIPPING': 'Despachada', 'TO_COLLECT': 'Despachada',
    'printed_label': 'Nueva',
  }
  return mapa[orden.estado] ?? orden.estado
}

export default function Home({ onModulo }: { onModulo: (modulo: string) => void }) {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const [dash, setDash] = useState<DashboardData>({
    ventasTotales: 0,
    ordenesNuevas: 0,
    proximosEnvios: 0,
    atrasadas: 0,
    loading: true,
  })

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get('/ordenes?limit=500')
        const ordenes = res.data.ordenes ?? []

        const now = new Date()
        const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const en7dias = new Date(hoy)
        en7dias.setDate(hoy.getDate() + 7)

        let ventasTotales = 0
        let ordenesNuevas = 0
        let proximosEnvios = 0
        let atrasadas = 0

        for (const o of ordenes) {
          const estado = getEstadoUnificado(o)

          if (o.total) ventasTotales += Number(o.total)
          if (estado === 'Nueva') ordenesNuevas++
          if (estado === 'Atrasada') atrasadas++

          if (o.fecha_despacho) {
            const [y, m, d] = o.fecha_despacho.split('-').map(Number)
            const fecha = new Date(y, m - 1, d)
            if (fecha >= hoy && fecha <= en7dias && estado === 'Nueva') {
              proximosEnvios++
            }
          }
        }

        setDash({ ventasTotales, ordenesNuevas, proximosEnvios, atrasadas, loading: false })
      } catch {
        setDash(d => ({ ...d, loading: false }))
      }
    }
    cargar()
  }, [])

  const modulos: Modulo[] = [
    {
      id: 'ventas',
      nombre: 'Ventas',
      descripcion: 'Órdenes de marketplace, sync Walmart, Paris y Falabella',
      color: '#2563eb',
      activo: true,
      icono: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
      ),
    },
    {
      id: 'contabilidad',
      nombre: 'Contabilidad',
      descripcion: 'Órdenes de trabajo, producción, reparaciones y resúmenes de pago',
      color: '#059669',
      activo: true,
      icono: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
          <path d="M7 8h2M7 12h2M11 8h6M11 12h6"/>
        </svg>
      ),
    },
    {
      id: 'rrhh',
      nombre: 'RRHH',
      descripcion: 'Gestión de personal, liquidaciones y control de asistencia',
      color: '#7c3aed',
      activo: false,
      icono: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ),
    },
    {
      id: 'mantenedores',
      nombre: 'Mantenedores',
      descripcion: 'Productos, insumos, trabajadores y configuración del sistema',
      color: '#d97706',
      activo: true,
      icono: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/>
        </svg>
      ),
    },
  ]

  const stats = [
    {
      label: 'Ventas Totales',
      valor: dash.loading ? '...' : `$${dash.ventasTotales.toLocaleString('es-CL')}`,
      color: '#2563eb',
      bg: '#2563eb18',
      icono: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/>
        </svg>
      ),
    },
    {
      label: 'Órdenes Nuevas',
      valor: dash.loading ? '...' : dash.ordenesNuevas,
      color: '#059669',
      bg: '#05966918',
      icono: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
      ),
    },
    {
      label: 'Próximos Envíos (7d)',
      valor: dash.loading ? '...' : dash.proximosEnvios,
      color: '#d97706',
      bg: '#d9770618',
      icono: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="3" width="15" height="13" rx="1"/>
          <path d="M16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
        </svg>
      ),
    },
    {
      label: 'Atrasadas',
      valor: dash.loading ? '...' : dash.atrasadas,
      color: dash.atrasadas > 0 ? '#dc2626' : '#059669',
      bg: dash.atrasadas > 0 ? '#dc262618' : '#05966918',
      icono: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '20px 32px', background: 'var(--bg-2)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', background: 'var(--accent)',
            borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="var(--accent-fg)"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="var(--accent-fg)"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="var(--accent-fg)"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="var(--accent-fg)"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Jerk Home</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>ERP Fábrica de Muebles</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>{usuario.nombre_usuario}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{usuario.rol}</div>
          </div>
          <button onClick={() => {
            localStorage.removeItem('token')
            localStorage.removeItem('usuario')
            window.location.reload()
          }} style={{
            background: 'var(--bg-3)', border: '0.5px solid var(--border)',
            borderRadius: '7px', padding: '6px 12px', cursor: 'pointer',
            fontSize: '12px', color: 'var(--text-3)',
          }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, padding: '40px 32px', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
        
        {/* Bienvenida */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>
            Bienvenido, {usuario.nombre_usuario}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Dashboard Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-2)', border: '0.5px solid var(--border)',
              borderRadius: '12px', padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</div>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: s.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: s.color,
                }}>
                  {s.icono}
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: s.color }}>
                {s.valor}
              </div>
            </div>
          ))}
        </div>

        {/* Módulos */}
        <div style={{ marginBottom: '16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Módulos
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {modulos.map(m => (
            <div key={m.id} onClick={() => m.activo && onModulo(m.id)}
              style={{
                background: 'var(--bg-2)', border: '0.5px solid var(--border)',
                borderRadius: '14px', padding: '28px',
                cursor: m.activo ? 'pointer' : 'not-allowed',
                opacity: m.activo ? 1 : 0.5,
                transition: 'all 0.15s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => { if (m.activo) (e.currentTarget as HTMLDivElement).style.borderColor = m.color }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: m.color + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: m.color, marginBottom: '16px',
              }}>
                {m.icono}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '6px' }}>
                {m.nombre}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.5 }}>
                {m.descripcion}
              </div>
              {!m.activo && (
                <div style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'var(--bg-3)', borderRadius: '6px',
                  padding: '3px 8px', fontSize: '10px', fontWeight: 600,
                  color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  Próximamente
                </div>
              )}
              {m.activo && (
                <div style={{
                  marginTop: '16px', fontSize: '12px', color: m.color,
                  fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  Abrir módulo →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
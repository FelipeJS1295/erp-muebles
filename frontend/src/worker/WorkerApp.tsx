import { useState, useEffect } from 'react'
import WorkerLogin from './pages/WorkerLogin'
import WorkerHome from './pages/WorkerHome'

export interface WorkerData {
  id: number
  nombre_completo: string
  rut: string
  cargo: string
}

export default function WorkerApp() {
  const [trabajador, setTrabajador] = useState<WorkerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('worker_token')
    const data = localStorage.getItem('worker_data')
    if (token && data) {
      try {
        setTrabajador(JSON.parse(data))
      } catch {
        localStorage.removeItem('worker_token')
        localStorage.removeItem('worker_data')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (data: WorkerData, token: string) => {
    localStorage.setItem('worker_token', token)
    localStorage.setItem('worker_data', JSON.stringify(data))
    setTrabajador(data)
  }

  const handleLogout = () => {
    localStorage.removeItem('worker_token')
    localStorage.removeItem('worker_data')
    setTrabajador(null)
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8f9fa',
    }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid #e2e8f0',
        borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!trabajador) return <WorkerLogin onLogin={handleLogin} />

  return <WorkerHome trabajador={trabajador} onLogout={handleLogout} />
}
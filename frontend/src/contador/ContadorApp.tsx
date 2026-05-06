import { useState, useEffect } from 'react'
import ContadorLogin from './pages/ContadorLogin'
import ContadorHome from './pages/ContadorHome'

export interface ContadorData {
  id: number
  nombre: string
  email: string
}

export default function ContadorApp() {
  const [contador, setContador] = useState<ContadorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('contador_token')
    const data = localStorage.getItem('contador_data')
    if (token && data) {
      try {
        setContador(JSON.parse(data))
      } catch {
        localStorage.removeItem('contador_token')
        localStorage.removeItem('contador_data')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (data: ContadorData, token: string) => {
    localStorage.setItem('contador_token', token)
    localStorage.setItem('contador_data', JSON.stringify(data))
    setContador(data)
  }

  const handleLogout = () => {
    localStorage.removeItem('contador_token')
    localStorage.removeItem('contador_data')
    setContador(null)
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8f9fa',
    }}>
      <div style={{
        width: '24px', height: '24px', border: '2px solid #e2e8f0',
        borderTopColor: '#059669', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )

  if (!contador) return <ContadorLogin onLogin={handleLogin} />
  return <ContadorHome contador={contador} onLogout={handleLogout} />
}
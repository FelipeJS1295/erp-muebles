import { useState } from 'react'
import { api } from '../../api/client'
import type { ContadorData } from '../ContadorApp'

interface Props {
  onLogin: (data: ContadorData, token: string) => void
}

export default function ContadorLogin({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) { setError('Ingresa tu email y contraseña'); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/contadores/login', { email, password })
      onLogin(res.data.contador, res.data.access_token)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const IS: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: '10px',
    border: `1.5px solid ${error ? '#ef4444' : '#e5e7eb'}`,
    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    color: '#111', background: '#f9fafb',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
      padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: 'rgba(255,255,255,0.15)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12h6M9 16h4"/>
          </svg>
        </div>
        <div style={{ color: 'white', fontSize: '22px', fontWeight: 700 }}>Portal Contabilidad</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginTop: '4px' }}>
          Acceso exclusivo para contadores
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: 'white', borderRadius: '20px', padding: '32px 28px',
        width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
            Email
          </label>
          <input
            type="email"
            placeholder="contador@empresa.cl"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={handleKey}
            style={IS}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
            Contraseña
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={handleKey}
            style={IS}
          />
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
            fontSize: '13px', color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: '10px',
            background: loading ? '#6ee7b7' : '#059669',
            border: 'none', color: 'white', fontSize: '15px',
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </div>
  )
}
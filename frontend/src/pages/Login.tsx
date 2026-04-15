import { useState } from 'react'
import { api } from '../api/client'

interface LoginProps {
  onLogin: (usuario: any, token: string) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Ingresa email y contraseña')
      return
    }
    try {
      setLoading(true)
      setError('')
      const res = await api.post('/auth/login', { email, password })
      const { access_token, usuario } = res.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('usuario', JSON.stringify(usuario))
      onLogin(usuario, access_token)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
    color: 'var(--text-1)', outline: 'none', width: '100%',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '380px',
        animation: 'fadeIn 0.2s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px', background: 'var(--accent)',
            borderRadius: '12px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="var(--accent-fg)"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="var(--accent-fg)"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="var(--accent-fg)"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="var(--accent-fg)"/>
            </svg>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Jerk Home</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>ERP Fábrica de Muebles</div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-2)', border: '0.5px solid var(--border)',
          borderRadius: '12px', padding: '24px',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '20px' }}>
            Iniciar sesión
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px' }}>Email</div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={IS}
              placeholder="tu@email.com"
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px' }}>Contraseña</div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={IS}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: 'var(--danger-bg)',
              borderRadius: '8px', color: 'var(--danger)', fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', padding: '11px', borderRadius: '8px',
              border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'opacity 0.1s',
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text-4)' }}>
          v0.1 · Jerk Home ERP
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
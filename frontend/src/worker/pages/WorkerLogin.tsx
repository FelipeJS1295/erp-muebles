import { useState } from 'react'
import { api } from '../../api/client'
import type { WorkerData } from '../WorkerApp'

interface Props {
  onLogin: (data: WorkerData, token: string) => void
}

export default function WorkerLogin({ onLogin }: Props) {
  const [rut, setRut] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const formatRut = (value: string) => {
    const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
    if (clean.length <= 1) return clean
    const dv = clean.slice(-1)
    const num = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `${num}-${dv}`
  }

  const handleRut = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRut(formatRut(e.target.value))
    setError('')
  }

  const handleSubmit = async () => {
    if (!rut || !password) { setError('Ingresa tu RUT y contraseña'); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/trabajadores/login', { rut, password })
      onLogin(res.data.trabajador, res.data.access_token)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'RUT o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
      padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* Logo / título */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: 'rgba(255,255,255,0.15)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
          </svg>
        </div>
        <div style={{ color: 'white', fontSize: '22px', fontWeight: 700 }}>Portal Trabajadores</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginTop: '4px' }}>Ingresa con tu RUT y contraseña</div>
      </div>

      {/* Card */}
      <div style={{
        background: 'white', borderRadius: '20px', padding: '32px 28px',
        width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* RUT */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
            RUT
          </label>
          <input
            type="text"
            placeholder="12.345.678-9"
            value={rut}
            onChange={handleRut}
            onKeyDown={handleKey}
            maxLength={12}
            style={{
              width: '100%', padding: '13px 14px', borderRadius: '10px',
              border: `1.5px solid ${error ? '#ef4444' : '#e5e7eb'}`,
              fontSize: '16px', outline: 'none', boxSizing: 'border-box',
              color: '#111', background: '#f9fafb',
              transition: 'border 0.2s',
            }}
          />
        </div>

        {/* Contraseña */}
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
            style={{
              width: '100%', padding: '13px 14px', borderRadius: '10px',
              border: `1.5px solid ${error ? '#ef4444' : '#e5e7eb'}`,
              fontSize: '16px', outline: 'none', boxSizing: 'border-box',
              color: '#111', background: '#f9fafb',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
            fontSize: '13px', color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        {/* Botón */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: '10px',
            background: loading ? '#93c5fd' : '#2563eb',
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
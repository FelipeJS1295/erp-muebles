import { useState, useEffect } from 'react'
import { useTheme } from './store/themeStore'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Ordenes from './pages/Ordenes'
import Productos from './pages/Productos'
import ProductosInternos from './pages/ProductosInternos'
import Insumos from './pages/Insumos'
import Trabajadores from './pages/Trabajadores'
import Usuarios from './pages/Usuarios'
import Login from './pages/Login'
import OrdenesTrabajo from './pages/OrdenesTrabajo'
import OrdenesManual from './pages/OrdenesManual'
import Clientes from './pages/Clientes'
import ApiClientes from './pages/ApiClientes'
import GastosMensuales from './pages/GastosMensuales'

type Page = 'dashboard' | 'ordenes' | 'productos' | 'productos-internos' | 'insumos' | 'trabajadores' | 'usuarios' | 'ordenes-trabajo' | 'ordenes-manual' | 'clientes' | 'api-clientes' | 'gastos'

const s = {
  app: { display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' } as React.CSSProperties,
  side: { width: '210px', background: 'var(--bg-2)', borderRight: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column' as const, flexShrink: 0 },
  logo: { padding: '18px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' },
  logoSq: { width: '30px', height: '30px', background: 'var(--accent)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  nav: { padding: '10px 8px', flex: 1, overflowY: 'auto' as const },
  sectionLabel: { fontSize: '10px', color: 'var(--text-4)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '0 8px', margin: '14px 0 4px' },
  footer: { padding: '12px 16px', borderTop: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
}

function NavItem({ id, label, icon, active, onClick }: {
  id: string, label: string, icon: React.ReactNode,
  active: boolean, onClick: () => void,
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
      padding: '7px 8px', borderRadius: '7px', border: 'none',
      background: active ? 'var(--bg-3)' : 'transparent',
      cursor: 'pointer', marginBottom: '1px', textAlign: 'left',
      transition: 'background 0.1s',
    }}>
      <span style={{ color: active ? 'var(--text-1)' : 'var(--text-3)', display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: '12px', color: active ? 'var(--text-1)' : 'var(--text-2)', fontWeight: active ? 500 : 400 }}>
        {label}
      </span>
    </button>
  )
}

const ICONS = {
  dashboard: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/><rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></svg>,
  ordenes: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M1 4h12M1 7h12M1 10h12"/></svg>,
  productos: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M7 1l5.5 3v6L7 13 1.5 10V4z"/><path d="M7 1v12M1.5 4L7 7l5.5-3"/></svg>,
  productosInternos: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1" y="1" width="12" height="12" rx="1"/><path d="M4 7h6M7 4v6"/></svg>,
  insumos: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M3 3h8v8H3zM1 1h2v2H1zM11 1h2v2h-2zM1 11h2v2H1zM11 11h2v2h-2z"/></svg>,
  trabajadores: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="5" cy="4" r="2.5"/><path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4"/><circle cx="11" cy="5" r="1.5"/><path d="M11 9c1.7 0 3 1.3 3 3"/></svg>,
  ordenesTrabajo: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 2h10v10H2z"/><path d="M5 5h4M5 7h4M5 9h2"/></svg>,
  usuarios: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="5" cy="4" r="2"/><path d="M1 12c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5"/><path d="M10 6l1.5 1.5L14 5"/></svg>,
  inicio: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M1 7L7 1l6 6M2 6v7h4V9h2v4h4V6"/></svg>,
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const { dark, toggle } = useTheme()
  const [usuario, setUsuario] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [modulo, setModulo] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const usuarioStr = localStorage.getItem('usuario')
    if (token && usuarioStr) {
      setUsuario(JSON.parse(usuarioStr))
    }
    setCheckingAuth(false)
  }, [])

  const handleLogin = (usuarioData: any) => {
    setUsuario(usuarioData)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
    setModulo(null)
    setPage('dashboard')
  }

  const cambiarModulo = (nuevoModulo: string) => {
    setModulo(nuevoModulo)
    // Página por defecto según módulo
    if (nuevoModulo === 'ventas') setPage('dashboard')
    if (nuevoModulo === 'contabilidad') setPage('ordenes-trabajo')
    if (nuevoModulo === 'mantenedores') setPage('productos-internos')
  }

  if (checkingAuth) return null
  if (!usuario) return <Login onLogin={handleLogin} />
  if (!modulo) return <Home onModulo={cambiarModulo} />

  const moduloLabel: Record<string, string> = {
    ventas: 'Ventas',
    contabilidad: 'Contabilidad',
    mantenedores: 'Mantenedores',
  }

  const moduloColor: Record<string, string> = {
    ventas: '#2563eb',
    contabilidad: '#059669',
    mantenedores: '#d97706',
  }

  return (
    <div style={s.app}>
      <aside style={s.side}>
        {/* Logo + módulo activo */}
        <div style={s.logo}>
          <div style={s.logoSq}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="var(--accent-fg)"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="var(--accent-fg)"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="var(--accent-fg)"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="var(--accent-fg)"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Jerk Home</div>
            <div style={{ fontSize: '10px', marginTop: '1px', fontWeight: 500, color: moduloColor[modulo] || 'var(--text-3)' }}>
              {moduloLabel[modulo] || modulo}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={s.nav}>
          {/* Botón volver al inicio */}
          <button onClick={() => setModulo(null)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
            padding: '7px 8px', borderRadius: '7px', border: 'none',
            background: 'transparent', cursor: 'pointer', marginBottom: '8px',
            borderBottom: '0.5px solid var(--border)', paddingBottom: '12px',
          }}>
            <span style={{ color: 'var(--text-3)', display: 'flex' }}>{ICONS.inicio}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Inicio</span>
          </button>

          {/* Módulo Ventas */}
          {modulo === 'ventas' && <>
            <div style={s.sectionLabel}>Ventas</div>
            <NavItem id="dashboard" label="Resumen" active={page === 'dashboard'} onClick={() => setPage('dashboard')} icon={ICONS.dashboard} />
            <NavItem id="ordenes" label="Órdenes" active={page === 'ordenes'} onClick={() => setPage('ordenes')} icon={ICONS.ordenes} />
            <NavItem id="productos" label="Productos" active={page === 'productos'} onClick={() => setPage('productos')} icon={ICONS.productos} />
            <NavItem id="ordenes-manual" label="Ventas Directas" active={page === 'ordenes-manual'} onClick={() => setPage('ordenes-manual')}
              icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M1 3h12v9a1 1 0 01-1 1H2a1 1 0 01-1-1V3z"/><path d="M1 3l1.5-2h9L13 3"/><path d="M5 7h4"/></svg>}/>
          </>}

          {/* Módulo Contabilidad */}
          {modulo === 'contabilidad' && <>
            <div style={s.sectionLabel}>Contabilidad</div>
            <NavItem id="ordenes-trabajo" label="Órdenes de Trabajo" active={page === 'ordenes-trabajo'} onClick={() => setPage('ordenes-trabajo')} icon={ICONS.ordenesTrabajo} />
            <NavItem id="gastos" label="Gastos Mensuales" active={page === 'gastos'} onClick={() => setPage('gastos')}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>}
            />
          </>}

          {/* Módulo Mantenedores */}
          {modulo === 'mantenedores' && <>
            <div style={s.sectionLabel}>Catálogo</div>
            <NavItem id="productos-internos" label="Productos" active={page === 'productos-internos'} onClick={() => setPage('productos-internos')} icon={ICONS.productosInternos} />
            <NavItem id="insumos" label="Insumos" active={page === 'insumos'} onClick={() => setPage('insumos')} icon={ICONS.insumos} />
            <div style={s.sectionLabel}>Personal</div>
            <NavItem id="trabajadores" label="Trabajadores" active={page === 'trabajadores'} onClick={() => setPage('trabajadores')} icon={ICONS.trabajadores} />
            <div style={s.sectionLabel}>Ventas</div>
            <div style={s.sectionLabel}>Integraciones</div>
            <NavItem id="api-clientes" label="APIs de Clientes" active={page === 'api-clientes'} onClick={() => setPage('api-clientes')}
              icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M1 5h12M1 9h12M5 1v12M9 1v12"/></svg>}/>
            <NavItem id="clientes" label="Clientes" active={page === 'clientes'} onClick={() => setPage('clientes')}
              icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="7" cy="4" r="3"/><path d="M1 13c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>}/>
            {usuario.rol === 'admin_master' && <>
              <div style={s.sectionLabel}>Configuración</div>
              <NavItem id="usuarios" label="Usuarios" active={page === 'usuarios'} onClick={() => setPage('usuarios')} icon={ICONS.usuarios} />
            </>}
          </>}
        </nav>

        {/* Footer */}
        <div style={s.footer}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-1)' }}>{usuario.nombre_usuario}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-4)', marginTop: '1px' }}>{usuario.rol}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={toggle} style={{
              width: '32px', height: '18px', borderRadius: '9px',
              background: dark ? 'var(--accent)' : 'var(--border-2)',
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'background 0.2s', flexShrink: 0,
            }}>
              <div style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: dark ? 'var(--accent-fg)' : '#fff',
                position: 'absolute', top: '3px',
                left: dark ? '17px' : '3px',
                transition: 'left 0.2s',
              }} />
            </button>
            <button onClick={handleLogout} title="Cerrar sesión" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-3)', display: 'flex', alignItems: 'center',
              padding: '4px', borderRadius: '4px',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M5 2H2v10h3M9 10l3-3-3-3M12 7H5"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        {page === 'dashboard' && <Dashboard />}
        {page === 'ordenes' && <Ordenes />}
        {page === 'productos' && <Productos />}
        {page === 'productos-internos' && <ProductosInternos />}
        {page === 'insumos' && <Insumos />}
        {page === 'trabajadores' && <Trabajadores />}
        {page === 'usuarios' && <Usuarios />}
        {page === 'ordenes-trabajo' && <OrdenesTrabajo />}
        {page === 'ordenes-manual' && <OrdenesManual />}
        {page === 'clientes' && <Clientes />}
        {page === 'api-clientes' && <ApiClientes />}
        {page === 'gastos' && <GastosMensuales />}
      </main>
    </div>
  )
}
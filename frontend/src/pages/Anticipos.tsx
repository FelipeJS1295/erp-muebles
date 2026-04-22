import { useEffect, useState } from 'react'
import { api } from '../api/client'

const CARGO_CONFIG: Record<string, { color: string; bg: string }> = {
  corte:        { bg: 'var(--info-bg)',    color: 'var(--info)' },
  costura:      { bg: 'var(--success-bg)', color: 'var(--success)' },
  tapiceria:    { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  esqueleteria: { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  bodega:       { bg: 'var(--bg-3)',       color: 'var(--text-2)' },
  cojineria:    { bg: 'var(--bg-3)',       color: 'var(--text-2)' },
  embalaje:     { bg: 'var(--bg-3)',       color: 'var(--text-2)' },
  oficina:      { bg: 'var(--bg-3)',       color: 'var(--text-3)' },
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface Anticipo {
  id: number
  trabajador_id: number
  trabajador_nombre: string
  trabajador_rut: string
  trabajador_cargo: string
  fecha: string
  monto: number
  observacion: string | null
  fecha_creacion: string
}

interface Trabajador {
  id: number
  nombre_completo: string
  rut: string
  cargo: string
}

const IS: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '7px',
  border: '0.5px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

const lbl = (txt: string) => (
  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
    {txt}
  </div>
)

export default function Anticipos() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [anticipos, setAnticipos] = useState<Anticipo[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Modal
  const [modal, setModal] = useState(false)
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [form, setForm] = useState({
    trabajador_id: '',
    fecha: new Date().toISOString().split('T')[0],
    monto: '',
    observacion: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/anticipos?mes=${mes}&anio=${anio}`)
      setAnticipos(res.data.anticipos ?? [])
    } catch {
      setAnticipos([])
    } finally {
      setLoading(false)
    }
  }

  const cargarTrabajadores = async () => {
    try {
      const res = await api.get('/trabajadores')
      setTrabajadores(res.data.trabajadores ?? [])
    } catch {
      setTrabajadores([])
    }
  }

  useEffect(() => { cargar() }, [mes, anio])

  const abrirNuevo = async () => {
    setForm({ trabajador_id: '', fecha: new Date().toISOString().split('T')[0], monto: '', observacion: '' })
    setError('')
    await cargarTrabajadores()
    setModal(true)
  }

  const guardar = async () => {
    if (!form.trabajador_id || !form.fecha || !form.monto) { setError('Completa todos los campos'); return }
    if (isNaN(Number(form.monto)) || Number(form.monto) <= 0) { setError('El monto debe ser mayor a 0'); return }
    setSaving(true); setError('')
    try {
      await api.post('/anticipos', {
        trabajador_id: Number(form.trabajador_id),
        fecha: form.fecha,
        monto: Number(form.monto),
        observacion: form.observacion || null,
      })
      setModal(false)
      cargar()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async (id: number) => {
    try {
      await api.delete(`/anticipos/${id}`)
      setConfirmDelete(null)
      cargar()
    } catch {}
  }

  const filtrados = anticipos.filter(a =>
    busqueda
      ? a.trabajador_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.trabajador_rut.includes(busqueda)
      : true
  )

  const totalMes = filtrados.reduce((s, a) => s + a.monto, 0)

  // Resumen por trabajador
  const porTrabajador = Object.values(
    filtrados.reduce((acc, a) => {
      if (!acc[a.trabajador_id]) {
        acc[a.trabajador_id] = {
          nombre: a.trabajador_nombre,
          cargo: a.trabajador_cargo,
          total: 0,
          cantidad: 0,
        }
      }
      acc[a.trabajador_id].total += a.monto
      acc[a.trabajador_id].cantidad++
      return acc
    }, {} as Record<number, { nombre: string; cargo: string; total: number; cantidad: number }>)
  ).sort((a, b) => b.total - a.total)

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Anticipos</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Anticipos de sueldo por trabajador</div>
        </div>
        <button onClick={abrirNuevo} style={{
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          borderRadius: '8px', padding: '9px 18px', fontSize: '13px',
          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Nuevo Anticipo
        </button>
      </div>

      {/* Selector período */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
        background: 'var(--bg-2)', border: '0.5px solid var(--border)',
        borderRadius: '10px', padding: '14px 16px',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>Período:</div>
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          style={{ padding: '7px 10px', borderRadius: '7px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', fontSize: '13px', outline: 'none' }}>
          {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={anio} onChange={e => setAnio(Number(e.target.value))}
          style={{ padding: '7px 10px', borderRadius: '7px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', fontSize: '13px', outline: 'none' }}>
          {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
          Total anticipos: -${Math.round(totalMes).toLocaleString('es-CL')}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>

        {/* Tabla principal */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>

          {/* Búsqueda */}
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
                style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
              </svg>
              <input placeholder="Buscar trabajador..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...IS, paddingLeft: '28px' }} />
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-3)' }}>
              {filtrados.length} registros
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              No hay anticipos registrados para este período
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  {['Trabajador', 'Cargo', 'Fecha', 'Monto', 'Observación', ''].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: '11px',
                      fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase',
                      letterSpacing: '0.05em', background: 'var(--bg-3)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a, i) => {
                  const cargoCfg = CARGO_CONFIG[a.trabajador_cargo] ?? { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                  return (
                    <tr key={a.id}
                      style={{ borderBottom: i < filtrados.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{a.trabajador_nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'monospace' }}>{a.trabajador_rut}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: cargoCfg.bg, color: cargoCfg.color }}>
                          {a.trabajador_cargo ? a.trabajador_cargo.charAt(0).toUpperCase() + a.trabajador_cargo.slice(1) : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                        {new Date(a.fecha + 'T00:00:00').toLocaleDateString('es-CL')}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '14px', fontWeight: 700, color: '#dc2626',
                          background: '#dc262618', padding: '3px 10px',
                          borderRadius: '8px', whiteSpace: 'nowrap',
                        }}>
                          -${Math.round(a.monto).toLocaleString('es-CL')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-2)', maxWidth: '200px' }}>
                        {a.observacion || <span style={{ color: 'var(--text-3)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button onClick={() => setConfirmDelete(a.id)} style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                          border: '0.5px solid var(--danger-bg)', background: 'var(--danger-bg)',
                          color: 'var(--danger)', cursor: 'pointer',
                        }}>Eliminar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                  <td colSpan={3} style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
                    Total ({filtrados.length} anticipos)
                  </td>
                  <td colSpan={3} style={{ padding: '12px 14px', fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>
                    -${Math.round(totalMes).toLocaleString('es-CL')}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Panel resumen por trabajador */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
            Por trabajador
          </div>
          {porTrabajador.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', padding: '24px 0' }}>Sin datos</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {porTrabajador.map(t => {
                const pct = totalMes > 0 ? (t.total / totalMes) * 100 : 0
                return (
                  <div key={t.nombre}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-1)' }}>{t.nombre}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{t.cantidad} anticipo{t.cantidad !== 1 ? 's' : ''}</div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
                        -${Math.round(t.total).toLocaleString('es-CL')}
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--bg-3)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#dc2626', borderRadius: '4px', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal nuevo */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '460px', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '20px' }}>
              Nuevo Anticipo
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                {lbl('Trabajador')}
                <select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))} style={IS}>
                  <option value="">Seleccionar trabajador...</option>
                  {trabajadores.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre_completo} · {t.rut} {t.cargo ? `· ${t.cargo}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {lbl('Fecha')}
                <input type="date" value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={IS} />
              </div>
              <div>
                {lbl('Monto ($)')}
                <input type="number" value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  placeholder="0" style={IS} />
                {form.monto && !isNaN(Number(form.monto)) && Number(form.monto) > 0 && (
                  <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>
                    -${Number(form.monto).toLocaleString('es-CL')}
                  </div>
                )}
              </div>
              <div>
                {lbl('Observación (opcional)')}
                <input value={form.observacion}
                  onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))}
                  placeholder="Motivo del anticipo..." style={IS} />
              </div>
            </div>

            {error && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--danger-bg)', borderRadius: '7px', color: 'var(--danger)', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setModal(false)} style={{
                padding: '9px 16px', borderRadius: '8px', border: '0.5px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{
                padding: '9px 20px', borderRadius: '8px', border: 'none',
                background: 'var(--accent)', color: 'var(--accent-fg)',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1,
              }}>{saving ? 'Guardando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm eliminar */}
      {confirmDelete !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '360px', border: '0.5px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Eliminar anticipo?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '9px 16px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminar(confirmDelete)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--danger)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
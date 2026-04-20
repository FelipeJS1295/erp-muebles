import { useEffect, useState } from 'react'
import { api } from '../api/client'

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: '#d97706', bg: '#d9770618' },
  aprobado:  { label: 'Aprobado',  color: '#059669', bg: '#05966918' },
  rechazado: { label: 'Rechazado', color: '#dc2626', bg: '#dc262618' },
}

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

interface Bono {
  id: number
  trabajador_id: number
  trabajador_nombre: string
  trabajador_rut: string
  trabajador_cargo: string
  fecha: string
  monto: number
  descripcion: string | null
  estado: string
  aprobado_por: string | null
  fecha_aprobacion: string | null
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

export default function Bonos() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = usuario.rol === 'admin_master'

  const [bonos, setBonos] = useState<Bono[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // Modal
  const [modal, setModal] = useState(false)
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [form, setForm] = useState({
    trabajador_id: '',
    fecha: new Date().toISOString().split('T')[0],
    monto: '',
    descripcion: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Confirms
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [confirmAprobar, setConfirmAprobar] = useState<Bono | null>(null)
  const [confirmRechazar, setConfirmRechazar] = useState<Bono | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await api.get('/bonos')
      setBonos(res.data.bonos ?? [])
    } catch {
      setBonos([])
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

  useEffect(() => { cargar() }, [])

  const abrirNuevo = async () => {
    setForm({ trabajador_id: '', fecha: new Date().toISOString().split('T')[0], monto: '', descripcion: '' })
    setError('')
    await cargarTrabajadores()
    setModal(true)
  }

  const guardar = async () => {
    if (!form.trabajador_id || !form.fecha || !form.monto) { setError('Completa todos los campos obligatorios'); return }
    if (isNaN(Number(form.monto)) || Number(form.monto) <= 0) { setError('El monto debe ser mayor a 0'); return }
    setSaving(true); setError('')
    try {
      await api.post('/bonos', {
        trabajador_id: Number(form.trabajador_id),
        fecha: form.fecha,
        monto: Number(form.monto),
        descripcion: form.descripcion || null,
      })
      setModal(false)
      cargar()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const aprobar = async (b: Bono) => {
    try {
      await api.put(`/bonos/${b.id}/aprobar`, { aprobado_por: usuario.nombre_usuario })
      setConfirmAprobar(null)
      cargar()
    } catch {}
  }

  const rechazar = async (b: Bono) => {
    try {
      await api.put(`/bonos/${b.id}/rechazar`, { aprobado_por: usuario.nombre_usuario })
      setConfirmRechazar(null)
      cargar()
    } catch {}
  }

  const eliminar = async (id: number) => {
    try {
      await api.delete(`/bonos/${id}`)
      setConfirmDelete(null)
      cargar()
    } catch {}
  }

  const filtrados = bonos
    .filter(b => filtroEstado ? b.estado === filtroEstado : true)
    .filter(b => busqueda
      ? b.trabajador_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        b.trabajador_rut.includes(busqueda)
      : true
    )

  const pendientes    = bonos.filter(b => b.estado === 'pendiente').length
  const aprobados     = bonos.filter(b => b.estado === 'aprobado')
  const montoAprobado = aprobados.reduce((s, b) => s + b.monto, 0)

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Bonos</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Registro y aprobación de bonos a trabajadores</div>
        </div>
        <button onClick={abrirNuevo} style={{
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          borderRadius: '8px', padding: '9px 18px', fontSize: '13px',
          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Nuevo Bono
        </button>
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Pendientes',     valor: pendientes,                                  color: pendientes > 0 ? '#d97706' : 'var(--text-1)' },
          { label: 'Bonos aprobados', valor: aprobados.length,                           color: '#059669' },
          { label: 'Monto aprobado', valor: `$${montoAprobado.toLocaleString('es-CL')}`, color: '#059669' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{c.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: c.color }}>{c.valor}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
        background: 'var(--bg-2)', border: '0.5px solid var(--border)',
        borderRadius: '10px', padding: '12px 16px',
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
            style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
          </svg>
          <input placeholder="Buscar trabajador..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...IS, paddingLeft: '28px' }} />
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        {['', 'pendiente', 'aprobado', 'rechazado'].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)} style={{
            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
            border: '0.5px solid var(--border)', cursor: 'pointer',
            background: filtroEstado === e ? 'var(--accent)' : 'var(--bg)',
            color: filtroEstado === e ? 'var(--accent-fg)' : 'var(--text-3)',
          }}>
            {e === '' ? 'Todos' : ESTADO_CONFIG[e]?.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            No hay bonos registrados
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                {['Trabajador', 'Cargo', 'Fecha', 'Descripción', 'Monto', 'Estado', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: '11px',
                    fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase',
                    letterSpacing: '0.05em', background: 'var(--bg-3)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((b, i) => {
                const estCfg   = ESTADO_CONFIG[b.estado]   ?? ESTADO_CONFIG.pendiente
                const cargoCfg = CARGO_CONFIG[b.trabajador_cargo] ?? { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                return (
                  <tr key={b.id}
                    style={{ borderBottom: i < filtrados.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{b.trabajador_nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'monospace' }}>{b.trabajador_rut}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: cargoCfg.bg, color: cargoCfg.color }}>
                        {b.trabajador_cargo ? b.trabajador_cargo.charAt(0).toUpperCase() + b.trabajador_cargo.slice(1) : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {new Date(b.fecha + 'T00:00:00').toLocaleDateString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-2)', maxWidth: '200px' }}>
                      {b.descripcion || <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
                      ${b.monto.toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div>
                        <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: estCfg.bg, color: estCfg.color }}>
                          {estCfg.label}
                        </span>
                        {b.aprobado_por && (
                          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>por {b.aprobado_por}</div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {esAdmin && b.estado === 'pendiente' && <>
                          <button onClick={() => setConfirmAprobar(b)} style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                            border: '0.5px solid #05966944', background: '#05966911',
                            color: '#059669', cursor: 'pointer', fontWeight: 500,
                          }}>Aprobar</button>
                          <button onClick={() => setConfirmRechazar(b)} style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                            border: '0.5px solid #dc262644', background: '#dc262611',
                            color: '#dc2626', cursor: 'pointer',
                          }}>Rechazar</button>
                        </>}
                        {b.estado !== 'aprobado' && (
                          <button onClick={() => setConfirmDelete(b.id)} style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                            border: '0.5px solid var(--danger-bg)', background: 'var(--danger-bg)',
                            color: 'var(--danger)', cursor: 'pointer',
                          }}>Eliminar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal nuevo ──────────────────────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '460px', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '20px' }}>
              Nuevo Bono
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
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={IS} />
              </div>
              <div>
                {lbl('Monto ($)')}
                <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  placeholder="0" style={IS} />
                {form.monto && !isNaN(Number(form.monto)) && Number(form.monto) > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>
                    ${Number(form.monto).toLocaleString('es-CL')}
                  </div>
                )}
              </div>
              <div>
                {lbl('Descripción (opcional)')}
                <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Bono producción marzo, bono asistencia..." style={IS} />
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
              }}>{saving ? 'Guardando...' : 'Crear Bono'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm aprobar ──────────────────────────────────────────────────── */}
      {confirmAprobar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '380px', border: '0.5px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Aprobar bono?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '6px' }}>{confirmAprobar.trabajador_nombre}</div>
            {confirmAprobar.descripcion && (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px' }}>{confirmAprobar.descripcion}</div>
            )}
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669', marginBottom: '20px' }}>
              ${confirmAprobar.monto.toLocaleString('es-CL')}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmAprobar(null)} style={{ padding: '9px 16px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => aprobar(confirmAprobar)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#059669', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Aprobar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm rechazar ─────────────────────────────────────────────────── */}
      {confirmRechazar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '380px', border: '0.5px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Rechazar bono?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>{confirmRechazar.trabajador_nombre} · ${confirmRechazar.monto.toLocaleString('es-CL')}</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmRechazar(null)} style={{ padding: '9px 16px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => rechazar(confirmRechazar)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--danger)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Rechazar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm eliminar ─────────────────────────────────────────────────── */}
      {confirmDelete !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '360px', border: '0.5px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Eliminar bono?</div>
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
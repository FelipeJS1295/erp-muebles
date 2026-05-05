// frontend/src/pages/HorasExtras.tsx
import { useEffect, useState } from 'react'
import { api } from '../api/client'

interface HoraExtra {
  id: number
  trabajador_id: number
  trabajador_nombre: string
  trabajador_rut: string
  trabajador_cargo: string
  fecha: string
  horas: number
  sueldo_base: number
  valor_hora: number
  monto_total: number
  observacion: string | null
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
  sueldo_base: number
}

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pendiente:  { label: 'Pendiente',  bg: 'var(--warning-bg)', color: 'var(--warning)' },
  aprobada:   { label: 'Aprobada',   bg: 'var(--success-bg)', color: 'var(--success)' },
  rechazada:  { label: 'Rechazada',  bg: 'var(--danger-bg)',  color: 'var(--danger)'  },
}

const CARGO_CONFIG: Record<string, { bg: string; color: string }> = {
  corte:        { bg: 'var(--info-bg)',    color: 'var(--info)' },
  costura:      { bg: 'var(--success-bg)', color: 'var(--success)' },
  tapiceria:    { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  esqueleteria: { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  bodega:       { bg: 'var(--bg-3)',       color: 'var(--text-2)' },
  oficina:      { bg: 'var(--bg-3)',       color: 'var(--text-3)' },
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

export default function HorasExtras() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = usuario.rol === 'admin_master'

  const [horasExtras, setHorasExtras] = useState<HoraExtra[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [modal, setModal] = useState(false)
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [form, setForm] = useState({
    trabajador_id: '',
    fecha: new Date().toISOString().split('T')[0],
    horas: '',
    valor_hora: '',
    observacion: '',
  })
  const [preview, setPreview] = useState<{ valor_hora: number; monto_total: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [confirmAprobar, setConfirmAprobar] = useState<HoraExtra | null>(null)
  const [confirmRechazar, setConfirmRechazar] = useState<HoraExtra | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await api.get('/horas-extras')
      setHorasExtras(res.data.horas_extras ?? [])
    } catch {
      setHorasExtras([])
    } finally {
      setLoading(false)
    }
  }

  const cargarTrabajadores = async () => {
    try {
      const res = await api.get('/remuneraciones')
      setTrabajadores(
        (res.data.remuneraciones ?? []).map((r: any) => ({
          id: r.trabajador_id,
          nombre_completo: r.trabajador_nombre,
          rut: r.trabajador_rut,
          cargo: r.trabajador_cargo,
          sueldo_base: r.sueldo_base,
        }))
      )
    } catch {
      setTrabajadores([])
    }
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (
      form.valor_hora && form.horas &&
      !isNaN(Number(form.valor_hora)) && Number(form.valor_hora) > 0 &&
      !isNaN(Number(form.horas)) && Number(form.horas) > 0
    ) {
      const monto_total = Number(form.valor_hora) * Number(form.horas)
      setPreview({
        valor_hora: Math.round(Number(form.valor_hora)),
        monto_total: Math.round(monto_total),
      })
    } else {
      setPreview(null)
    }
  }, [form.valor_hora, form.horas])

  const abrirNuevo = async () => {
    setForm({
      trabajador_id: '',
      fecha: new Date().toISOString().split('T')[0],
      horas: '',
      valor_hora: '',
      observacion: '',
    })
    setPreview(null)
    setError('')
    await cargarTrabajadores()
    setModal(true)
  }

  const guardar = async () => {
    if (!form.trabajador_id || !form.fecha || !form.horas || !form.valor_hora) {
      setError('Completa todos los campos obligatorios')
      return
    }
    if (isNaN(Number(form.horas)) || Number(form.horas) <= 0) {
      setError('Las horas deben ser un número mayor a 0')
      return
    }
    if (isNaN(Number(form.valor_hora)) || Number(form.valor_hora) <= 0) {
      setError('El valor de la hora debe ser mayor a 0')
      return
    }
    setSaving(true); setError('')
    try {
      await api.post('/horas-extras', {
        trabajador_id: Number(form.trabajador_id),
        fecha: form.fecha,
        horas: Number(form.horas),
        valor_hora: Number(form.valor_hora),
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

  const aprobar = async (he: HoraExtra) => {
    try {
      await api.put(`/horas-extras/${he.id}/aprobar`, { aprobado_por: usuario.nombre_usuario })
      setConfirmAprobar(null)
      cargar()
    } catch {}
  }

  const rechazar = async (he: HoraExtra) => {
    try {
      await api.put(`/horas-extras/${he.id}/rechazar`, { aprobado_por: usuario.nombre_usuario })
      setConfirmRechazar(null)
      cargar()
    } catch {}
  }

  const eliminar = async (id: number) => {
    try {
      await api.delete(`/horas-extras/${id}`)
      setConfirmDelete(null)
      cargar()
    } catch {}
  }

  const filtradas = horasExtras
    .filter(h => filtroEstado ? h.estado === filtroEstado : true)
    .filter(h => busqueda
      ? h.trabajador_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        h.trabajador_rut.includes(busqueda)
      : true
    )

  const pendientes = horasExtras.filter(h => h.estado === 'pendiente').length
  const horasAprobadas = horasExtras.filter(h => h.estado === 'aprobada').reduce((s, h) => s + h.horas, 0)
  const montoAprobado = horasExtras.filter(h => h.estado === 'aprobada').reduce((s, h) => s + h.monto_total, 0)

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Horas Extras</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Registro y aprobación de horas extras</div>
        </div>
        <button onClick={abrirNuevo} style={{
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          borderRadius: '8px', padding: '9px 18px', fontSize: '13px',
          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Nueva Hora Extra
        </button>
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Pendientes',     valor: pendientes,                                           color: pendientes > 0 ? '#d97706' : 'var(--text-1)', bg: pendientes > 0 ? '#d9770618' : 'var(--bg-3)' },
          { label: 'Horas aprobadas', valor: `${horasAprobadas} hrs`,                             color: '#059669', bg: '#05966918' },
          { label: 'Monto aprobado',  valor: `$${montoAprobado.toLocaleString('es-CL')}`,         color: '#059669', bg: '#05966918' },
          { label: 'Total registros', valor: horasExtras.length,                                  color: 'var(--text-1)', bg: 'var(--bg-3)' },
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
        {['', 'pendiente', 'aprobada', 'rechazada'].map(e => (
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
        ) : filtradas.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            No hay registros de horas extras
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                {['Trabajador', 'Cargo', 'Fecha', 'Horas', 'Valor hora', 'Monto total', 'Estado', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: '11px',
                    fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase',
                    letterSpacing: '0.05em', background: 'var(--bg-3)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((h, i) => {
                const estCfg = ESTADO_CONFIG[h.estado] ?? ESTADO_CONFIG.pendiente
                const cargoCfg = CARGO_CONFIG[h.trabajador_cargo] ?? { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                return (
                  <tr key={h.id}
                    style={{ borderBottom: i < filtradas.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{h.trabajador_nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'monospace' }}>{h.trabajador_rut}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: cargoCfg.bg, color: cargoCfg.color }}>
                        {h.trabajador_cargo ? h.trabajador_cargo.charAt(0).toUpperCase() + h.trabajador_cargo.slice(1) : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-2)' }}>{h.fecha}</td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                      {h.horas} hrs
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-2)' }}>
                      ${Math.round(h.valor_hora).toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                      ${Math.round(h.monto_total).toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: estCfg.bg, color: estCfg.color }}>
                        {estCfg.label}
                      </span>
                      {h.aprobado_por && (
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>por {h.aprobado_por}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {esAdmin && h.estado === 'pendiente' && (
                          <>
                            <button onClick={() => setConfirmAprobar(h)} style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                              border: '0.5px solid var(--success-bg)', background: 'var(--success-bg)',
                              color: 'var(--success)', cursor: 'pointer',
                            }}>Aprobar</button>
                            <button onClick={() => setConfirmRechazar(h)} style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                              border: '0.5px solid var(--warning-bg)', background: 'var(--warning-bg)',
                              color: 'var(--warning)', cursor: 'pointer',
                            }}>Rechazar</button>
                          </>
                        )}
                        <button onClick={() => setConfirmDelete(h.id)} style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                          border: '0.5px solid var(--danger-bg)', background: 'var(--danger-bg)',
                          color: 'var(--danger)', cursor: 'pointer',
                        }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal nuevo registro ─────────────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '500px', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '20px' }}>
              Registrar Horas Extras
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                {lbl('Trabajador')}
                {trabajadores.length === 0 ? (
                  <div style={{ padding: '10px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '7px', fontSize: '13px', color: 'var(--text-3)' }}>
                    No hay trabajadores con sueldo base registrado
                  </div>
                ) : (
                  <select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))} style={IS}>
                    <option value="">Seleccionar trabajador...</option>
                    {trabajadores.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nombre_completo} · {t.rut} {t.cargo ? `· ${t.cargo}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                {lbl('Fecha')}
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={IS} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  {lbl('Valor hora extra ($)')}
                  <input
                    type="number" min="0" placeholder="Ej: 3800"
                    value={form.valor_hora}
                    onChange={e => setForm(f => ({ ...f, valor_hora: e.target.value }))}
                    style={IS}
                  />
                </div>
                <div>
                  {lbl('Cantidad de horas')}
                  <input
                    type="number" min="0.5" step="0.5" placeholder="Ej: 4"
                    value={form.horas}
                    onChange={e => setForm(f => ({ ...f, horas: e.target.value }))}
                    style={IS}
                  />
                </div>
              </div>

              <div>
                {lbl('Observación (opcional)')}
                <input value={form.observacion} onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))}
                  placeholder="Motivo o descripción..." style={IS} />
              </div>

              {/* Preview cálculo */}
              {preview && (
                <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    Cálculo
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    {[
                      { label: 'Valor hora',   valor: `$${preview.valor_hora.toLocaleString('es-CL')}`,   destacado: false },
                      { label: 'Total horas',  valor: `${form.horas} hrs`,                                destacado: false },
                      { label: 'Monto total',  valor: `$${preview.monto_total.toLocaleString('es-CL')}`,  destacado: true  },
                    ].map(c => (
                      <div key={c.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}>{c.label}</div>
                        <div style={{ fontSize: c.destacado ? '16px' : '14px', fontWeight: 700, color: c.destacado ? 'var(--accent)' : 'var(--text-1)' }}>
                          {c.valor}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => setModal(false)} style={{
                  padding: '8px 18px', borderRadius: '8px', border: '0.5px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
                }}>Cancelar</button>
                <button onClick={guardar} disabled={saving} style={{
                  padding: '8px 18px', borderRadius: '8px', border: 'none',
                  background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: '13px',
                  fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                }}>
                  {saving ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Aprobar ──────────────────────────────────────────────────── */}
      {confirmAprobar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '400px', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '10px' }}>¿Aprobar horas extras?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '20px' }}>
              {confirmAprobar.trabajador_nombre} · {confirmAprobar.horas} hrs · ${Math.round(confirmAprobar.monto_total).toLocaleString('es-CL')}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmAprobar(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => aprobar(confirmAprobar)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'var(--success)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Aprobar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Rechazar ─────────────────────────────────────────────────── */}
      {confirmRechazar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '400px', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '10px' }}>¿Rechazar horas extras?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '20px' }}>
              {confirmRechazar.trabajador_nombre} · {confirmRechazar.horas} hrs · ${Math.round(confirmRechazar.monto_total).toLocaleString('es-CL')}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmRechazar(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => rechazar(confirmRechazar)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'var(--warning)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Rechazar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Eliminar ─────────────────────────────────────────────────── */}
      {confirmDelete !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '380px', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '10px' }}>¿Eliminar registro?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '20px' }}>Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminar(confirmDelete)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'var(--danger)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
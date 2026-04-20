import { useEffect, useState } from 'react'
import { api } from '../api/client'

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: '#d97706', bg: '#d9770618' },
  aprobada:  { label: 'Aprobada',  color: '#059669', bg: '#05966918' },
  rechazada: { label: 'Rechazada', color: '#dc2626', bg: '#dc262618' },
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
  sueldo_base?: number
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

  // Modal nuevo
  const [modal, setModal] = useState(false)
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [form, setForm] = useState({
    trabajador_id: '',
    fecha: new Date().toISOString().split('T')[0],
    horas: '',
    observacion: '',
  })
  const [preview, setPreview] = useState<{ sueldo_base: number; valor_hora: number; monto_total: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Confirm
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
      // Solo trabajadores con sueldo base registrado
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

  // Recalcular preview cuando cambia trabajador u horas
  useEffect(() => {
    const t = trabajadores.find(t => t.id === Number(form.trabajador_id))
    if (t?.sueldo_base && form.horas && !isNaN(Number(form.horas)) && Number(form.horas) > 0) {
      const valor_hora = (t.sueldo_base / 30 / 28) * 1.5
      const monto_total = valor_hora * Number(form.horas)
      setPreview({
        sueldo_base: t.sueldo_base,
        valor_hora: Math.round(valor_hora),
        monto_total: Math.round(monto_total),
      })
    } else {
      setPreview(null)
    }
  }, [form.trabajador_id, form.horas, trabajadores])

  const abrirNuevo = async () => {
    setForm({ trabajador_id: '', fecha: new Date().toISOString().split('T')[0], horas: '', observacion: '' })
    setPreview(null)
    setError('')
    await cargarTrabajadores()
    setModal(true)
  }

  const guardar = async () => {
    if (!form.trabajador_id || !form.fecha || !form.horas) { setError('Completa todos los campos obligatorios'); return }
    if (isNaN(Number(form.horas)) || Number(form.horas) <= 0) { setError('Las horas deben ser un número mayor a 0'); return }
    setSaving(true); setError('')
    try {
      await api.post('/horas-extras', {
        trabajador_id: Number(form.trabajador_id),
        fecha: form.fecha,
        horas: Number(form.horas),
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

  // Resumen
  const pendientes = horasExtras.filter(h => h.estado === 'pendiente').length
  const aprobadas = horasExtras.filter(h => h.estado === 'aprobada')
  const montoAprobado = aprobadas.reduce((s, h) => s + h.monto_total, 0)
  const horasAprobadas = aprobadas.reduce((s, h) => s + h.horas, 0)

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
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Registrar Horas Extras
        </button>
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Pendientes de aprobación', valor: pendientes, color: pendientes > 0 ? '#d97706' : 'var(--text-1)', bg: pendientes > 0 ? '#d9770618' : 'var(--bg-3)' },
          { label: 'Horas aprobadas', valor: `${horasAprobadas} hrs`, color: '#059669', bg: '#05966918' },
          { label: 'Monto aprobado', valor: `$${montoAprobado.toLocaleString('es-CL')}`, color: '#059669', bg: '#05966918' },
          { label: 'Total registros', valor: horasExtras.length, color: 'var(--text-1)', bg: 'var(--bg-3)' },
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
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {new Date(h.fecha + 'T00:00:00').toLocaleDateString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
                      {h.horas} hrs
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-2)' }}>
                      ${Math.round(h.valor_hora).toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
                      ${Math.round(h.monto_total).toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div>
                        <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: estCfg.bg, color: estCfg.color }}>
                          {estCfg.label}
                        </span>
                        {h.aprobado_por && (
                          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>por {h.aprobado_por}</div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Aprobar/Rechazar solo admin_master y solo si pendiente */}
                        {esAdmin && h.estado === 'pendiente' && <>
                          <button onClick={() => setConfirmAprobar(h)} style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                            border: '0.5px solid #05966944', background: '#05966911',
                            color: '#059669', cursor: 'pointer', fontWeight: 500,
                          }}>Aprobar</button>
                          <button onClick={() => setConfirmRechazar(h)} style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                            border: '0.5px solid #dc262644', background: '#dc262611',
                            color: '#dc2626', cursor: 'pointer',
                          }}>Rechazar</button>
                        </>}
                        {/* Eliminar solo si no aprobada */}
                        {h.estado !== 'aprobada' && (
                          <button onClick={() => setConfirmDelete(h.id)} style={{
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  {lbl('Fecha')}
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={IS} />
                </div>
                <div>
                  {lbl('Cantidad de horas')}
                  <input type="number" value={form.horas} onChange={e => setForm(f => ({ ...f, horas: e.target.value }))}
                    placeholder="Ej: 4" style={IS} min="0.5" step="0.5" />
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
                    Cálculo de horas extras
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'Sueldo base', valor: `$${preview.sueldo_base.toLocaleString('es-CL')}` },
                      { label: 'Valor hora extra', valor: `$${preview.valor_hora.toLocaleString('es-CL')}` },
                      { label: 'Monto total', valor: `$${preview.monto_total.toLocaleString('es-CL')}`, destacado: true },
                    ].map(c => (
                      <div key={c.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}>{c.label}</div>
                        <div style={{ fontSize: c.destacado ? '16px' : '14px', fontWeight: 700, color: c.destacado ? '#059669' : 'var(--text-1)' }}>
                          {c.valor}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '10px', textAlign: 'center' }}>
                    Fórmula: (Sueldo Base / 30 / 28) × 1.5 × {form.horas} horas
                  </div>
                </div>
              )}
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
              <button onClick={guardar} disabled={saving || !preview} style={{
                padding: '9px 20px', borderRadius: '8px', border: 'none',
                background: 'var(--accent)', color: 'var(--accent-fg)',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                opacity: saving || !preview ? 0.6 : 1,
              }}>{saving ? 'Guardando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm aprobar ──────────────────────────────────────────────────── */}
      {confirmAprobar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '380px', border: '0.5px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Aprobar horas extras?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '6px' }}>
              {confirmAprobar.trabajador_nombre} · {confirmAprobar.horas} hrs
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#059669', marginBottom: '20px' }}>
              ${Math.round(confirmAprobar.monto_total).toLocaleString('es-CL')}
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
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Rechazar horas extras?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>
              {confirmRechazar.trabajador_nombre} · {confirmRechazar.horas} hrs
            </div>
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
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Eliminar registro?</div>
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
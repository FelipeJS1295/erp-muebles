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

interface DiaFaltante {
  id: number
  trabajador_id: number
  trabajador_nombre: string
  trabajador_rut: string
  trabajador_cargo: string
  fecha: string
  sueldo_base: number
  monto_descuento: number
  observacion: string | null
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

export default function DiasFaltantes() {
  const [diasFaltantes, setDiasFaltantes] = useState<DiaFaltante[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Modal
  const [modal, setModal] = useState(false)
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [form, setForm] = useState({
    trabajador_id: '',
    fecha: new Date().toISOString().split('T')[0],
    observacion: '',
  })
  const [preview, setPreview] = useState<{ sueldo_base: number; monto_descuento: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await api.get('/dias-faltantes')
      setDiasFaltantes(res.data.dias_faltantes ?? [])
    } catch {
      setDiasFaltantes([])
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

  // Preview al seleccionar trabajador
  useEffect(() => {
    const t = trabajadores.find(t => t.id === Number(form.trabajador_id))
    if (t?.sueldo_base) {
      setPreview({
        sueldo_base: t.sueldo_base,
        monto_descuento: Math.round(t.sueldo_base / 30),
      })
    } else {
      setPreview(null)
    }
  }, [form.trabajador_id, trabajadores])

  const abrirNuevo = async () => {
    setForm({ trabajador_id: '', fecha: new Date().toISOString().split('T')[0], observacion: '' })
    setPreview(null)
    setError('')
    await cargarTrabajadores()
    setModal(true)
  }

  const guardar = async () => {
    if (!form.trabajador_id || !form.fecha) { setError('Selecciona trabajador y fecha'); return }
    setSaving(true); setError('')
    try {
      await api.post('/dias-faltantes', {
        trabajador_id: Number(form.trabajador_id),
        fecha: form.fecha,
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
      await api.delete(`/dias-faltantes/${id}`)
      setConfirmDelete(null)
      cargar()
    } catch {}
  }

  const filtrados = diasFaltantes.filter(d =>
    busqueda
      ? d.trabajador_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.trabajador_rut.includes(busqueda)
      : true
  )

  const totalDescuento = filtrados.reduce((s, d) => s + d.monto_descuento, 0)
  const totalDias = filtrados.length

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Días Faltantes</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Registro de inasistencias y descuentos</div>
        </div>
        <button onClick={abrirNuevo} style={{
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          borderRadius: '8px', padding: '9px 18px', fontSize: '13px',
          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Registrar Día Faltante
        </button>
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total días faltantes', valor: totalDias,   color: 'var(--text-1)' },
          { label: 'Total descuentos',
            valor: `-$${totalDescuento.toLocaleString('es-CL')}`,
            color: '#dc2626' },
          { label: 'Promedio por día',
            valor: totalDias > 0 ? `-$${Math.round(totalDescuento / totalDias).toLocaleString('es-CL')}` : '—',
            color: '#dc2626' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{c.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: c.color }}>{c.valor}</div>
          </div>
        ))}
      </div>

      {/* Filtro búsqueda */}
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
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-3)' }}>
          {filtrados.length} registros · Total:{' '}
          <strong style={{ color: '#dc2626' }}>-${totalDescuento.toLocaleString('es-CL')}</strong>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            No hay días faltantes registrados
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                {['Trabajador', 'Cargo', 'Fecha', 'Sueldo Base', 'Descuento', 'Observación', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: '11px',
                    fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase',
                    letterSpacing: '0.05em', background: 'var(--bg-3)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((d, i) => {
                const cargoCfg = CARGO_CONFIG[d.trabajador_cargo] ?? { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                return (
                  <tr key={d.id}
                    style={{ borderBottom: i < filtrados.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{d.trabajador_nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'monospace' }}>{d.trabajador_rut}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: cargoCfg.bg, color: cargoCfg.color }}>
                        {d.trabajador_cargo ? d.trabajador_cargo.charAt(0).toUpperCase() + d.trabajador_cargo.slice(1) : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-2)' }}>
                      ${d.sueldo_base.toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: '14px', fontWeight: 700, color: '#dc2626',
                        background: '#dc262618', padding: '3px 10px',
                        borderRadius: '8px', whiteSpace: 'nowrap',
                      }}>
                        -${Math.round(d.monto_descuento).toLocaleString('es-CL')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-2)', maxWidth: '200px' }}>
                      {d.observacion || <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => setConfirmDelete(d.id)} style={{
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
                <td colSpan={4} style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
                  Total ({filtrados.length} días)
                </td>
                <td colSpan={3} style={{ padding: '12px 14px', fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>
                  -${totalDescuento.toLocaleString('es-CL')}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── Modal nuevo ──────────────────────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '460px', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '20px' }}>
              Registrar Día Faltante
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
                <input type="date" value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={IS} />
              </div>

              <div>
                {lbl('Observación (opcional)')}
                <input value={form.observacion}
                  onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))}
                  placeholder="Ej: Inasistencia injustificada..." style={IS} />
              </div>

              {/* Preview descuento */}
              {preview && (
                <div style={{ background: 'var(--bg)', border: '0.5px solid #dc262644', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    Cálculo del descuento
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}>Sueldo base</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
                        ${preview.sueldo_base.toLocaleString('es-CL')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}>Descuento (1 día)</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626' }}>
                        -${preview.monto_descuento.toLocaleString('es-CL')}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '10px', textAlign: 'center' }}>
                    Fórmula: Sueldo Base / 30
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
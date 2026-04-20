import { useEffect, useState } from 'react'
import { api } from '../api/client'

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  compras: { label: 'Compras',  color: '#7c3aed', bg: '#7c3aed18' },
  horas:   { label: 'Horas',    color: '#d97706', bg: '#d9770618' },
  otro:    { label: 'Otro',     color: '#6b7280', bg: '#6b728018' },
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

interface OtroDescuento {
  id: number
  trabajador_id: number
  trabajador_nombre: string
  trabajador_rut: string
  trabajador_cargo: string
  tipo: string
  documento: string | null
  monto_total: number
  cuotas: number
  monto_cuota: number
  cuotas_pagadas: number
  cuotas_restantes: number
  horas: number | null
  valor_hora: number | null
  descripcion: string | null
  activo: number
  fecha_inicio: string
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

export default function OtrosDescuentos() {
  const [descuentos, setDescuentos] = useState<OtroDescuento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroActivo, setFiltroActivo] = useState<string>('1')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // Modal
  const [modal, setModal] = useState(false)
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [tipo, setTipo] = useState('compras')
  const [form, setForm] = useState({
    trabajador_id: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    // compras
    documento: '',
    monto_total: '',
    cuotas: '1',
    // horas
    horas: '',
    // otro
    descripcion: '',
  })
  const [preview, setPreview] = useState<{ monto_total: number; monto_cuota: number; cuotas: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Confirms
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [confirmCuota, setConfirmCuota] = useState<OtroDescuento | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const params = filtroActivo !== '' ? `?activo=${filtroActivo}` : ''
      const res = await api.get(`/otros-descuentos${params}`)
      setDescuentos(res.data.descuentos ?? [])
    } catch {
      setDescuentos([])
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

  useEffect(() => { cargar() }, [filtroActivo])

  // Preview al cambiar form
  useEffect(() => {
    if (tipo === 'compras') {
      const monto = Number(form.monto_total)
      const cuotas = Number(form.cuotas) || 1
      if (monto > 0) {
        setPreview({ monto_total: monto, monto_cuota: Math.round(monto / cuotas), cuotas })
      } else {
        setPreview(null)
      }
    } else if (tipo === 'horas') {
      const t = trabajadores.find(t => t.id === Number(form.trabajador_id))
      const horas = Number(form.horas)
      if (t?.sueldo_base && horas > 0) {
        const valor_hora = (t.sueldo_base * 28) / (30 * 45 * 4)
        const monto_total = Math.round(valor_hora * horas)
        setPreview({ monto_total, monto_cuota: monto_total, cuotas: 1 })
      } else {
        setPreview(null)
      }
    } else if (tipo === 'otro') {
      const monto = Number(form.monto_total)
      if (monto > 0) {
        setPreview({ monto_total: monto, monto_cuota: monto, cuotas: 1 })
      } else {
        setPreview(null)
      }
    }
  }, [tipo, form, trabajadores])

  const abrirNuevo = async () => {
    setTipo('compras')
    setForm({
      trabajador_id: '', fecha_inicio: new Date().toISOString().split('T')[0],
      documento: '', monto_total: '', cuotas: '1',
      horas: '', descripcion: '',
    })
    setPreview(null)
    setError('')
    await cargarTrabajadores()
    setModal(true)
  }

  const guardar = async () => {
    if (!form.trabajador_id) { setError('Selecciona un trabajador'); return }
    if (tipo === 'compras' && (!form.monto_total || Number(form.monto_total) <= 0)) { setError('Ingresa el monto total'); return }
    if (tipo === 'horas' && (!form.horas || Number(form.horas) <= 0)) { setError('Ingresa la cantidad de horas'); return }
    if (tipo === 'otro' && (!form.monto_total || Number(form.monto_total) <= 0)) { setError('Ingresa el monto'); return }

    setSaving(true); setError('')
    try {
      await api.post('/otros-descuentos', {
        trabajador_id: Number(form.trabajador_id),
        tipo,
        fecha_inicio: form.fecha_inicio,
        documento: form.documento || null,
        monto_total: Number(form.monto_total) || 0,
        cuotas: Number(form.cuotas) || 1,
        horas: Number(form.horas) || null,
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

  const pagarCuota = async (d: OtroDescuento) => {
    try {
      await api.put(`/otros-descuentos/${d.id}/pagar-cuota`)
      setConfirmCuota(null)
      cargar()
    } catch {}
  }

  const eliminar = async (id: number) => {
    try {
      await api.delete(`/otros-descuentos/${id}`)
      setConfirmDelete(null)
      cargar()
    } catch {}
  }

  const filtrados = descuentos
    .filter(d => filtroTipo ? d.tipo === filtroTipo : true)
    .filter(d => busqueda
      ? d.trabajador_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.trabajador_rut.includes(busqueda)
      : true
    )

  const totalActivos = descuentos.filter(d => d.activo === 1).length
  const montoTotal = descuentos.filter(d => d.activo === 1).reduce((s, d) => s + d.monto_total, 0)
  const montoPendiente = descuentos.filter(d => d.activo === 1).reduce((s, d) => s + (d.monto_cuota * d.cuotas_restantes), 0)

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Otros Descuentos</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Compras, horas y descuentos varios</div>
        </div>
        <button onClick={abrirNuevo} style={{
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          borderRadius: '8px', padding: '9px 18px', fontSize: '13px',
          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Nuevo Descuento
        </button>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Descuentos activos',   valor: totalActivos,                                      color: 'var(--text-1)' },
          { label: 'Monto total registrado', valor: `-$${Math.round(montoTotal).toLocaleString('es-CL')}`, color: '#dc2626' },
          { label: 'Saldo pendiente',       valor: `-$${Math.round(montoPendiente).toLocaleString('es-CL')}`, color: '#d97706' },
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
        borderRadius: '10px', padding: '12px 16px', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative' }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
            style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
          </svg>
          <input placeholder="Buscar trabajador..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...IS, paddingLeft: '28px', width: '220px' }} />
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        {[
          { val: '1', label: 'Activos' },
          { val: '0', label: 'Completados' },
          { val: '',  label: 'Todos' },
        ].map(f => (
          <button key={f.val} onClick={() => setFiltroActivo(f.val)} style={{
            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
            border: '0.5px solid var(--border)', cursor: 'pointer',
            background: filtroActivo === f.val ? 'var(--accent)' : 'var(--bg)',
            color: filtroActivo === f.val ? 'var(--accent-fg)' : 'var(--text-3)',
          }}>{f.label}</button>
        ))}
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        {['', 'compras', 'horas', 'otro'].map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)} style={{
            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
            border: '0.5px solid var(--border)', cursor: 'pointer',
            background: filtroTipo === t ? 'var(--accent)' : 'var(--bg)',
            color: filtroTipo === t ? 'var(--accent-fg)' : 'var(--text-3)',
          }}>{t === '' ? 'Todos los tipos' : TIPO_CONFIG[t]?.label}</button>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>No hay descuentos registrados</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                {['Trabajador', 'Tipo', 'Detalle', 'Monto total', 'Cuotas', 'Monto cuota', 'Estado', ''].map(h => (
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
                const tipoCfg  = TIPO_CONFIG[d.tipo] ?? TIPO_CONFIG.otro
                const cargoCfg = CARGO_CONFIG[d.trabajador_cargo] ?? { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                const completado = d.activo === 0
                return (
                  <tr key={d.id}
                    style={{ borderBottom: i < filtrados.length - 1 ? '0.5px solid var(--border)' : 'none', opacity: completado ? 0.6 : 1 }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{d.trabajador_nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'monospace' }}>{d.trabajador_rut}</div>
                      <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 500, background: cargoCfg.bg, color: cargoCfg.color }}>
                        {d.trabajador_cargo}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: tipoCfg.bg, color: tipoCfg.color }}>
                        {tipoCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-2)', maxWidth: '180px' }}>
                      {d.tipo === 'compras' && d.documento && <div>Doc: <strong>{d.documento}</strong></div>}
                      {d.tipo === 'horas' && <div>{d.horas} hrs × ${Math.round(d.valor_hora ?? 0).toLocaleString('es-CL')}</div>}
                      {d.tipo === 'otro' && d.descripcion && <div>{d.descripcion}</div>}
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        Desde {new Date(d.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CL')}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
                      -${Math.round(d.monto_total).toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {d.cuotas > 1 ? (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                            {d.cuotas_pagadas}/{d.cuotas}
                          </div>
                          <div style={{ height: '4px', background: 'var(--bg-3)', borderRadius: '4px', marginTop: '4px', width: '80px' }}>
                            <div style={{
                              height: '100%', borderRadius: '4px',
                              width: `${(d.cuotas_pagadas / d.cuotas) * 100}%`,
                              background: completado ? '#059669' : '#2563eb',
                              transition: 'width 0.3s',
                            }} />
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
                            {d.cuotas_restantes} restante{d.cuotas_restantes !== 1 ? 's' : ''}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>1 cuota</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>
                      -${Math.round(d.monto_cuota).toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {completado ? (
                        <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: '#05966918', color: '#059669' }}>
                          Completado
                        </span>
                      ) : (
                        <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: '#d9770618', color: '#d97706' }}>
                          Activo
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                        {!completado && (
                          <button onClick={() => setConfirmCuota(d)} style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                            border: '0.5px solid #2563eb44', background: '#2563eb11',
                            color: '#2563eb', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
                          }}>Pagar cuota</button>
                        )}
                        <button onClick={() => setConfirmDelete(d.id)} style={{
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

      {/* ── Modal nuevo ──────────────────────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '500px', maxHeight: '90vh', overflowY: 'auto', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '20px' }}>
              Nuevo Descuento
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Trabajador */}
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

              {/* Tipo */}
              <div>
                {lbl('Tipo de descuento')}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['compras', 'horas', 'otro'].map(t => (
                    <button key={t} onClick={() => setTipo(t)} style={{
                      flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                      border: `0.5px solid ${tipo === t ? TIPO_CONFIG[t].color : 'var(--border)'}`,
                      background: tipo === t ? TIPO_CONFIG[t].bg : 'var(--bg)',
                      color: tipo === t ? TIPO_CONFIG[t].color : 'var(--text-3)',
                      cursor: 'pointer',
                    }}>{TIPO_CONFIG[t].label}</button>
                  ))}
                </div>
              </div>

              {/* Fecha inicio */}
              <div>
                {lbl('Fecha inicio')}
                <input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} style={IS} />
              </div>

              {/* Campos según tipo */}
              {tipo === 'compras' && <>
                <div>
                  {lbl('Documento (boleta/factura)')}
                  <input value={form.documento} onChange={e => setForm(f => ({ ...f, documento: e.target.value }))}
                    placeholder="N° documento..." style={IS} />
                </div>
                <div>
                  {lbl('Monto total ($)')}
                  <input type="number" value={form.monto_total} onChange={e => setForm(f => ({ ...f, monto_total: e.target.value }))}
                    placeholder="0" style={IS} />
                </div>
                <div>
                  {lbl('Número de cuotas')}
                  <input type="number" value={form.cuotas} onChange={e => setForm(f => ({ ...f, cuotas: e.target.value }))}
                    min="1" placeholder="1" style={IS} />
                </div>
              </>}

              {tipo === 'horas' && (
                <div>
                  {lbl('Cantidad de horas a descontar')}
                  <input type="number" value={form.horas} onChange={e => setForm(f => ({ ...f, horas: e.target.value }))}
                    placeholder="0" min="0.5" step="0.5" style={IS} />
                </div>
              )}

              {tipo === 'otro' && <>
                <div>
                  {lbl('Descripción')}
                  <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Motivo del descuento..." style={IS} />
                </div>
                <div>
                  {lbl('Monto ($)')}
                  <input type="number" value={form.monto_total} onChange={e => setForm(f => ({ ...f, monto_total: e.target.value }))}
                    placeholder="0" style={IS} />
                </div>
              </>}

              {/* Preview */}
              {preview && (
                <div style={{ background: 'var(--bg)', border: '0.5px solid #dc262644', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    Resumen del descuento
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'Monto total', valor: `-$${Math.round(preview.monto_total).toLocaleString('es-CL')}` },
                      { label: 'Cuotas', valor: preview.cuotas },
                      { label: 'Por cuota', valor: `-$${Math.round(preview.monto_cuota).toLocaleString('es-CL')}` },
                    ].map(c => (
                      <div key={c.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}>{c.label}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>{c.valor}</div>
                      </div>
                    ))}
                  </div>
                  {tipo === 'compras' && preview.cuotas > 1 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '10px', textAlign: 'center' }}>
                      Se descontará ${Math.round(preview.monto_cuota).toLocaleString('es-CL')} por mes durante {preview.cuotas} meses
                    </div>
                  )}
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
              }}>{saving ? 'Guardando...' : 'Crear descuento'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm pagar cuota ──────────────────────────────────────────────── */}
      {confirmCuota && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '380px', border: '0.5px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Registrar pago de cuota?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '4px' }}>{confirmCuota.trabajador_nombre}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>
              -{`$${Math.round(confirmCuota.monto_cuota).toLocaleString('es-CL')}`}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '20px' }}>
              Cuota {confirmCuota.cuotas_pagadas + 1} de {confirmCuota.cuotas}
              {confirmCuota.cuotas_pagadas + 1 === confirmCuota.cuotas && (
                <span style={{ color: '#059669', fontWeight: 600 }}> · Última cuota</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmCuota(null)} style={{ padding: '9px 16px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => pagarCuota(confirmCuota)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm eliminar ─────────────────────────────────────────────────── */}
      {confirmDelete !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '360px', border: '0.5px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Eliminar descuento?</div>
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
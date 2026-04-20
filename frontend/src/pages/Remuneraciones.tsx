import { useEffect, useState } from 'react'
import { api } from '../api/client'

const TIPOS_CONTRATO = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'boleta', label: 'Boleta' },
  { value: 'sin_contrato', label: 'Sin Contrato' },
]

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  contrato:     { label: 'Contrato',     color: '#059669', bg: '#05966918' },
  boleta:       { label: 'Boleta',       color: '#2563eb', bg: '#2563eb18' },
  sin_contrato: { label: 'Sin Contrato', color: '#d97706', bg: '#d9770618' },
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

interface Remuneracion {
  id: number
  trabajador_id: number
  trabajador_nombre: string
  trabajador_rut: string
  trabajador_cargo: string
  sueldo_base: number
  tipo: string
  fecha_actualizacion: string
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

const label = (txt: string) => (
  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
    {txt}
  </div>
)

export default function Remuneraciones() {
  const [remuneraciones, setRemuneraciones] = useState<Remuneracion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // Modal
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Remuneracion | null>(null)
  const [trabajadoresSin, setTrabajadoresSin] = useState<Trabajador[]>([])
  const [form, setForm] = useState({ trabajador_id: '', sueldo_base: '', tipo: 'contrato' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await api.get('/remuneraciones')
      setRemuneraciones(res.data.remuneraciones ?? [])
    } catch {
      setRemuneraciones([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const abrirNuevo = async () => {
    setEditando(null)
    setForm({ trabajador_id: '', sueldo_base: '', tipo: 'contrato' })
    setError('')
    try {
      const res = await api.get('/remuneraciones/trabajadores-sin-remuneracion')
      setTrabajadoresSin(res.data.trabajadores ?? [])
    } catch {
      setTrabajadoresSin([])
    }
    setModal(true)
  }

  const abrirEditar = (r: Remuneracion) => {
    setEditando(r)
    setForm({ trabajador_id: String(r.trabajador_id), sueldo_base: String(r.sueldo_base), tipo: r.tipo })
    setError('')
    setModal(true)
  }

  const guardar = async () => {
    if (!form.sueldo_base || (!editando && !form.trabajador_id)) {
      setError('Completa todos los campos')
      return
    }
    if (isNaN(Number(form.sueldo_base)) || Number(form.sueldo_base) <= 0) {
      setError('El sueldo base debe ser mayor a 0')
      return
    }
    setSaving(true); setError('')
    try {
      if (editando) {
        await api.put(`/remuneraciones/${editando.id}`, {
          sueldo_base: Number(form.sueldo_base),
          tipo: form.tipo,
        })
      } else {
        await api.post('/remuneraciones', {
          trabajador_id: Number(form.trabajador_id),
          sueldo_base: Number(form.sueldo_base),
          tipo: form.tipo,
        })
      }
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
      await api.delete(`/remuneraciones/${id}`)
      setConfirmDelete(null)
      cargar()
    } catch {}
  }

  const filtradas = remuneraciones
    .filter(r => filtroTipo ? r.tipo === filtroTipo : true)
    .filter(r => busqueda
      ? r.trabajador_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.trabajador_rut.includes(busqueda)
      : true
    )

  const totalSueldos = filtradas.reduce((s, r) => s + r.sueldo_base, 0)

  // Resumen por tipo
  const resumenTipo = TIPOS_CONTRATO.map(t => ({
    ...t,
    count: remuneraciones.filter(r => r.tipo === t.value).length,
    total: remuneraciones.filter(r => r.tipo === t.value).reduce((s, r) => s + r.sueldo_base, 0),
  }))

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Remuneraciones</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Sueldos base por trabajador</div>
        </div>
        <button onClick={abrirNuevo} style={{
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          borderRadius: '8px', padding: '9px 18px', fontSize: '13px',
          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Nueva Remuneración
        </button>
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {/* Total general */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Total mensual
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>
            ${remuneraciones.reduce((s, r) => s + r.sueldo_base, 0).toLocaleString('es-CL')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
            {remuneraciones.length} trabajadores
          </div>
        </div>

        {/* Por tipo */}
        {resumenTipo.map(t => {
          const cfg = TIPO_CONFIG[t.value]
          return (
            <div key={t.value} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t.label}
                </div>
                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                  {t.count}
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: cfg.color }}>
                ${t.total.toLocaleString('es-CL')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
        background: 'var(--bg-2)', border: '0.5px solid var(--border)',
        borderRadius: '10px', padding: '12px 16px',
      }}>
        {/* Busqueda */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
            style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
          </svg>
          <input placeholder="Buscar por nombre o RUT..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...IS, paddingLeft: '28px' }} />
        </div>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {/* Filtro tipo */}
        {['', 'contrato', 'boleta', 'sin_contrato'].map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)} style={{
            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
            border: '0.5px solid var(--border)', cursor: 'pointer',
            background: filtroTipo === t ? 'var(--accent)' : 'var(--bg)',
            color: filtroTipo === t ? 'var(--accent-fg)' : 'var(--text-3)',
          }}>
            {t === '' ? 'Todos' : TIPO_CONFIG[t]?.label}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-3)' }}>
          Mostrando <strong style={{ color: 'var(--text-1)' }}>{filtradas.length}</strong> · Total:{' '}
          <strong style={{ color: 'var(--text-1)' }}>${totalSueldos.toLocaleString('es-CL')}</strong>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Cargando...</div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            {remuneraciones.length === 0 ? 'No hay remuneraciones registradas' : 'No hay resultados para el filtro aplicado'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                {['Trabajador', 'RUT', 'Cargo', 'Tipo', 'Sueldo Base', 'Última actualización', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: '11px',
                    fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase',
                    letterSpacing: '0.05em', background: 'var(--bg-3)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r, i) => {
                const tipoCfg = TIPO_CONFIG[r.tipo] ?? TIPO_CONFIG.sin_contrato
                const cargoCfg = CARGO_CONFIG[r.trabajador_cargo] ?? { bg: 'var(--bg-3)', color: 'var(--text-3)' }
                return (
                  <tr key={r.id}
                    style={{ borderBottom: i < filtradas.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                      {r.trabajador_nombre}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '12px', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                      {r.trabajador_rut}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                        background: cargoCfg.bg, color: cargoCfg.color,
                      }}>
                        {r.trabajador_cargo ? r.trabajador_cargo.charAt(0).toUpperCase() + r.trabajador_cargo.slice(1) : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                        background: tipoCfg.bg, color: tipoCfg.color,
                      }}>
                        {tipoCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
                      ${r.sueldo_base.toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '12px', color: 'var(--text-3)' }}>
                      {r.fecha_actualizacion
                        ? new Date(r.fecha_actualizacion).toLocaleDateString('es-CL')
                        : '—'}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => abrirEditar(r)} style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                          border: '0.5px solid var(--border)', background: 'var(--bg)',
                          color: 'var(--text-2)', cursor: 'pointer',
                        }}>Editar</button>
                        <button onClick={() => setConfirmDelete(r.id)} style={{
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
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                <td colSpan={4} style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
                  Total ({filtradas.length} trabajadores)
                </td>
                <td colSpan={3} style={{ padding: '12px 16px', fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>
                  ${totalSueldos.toLocaleString('es-CL')}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── Modal nuevo / editar ─────────────────────────────────────────────── */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{
            background: 'var(--bg-2)', borderRadius: '14px', padding: '28px',
            width: '460px', border: '0.5px solid var(--border)',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '20px' }}>
              {editando ? `Editar — ${editando.trabajador_nombre}` : 'Nueva Remuneración'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Trabajador — solo al crear */}
              {!editando && (
                <div>
                  {label('Trabajador')}
                  {trabajadoresSin.length === 0 ? (
                    <div style={{ padding: '10px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '7px', fontSize: '13px', color: 'var(--text-3)' }}>
                      Todos los trabajadores tienen remuneración registrada
                    </div>
                  ) : (
                    <select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))} style={IS}>
                      <option value="">Seleccionar trabajador...</option>
                      {trabajadoresSin.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nombre_completo} · {t.rut} {t.cargo ? `· ${t.cargo}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Tipo contrato */}
              <div>
                {label('Tipo de contrato')}
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={IS}>
                  {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Sueldo base */}
              <div>
                {label('Sueldo Base ($)')}
                <input
                  type="number"
                  value={form.sueldo_base}
                  onChange={e => setForm(f => ({ ...f, sueldo_base: e.target.value }))}
                  placeholder="0"
                  style={IS}
                />
                {form.sueldo_base && !isNaN(Number(form.sueldo_base)) && Number(form.sueldo_base) > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>
                    ${Number(form.sueldo_base).toLocaleString('es-CL')}
                  </div>
                )}
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
              }}>{saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear remuneración'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete ───────────────────────────────────────────────────── */}
      {confirmDelete !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
        }}>
          <div style={{
            background: 'var(--bg-2)', borderRadius: '14px', padding: '28px',
            width: '360px', border: '0.5px solid var(--border)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Eliminar remuneración?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                padding: '9px 16px', borderRadius: '8px', border: '0.5px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={() => eliminar(confirmDelete)} style={{
                padding: '9px 20px', borderRadius: '8px', border: 'none',
                background: 'var(--danger)', color: '#fff',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import { useEffect, useState } from 'react'
import { api } from '../api/client'

const TIPOS = [
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'remuneraciones', label: 'Remuneraciones' },
  { value: 'insumos', label: 'Insumos' },
  { value: 'logistica', label: 'Logística' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'equipamiento', label: 'Equipamiento' },
  { value: 'mantencion', label: 'Mantención' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'otros', label: 'Otros' },
]

const TIPO_COLORS: Record<string, string> = {
  arriendo: '#2563eb',
  servicios: '#0891b2',
  remuneraciones: '#7c3aed',
  insumos: '#d97706',
  logistica: '#ea580c',
  marketing: '#db2777',
  equipamiento: '#059669',
  mantencion: '#65a30d',
  impuestos: '#dc2626',
  otros: '#6b7280',
}

interface Gasto {
  id: number
  fecha: string
  tipo: string
  descripcion: string
  monto: number
  fecha_creacion: string
}

const formVacio = {
  fecha: new Date().toISOString().split('T')[0],
  tipo: 'otros',
  descripcion: '',
  monto: '',
}

const IS: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '7px',
  border: '0.5px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

export default function GastosMensuales() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Gasto | null>(null)
  const [form, setForm] = useState(formVacio)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/gastos?mes=${mes}&anio=${anio}`)
      setGastos(res.data.gastos ?? [])
    } catch {
      setGastos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [mes, anio])

  const abrirNuevo = () => {
    setEditando(null)
    setForm(formVacio)
    setError('')
    setModal(true)
  }

  const abrirEditar = (g: Gasto) => {
    setEditando(g)
    setForm({ fecha: g.fecha, tipo: g.tipo, descripcion: g.descripcion, monto: String(g.monto) })
    setError('')
    setModal(true)
  }

  const guardar = async () => {
    if (!form.fecha || !form.descripcion || !form.monto) {
      setError('Completa todos los campos')
      return
    }
    if (isNaN(Number(form.monto)) || Number(form.monto) <= 0) {
      setError('El monto debe ser un número válido mayor a 0')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editando) {
        await api.put(`/gastos/${editando.id}`, { ...form, monto: Number(form.monto) })
      } else {
        await api.post('/gastos', { ...form, monto: Number(form.monto) })
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
      await api.delete(`/gastos/${id}`)
      setConfirmDelete(null)
      cargar()
    } catch {}
  }

  const gastosFiltrados = filtroTipo ? gastos.filter(g => g.tipo === filtroTipo) : gastos
  const montoTotal = gastosFiltrados.reduce((sum, g) => sum + g.monto, 0)

  // Resumen por tipo
  const porTipo = TIPOS.map(t => ({
    ...t,
    monto: gastos.filter(g => g.tipo === t.value).reduce((s, g) => s + g.monto, 0),
  })).filter(t => t.monto > 0).sort((a, b) => b.monto - a.monto)

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]

  const label = (txt: string) => (
    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {txt}
    </div>
  )

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Gastos Mensuales</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Registro de gastos operacionales</div>
        </div>
        <button onClick={abrirNuevo} style={{
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          borderRadius: '8px', padding: '9px 18px', fontSize: '13px',
          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Nuevo Gasto
        </button>
      </div>

      {/* Filtros mes/año */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px',
        background: 'var(--bg-2)', border: '0.5px solid var(--border)',
        borderRadius: '10px', padding: '14px 16px',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>Período:</div>
        <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ ...IS, width: 'auto' }}>
          {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={{ ...IS, width: 'auto' }}>
          {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-3)' }}>
          Total del mes:&nbsp;
          <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-1)' }}>
            ${gastos.reduce((s, g) => s + g.monto, 0).toLocaleString('es-CL')}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>

        {/* Tabla */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>

          {/* Filtro tipo sobre la tabla */}
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Filtrar:</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button onClick={() => setFiltroTipo('')} style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                border: '0.5px solid var(--border)', cursor: 'pointer',
                background: filtroTipo === '' ? 'var(--accent)' : 'var(--bg)',
                color: filtroTipo === '' ? 'var(--accent-fg)' : 'var(--text-3)',
              }}>Todos</button>
              {porTipo.map(t => (
                <button key={t.value} onClick={() => setFiltroTipo(t.value)} style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                  border: `0.5px solid ${TIPO_COLORS[t.value]}44`, cursor: 'pointer',
                  background: filtroTipo === t.value ? TIPO_COLORS[t.value] + '22' : 'var(--bg)',
                  color: TIPO_COLORS[t.value],
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Cargando...</div>
          ) : gastosFiltrados.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              No hay gastos registrados para este período
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  {['Fecha', 'Tipo', 'Descripción', 'Monto', ''].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', fontSize: '11px',
                      fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase',
                      letterSpacing: '0.05em', background: 'var(--bg-3)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gastosFiltrados.map((g, i) => (
                  <tr key={g.id} style={{
                    borderBottom: i < gastosFiltrados.length - 1 ? '0.5px solid var(--border)' : 'none',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {new Date(g.fecha + 'T00:00:00').toLocaleDateString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                        background: TIPO_COLORS[g.tipo] + '18', color: TIPO_COLORS[g.tipo],
                      }}>
                        {TIPOS.find(t => t.value === g.tipo)?.label ?? g.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-1)', maxWidth: '300px' }}>
                      {g.descripcion}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
                      ${g.monto.toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => abrirEditar(g)} style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                          border: '0.5px solid var(--border)', background: 'var(--bg)',
                          color: 'var(--text-2)', cursor: 'pointer',
                        }}>Editar</button>
                        <button onClick={() => setConfirmDelete(g.id)} style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                          border: '0.5px solid var(--danger-bg)', background: 'var(--danger-bg)',
                          color: 'var(--danger)', cursor: 'pointer',
                        }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                  <td colSpan={3} style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
                    Total ({gastosFiltrados.length} gastos)
                  </td>
                  <td colSpan={2} style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
                    ${montoTotal.toLocaleString('es-CL')}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Panel resumen por tipo */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
            Resumen por tipo
          </div>
          {porTipo.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', padding: '24px 0' }}>Sin datos</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {porTipo.map(t => {
                const pct = montoTotal > 0 ? (t.monto / gastos.reduce((s, g) => s + g.monto, 0)) * 100 : 0
                return (
                  <div key={t.value}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: TIPO_COLORS[t.value], fontWeight: 500 }}>{t.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>${t.monto.toLocaleString('es-CL')}</span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--bg-3)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: TIPO_COLORS[t.value], borderRadius: '4px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{pct.toFixed(1)}%</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal nuevo/editar */}
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
              {editando ? 'Editar Gasto' : 'Nuevo Gasto'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                {label('Fecha')}
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={IS} />
              </div>
              <div>
                {label('Tipo de gasto')}
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={IS}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                {label('Descripción')}
                <input
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Arriendo bodega marzo"
                  style={IS}
                />
              </div>
              <div>
                {label('Monto ($)')}
                <input
                  type="number"
                  value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  placeholder="0"
                  style={IS}
                />
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
              }}>{saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear gasto'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmDelete !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg-2)', borderRadius: '14px', padding: '28px',
            width: '360px', border: '0.5px solid var(--border)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Eliminar gasto?</div>
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
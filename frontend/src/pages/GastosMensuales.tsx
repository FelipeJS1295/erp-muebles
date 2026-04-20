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

const TIPOS_PAGO = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
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

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: '#d97706', bg: '#d9770618' },
  parcial:   { label: 'Parcial',   color: '#2563eb', bg: '#2563eb18' },
  pagado:    { label: 'Pagado',    color: '#059669', bg: '#05966918' },
}

interface Gasto {
  id: number
  fecha: string
  tipo: string
  descripcion: string
  monto: number
  monto_pagado: number
  estado: string
  fecha_creacion: string
}

interface Pago {
  id: number
  gasto_id: number
  fecha: string
  tipo: string
  comprobante: string | null
  monto: number
}

const formVacio = {
  fecha: new Date().toISOString().split('T')[0],
  tipo: 'otros',
  descripcion: '',
  monto: '',
}

const pagoVacio = {
  fecha: new Date().toISOString().split('T')[0],
  tipo: 'transferencia',
  comprobante: '',
  monto: '',
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

export default function GastosMensuales() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Modal gasto
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Gasto | null>(null)
  const [form, setForm] = useState(formVacio)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  // Modal pagos
  const [gastoSeleccionado, setGastoSeleccionado] = useState<Gasto | null>(null)
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loadingPagos, setLoadingPagos] = useState(false)
  const [formPago, setFormPago] = useState(pagoVacio)
  const [savingPago, setSavingPago] = useState(false)
  const [errorPago, setErrorPago] = useState('')
  const [confirmDeletePago, setConfirmDeletePago] = useState<number | null>(null)

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

  // ── Gasto CRUD ──────────────────────────────────────────────────────────────

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
    if (!form.fecha || !form.descripcion || !form.monto) { setError('Completa todos los campos'); return }
    if (isNaN(Number(form.monto)) || Number(form.monto) <= 0) { setError('El monto debe ser un número válido mayor a 0'); return }
    setSaving(true); setError('')
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

  // ── Pagos ────────────────────────────────────────────────────────────────────

  const abrirPagos = async (g: Gasto) => {
    setGastoSeleccionado(g)
    setFormPago({ ...pagoVacio, monto: String(Math.max(0, g.monto - g.monto_pagado)) })
    setErrorPago('')
    setLoadingPagos(true)
    try {
      const res = await api.get(`/gastos/${g.id}/pagos`)
      setPagos(res.data.pagos ?? [])
    } catch {
      setPagos([])
    } finally {
      setLoadingPagos(false)
    }
  }

  const guardarPago = async () => {
    if (!formPago.fecha || !formPago.monto) { setErrorPago('Completa fecha y monto'); return }
    if (isNaN(Number(formPago.monto)) || Number(formPago.monto) <= 0) { setErrorPago('Monto inválido'); return }
    setSavingPago(true); setErrorPago('')
    try {
      await api.post(`/gastos/${gastoSeleccionado!.id}/pagos`, {
        fecha: formPago.fecha,
        tipo: formPago.tipo,
        comprobante: formPago.comprobante || null,
        monto: Number(formPago.monto),
      })
      setFormPago(pagoVacio)
      // Recargar pagos y gastos
      const res = await api.get(`/gastos/${gastoSeleccionado!.id}/pagos`)
      setPagos(res.data.pagos ?? [])
      cargar()
      // Actualizar gasto seleccionado con nuevos datos
      const resG = await api.get(`/gastos?mes=${mes}&anio=${anio}`)
      const actualizado = (resG.data.gastos ?? []).find((g: Gasto) => g.id === gastoSeleccionado!.id)
      if (actualizado) setGastoSeleccionado(actualizado)
    } catch (e: any) {
      setErrorPago(e.response?.data?.detail || 'Error al registrar pago')
    } finally {
      setSavingPago(false)
    }
  }

  const eliminarPago = async (pagoId: number) => {
    try {
      await api.delete(`/gastos/${gastoSeleccionado!.id}/pagos/${pagoId}`)
      setConfirmDeletePago(null)
      const res = await api.get(`/gastos/${gastoSeleccionado!.id}/pagos`)
      setPagos(res.data.pagos ?? [])
      cargar()
      const resG = await api.get(`/gastos?mes=${mes}&anio=${anio}`)
      const actualizado = (resG.data.gastos ?? []).find((g: Gasto) => g.id === gastoSeleccionado!.id)
      if (actualizado) setGastoSeleccionado(actualizado)
    } catch {}
  }

  // ── Filtros y resumen ────────────────────────────────────────────────────────

  const gastosFiltrados = gastos
    .filter(g => filtroTipo ? g.tipo === filtroTipo : true)
    .filter(g => filtroEstado ? g.estado === filtroEstado : true)

  const montoTotal = gastosFiltrados.reduce((s, g) => s + g.monto, 0)
  const montoPagado = gastosFiltrados.reduce((s, g) => s + (g.monto_pagado ?? 0), 0)
  const montoPendiente = montoTotal - montoPagado

  const porTipo = TIPOS.map(t => ({
    ...t,
    monto: gastos.filter(g => g.tipo === t.value).reduce((s, g) => s + g.monto, 0),
  })).filter(t => t.monto > 0).sort((a, b) => b.monto - a.monto)

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>Gastos Mensuales</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Registro y control de pagos</div>
        </div>
        <button onClick={abrirNuevo} style={{
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          borderRadius: '8px', padding: '9px 18px', fontSize: '13px',
          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Nuevo Gasto
        </button>
      </div>

      {/* Filtro período */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
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
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Gastos', valor: montoTotal, color: 'var(--text-1)', bg: 'var(--bg-3)' },
          { label: 'Total Pagado', valor: montoPagado, color: '#059669', bg: '#05966918' },
          { label: 'Por Pagar', valor: montoPendiente, color: montoPendiente > 0 ? '#dc2626' : '#059669', bg: montoPendiente > 0 ? '#dc262618' : '#05966918' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{c.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: c.color }}>${c.valor.toLocaleString('es-CL')}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '20px', alignItems: 'start' }}>

        {/* Tabla */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>

          {/* Filtros */}
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['', 'pendiente', 'parcial', 'pagado'].map(e => (
                <button key={e} onClick={() => setFiltroEstado(e)} style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                  border: '0.5px solid var(--border)', cursor: 'pointer',
                  background: filtroEstado === e ? 'var(--accent)' : 'var(--bg)',
                  color: filtroEstado === e ? 'var(--accent-fg)' : 'var(--text-3)',
                }}>{e === '' ? 'Todos' : ESTADO_CONFIG[e]?.label}</button>
              ))}
            </div>
            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button onClick={() => setFiltroTipo('')} style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                border: '0.5px solid var(--border)', cursor: 'pointer',
                background: filtroTipo === '' ? 'var(--bg-3)' : 'var(--bg)',
                color: 'var(--text-3)',
              }}>Todos los tipos</button>
              {porTipo.map(t => (
                <button key={t.value} onClick={() => setFiltroTipo(filtroTipo === t.value ? '' : t.value)} style={{
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
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>No hay gastos para este período</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  {['Fecha', 'Tipo', 'Descripción', 'Monto', 'Pagado', 'Estado', ''].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: '11px',
                      fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase',
                      letterSpacing: '0.05em', background: 'var(--bg-3)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gastosFiltrados.map((g, i) => {
                  const est = ESTADO_CONFIG[g.estado] ?? ESTADO_CONFIG.pendiente
                  return (
                    <tr key={g.id}
                      style={{ borderBottom: i < gastosFiltrados.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 14px', fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                        {new Date(g.fecha + 'T00:00:00').toLocaleDateString('es-CL')}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{
                          padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                          background: TIPO_COLORS[g.tipo] + '18', color: TIPO_COLORS[g.tipo],
                        }}>{TIPOS.find(t => t.value === g.tipo)?.label ?? g.tipo}</span>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: '13px', color: 'var(--text-1)', maxWidth: '220px' }}>
                        {g.descripcion}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
                        ${g.monto.toLocaleString('es-CL')}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                        ${g.monto_pagado.toLocaleString('es-CL')}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{
                          padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                          background: est.bg, color: est.color,
                        }}>{est.label}</span>
                      </td>
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => abrirPagos(g)} style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                            border: '0.5px solid #2563eb44', background: '#2563eb11',
                            color: '#2563eb', cursor: 'pointer', fontWeight: 500,
                          }}>Pagos</button>
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
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                  <td colSpan={3} style={{ padding: '11px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
                    Total ({gastosFiltrados.length} gastos)
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
                    ${montoTotal.toLocaleString('es-CL')}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                    ${montoPagado.toLocaleString('es-CL')}
                  </td>
                  <td colSpan={2} />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {porTipo.map(t => {
                const totalMes = gastos.reduce((s, g) => s + g.monto, 0)
                const pct = totalMes > 0 ? (t.monto / totalMes) * 100 : 0
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

      {/* ── Modal Pagos ─────────────────────────────────────────────────────── */}
      {gastoSeleccionado && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={e => { if (e.target === e.currentTarget) setGastoSeleccionado(null) }}>
          <div style={{
            background: 'var(--bg-2)', borderRadius: '14px', padding: '28px',
            width: '540px', maxHeight: '90vh', overflowY: 'auto',
            border: '0.5px solid var(--border)',
          }}>
            {/* Header modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>Pagos del Gasto</div>
                <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>{gastoSeleccionado.descripcion}</div>
              </div>
              <button onClick={() => setGastoSeleccionado(null)} style={{
                background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
                width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '14px',
              }}>✕</button>
            </div>

            {/* Resumen del gasto */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px',
              marginBottom: '20px',
            }}>
              {[
                { label: 'Total', valor: gastoSeleccionado.monto, color: 'var(--text-1)' },
                { label: 'Pagado', valor: gastoSeleccionado.monto_pagado ?? 0, color: '#059669' },
                { label: 'Saldo', valor: gastoSeleccionado.monto - (gastoSeleccionado.monto_pagado ?? 0), color: gastoSeleccionado.monto - gastoSeleccionado.monto_pagado > 0 ? '#dc2626' : '#059669' },
              ].map(c => (
                <div key={c.label} style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>{c.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: c.color }}>${c.valor.toLocaleString('es-CL')}</div>
                </div>
              ))}
            </div>

            {/* Historial de pagos */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Historial de pagos
              </div>
              {loadingPagos ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Cargando...</div>
              ) : pagos.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px', background: 'var(--bg)', borderRadius: '8px', border: '0.5px solid var(--border)' }}>
                  Sin pagos registrados
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pagos.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--bg)', border: '0.5px solid var(--border)',
                      borderRadius: '8px', padding: '10px 14px',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                            ${p.monto.toLocaleString('es-CL')}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 500,
                            background: 'var(--bg-3)', color: 'var(--text-3)',
                          }}>{TIPOS_PAGO.find(t => t.value === p.tipo)?.label ?? p.tipo}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                          {new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-CL')}
                          {p.comprobante && <span> · Comprobante: <strong>{p.comprobante}</strong></span>}
                        </div>
                      </div>
                      <button onClick={() => setConfirmDeletePago(p.id)} style={{
                        padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
                        border: '0.5px solid var(--danger-bg)', background: 'var(--danger-bg)',
                        color: 'var(--danger)', cursor: 'pointer',
                      }}>Eliminar</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario nuevo pago — solo si no está pagado completo */}
            {gastoSeleccionado.estado !== 'pagado' && (
              <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
                  Registrar pago / abono
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    {label('Fecha')}
                    <input type="date" value={formPago.fecha} onChange={e => setFormPago(f => ({ ...f, fecha: e.target.value }))} style={IS} />
                  </div>
                  <div>
                    {label('Tipo de pago')}
                    <select value={formPago.tipo} onChange={e => setFormPago(f => ({ ...f, tipo: e.target.value }))} style={IS}>
                      {TIPOS_PAGO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    {label('Monto ($)')}
                    <input type="number" value={formPago.monto} onChange={e => setFormPago(f => ({ ...f, monto: e.target.value }))} placeholder="0" style={IS} />
                  </div>
                  <div>
                    {label('Comprobante (opcional)')}
                    <input value={formPago.comprobante} onChange={e => setFormPago(f => ({ ...f, comprobante: e.target.value }))} placeholder="N° transferencia, cheque..." style={IS} />
                  </div>
                </div>

                {errorPago && (
                  <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: '7px', color: 'var(--danger)', fontSize: '12px' }}>
                    {errorPago}
                  </div>
                )}

                <button onClick={guardarPago} disabled={savingPago} style={{
                  width: '100%', padding: '9px', borderRadius: '8px', border: 'none',
                  background: 'var(--accent)', color: 'var(--accent-fg)',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: savingPago ? 0.6 : 1,
                }}>{savingPago ? 'Registrando...' : 'Registrar Pago'}</button>
              </div>
            )}

            {gastoSeleccionado.estado === 'pagado' && (
              <div style={{ textAlign: 'center', padding: '16px', background: '#05966918', borderRadius: '10px', border: '0.5px solid #05966944' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>✓ Gasto pagado completamente</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Gasto nuevo/editar ─────────────────────────────────────────── */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '460px', border: '0.5px solid var(--border)' }}>
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
                <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Arriendo bodega marzo" style={IS} />
              </div>
              <div>
                {label('Monto ($)')}
                <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0" style={IS} />
              </div>
            </div>
            {error && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--danger-bg)', borderRadius: '7px', color: 'var(--danger)', fontSize: '13px' }}>{error}</div>
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

      {/* ── Confirm delete gasto ─────────────────────────────────────────────── */}
      {confirmDelete !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '360px', border: '0.5px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Eliminar gasto?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>Se eliminarán también todos sus pagos. Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '9px 16px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminar(confirmDelete)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--danger)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete pago ──────────────────────────────────────────────── */}
      {confirmDeletePago !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '360px', border: '0.5px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>¿Eliminar pago?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>El estado del gasto se recalculará automáticamente.</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmDeletePago(null)} style={{ padding: '9px 16px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminarPago(confirmDeletePago)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--danger)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
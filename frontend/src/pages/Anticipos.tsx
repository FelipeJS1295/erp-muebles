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

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: '#d97706', bg: '#d9770618' },
  pagado:    { label: 'Pagado',    color: '#059669', bg: '#05966918' },
  rechazado: { label: 'Rechazado', color: '#dc2626', bg: '#dc262618' },
}

const TIPO_PAGO_CONFIG: Record<string, { label: string }> = {
  efectivo:      { label: 'Efectivo' },
  cheque:        { label: 'Cheque' },
  transferencia: { label: 'Transferencia' },
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
  estado: string
  tipo_pago: string | null
  fecha_pago: string | null
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
  const [filtroEstado, setFiltroEstado] = useState('')

  // Selección múltiple
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())

  // Modal nuevo
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

  // Modal bulk estado
  const [modalBulk, setModalBulk] = useState(false)
  const [bulkEstado, setBulkEstado] = useState('pagado')
  const [bulkTipoPago, setBulkTipoPago] = useState('efectivo')
  const [bulkFechaPago, setBulkFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [savingBulk, setSavingBulk] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ mes: String(mes), anio: String(anio) })
      if (filtroEstado) params.append('estado', filtroEstado)
      const res = await api.get(`/anticipos?${params}`)
      setAnticipos(res.data.anticipos ?? [])
      setSeleccionados(new Set())
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

  useEffect(() => { cargar() }, [mes, anio, filtroEstado])

  const toggleSeleccion = (id: number) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    if (seleccionados.size === filtrados.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(filtrados.map(a => a.id)))
    }
  }

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

  const guardarBulk = async () => {
    setSavingBulk(true)
    try {
      await api.put('/anticipos/bulk-estado', {
        ids: Array.from(seleccionados),
        estado: bulkEstado,
        tipo_pago: bulkEstado === 'pagado' ? bulkTipoPago : null,
        fecha_pago: bulkEstado === 'pagado' ? bulkFechaPago : null,
      })
      setModalBulk(false)
      setSeleccionados(new Set())
      cargar()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error al actualizar')
    } finally {
      setSavingBulk(false)
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

  const totalMes       = filtrados.reduce((s, a) => s + a.monto, 0)
  const totalPagado    = filtrados.filter(a => a.estado === 'pagado').reduce((s, a) => s + a.monto, 0)
  const totalPendiente = filtrados.filter(a => a.estado === 'pendiente').reduce((s, a) => s + a.monto, 0)

  const todosSel   = filtrados.length > 0 && seleccionados.size === filtrados.length
  const algunosSel = seleccionados.size > 0 && !todosSel

  const imprimir = () => {
  const aImprimir = seleccionados.size > 0
    ? filtrados.filter(a => seleccionados.has(a.id))
    : filtrados

  const ventana = window.open('', '_blank')
  if (!ventana) return

  const totalImprimir = aImprimir.reduce((s, a) => s + a.monto, 0)

  ventana.document.write(`
    <html><head>
      <title>Anticipos ${MESES[mes-1]} ${anio}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:Arial,sans-serif; }
        body { padding:32px; color:#1a1a1a; font-size:12px; }
        h1 { font-size:20px; margin-bottom:4px; }
        .sub { color:#666; margin-bottom:24px; font-size:12px; }
        table { width:100%; border-collapse:collapse; }
        th { background:#1a1a1a; color:#fff; padding:8px 10px; text-align:left; font-size:10px; text-transform:uppercase; }
        td { padding:8px 10px; border-bottom:1px solid #eee; font-size:11px; }
        tr:nth-child(even) td { background:#f9f9f9; }
        .badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:9px; font-weight:600; }
        .pendiente { background:#fff7ed; color:#d97706; }
        .pagado    { background:#f0fdf4; color:#059669; }
        .rechazado { background:#fef2f2; color:#dc2626; }
        .total-row td { font-weight:700; background:#f0f0f0 !important; font-size:12px; }
        .neg { color:#dc2626; font-weight:700; }
        .footer { margin-top:32px; border-top:1px solid #ddd; padding-top:12px; font-size:10px; color:#888; text-align:center; }
        @media print { body { padding:16px; } }
      </style>
    </head><body>
      <h1>Anticipos de Sueldo</h1>
      <div class="sub">
        ${MESES[mes-1]} ${anio}
        ${seleccionados.size > 0 ? ` · ${aImprimir.length} seleccionados` : ` · ${aImprimir.length} registros`}
        · Total: $${Math.round(totalImprimir).toLocaleString('es-CL')}
      </div>
      <table>
        <thead>
          <tr>
            <th>Trabajador</th>
            <th>RUT</th>
            <th>Cargo</th>
            <th>Fecha</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>Tipo Pago</th>
            <th>Fecha Pago</th>
            <th>Observación</th>
          </tr>
        </thead>
        <tbody>
          ${aImprimir.map(a => `
            <tr>
              <td><strong>${a.trabajador_nombre}</strong></td>
              <td style="font-family:monospace">${a.trabajador_rut}</td>
              <td>${a.trabajador_cargo || '—'}</td>
              <td>${new Date(a.fecha + 'T00:00:00').toLocaleDateString('es-CL')}</td>
              <td class="neg">-$${Math.round(a.monto).toLocaleString('es-CL')}</td>
              <td><span class="badge ${a.estado}">${a.estado.charAt(0).toUpperCase() + a.estado.slice(1)}</span></td>
              <td>${a.tipo_pago ? TIPO_PAGO_CONFIG[a.tipo_pago]?.label : '—'}</td>
              <td>${a.fecha_pago ? new Date(a.fecha_pago + 'T00:00:00').toLocaleDateString('es-CL') : '—'}</td>
              <td>${a.observacion || '—'}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4">TOTAL (${aImprimir.length} anticipos)</td>
            <td class="neg">-$${Math.round(totalImprimir).toLocaleString('es-CL')}</td>
            <td colspan="4"></td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        Generado el ${new Date().toLocaleDateString('es-CL', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
      </div>
    </body></html>
  `)
  ventana.document.close()
  ventana.print()
}

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
        <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={imprimir} style={{
          background: 'var(--bg-2)', color: 'var(--text-1)', border: '0.5px solid var(--border)',
          borderRadius: '8px', padding: '9px 16px', fontSize: '13px',
          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          🖨️ {seleccionados.size > 0 ? `Imprimir ${seleccionados.size} seleccionados` : 'Imprimir todo'}
        </button>
        <button onClick={abrirNuevo} style={{
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          borderRadius: '8px', padding: '9px 18px', fontSize: '13px',
          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Nuevo Anticipo
        </button>
        </div>
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total anticipos', valor: `-$${Math.round(totalMes).toLocaleString('es-CL')}`,       color: '#dc2626' },
          { label: 'Pagado',          valor: `-$${Math.round(totalPagado).toLocaleString('es-CL')}`,    color: '#059669' },
          { label: 'Pendiente',       valor: `-$${Math.round(totalPendiente).toLocaleString('es-CL')}`, color: '#d97706' },
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
        <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>Período:</div>
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          style={{ padding: '6px 10px', borderRadius: '7px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', fontSize: '12px', outline: 'none' }}>
          {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={anio} onChange={e => setAnio(Number(e.target.value))}
          style={{ padding: '6px 10px', borderRadius: '7px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', fontSize: '12px', outline: 'none' }}>
          {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {['', 'pendiente', 'pagado', 'rechazado'].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)} style={{
            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
            border: '0.5px solid var(--border)', cursor: 'pointer',
            background: filtroEstado === e ? 'var(--accent)' : 'var(--bg)',
            color: filtroEstado === e ? 'var(--accent-fg)' : (ESTADO_CONFIG[e]?.color || 'var(--text-3)'),
          }}>{e === '' ? 'Todos' : ESTADO_CONFIG[e]?.label}</button>
        ))}

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        <div style={{ position: 'relative' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
            style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
          </svg>
          <input placeholder="Buscar trabajador..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ padding: '6px 10px 6px 26px', borderRadius: '7px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', fontSize: '12px', outline: 'none', width: '200px' }} />
        </div>

        {seleccionados.size > 0 && (
          <>
            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
            <button onClick={() => setModalBulk(true)} style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
              border: '0.5px solid #2563eb44', background: '#2563eb11',
              color: '#2563eb', cursor: 'pointer',
            }}>
              Actualizar {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
            </button>
          </>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-3)' }}>
          {filtrados.length} registros
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            No hay anticipos para este período
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                <th style={{ padding: '10px 14px', background: 'var(--bg-3)', width: '40px' }}>
                  <input type="checkbox"
                    checked={todosSel}
                    ref={el => { if (el) el.indeterminate = algunosSel }}
                    onChange={toggleTodos}
                    style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                  />
                </th>
                {['Trabajador', 'Cargo', 'Fecha', 'Monto', 'Estado', 'Tipo Pago', 'Fecha Pago', 'Observación', ''].map(h => (
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
                const estCfg   = ESTADO_CONFIG[a.estado] ?? ESTADO_CONFIG.pendiente
                const isSel    = seleccionados.has(a.id)
                return (
                  <tr key={a.id}
                    style={{ borderBottom: i < filtrados.length - 1 ? '0.5px solid var(--border)' : 'none', background: isSel ? '#2563eb08' : 'transparent' }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isSel ? '#2563eb08' : 'transparent' }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleSeleccion(a.id)}
                        style={{ cursor: 'pointer', width: '14px', height: '14px' }} />
                    </td>
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
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', background: '#dc262618', padding: '3px 10px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                        -${Math.round(a.monto).toLocaleString('es-CL')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: estCfg.bg, color: estCfg.color }}>
                        {estCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-2)' }}>
                      {a.tipo_pago ? TIPO_PAGO_CONFIG[a.tipo_pago]?.label : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {a.fecha_pago ? new Date(a.fecha_pago + 'T00:00:00').toLocaleDateString('es-CL') : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-2)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                <td colSpan={4} style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
                  Total ({filtrados.length})
                  {seleccionados.size > 0 && (
                    <span style={{ color: '#2563eb', marginLeft: '8px' }}>
                      · {seleccionados.size} seleccionados — 
                      <strong> -${Math.round(filtrados.filter(a => seleccionados.has(a.id)).reduce((s, a) => s + a.monto, 0)).toLocaleString('es-CL')}</strong>
                    </span>
                  )}
                </td>
                <td colSpan={6} style={{ padding: '12px 14px', fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>
                  -${Math.round(totalMes).toLocaleString('es-CL')}
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
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '20px' }}>Nuevo Anticipo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                {lbl('Trabajador')}
                <select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))} style={IS}>
                  <option value="">Seleccionar trabajador...</option>
                  {trabajadores.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre_completo} · {t.rut} {t.cargo ? `· ${t.cargo}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                {lbl('Fecha')}
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={IS} />
              </div>
              <div>
                {lbl('Monto ($)')}
                <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0" style={IS} />
                {form.monto && !isNaN(Number(form.monto)) && Number(form.monto) > 0 && (
                  <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>
                    -${Number(form.monto).toLocaleString('es-CL')}
                  </div>
                )}
              </div>
              <div>
                {lbl('Observación (opcional)')}
                <input value={form.observacion} onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))} placeholder="Motivo del anticipo..." style={IS} />
              </div>
            </div>
            {error && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--danger-bg)', borderRadius: '7px', color: 'var(--danger)', fontSize: '13px' }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 16px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal bulk estado ────────────────────────────────────────────────── */}
      {modalBulk && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setModalBulk(false) }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '14px', padding: '28px', width: '440px', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>
              Actualizar {seleccionados.size} anticipo{seleccionados.size !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>
              Cambia el estado y forma de pago de los anticipos seleccionados
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                {lbl('Nuevo estado')}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['pendiente', 'pagado', 'rechazado'].map(e => {
                    const cfg = ESTADO_CONFIG[e]
                    return (
                      <button key={e} onClick={() => setBulkEstado(e)} style={{
                        flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                        border: `0.5px solid ${bulkEstado === e ? cfg.color : 'var(--border)'}`,
                        background: bulkEstado === e ? cfg.bg : 'var(--bg)',
                        color: bulkEstado === e ? cfg.color : 'var(--text-3)',
                        cursor: 'pointer',
                      }}>{cfg.label}</button>
                    )
                  })}
                </div>
              </div>
              {bulkEstado === 'pagado' && <>
                <div>
                  {lbl('Tipo de pago')}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['efectivo', 'cheque', 'transferencia'].map(t => (
                      <button key={t} onClick={() => setBulkTipoPago(t)} style={{
                        flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                        border: `0.5px solid ${bulkTipoPago === t ? '#2563eb' : 'var(--border)'}`,
                        background: bulkTipoPago === t ? '#2563eb18' : 'var(--bg)',
                        color: bulkTipoPago === t ? '#2563eb' : 'var(--text-3)',
                        cursor: 'pointer',
                      }}>{TIPO_PAGO_CONFIG[t].label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  {lbl('Fecha de pago')}
                  <input type="date" value={bulkFechaPago} onChange={e => setBulkFechaPago(e.target.value)} style={IS} />
                </div>
              </>}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setModalBulk(false)} style={{ padding: '9px 16px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarBulk} disabled={savingBulk} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: savingBulk ? 0.6 : 1 }}>
                {savingBulk ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm eliminar ─────────────────────────────────────────────────── */}
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
import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import * as XLSX from 'xlsx-js-style'

interface Props {
  mes: number
  anio: number
}

interface Trabajador {
  trabajador_id: number
  trabajador_nombre: string
  trabajador_rut: string
  trabajador_cargo: string
  es_produccion: boolean
  sueldo_base: number
  sueldo_base_registrado: number
  horas_extras_qty: number
  total_horas_extras: number
  dias_extras_qty: number
  total_dias_extras: number
  bonos_qty: number
  total_bonos: number
  dias_faltantes_qty: number
  total_descuentos: number
  otros_desc_qty: number
  total_otros_descuentos: number
  otros_desc_detalle: any[]
  anticipos_qty: number
  total_anticipos: number
  total: number
  // calculados
  sueldo_base_contabilidad: number
  bono_produccion: number
  total_liquido: number
  licencia?: boolean
}

interface Resumen {
  contrato: Trabajador[]
  boleta: Trabajador[]
  total_contrato: number
  total_boleta: number
  gran_total: number
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

const BASE_TOPE = 539000
const TOPE = 600000
const TOPE_PRODUCCION = 636000
const DESCUENTO_BOLETA = 0.1525

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function ContadorResumen({ mes, anio }: Props) {
  const [data, setData] = useState<Resumen | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'contrato' | 'boleta'>('contrato')

  const cargar = async () => {
    setLoading(true)
    setError('')
    try {
      const [resumenRes, tiposRes] = await Promise.all([
        api.get('/resumen-mensual', { params: { mes, anio } }),
        api.get('/contadores/tipos-contrato'),
      ])

      const todosLosT: Trabajador[] = resumenRes.data.resumen || []
      const tiposMap: Record<string, string> = tiposRes.data.tipos || {}

      // CONTRATOS
      const contrato = todosLosT
        .filter(t => tiposMap[String(t.trabajador_id)] === 'contrato')
        .map(t => {
          let sueldo_base_contabilidad: number
          let bono_produccion: number

            if (t.es_produccion) {
            sueldo_base_contabilidad = t.sueldo_base_registrado > TOPE_PRODUCCION ? BASE_TOPE : t.sueldo_base_registrado
            bono_produccion = t.sueldo_base
            }else {
            // No producción: sueldo base tope 539.000 si supera 600.000
            sueldo_base_contabilidad = t.sueldo_base_registrado > TOPE ? BASE_TOPE : t.sueldo_base_registrado
            // bono = horas extras + días extras + bonos
            bono_produccion = t.total_horas_extras + t.total_dias_extras + t.total_bonos
          }

            const total_liquido = Math.round(
            (t.es_produccion ? bono_produccion : sueldo_base_contabilidad + bono_produccion)
            - t.total_descuentos
            - t.total_otros_descuentos
            - t.total_anticipos
            )

            return {
            ...t,
            sueldo_base_contabilidad,
            bono_produccion,
            total_liquido,
            licencia: t.es_produccion && t.sueldo_base === 0,
            }
        })

      // BOLETAS
      const boleta = todosLosT
        .filter(t => tiposMap[String(t.trabajador_id)] === 'boleta')
        .map(t => {
        const bruto = t.sueldo_base_registrado > 0 ? t.sueldo_base_registrado : t.sueldo_base
          const descuento = Math.round(bruto * DESCUENTO_BOLETA)
          return {
            ...t,
            sueldo_base_contabilidad: bruto,
            bono_produccion: 0,
            total_liquido: bruto - descuento,
            descuento_boleta: descuento,
          }
        })

      setData({
        contrato,
        boleta,
        total_contrato: contrato.reduce((a, t) => a + t.total_liquido, 0),
        total_boleta: boleta.reduce((a, t) => a + t.total_liquido, 0),
        gran_total: contrato.reduce((a, t) => a + t.total_liquido, 0) + boleta.reduce((a, t) => a + t.total_liquido, 0),
      })
    } catch {
      setError('No se pudo cargar el resumen')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [mes, anio])

const descargarExcel = () => {
  if (!data) return
  const nombreMes = MESES[mes - 1]
  const fechaHoy = new Date().toLocaleDateString('es-CL')
  const wb = XLSX.utils.book_new()

  // ─── ESTILOS ───────────────────────────────────────────────
  const sEmpresa = { font: { bold: true, sz: 13, color: { rgb: '1e3a5f' } } }
  const sRut     = { font: { sz: 11, color: { rgb: '444444' } } }
  const sFecha   = { font: { italic: true, sz: 10, color: { rgb: '888888' } } }
  const sTitulo  = (rgb: string) => ({
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb } },
    alignment: { horizontal: 'center' },
    border: {
      top:    { style: 'thin', color: { rgb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
      left:   { style: 'thin', color: { rgb: 'CCCCCC' } },
      right:  { style: 'thin', color: { rgb: 'CCCCCC' } },
    }
  })
  const sCargo = (rgb: string) => ({
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb } },
    alignment: { horizontal: 'left' },
  })
  const sDato = {
    font: { sz: 10 },
    border: {
      top:    { style: 'thin', color: { rgb: 'EEEEEE' } },
      bottom: { style: 'thin', color: { rgb: 'EEEEEE' } },
      left:   { style: 'thin', color: { rgb: 'EEEEEE' } },
      right:  { style: 'thin', color: { rgb: 'EEEEEE' } },
    }
  }
  const sMonto = {
    ...sDato,
    font: { sz: 10 },
    numFmt: '"$"#,##0',
    alignment: { horizontal: 'right' },
  }
  const sMontoRojo = { ...sMonto, font: { sz: 10, color: { rgb: 'dc2626' } } }
  const sMontoVerde = { ...sMonto, font: { sz: 10, bold: true, color: { rgb: '059669' } } }
  const sSubtotal = (rgb: string) => ({
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb } },
    numFmt: '"$"#,##0',
    alignment: { horizontal: 'right' },
  })
  const sTotal = (rgb: string) => ({
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb } },
    numFmt: '"$"#,##0',
    alignment: { horizontal: 'right' },
  })
  const sLicencia = {
    font: { bold: true, sz: 10, color: { rgb: 'c2410c' } },
    fill: { fgColor: { rgb: 'fff7ed' } },
    alignment: { horizontal: 'center' },
  }

  // ─── HELPER: celda ────────────────────────────────────────
  const c = (v: any, s: any = {}) => ({ v, s })
  const empty = () => c('', {})

  // ─── HOJA CONTRATOS ───────────────────────────────────────
  const COLOR_CONTRATO = '1e3a5f'
  const COLOR_CONTRATO_LIGHT = '2563eb'
  const COLS_C = ['Nombre', 'RUT', 'Cargo', 'Sueldo Base', 'Bono Producción', 'Anticipos', 'Total Líquido']

  const rowsC: any[][] = []

  // Cabecera empresa
  rowsC.push([c('Muebles Jerk SPA', sEmpresa), ...Array(6).fill(empty())])
  rowsC.push([c('76.990.942-7', sRut), ...Array(6).fill(empty())])
  rowsC.push([c(`Remuneraciones ${nombreMes} ${anio} — Contratos`, sEmpresa), ...Array(6).fill(empty())])
  rowsC.push([c(`Generado: ${fechaHoy}`, sFecha), ...Array(6).fill(empty())])
  rowsC.push(Array(7).fill(empty()))

  // Títulos columnas
  rowsC.push(COLS_C.map(h => c(h, sTitulo(COLOR_CONTRATO))))

  // Agrupar por cargo
  const cargoColores: Record<string, string> = {
    costura:      '7c3aed',
    tapiceria:    'b45309',
    esqueleteria: '0e7490',
    bodega:       '374151',
    cojineria:    'be185d',
    embalaje:     '166534',
    oficina:      '1e40af',
    corte:        '9a3412',
  }

  const cargoGroups: Record<string, typeof data.contrato> = {}
  data.contrato.forEach(t => {
    const cargo = t.trabajador_cargo || 'otro'
    if (!cargoGroups[cargo]) cargoGroups[cargo] = []
    cargoGroups[cargo].push(t)
  })

  let totalGeneral = 0
  let totalBaseGeneral = 0
  let totalBonoGeneral = 0
  let totalAnticiposGeneral = 0

  Object.entries(cargoGroups).forEach(([cargo, trabajadores]) => {
    const colorCargo = cargoColores[cargo] || '374151'

    // Fila cargo
    rowsC.push([
      c(cargo.toUpperCase(), sCargo(colorCargo)),
      ...Array(6).fill(c('', { fill: { fgColor: { rgb: colorCargo } } }))
    ])

    let subBase = 0, subBono = 0, subAnt = 0, subTotal = 0

    trabajadores.forEach(t => {
      subBase += t.sueldo_base_contabilidad
      subBono += t.bono_produccion
      subAnt  += t.total_anticipos
      subTotal += t.total_liquido

      rowsC.push([
        c(t.trabajador_nombre, sDato),
        c(t.trabajador_rut, sDato),
        c(t.trabajador_cargo, sDato),
        c(t.sueldo_base_contabilidad, sMonto),
        t.licencia ? c('LICENCIA', sLicencia) : c(t.bono_produccion > 0 ? t.bono_produccion : 0, sMonto),
        c(t.total_anticipos > 0 ? t.total_anticipos : 0, t.total_anticipos > 0 ? sMontoRojo : sDato),
        c(t.total_liquido, sMontoVerde),
      ])
    })

    // Subtotal cargo
    rowsC.push([
      c(`Subtotal ${cargo}`, { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: colorCargo } } }),
      empty(), empty(),
      c(subBase, sSubtotal(colorCargo)),
      c(subBono, sSubtotal(colorCargo)),
      c(subAnt, sSubtotal(colorCargo)),
      c(subTotal, sSubtotal(colorCargo)),
    ])
    rowsC.push(Array(7).fill(empty()))

    totalBaseGeneral += subBase
    totalBonoGeneral += subBono
    totalAnticiposGeneral += subAnt
    totalGeneral += subTotal
  })

  // Total general
  rowsC.push([
    c('TOTAL CONTRATOS', { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: COLOR_CONTRATO } } }),
    empty(), empty(),
    c(totalBaseGeneral, sTotal(COLOR_CONTRATO)),
    c(totalBonoGeneral, sTotal(COLOR_CONTRATO)),
    c(totalAnticiposGeneral, sTotal(COLOR_CONTRATO)),
    c(totalGeneral, sTotal(COLOR_CONTRATO)),
  ])

  const wsC = XLSX.utils.aoa_to_sheet(rowsC)
  wsC['!cols'] = [{ wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }]
  wsC['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
  ]
  XLSX.utils.book_append_sheet(wb, wsC, `Contratos ${nombreMes}`)

  // ─── HOJA BOLETAS ─────────────────────────────────────────
  const COLOR_BOLETA = '4c1d95'
  const COLS_B = ['Nombre', 'RUT', 'Cargo', 'Monto Bruto', 'Desc. Boleta (15.25%)', 'Total Líquido']

  const rowsB: any[][] = []
  rowsB.push([c('Muebles Jerk SPA', sEmpresa), ...Array(5).fill(empty())])
  rowsB.push([c('76.990.942-7', sRut), ...Array(5).fill(empty())])
  rowsB.push([c(`Remuneraciones ${nombreMes} ${anio} — Boletas`, sEmpresa), ...Array(5).fill(empty())])
  rowsB.push([c(`Generado: ${fechaHoy}`, sFecha), ...Array(5).fill(empty())])
  rowsB.push(Array(6).fill(empty()))
  rowsB.push(COLS_B.map(h => c(h, sTitulo(COLOR_BOLETA))))

  let totalBruto = 0, totalDesc = 0, totalLiqBoleta = 0

  ;(data.boleta as any[]).forEach(t => {
    totalBruto   += t.sueldo_base_contabilidad
    totalDesc    += t.descuento_boleta
    totalLiqBoleta += t.total_liquido

    rowsB.push([
      c(t.trabajador_nombre, sDato),
      c(t.trabajador_rut, sDato),
      c(t.trabajador_cargo, sDato),
      c(t.sueldo_base_contabilidad, sMonto),
      c(t.descuento_boleta, sMontoRojo),
      c(t.total_liquido, sMontoVerde),
    ])
  })

  rowsB.push(Array(6).fill(empty()))
  rowsB.push([
    c('TOTAL BOLETAS', { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: COLOR_BOLETA } } }),
    empty(), empty(),
    c(totalBruto, sTotal(COLOR_BOLETA)),
    c(totalDesc, sTotal(COLOR_BOLETA)),
    c(totalLiqBoleta, sTotal(COLOR_BOLETA)),
  ])

  const wsB = XLSX.utils.aoa_to_sheet(rowsB)
  wsB['!cols'] = [{ wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 14 }]
  wsB['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
  ]
  XLSX.utils.book_append_sheet(wb, wsB, `Boletas ${nombreMes}`)

  XLSX.writeFile(wb, `Remuneraciones_${nombreMes}_${anio}.xlsx`)
}

  const TH: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: '11px',
    fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb',
    textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    background: '#f9fafb',
  }
  const TD: React.CSSProperties = {
    padding: '11px 14px', fontSize: '13px', color: '#374151',
    borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap',
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af' }}>
      <div style={{
        width: '32px', height: '32px', border: '3px solid #e5e7eb',
        borderTopColor: '#059669', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
      }} />
      Cargando resumen de {MESES[mes - 1]} {anio}...
    </div>
  )

  if (error) return (
    <div style={{
      textAlign: 'center', padding: '60px', color: '#dc2626',
      background: 'white', borderRadius: '12px', border: '1px solid #fecaca',
    }}>
      {error}
    </div>
  )

  if (!data) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Contratos', valor: data.total_contrato, count: data.contrato.length, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Total Boletas', valor: data.total_boleta, count: data.boleta.length, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Gran Total', valor: data.gran_total, count: data.contrato.length + data.boleta.length, color: '#059669', bg: '#d1fae5' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'white', borderRadius: '12px', padding: '20px 24px',
            border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {k.label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: k.color }}>{fmt(k.valor)}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{k.count} trabajadores</div>
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={k.color} strokeWidth="1.5">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/>
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + botón excel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {(['contrato', 'boleta'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 24px', border: 'none', cursor: 'pointer',
              background: tab === t ? '#059669' : 'white',
              color: tab === t ? 'white' : '#6b7280',
              fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
            }}>
              {t === 'contrato' ? `📄 Contratos (${data.contrato.length})` : `🧾 Boletas (${data.boleta.length})`}
            </button>
          ))}
        </div>

        <button onClick={descargarExcel} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#059669', border: 'none', borderRadius: '8px',
          padding: '10px 18px', color: 'white', fontSize: '13px',
          fontWeight: 600, cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Descargar Excel
        </button>
      </div>

      {/* Tabla Contratos */}
      {tab === 'contrato' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {data.contrato.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Sin trabajadores con contrato</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Nombre</th>
                  <th style={TH}>RUT</th>
                  <th style={TH}>Cargo</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Sueldo Base</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Bono Producción</th>
                  <th style={{ ...TH, textAlign: 'right', color: '#dc2626' }}>Anticipos</th>
                  <th style={{ ...TH, textAlign: 'right', color: '#059669' }}>Total Líquido</th>
                </tr>
              </thead>
              <tbody>
                {data.contrato.map(t => (
                  <tr key={t.trabajador_id}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <td style={{ ...TD, fontWeight: 500, color: '#111827' }}>
                      {t.trabajador_nombre}
                      {t.es_produccion && (
                        <span style={{
                          marginLeft: '6px', fontSize: '10px', padding: '1px 6px',
                          borderRadius: '20px', background: '#dbeafe', color: '#1d4ed8', fontWeight: 600,
                        }}>Prod.</span>
                      )}
                    </td>
                    <td style={{ ...TD, color: '#6b7280' }}>{t.trabajador_rut}</td>
                    <td style={TD}>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                        background: '#f3f4f6', color: '#374151', fontWeight: 500,
                      }}>
                        {t.trabajador_cargo}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 500 }}>
                      {fmt(t.sueldo_base_contabilidad)}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', color: t.bono_produccion > 0 ? '#059669' : '#e97316' }}>
                    {t.licencia ? (
                        <span style={{
                        fontSize: '11px', padding: '2px 10px', borderRadius: '20px',
                        background: '#fff7ed', color: '#c2410c', fontWeight: 700,
                        border: '1px solid #fed7aa',
                        }}>
                        LICENCIA
                        </span>
                    ) : t.bono_produccion > 0 ? fmt(t.bono_produccion) : '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', color: t.total_anticipos > 0 ? '#dc2626' : '#9ca3af' }}>
                      {t.total_anticipos > 0 ? `-${fmt(t.total_anticipos)}` : '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '14px' }}>
                      {fmt(t.total_liquido)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f0fdf4' }}>
                  <td colSpan={6} style={{
                    padding: '12px 14px', fontWeight: 700, fontSize: '13px',
                    color: '#065f46', textAlign: 'right', borderTop: '2px solid #d1fae5',
                  }}>
                    Total Contratos
                  </td>
                  <td style={{
                    padding: '12px 14px', textAlign: 'right', fontWeight: 800,
                    fontSize: '15px', color: '#059669', borderTop: '2px solid #d1fae5',
                  }}>
                    {fmt(data.total_contrato)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Tabla Boletas */}
      {tab === 'boleta' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {data.boleta.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Sin trabajadores con boleta</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Nombre</th>
                  <th style={TH}>RUT</th>
                  <th style={TH}>Cargo</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Monto Bruto</th>
                  <th style={{ ...TH, textAlign: 'right', color: '#dc2626' }}>Desc. Boleta (15.25%)</th>
                  <th style={{ ...TH, textAlign: 'right', color: '#059669' }}>Total Líquido</th>
                </tr>
              </thead>
              <tbody>
                {data.boleta.map((t: any) => (
                  <tr key={t.trabajador_id}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <td style={{ ...TD, fontWeight: 500, color: '#111827' }}>{t.trabajador_nombre}</td>
                    <td style={{ ...TD, color: '#6b7280' }}>{t.trabajador_rut}</td>
                    <td style={TD}>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                        background: '#f3f4f6', color: '#374151', fontWeight: 500,
                      }}>
                        {t.trabajador_cargo}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 500 }}>{fmt(t.sueldo_base_contabilidad)}</td>
                    <td style={{ ...TD, textAlign: 'right', color: '#dc2626', fontWeight: 500 }}>
                      -{fmt(t.descuento_boleta)}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '14px' }}>
                      {fmt(t.total_liquido)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f0fdf4' }}>
                  <td colSpan={5} style={{
                    padding: '12px 14px', fontWeight: 700, fontSize: '13px',
                    color: '#065f46', textAlign: 'right', borderTop: '2px solid #d1fae5',
                  }}>
                    Total Boletas
                  </td>
                  <td style={{
                    padding: '12px 14px', textAlign: 'right', fontWeight: 800,
                    fontSize: '15px', color: '#059669', borderTop: '2px solid #d1fae5',
                  }}>
                    {fmt(data.total_boleta)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

    </div>
  )
}
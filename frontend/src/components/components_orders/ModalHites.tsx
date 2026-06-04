import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { api } from '../../api/client'

interface Props {
  onClose: () => void
  onSave: () => void
}

const IS: React.CSSProperties = {
  background: 'var(--bg)', border: '0.5px solid var(--border)',
  borderRadius: '7px', padding: '7px 12px', fontSize: '13px',
  color: 'var(--text-1)', outline: 'none',
}

const SKU_SHIPPING = '334519001'

export default function ModalHites({ onClose, onSave }: Props) {
  const [archivoOrdenes, setArchivoOrdenes] = useState<File | null>(null)
  const [archivoDetalle, setArchivoDetalle] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paso, setPaso] = useState<'upload' | 'preview'>('upload')

  const refOrdenes = useRef<HTMLInputElement>(null)
  const refDetalle = useRef<HTMLInputElement>(null)

  const leerCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(l => l.trim())
          const headers = lines[0].replace(/^\uFEFF/, '').split(';').map(h => h.trim())
          const rows = lines.slice(1).map(line => {
            const vals = line.split(';').map(v => v.trim())
            const obj: any = {}
            headers.forEach((h, i) => { obj[h] = vals[i] || '' })
            return obj
          })
          resolve(rows)
        } catch {
          reject(new Error('No se pudo leer el archivo'))
        }
      }
      reader.onerror = () => reject(new Error('Error leyendo archivo'))
      reader.readAsText(file, 'utf-8')
    })
  }

  const leerArchivo = (file: File): Promise<any[]> => {
    if (file.name.endsWith('.csv')) return leerCSV(file)
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }))
        } catch {
          reject(new Error('No se pudo leer el archivo'))
        }
      }
      reader.onerror = () => reject(new Error('Error leyendo archivo'))
      reader.readAsArrayBuffer(file)
    })
  }

  const agregarDiasHabiles = (fechaStr: string, dias: number): string => {
    if (!fechaStr || fechaStr.length !== 8) return ''
    const y = parseInt(fechaStr.slice(0, 4))
    const m = parseInt(fechaStr.slice(4, 6)) - 1
    const d = parseInt(fechaStr.slice(6, 8))
    const fecha = new Date(y, m, d)
    let agregados = 0
    while (agregados < dias) {
        fecha.setDate(fecha.getDate() + 1)
        const dow = fecha.getDay()
        if (dow !== 0 && dow !== 6) agregados++
    }
    const dd = String(fecha.getDate()).padStart(2, '0')
    const mm = String(fecha.getMonth() + 1).padStart(2, '0')
    const yyyy = fecha.getFullYear()
    return `${dd}/${mm}/${yyyy}`
}

  const procesarArchivos = async () => {
    if (!archivoOrdenes || !archivoDetalle) {
      setError('Debes cargar ambos archivos')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [rowsOrdenes, rowsDetalle] = await Promise.all([
        leerArchivo(archivoOrdenes),
        leerArchivo(archivoDetalle),
      ])

      // Agrupar detalle por numeroOrden, excluyendo shipping
      const detalleMap: Record<string, any[]> = {}
      rowsDetalle.forEach((row: any) => {
        const key = String(row['numeroOrden'] || '').trim()
        if (!key) return
        if (String(row['sku']).trim() === SKU_SHIPPING) return // ignorar fila de envío
        if (!detalleMap[key]) detalleMap[key] = []
        detalleMap[key].push(row)
      })

      // Fila de shipping para calcular costo_despacho
      const shippingMap: Record<string, number> = {}
      rowsDetalle.forEach((row: any) => {
        const key = String(row['numeroOrden'] || '').trim()
        if (String(row['sku']).trim() === SKU_SHIPPING) {
          shippingMap[key] = Number(row['total']) || 0
        }
      })

      // Construir preview cruzando órdenes con detalle
      const resultado = rowsOrdenes.map((row: any) => {
        const nOrden = String(row['orderNumber'] || '').trim()
        const items = (detalleMap[nOrden] || []).map((it: any) => ({
          sku: String(it['skuSellerPadre'] || it['sku'] || '').trim(),
          nombre: String(it['producto'] || '').trim(),
          cantidad: Number(it['cantidad']) || 1,
          precio: Number(it['precioUnitario']) || 0,
          total: Number(it['total']) || 0,
        }))

        // Parsear dirección de DatosBoleta (primera fila del detalle)
        const primeraFila = detalleMap[nOrden]?.[0] || {}
        const direccionRaw = String(primeraFila['direccion'] || '').trim()
        const [direccion, ciudad] = direccionRaw.split(',').map(s => s.trim())

        return {
          orden_id: nOrden,
          marketplace: 'hites',
          cliente_nombre: `${primeraFila['nombre'] || ''} ${primeraFila['apellido'] || ''}`.trim() || row['customerName'] || '',
          cliente_rut: String(primeraFila['rut'] || '').trim(),
          cliente_email: String(row['clientEmail'] || '').trim(),
          cliente_telefono: String(row['clientPhone'] || '').trim(),
          direccion: direccion || '',
          ciudad: ciudad || '',
          fecha_despacho: String(row['dateSale'] || '').trim(),
          fecha_venta: String(row['dateSale'] || '').trim(),
          estado_marketplace: String(row['status'] || '').trim(),
          total: Number(row['grossTotal']) || 0,
          costo_despacho: shippingMap[nOrden] || 0,
          subtotal_productos: Number(row['totalProductGrossPrice']) || 0,
          items,
          raw: row,
        }
      }).filter(o => o.orden_id)

      setPreview(resultado)
      setPaso('preview')
    } catch (e: any) {
      setError(e.message || 'Error procesando archivos')
    } finally {
      setLoading(false)
    }
  }

  const importar = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/ordenes/hites/importar', { ordenes: preview })
      const { guardadas, duplicadas } = res.data
      alert(`✓ ${guardadas} órdenes importadas${duplicadas > 0 ? `, ${duplicadas} ya existían` : ''}`)
      onSave()
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error importando')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: '12px',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '700px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 0.15s ease',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>Agregar Órdenes Hites</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
              {paso === 'upload'
                ? 'Carga los dos archivos exportados desde Hites'
                : `${preview.length} órdenes listas para importar`}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
            width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {paso === 'upload' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Archivo Órdenes */}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px', fontWeight: 500 }}>
                  📋 Archivo de Órdenes <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>(Ordenes_Compra_Hites_Seller...)</span>
                </div>
                <div onClick={() => refOrdenes.current?.click()} style={{
                  border: `1.5px dashed ${archivoOrdenes ? 'var(--success)' : 'var(--border-2)'}`,
                  borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer',
                  background: archivoOrdenes ? 'var(--success-bg)' : 'var(--bg)', transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '13px', color: archivoOrdenes ? 'var(--success)' : 'var(--text-3)' }}>
                    {archivoOrdenes ? `✓ ${archivoOrdenes.name}` : 'Haz clic para seleccionar (.csv o .xlsx)'}
                  </div>
                </div>
                <input ref={refOrdenes} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
                  onChange={e => setArchivoOrdenes(e.target.files?.[0] || null)} />
              </div>

              {/* Archivo Detalle */}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px', fontWeight: 500 }}>
                  📦 Archivo de Detalle <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>(DatosBoleta...)</span>
                </div>
                <div onClick={() => refDetalle.current?.click()} style={{
                  border: `1.5px dashed ${archivoDetalle ? 'var(--success)' : 'var(--border-2)'}`,
                  borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer',
                  background: archivoDetalle ? 'var(--success-bg)' : 'var(--bg)', transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '13px', color: archivoDetalle ? 'var(--success)' : 'var(--text-3)' }}>
                    {archivoDetalle ? `✓ ${archivoDetalle.name}` : 'Haz clic para seleccionar (.csv o .xlsx)'}
                  </div>
                </div>
                <input ref={refDetalle} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
                  onChange={e => setArchivoDetalle(e.target.files?.[0] || null)} />
              </div>

              {error && (
                <div style={{ fontSize: '13px', color: 'var(--danger)', padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: '6px' }}>
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '12px' }}>
                Revisa antes de importar:
              </div>
              <div style={{ border: '0.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-3)', position: 'sticky', top: 0 }}>
                        {['N° Orden', 'Fecha despacho', 'Estado', 'Productos', 'Total'].map(h => (
                          <th key={h} style={{
                            padding: '8px 12px', fontSize: '11px', fontWeight: 500,
                            color: 'var(--text-3)', textAlign: 'left',
                            borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} style={{ borderBottom: i < preview.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--info)' }}>{row.orden_id}</td>
                            <td style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                            {agregarDiasHabiles(row.fecha_despacho, 3) || '—'}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                            <span style={{
                                fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 500,
                                background: row.estado_marketplace === 'EN_PREPARACION' ? 'var(--info-bg)' : 'var(--bg-3)',
                                color: row.estado_marketplace === 'EN_PREPARACION' ? 'var(--info)' : 'var(--text-3)',
                            }}>
                                {row.estado_marketplace || '—'}
                            </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-2)' }}>
                            {row.items?.map((it: any) => it.nombre).filter(Boolean).join(', ') || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 500 }}>${Number(row.total).toLocaleString('es-CL')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {error && (
                <div style={{ fontSize: '13px', color: 'var(--danger)', padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: '6px', marginTop: '12px' }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '0.5px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: '8px', flexShrink: 0,
        }}>
          {paso === 'preview' && (
            <button onClick={() => { setPaso('upload'); setPreview([]); setError('') }}
              style={{ ...IS, cursor: 'pointer' }}>
              ← Volver
            </button>
          )}
          <button onClick={onClose} style={{ ...IS, cursor: 'pointer' }}>Cancelar</button>
          {paso === 'upload' ? (
            <button
              onClick={procesarArchivos}
              disabled={loading || !archivoOrdenes || !archivoDetalle}
              style={{
                ...IS, background: '#16a34a', color: '#fff', border: 'none', fontWeight: 500,
                cursor: loading || !archivoOrdenes || !archivoDetalle ? 'not-allowed' : 'pointer',
                opacity: loading || !archivoOrdenes || !archivoDetalle ? 0.6 : 1,
              }}>
              {loading ? 'Procesando...' : 'Revisar órdenes →'}
            </button>
          ) : (
            <button
              onClick={importar}
              disabled={loading}
              style={{
                ...IS, background: '#16a34a', color: '#fff', border: 'none', fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              }}>
              {loading ? 'Importando...' : `Importar ${preview.length} órdenes`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
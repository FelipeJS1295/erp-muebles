import { useEffect, useState, useMemo, useRef } from 'react'
import { api } from '../api/client'

const TIPOS = ['sofa', 'seccional', 'modular', 'poltrona', 'cojineria', 'cama']

interface Insumo {
  id: number
  codigo: string
  nombre: string
  unidad_medida: string
  precio_costo: number
  precio_venta: number
}

interface ProductoInsumo {
  id: number
  insumo_id: number
  codigo: string
  nombre: string
  unidad_medida: string
  cantidad: number
  precio_costo: number
  costo_total: number
}

interface SkuRetail {
  sku_walmart?: string
  sku_paris?: string
  sku_falabella?: string
  sku_ripley?: string
  sku_hites?: string
  otros_retail?: { nombre: string; sku: string }[]
}

interface Producto {
  id?: number
  sku_padre: string
  sku: string
  descripcion: string
  descripcion_esqueleto?: string
  tipo_producto: string
  precio_venta: number
  precio_venta_descuento: number
  precio_costura: number
  precio_esqueleteria: number
  precio_tapiceria: number
  color?: string
  material?: string
  peso?: number
  dimensiones?: { alto?: number; ancho?: number; largo?: number }
  imagenes?: string[]
  activo?: number
  fecha_creacion?: string
}

const emptyProducto = (): Producto => ({
  sku_padre: '', sku: '', descripcion: '', tipo_producto: 'seccional',
  precio_venta: 0, precio_venta_descuento: 0,
  precio_costura: 0, precio_esqueleteria: 0, precio_tapiceria: 0,
  color: '', material: '', peso: undefined,
  dimensiones: { alto: undefined, ancho: undefined, largo: undefined },
  imagenes: [],
})

// =============================================================================
// Editor de Plano de Corte
// =============================================================================
function PlanoEditor({ productoId, planoInicial, planos, onPlanosChange }: {
  productoId: number
  planoInicial: any
  planos: any[]
  onPlanosChange: (p: any[]) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const editorRef = useRef<any>({})
  const [mesonLargo, setMesonLargo] = useState(planoInicial?.meson_largo?.toString() || '')
  const [mesonAncho, setMesonAncho] = useState(planoInicial?.meson_ancho?.toString() || '')
  const [nombrePlano, setNombrePlano] = useState(planoInicial?.nombre || 'Plano principal')
  const [listo, setListo] = useState(!!planoInicial)
  const [saving, setSaving] = useState(false)
  const [planoId, setPlanoId] = useState(planoInicial?.id || null)
  const [tool, setToolState] = useState('rect')

  useEffect(() => {
    if (listo && canvasRef.current) {
      setTimeout(() => initEditor(planoInicial?.piezas || []), 50)
    }
  }, [listo])

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '6px 10px', fontSize: '13px',
    color: 'var(--text-1)', outline: 'none',
  }

  const tbtn: React.CSSProperties = {
    padding: '5px 10px', borderRadius: '5px', border: '0.5px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text-1)', fontSize: '11px', cursor: 'pointer',
  }
  const tbtnActive: React.CSSProperties = {
    ...tbtn, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
  }

  const iniciar = () => {
    if (!mesonLargo || !mesonAncho) return
    setListo(true)
  }

  const setTool = (t: string) => {
    setToolState(t)
    editorRef.current.setTool?.(t)
    if (canvasRef.current) {
      canvasRef.current.style.cursor = t === 'rect' ? 'crosshair' : t === 'move' ? 'grab' : 'default'
    }
  }

  const initEditor = (piezasIniciales: any[] = []) => {
    const cvs = canvasRef.current
    if (!cvs) return
    const largo = parseFloat(mesonLargo) || planoInicial?.meson_largo || 13.7
    const ancho = parseFloat(mesonAncho) || planoInicial?.meson_ancho || 1.45
    const OX = 30, OY = 30
    const W = 600
    const scale = W / largo
    const H = Math.round(W * (ancho / largo))
    cvs.width = 680
    cvs.height = H + OY * 2 + 60
    cvs.style.width = '100%'

    const ctx = cvs.getContext('2d')!
    const COLORS = ['#9DB8CC88', '#B8CDD888', '#7FA8BF88', '#C8D9E388', '#A8C0CC88', '#BED4DE88', '#D4E4EC88', '#8BAFC088']
    let pieces: any[] = piezasIniciales.map(p => ({ ...p }))
    let selPiece: any = null
    let drawing = false
    let startX = 0, startY = 0
    let previewRect: any = null
    let dragging = false
    let dragSX = 0, dragSY = 0
    let dragPX = 0, dragPY = 0
    let colorIdx = piezasIniciales.length
    let currentTool = 'rect'

    editorRef.current = {
      getPieces: () => pieces,
      setTool: (t: string) => { currentTool = t },
      eliminar: () => {
        if (selPiece) { pieces = pieces.filter(p => p.id !== selPiece.id); selPiece = null; render() }
      },
      redondear: () => {
        if (!selPiece) return
        const r = parseInt(prompt('Radio de esquinas (0-100):', selPiece.radio || 0) || '0')
        selPiece.radio = Math.max(0, Math.min(r, Math.min(selPiece.w, selPiece.h) / 2))
        render()
      },
      editarPieza: () => {
        if (!selPiece) return
        const nombre = prompt('Nombre de la pieza:', selPiece.nombre)
        if (nombre) selPiece.nombre = nombre
        const anchoM = parseFloat(prompt('Ancho en metros:', selPiece.anchoM) || selPiece.anchoM)
        if (!isNaN(anchoM)) selPiece.anchoM = anchoM
        const largoM = parseFloat(prompt('Largo en metros:', selPiece.largoM) || selPiece.largoM)
        if (!isNaN(largoM)) selPiece.largoM = largoM
        render()
      },
    }

    function snapG(v: number) { return Math.round(v / 5) * 5 }

    function getPos(e: MouseEvent) {
      const r = cvs.getBoundingClientRect()
      const sx = cvs.width / r.width
      const sy = cvs.height / r.height
      return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }
    }

    function getPieceAt(x: number, y: number) {
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i]
        if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p
      }
      return null
    }

    function renderPiece(p: any, isPreview = false) {
      const { x, y, w, h, radio = 0, color } = p
      ctx.beginPath()
      if (radio > 0) {
        const r = Math.min(radio, w / 2, h / 2)
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
      } else {
        ctx.rect(x, y, w, h)
      }
      ctx.closePath()
      if (isPreview) {
        ctx.fillStyle = '#2563eb22'; ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 1.5; ctx.setLineDash([5, 3])
      } else {
        ctx.fillStyle = color || '#9DB8CC88'
        ctx.strokeStyle = selPiece?.id === p.id ? '#2563eb' : '#555'
        ctx.lineWidth = selPiece?.id === p.id ? 2 : 1
        ctx.setLineDash([])
      }
      ctx.fill(); ctx.stroke(); ctx.setLineDash([])

      if (!isPreview) {
        const cx = x + w / 2, cy = y + h / 2
        ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 11px -apple-system,sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(p.nombre, cx, cy - 7)
        ctx.font = '10px -apple-system,sans-serif'; ctx.fillStyle = '#444'
        ctx.fillText(`${p.anchoM}m × ${p.largoM}m`, cx, cy + 7)
        // Cota ancho
        ctx.strokeStyle = '#888'; ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + w, y - 12); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 8); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + w, y - 16); ctx.lineTo(x + w, y - 8); ctx.stroke()
        ctx.fillStyle = '#666'; ctx.font = '9px -apple-system,sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(p.anchoM + 'm', cx, y - 19)
        // Cota largo
        const rx2 = x + w + 12
        ctx.beginPath(); ctx.moveTo(rx2, y); ctx.lineTo(rx2, y + h); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(rx2 - 4, y); ctx.lineTo(rx2 + 4, y); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(rx2 - 4, y + h); ctx.lineTo(rx2 + 4, y + h); ctx.stroke()
        ctx.save(); ctx.translate(rx2 + 8, y + h / 2); ctx.rotate(-Math.PI / 2)
        ctx.fillStyle = '#666'; ctx.font = '9px -apple-system,sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(p.largoM + 'm', 0, 0); ctx.restore()
      }
    }

    function render() {
      ctx.clearRect(0, 0, cvs.width, cvs.height)
      ctx.fillStyle = '#f0ede8'; ctx.fillRect(0, 0, cvs.width, cvs.height)
      // Grid
      const gPx = 10 / 100 * scale
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.3
      for (let gx = OX; gx <= OX + W; gx += gPx) { ctx.beginPath(); ctx.moveTo(gx, OY); ctx.lineTo(gx, OY + H); ctx.stroke() }
      for (let gy = OY; gy <= OY + H; gy += gPx) { ctx.beginPath(); ctx.moveTo(OX, gy); ctx.lineTo(OX + W, gy); ctx.stroke() }
      // Mesón
      ctx.fillStyle = '#e8e4de'; ctx.strokeStyle = '#555'; ctx.lineWidth = 2
      ctx.fillRect(OX, OY, W, H); ctx.strokeRect(OX, OY, W, H)
      ctx.fillStyle = '#888'; ctx.font = '11px -apple-system,sans-serif'
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'
      ctx.fillText(`Mesón: ${largo}m × ${ancho}m`, OX + 4, OY + 4)
      // Escala
      const sbM = Math.round(largo / 4 * 10) / 10
      const sbPx = sbM * scale
      ctx.fillStyle = '#555'; ctx.fillRect(OX, OY + H + 20, sbPx, 3)
      ctx.font = '10px -apple-system,sans-serif'; ctx.textAlign = 'left'
      ctx.fillText('0', OX - 2, OY + H + 18)
      ctx.fillText(sbM + 'm', OX + sbPx + 4, OY + H + 18)
      // Piezas
      pieces.forEach(p => renderPiece(p))
      if (previewRect && previewRect.w > 0 && previewRect.h > 0) {
        renderPiece({ ...previewRect, radio: 0, nombre: '', anchoM: 0, largoM: 0 }, true)
      }
    }

    cvs.addEventListener('mousedown', (e) => {
      const { x, y } = getPos(e)
      if (currentTool === 'rect') {
        if (x < OX || x > OX + W || y < OY || y > OY + H) return
        drawing = true; startX = snapG(x); startY = snapG(y)
      } else if (currentTool === 'select') {
        selPiece = getPieceAt(x, y); render()
      } else if (currentTool === 'move') {
        const p = getPieceAt(x, y)
        if (p) { selPiece = p; dragging = true; dragSX = x; dragSY = y; dragPX = p.x; dragPY = p.y }
      }
    })

    cvs.addEventListener('mousemove', (e) => {
      const { x, y } = getPos(e)
      if (currentTool === 'rect' && drawing) {
        previewRect = { x: Math.min(startX, snapG(x)), y: Math.min(startY, snapG(y)), w: Math.abs(snapG(x) - startX), h: Math.abs(snapG(y) - startY) }
        render()
      } else if (currentTool === 'move' && dragging && selPiece) {
        let nx = snapG(dragPX + (x - dragSX)), ny = snapG(dragPY + (y - dragSY))
        nx = Math.max(OX, Math.min(nx, OX + W - selPiece.w))
        ny = Math.max(OY, Math.min(ny, OY + H - selPiece.h))
        selPiece.x = nx; selPiece.y = ny; render()
      }
    })

    cvs.addEventListener('mouseup', (e) => {
      const { x, y } = getPos(e)
      if (currentTool === 'rect' && drawing) {
        drawing = false
        const px = Math.min(startX, snapG(x)), py = Math.min(startY, snapG(y))
        const pw = Math.abs(snapG(x) - startX), ph = Math.abs(snapG(y) - startY)
        if (pw > 10 && ph > 10) {
          const p = {
            id: Date.now(), nombre: 'Pieza ' + (pieces.length + 1),
            x: px, y: py, w: pw, h: ph, radio: 0,
            color: COLORS[colorIdx % COLORS.length],
            anchoM: +(pw / scale).toFixed(2),
            largoM: +(ph / scale).toFixed(2),
          }
          colorIdx++; pieces.push(p); selPiece = p
        }
        previewRect = null; render()
      }
      dragging = false
    })

    cvs.addEventListener('dblclick', (e) => {
      const { x, y } = getPos(e)
      const p = getPieceAt(x, y)
      if (p) {
        selPiece = p
        const nombre = prompt('Nombre de la pieza:', p.nombre)
        if (nombre) p.nombre = nombre
        const anchoM = parseFloat(prompt('Ancho en metros:', p.anchoM) || p.anchoM)
        if (!isNaN(anchoM)) p.anchoM = anchoM
        const largoM = parseFloat(prompt('Largo en metros:', p.largoM) || p.largoM)
        if (!isNaN(largoM)) p.largoM = largoM
        render()
      }
    })

    render()
  }

  const guardarPlano = async () => {
    try {
      setSaving(true)
      const piezas = editorRef.current.getPieces?.() || []
      const data = {
        nombre: nombrePlano,
        meson_largo: parseFloat(mesonLargo),
        meson_ancho: parseFloat(mesonAncho),
        piezas,
      }
      if (planoId) {
        await api.put(`/planos-corte/${planoId}`, data)
      } else {
        const res = await api.post(`/planos-corte/producto/${productoId}`, data)
        setPlanoId(res.data.id)
      }
      const r = await api.get(`/planos-corte/producto/${productoId}`)
      onPlanosChange(r.data.planos || [])
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (!listo) {
    return (
      <div>
        <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>
          Ingresa las medidas del mesón de corte para comenzar a dibujar
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Nombre del plano</div>
            <input value={nombrePlano} onChange={e => setNombrePlano(e.target.value)} style={IS} placeholder="Ej: Plano principal" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Largo del mesón (metros)</div>
            <input type="number" step="0.01" value={mesonLargo} onChange={e => setMesonLargo(e.target.value)} style={IS} placeholder="Ej: 13.70" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Ancho del mesón (metros)</div>
            <input type="number" step="0.01" value={mesonAncho} onChange={e => setMesonAncho(e.target.value)} style={IS} placeholder="Ej: 1.45" />
          </div>
        </div>
        <button onClick={iniciar} style={{
          padding: '9px 20px', borderRadius: '8px', border: 'none',
          background: 'var(--accent)', color: 'var(--accent-fg)',
          fontSize: '13px', fontWeight: 500, cursor: 'pointer',
        }}>
          Crear mesón →
        </button>

        {planos.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Planos guardados
            </div>
            {planos.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', border: '0.5px solid var(--border)',
                borderRadius: '8px', marginBottom: '6px', background: 'var(--bg)',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>{p.nombre}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                    {p.meson_largo}m × {p.meson_ancho}m · {p.piezas?.length || 0} piezas
                  </div>
                </div>
                <button onClick={() => {
                  setNombrePlano(p.nombre)
                  setMesonLargo(p.meson_largo.toString())
                  setMesonAncho(p.meson_ancho.toString())
                  setPlanoId(p.id)
                  setListo(true)
                  setTimeout(() => initEditor(p.piezas || []), 100)
                }} style={{ padding: '5px 12px', borderRadius: '6px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--info)', fontSize: '12px', cursor: 'pointer' }}>
                  Abrir →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={tool === 'rect' ? tbtnActive : tbtn} onClick={() => setTool('rect')}>▭ Dibujar</button>
        <button style={tool === 'select' ? tbtnActive : tbtn} onClick={() => setTool('select')}>↖ Seleccionar</button>
        <button style={tool === 'move' ? tbtnActive : tbtn} onClick={() => setTool('move')}>✥ Mover</button>
        <div style={{ width: '0.5px', height: '18px', background: 'var(--border)', flexShrink: 0 }} />
        <button style={tbtn} onClick={() => editorRef.current.redondear?.()}>⌒ Redondear</button>
        <button style={tbtn} onClick={() => editorRef.current.editarPieza?.()}>✏️ Editar pieza</button>
        <button style={{ ...tbtn, color: 'var(--danger)', borderColor: 'var(--danger)' }}
          onClick={() => editorRef.current.eliminar?.()}>🗑 Eliminar</button>
        <div style={{ flex: 1 }} />
        <input value={nombrePlano} onChange={e => setNombrePlano(e.target.value)}
          style={{ ...IS, width: '160px', fontSize: '12px' }} placeholder="Nombre del plano" />
        <button onClick={guardarPlano} disabled={saving} style={{
          padding: '6px 14px', borderRadius: '6px', border: 'none',
          background: 'var(--accent)', color: 'var(--accent-fg)',
          fontSize: '12px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1,
        }}>
          {saving ? 'Guardando...' : '💾 Guardar plano'}
        </button>
        <button onClick={() => setListo(false)} style={{ ...tbtn, opacity: 0.6 }}>← Volver</button>
      </div>

      <div style={{ border: '0.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', cursor: 'crosshair' }} />
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '6px' }}>
        Arrastra para dibujar piezas · Doble clic sobre una pieza para editar nombre y medidas · Seleccionar + Redondear para esquinas curvas
      </div>
    </div>
  )
}

// =============================================================================
// Modal Producto
// =============================================================================
function ProductoModal({ producto, onClose, onSave }: {
  producto: Producto | null, onClose: () => void, onSave: () => void
}) {
  const [form, setForm] = useState<Producto>(producto || emptyProducto())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nuevaImagen, setNuevaImagen] = useState('')
  const [tab, setTab] = useState<'datos' | 'skus' | 'insumos' | 'plano'>('datos')
  const [skuRetail, setSkuRetail] = useState<SkuRetail>({})
  const [nuevoOtroNombre, setNuevoOtroNombre] = useState('')
  const [nuevoOtroSku, setNuevoOtroSku] = useState('')
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [productoInsumos, setProductoInsumos] = useState<ProductoInsumo[]>([])
  const [insumoSeleccionado, setInsumoSeleccionado] = useState('')
  const [cantidadInsumo, setCantidadInsumo] = useState('')
  const [planos, setPlanos] = useState<any[]>([])
  const isEdit = !!producto?.id

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))
  const setDim = (key: string, value: any) => setForm(f => ({
    ...f, dimensiones: { ...f.dimensiones, [key]: value ? Number(value) : undefined }
  }))
  const setSku = (key: string, value: string) => setSkuRetail(s => ({ ...s, [key]: value }))

  useEffect(() => {
    if (isEdit) {
      api.get(`/sku-retail/${producto!.id}`).then(r => setSkuRetail(r.data)).catch(() => {})
      api.get(`/insumos/producto/${producto!.id}`).then(r => setProductoInsumos(r.data.insumos || [])).catch(() => {})
      api.get(`/planos-corte/producto/${producto!.id}`).then(r => setPlanos(r.data.planos || [])).catch(() => {})
    }
    api.get('/insumos').then(r => setInsumos(r.data.insumos || [])).catch(() => {})
  }, [])

  const guardar = async () => {
    if (!form.sku_padre || !form.sku || !form.descripcion) {
      setError('SKU padre, SKU y descripción son obligatorios')
      return
    }
    try {
      setSaving(true); setError('')
      if (isEdit) {
        await api.put(`/productos-internos/${producto!.id}`, form)
        await api.post(`/sku-retail/${producto!.id}`, skuRetail)
      } else {
        const res = await api.post('/productos-internos', form)
        await api.post(`/sku-retail/${res.data.id}`, skuRetail)
      }
      onSave(); onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const agregarInsumo = async () => {
    if (!insumoSeleccionado || !cantidadInsumo) return
    try {
      await api.post(`/insumos/producto/${producto!.id}`, {
        insumo_id: Number(insumoSeleccionado),
        cantidad: Number(cantidadInsumo),
      })
      const r = await api.get(`/insumos/producto/${producto!.id}`)
      setProductoInsumos(r.data.insumos || [])
      setInsumoSeleccionado(''); setCantidadInsumo('')
    } catch (e) { console.error(e) }
  }

  const eliminarInsumo = async (relacionId: number) => {
    try {
      await api.delete(`/insumos/producto/${producto!.id}/${relacionId}`)
      const r = await api.get(`/insumos/producto/${producto!.id}`)
      setProductoInsumos(r.data.insumos || [])
    } catch (e) { console.error(e) }
  }

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '7px 10px', fontSize: '13px',
    color: 'var(--text-1)', outline: 'none', width: '100%',
  }

  const label = (texto: string, requerido = false) => (
    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px', fontWeight: 500 }}>
      {texto} {requerido && <span style={{ color: 'var(--danger)' }}>*</span>}
    </div>
  )

  const seccion = (titulo: string) => (
    <div style={{
      fontSize: '11px', fontWeight: 600, color: 'var(--text-3)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      marginBottom: '10px', marginTop: '16px', paddingBottom: '6px',
      borderBottom: '0.5px solid var(--border)',
    }}>{titulo}</div>
  )

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
    fontSize: '12px', fontWeight: tab === t ? 600 : 400,
    background: tab === t ? 'var(--accent)' : 'transparent',
    color: tab === t ? 'var(--accent-fg)' : 'var(--text-3)',
  })

  const costoTotal = productoInsumos.reduce((sum, i) => sum + i.costo_total, 0)

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, padding: '24px', overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: '12px',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: '720px',
        animation: 'fadeIn 0.15s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'var(--bg-2)', zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>
              {isEdit ? 'Editar producto' : 'Nuevo producto interno'}
            </div>
            {isEdit && (
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'monospace', marginTop: '2px' }}>
                {producto!.sku}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-3)', border: 'none', borderRadius: '6px',
            width: '28px', height: '28px', cursor: 'pointer', color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '10px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: '4px' }}>
          <button style={tabStyle('datos')} onClick={() => setTab('datos')}>Datos</button>
          <button style={tabStyle('skus')} onClick={() => setTab('skus')}>SKUs Retail</button>
          {isEdit && <>
            <button style={tabStyle('insumos')} onClick={() => setTab('insumos')}>
              Insumos {productoInsumos.length > 0 && `(${productoInsumos.length})`}
            </button>
            <button style={tabStyle('plano')} onClick={() => setTab('plano')}>
              ✂ Plano de corte {planos.length > 0 && `(${planos.length})`}
            </button>
          </>}
        </div>

        <div style={{ padding: '20px' }}>

          {/* Tab Datos */}
          {tab === 'datos' && <>
            {seccion('Identificación')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>{label('SKU Padre', true)}<input value={form.sku_padre} onChange={e => set('sku_padre', e.target.value)} style={IS} placeholder="Ej: SECRICH" /></div>
              <div>{label('SKU', true)}<input value={form.sku} onChange={e => set('sku', e.target.value)} style={IS} placeholder="Ej: SECRICH1401" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>{label('Descripción', true)}<input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} style={IS} placeholder="Ej: Seccional Richter Gris Oscuro" /></div>
              <div>
                {label('Descripción esqueleto')}
                <input value={form.descripcion_esqueleto || ''} 
                  onChange={e => set('descripcion_esqueleto', e.target.value)} 
                  style={IS} placeholder="Ej: Esqueleto madera pino 2x2" />
              </div>
              <div>{label('Tipo', true)}<select value={form.tipo_producto} onChange={e => set('tipo_producto', e.target.value)} style={IS}>{TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
            </div>
            {seccion('Precios')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>{label('Precio venta', true)}<input type="number" value={form.precio_venta} onChange={e => set('precio_venta', Number(e.target.value))} style={IS} /></div>
              <div>{label('Precio venta descuento', true)}<input type="number" value={form.precio_venta_descuento} onChange={e => set('precio_venta_descuento', Number(e.target.value))} style={IS} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>{label('Costura', true)}<input type="number" value={form.precio_costura} onChange={e => set('precio_costura', Number(e.target.value))} style={IS} /></div>
              <div>{label('Esqueletería', true)}<input type="number" value={form.precio_esqueleteria} onChange={e => set('precio_esqueleteria', Number(e.target.value))} style={IS} /></div>
              <div>{label('Tapicería', true)}<input type="number" value={form.precio_tapiceria} onChange={e => set('precio_tapiceria', Number(e.target.value))} style={IS} /></div>
            </div>
            {seccion('Datos opcionales')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>{label('Color')}<input value={form.color || ''} onChange={e => set('color', e.target.value)} style={IS} placeholder="Ej: Gris Oscuro" /></div>
              <div>{label('Material')}<input value={form.material || ''} onChange={e => set('material', e.target.value)} style={IS} placeholder="Ej: Felpa" /></div>
              <div>{label('Peso (kg)')}<input type="number" value={form.peso || ''} onChange={e => set('peso', e.target.value ? Number(e.target.value) : undefined)} style={IS} /></div>
            </div>
            {seccion('Dimensiones (cm)')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>{label('Alto')}<input type="number" value={form.dimensiones?.alto || ''} onChange={e => setDim('alto', e.target.value)} style={IS} placeholder="cm" /></div>
              <div>{label('Ancho')}<input type="number" value={form.dimensiones?.ancho || ''} onChange={e => setDim('ancho', e.target.value)} style={IS} placeholder="cm" /></div>
              <div>{label('Largo')}<input type="number" value={form.dimensiones?.largo || ''} onChange={e => setDim('largo', e.target.value)} style={IS} placeholder="cm" /></div>
            </div>
            {seccion('Imágenes (URLs)')}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input value={nuevaImagen} onChange={e => setNuevaImagen(e.target.value)} placeholder="https://..." style={{ ...IS, flex: 1 }} />
                <button onClick={() => { if (nuevaImagen) { set('imagenes', [...(form.imagenes || []), nuevaImagen]); setNuevaImagen('') } }}
                  style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  + Agregar
                </button>
              </div>
              {(form.imagenes || []).map((url, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--bg)', borderRadius: '6px', border: '0.5px solid var(--border)', marginBottom: '6px' }}>
                  <img src={url} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <span style={{ flex: 1, fontSize: '11px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                  <button onClick={() => set('imagenes', form.imagenes!.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                </div>
              ))}
            </div>
          </>}

          {/* Tab SKUs Retail */}
          {tab === 'skus' && <>
            {seccion('SKUs en marketplaces')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>{label('SKU Walmart')}<input value={skuRetail.sku_walmart || ''} onChange={e => setSku('sku_walmart', e.target.value)} style={IS} placeholder="Ej: SECRICH1401" /></div>
              <div>{label('SKU Paris')}<input value={skuRetail.sku_paris || ''} onChange={e => setSku('sku_paris', e.target.value)} style={IS} placeholder="Ej: MKOTQ4EAR6-1" /></div>
              <div>{label('SKU Falabella')}<input value={skuRetail.sku_falabella || ''} onChange={e => setSku('sku_falabella', e.target.value)} style={IS} placeholder="Ej: SECRICH1401" /></div>
              <div>{label('SKU Ripley')}<input value={skuRetail.sku_ripley || ''} onChange={e => setSku('sku_ripley', e.target.value)} style={IS} placeholder="Ej: SECRICH1401" /></div>
              <div>{label('SKU Hites')}<input value={skuRetail.sku_hites || ''} onChange={e => setSku('sku_hites', e.target.value)} style={IS} placeholder="Ej: SECRICH1401" /></div>
            </div>
            {seccion('Otros retail')}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input value={nuevoOtroNombre} onChange={e => setNuevoOtroNombre(e.target.value)} placeholder="Nombre retail" style={{ ...IS, flex: 1 }} />
              <input value={nuevoOtroSku} onChange={e => setNuevoOtroSku(e.target.value)} placeholder="SKU" style={{ ...IS, flex: 1 }} />
              <button onClick={() => {
                if (nuevoOtroNombre && nuevoOtroSku) {
                  setSkuRetail(s => ({ ...s, otros_retail: [...(s.otros_retail || []), { nombre: nuevoOtroNombre, sku: nuevoOtroSku }] }))
                  setNuevoOtroNombre(''); setNuevoOtroSku('')
                }
              }} style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + Agregar
              </button>
            </div>
            {(skuRetail.otros_retail || []).map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg)', borderRadius: '6px', border: '0.5px solid var(--border)', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-1)', flex: 1 }}>{o.nombre}</span>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--info)' }}>{o.sku}</span>
                <button onClick={() => setSkuRetail(s => ({ ...s, otros_retail: s.otros_retail!.filter((_, j) => j !== i) }))}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
              </div>
            ))}
          </>}

          {/* Tab Insumos */}
          {tab === 'insumos' && isEdit && <>
            {seccion('Agregar insumo')}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                {label('Insumo')}
                <select value={insumoSeleccionado} onChange={e => setInsumoSeleccionado(e.target.value)} style={IS}>
                  <option value="">Seleccionar insumo...</option>
                  {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                {label('Cantidad')}
                <input type="number" value={cantidadInsumo} onChange={e => setCantidadInsumo(e.target.value)} placeholder="0" style={IS} />
              </div>
              <button onClick={agregarInsumo} style={{
                padding: '7px 14px', borderRadius: '7px', border: 'none',
                background: 'var(--accent)', color: 'var(--accent-fg)',
                fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '1px',
              }}>+ Agregar</button>
            </div>
            {seccion(`Insumos del producto · Costo total: $${costoTotal.toLocaleString('es-CL')}`)}
            {productoInsumos.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Sin insumos agregados</div>
            ) : (
              <div style={{ border: '0.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      {['Código', 'Insumo', 'Unidad', 'Cantidad', 'Costo unit.', 'Costo total', ''].map(h => (
                        <th key={h} style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productoInsumos.map((pi, i) => (
                      <tr key={i} style={{ borderBottom: '0.5px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--info)' }}>{pi.codigo}</td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-1)', fontWeight: 500 }}>{pi.nombre}</td>
                        <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-3)' }}>{pi.unidad_medida}</td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 600 }}>{pi.cantidad}</td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-2)' }}>${pi.precio_costo.toLocaleString('es-CL')}</td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>${pi.costo_total.toLocaleString('es-CL')}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <button onClick={() => eliminarInsumo(pi.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>}

          {/* Tab Plano de corte */}
          {tab === 'plano' && isEdit && (
            <PlanoEditor
              productoId={producto!.id!}
              planoInicial={planos[0] || null}
              planos={planos}
              onPlanosChange={setPlanos}
            />
          )}

          {error && (
            <div style={{ padding: '10px', background: 'var(--danger-bg)', borderRadius: '7px', color: 'var(--danger)', fontSize: '13px', marginTop: '12px' }}>
              {error}
            </div>
          )}

          {tab !== 'plano' && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: '8px', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Página Principal
// =============================================================================
export default function ProductosInternos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modalProducto, setModalProducto] = useState<Producto | null>(null)
  const [mostrarModal, setMostrarModal] = useState(false)

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await api.get('/productos-internos')
      setProductos(res.data.productos || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const filtrados = useMemo(() => {
    let result = [...productos]
    if (busqueda) {
      const q = busqueda.toLowerCase()
      result = result.filter(p =>
        p.sku?.toLowerCase().includes(q) ||
        p.sku_padre?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      )
    }
    if (filtroTipo) result = result.filter(p => p.tipo_producto === filtroTipo)
    return result
  }, [productos, busqueda, filtroTipo])

  const IS: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: '7px', padding: '7px 12px', fontSize: '13px',
    color: 'var(--text-1)', outline: 'none', cursor: 'pointer',
  }

  const TH: React.CSSProperties = {
    padding: '11px 14px', textAlign: 'left', fontSize: '12px',
    fontWeight: 500, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)',
    whiteSpace: 'nowrap', background: 'var(--bg)',
  }

  const TD: React.CSSProperties = {
    padding: '11px 14px', borderBottom: '0.5px solid var(--border)', verticalAlign: 'middle',
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {mostrarModal && (
        <ProductoModal
          producto={modalProducto}
          onClose={() => setMostrarModal(false)}
          onSave={cargar}
        />
      )}

      <div style={{
        padding: '16px 24px', background: 'var(--bg-2)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)' }}>
            Productos Internos
            <span style={{ fontSize: '13px', color: 'var(--text-4)', fontWeight: 400 }}> · {filtrados.length} de {productos.length}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Catálogo interno de productos de la fábrica</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <div style={{ position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.3"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
              </svg>
              <input placeholder="Buscar SKU o descripción..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...IS, paddingLeft: '30px', width: '220px' }} />
            </div>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={IS}>
              <option value="">Todos los tipos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => { setModalProducto(null); setMostrarModal(true) }} style={{
          ...IS, display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          fontWeight: 500, marginTop: '4px',
        }}>+ Nuevo producto</button>
      </div>

      <div style={{ padding: '16px 24px' }}>
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>SKU</th>
                  <th style={TH}>Descripción</th>
                  <th style={TH}>Tipo</th>
                  <th style={TH}>Precio venta</th>
                  <th style={TH}>Precio desc.</th>
                  <th style={TH}>Costura</th>
                  <th style={TH}>Esqueletería</th>
                  <th style={TH}>Tapicería</th>
                  <th style={{ ...TH, cursor: 'default' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(9)].map((_, j) => (
                    <td key={j} style={TD}><div style={{ height: '14px', background: 'var(--bg-3)', borderRadius: '3px', animation: 'pulse 1.5s infinite' }} /></td>
                  ))}</tr>
                )) : filtrados.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                    No hay productos. <button onClick={() => { setModalProducto(null); setMostrarModal(true) }}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' }}>Crear el primero</button>
                  </td></tr>
                ) : filtrados.map((p, i) => (
                  <tr key={i}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ transition: 'background 0.1s' }}>
                    <td style={TD}>
                      <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--info)', fontWeight: 500 }}>{p.sku}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-4)', marginTop: '1px' }}>{p.sku_padre}</div>
                    </td>
                    <td style={{ ...TD, maxWidth: '220px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.descripcion}</div>
                      {p.color && <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '1px' }}>{p.color}</div>}
                    </td>
                    <td style={TD}>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: 'var(--info-bg)', color: 'var(--info)' }}>{p.tipo_producto}</span>
                    </td>
                    <td style={{ ...TD, fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>${Number(p.precio_venta).toLocaleString('es-CL')}</td>
                    <td style={{ ...TD, fontSize: '13px', color: 'var(--warning)' }}>${Number(p.precio_venta_descuento).toLocaleString('es-CL')}</td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-2)' }}>${Number(p.precio_costura).toLocaleString('es-CL')}</td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-2)' }}>${Number(p.precio_esqueleteria).toLocaleString('es-CL')}</td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-2)' }}>${Number(p.precio_tapiceria).toLocaleString('es-CL')}</td>
                    <td style={TD}>
                      <button onClick={() => { setModalProducto(p); setMostrarModal(true) }} style={{
                        fontSize: '11px', padding: '5px 10px', borderRadius: '5px',
                        border: '0.5px solid var(--border)', background: 'var(--bg)',
                        color: 'var(--text-2)', cursor: 'pointer',
                      }}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
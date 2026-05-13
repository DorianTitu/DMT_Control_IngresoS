import React, { useEffect, useState } from 'react'
import { apiService } from '@/services/api'
import { CatalogoItem, IngresoDetalle, MotivoCatalogo, TipoIngreso } from '@/types'

interface IngresoDetalleModalProps {
  tipo: TipoIngreso
  ticket: string
  onClose: () => void
  onSaved: () => void
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const IngresoDetalleModal: React.FC<IngresoDetalleModalProps> = ({ tipo, ticket, onClose, onSaved }) => {
  const [detalle, setDetalle] = useState<IngresoDetalle | null>(null)
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([])
  const [motivos, setMotivos] = useState<MotivoCatalogo[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<{ label: string; base64: string } | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ingreso, deps, motivosList] = await Promise.all([
        apiService.leerIngreso(tipo, ticket),
        apiService.getDepartamentos(),
        apiService.getMotivos(tipo),
      ])
      setDetalle(ingreso.datos)
      setDepartamentos(deps)
      const departamento = deps.find((item) => item.nombre === ingreso.datos.departamento)
      setMotivos(departamento ? await apiService.getMotivos(tipo, departamento.id) : motivosList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el detalle')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tipo, ticket])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setDetalle((prev) => prev ? { ...prev, [name]: value } : prev)
  }

  useEffect(() => {
    const loadMotivos = async () => {
      if (!detalle?.departamento) return
      const departamento = departamentos.find((item) => item.nombre === detalle.departamento)
      if (!departamento) return
      const motivosList = await apiService.getMotivos(tipo, departamento.id)
      setMotivos(motivosList)
      if (detalle.motivo && !motivosList.some((item) => item.nombre === detalle.motivo)) {
        setDetalle((prev) => prev ? { ...prev, motivo: '' } : prev)
      }
    }
    loadMotivos()
  }, [detalle?.departamento, departamentos, tipo])

  const handleSave = async () => {
    if (!detalle) return
    setSaving(true)
    setError(null)
    try {
      await Promise.all([
        apiService.actualizarIngreso(tipo, ticket, {
          numero_cedula: detalle.numero_cedula,
          nombres: detalle.nombres,
          apellidos: detalle.apellidos,
          departamento: detalle.departamento,
          motivo: detalle.motivo,
        }),
        delay(1000),
      ])
      onSaved()
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el registro')
    } finally {
      setSaving(false)
    }
  }

  const renderImage = (label: string, base64?: string) => {
    if (!base64) {
      return (
        <div className="photo-box detail-photo">
          <div className="photo-add">+</div>
          <p className="photo-label">{label}</p>
        </div>
      )
    }

    return (
      <button
        type="button"
        className="photo-box detail-photo detail-photo-button"
        onClick={() => setPreviewImage({ label, base64 })}
        title={`Ampliar ${label}`}
      >
        <img src={`data:image/jpeg;base64,${base64}`} alt={label} />
        <span className="image-zoom-hint">Ampliar</span>
        <p className="photo-label">{label}</p>
      </button>
    )
  }

  return (
    <>
      <div className="modal-overlay">
        <div className="modal">
          <div className={`modal-header ${tipo === 'vehicular' ? 'brown' : 'red'}`}>
            <div className="modal-header-left">
              <p className="modal-eyebrow">{tipo === 'vehicular' ? 'Ingreso Vehicular' : 'Ingreso Peatonal'}</p>
              <h2 className="modal-title">{ticket}</h2>
            </div>
            <div className="modal-header-right">
              <button type="button" onClick={onClose} className="btn-close">×</button>
            </div>
          </div>

          <div className="modal-body">
            <div className="photo-col">
              {renderImage('Foto Cédula', detalle?.imagen_cedula_base64)}
              {renderImage('Foto Rostro', detalle?.imagen_usuario_base64)}
              {tipo === 'vehicular' && renderImage('Foto Placa', detalle?.imagen_placa_base64)}
            </div>

            <div className="fields">
              {loading && <p className="detail-muted">Cargando información...</p>}
              {detalle && (
                <>
                  <div className="detail-meta">
                    <span>{detalle.fecha_ingreso}</span>
                    <span>{detalle.hora_entrada}</span>
                    <span className={`badge ${detalle.estado === 'activo' ? 'badge-active' : 'badge-out'}`}>
                      {detalle.estado === 'activo' ? 'Activo' : 'Salió'}
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nombres</label>
                    <input name="nombres" value={detalle.nombres} onChange={handleChange} className="form-input" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Apellidos</label>
                    <input name="apellidos" value={detalle.apellidos} onChange={handleChange} className="form-input" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cédula</label>
                    <input name="numero_cedula" value={detalle.numero_cedula} onChange={handleChange} className="form-input" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Departamento</label>
                    <select name="departamento" value={detalle.departamento} onChange={handleChange} className="form-select">
                      {departamentos.map((item) => (
                        <option key={item.id} value={item.nombre}>{item.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Motivo</label>
                    <select name="motivo" value={detalle.motivo} onChange={handleChange} className="form-select">
                      {motivos.map((item) => (
                        <option key={item.id} value={item.nombre}>{item.nombre}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-cancel">Cerrar</button>
            <div className="footer-right">
              <button type="button" onClick={handleSave} className={`btn-save ${tipo === 'vehicular' ? 'brown' : ''}`} disabled={!detalle || saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {previewImage && (
        <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="image-preview-header">
              <h3>{previewImage.label}</h3>
              <button type="button" onClick={() => setPreviewImage(null)} className="btn-close">×</button>
            </div>
            <img src={`data:image/jpeg;base64,${previewImage.base64}`} alt={previewImage.label} />
          </div>
        </div>
      )}

      {saving && (
        <div className="saving-overlay">
          <div className="saving-box">
            <span className="saving-spinner" />
            Guardando cambios...
          </div>
        </div>
      )}
    </>
  )
}

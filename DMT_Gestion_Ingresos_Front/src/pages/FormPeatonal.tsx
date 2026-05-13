import React, { useEffect, useState } from 'react'
import { apiService } from '@/services/api'
import { CatalogoItem, MotivoCatalogo, OcrDebugZonasResponse, TipoCedula } from '@/types'

interface FormPeatonalProps {
  onClose: () => void
  onSubmit: (data: any) => void
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const FormPeatonal: React.FC<FormPeatonalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    departamento: '',
    motivo: '',
    tipoCedula: 'nueva' as TipoCedula,
  })
  const [imagenes, setImagenes] = useState<{ usuario: string; cedula: string } | null>(null)
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([])
  const [motivos, setMotivos] = useState<MotivoCatalogo[]>([])
  const [zonasOcr, setZonasOcr] = useState<OcrDebugZonasResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const deps = await apiService.getDepartamentos()
        setDepartamentos(deps)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los catálogos')
      }
    }
    fetchCatalogos()
  }, [])

  useEffect(() => {
    const fetchMotivos = async () => {
      const departamento = departamentos.find((item) => item.nombre === formData.departamento)
      if (!departamento) {
        setMotivos([])
        return
      }
      try {
        const motivosList = await apiService.getMotivos('peatonal', departamento.id)
        setMotivos(motivosList)
        if (formData.motivo && !motivosList.some((item) => item.nombre === formData.motivo)) {
          setFormData(prev => ({ ...prev, motivo: '' }))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los motivos')
      }
    }
    fetchMotivos()
  }, [departamentos, formData.departamento])

  useEffect(() => {
    if (!imagenes?.cedula) {
      setZonasOcr(null)
      return
    }

    let activo = true
    apiService.debugZonasOcr(imagenes.cedula, formData.tipoCedula, 'peatonal')
      .then((data) => {
        if (activo) setZonasOcr(data)
      })
      .catch(() => {
        if (activo) setZonasOcr(null)
      })

    return () => {
      activo = false
    }
  }, [imagenes?.cedula, formData.tipoCedula])

  const currentDate = new Date()
  const timeStr = currentDate.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCapturar = async () => {
    setLoading(true)
    setError(null)
    setInfo(null)
    try {
      const captura = await apiService.capturarRegistro('peatonal')
      setImagenes(captura.imagenes)

      const ia = await apiService.procesarCedulaConIA(captura.imagenes.cedula, formData.tipoCedula, 'peatonal')
      const datos = ia.resultado_ia
      let datosFinales = {
        cedula: datos.cedula,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
      }
      if (datos.cedula) {
        const persona = await apiService.buscarPersonaPorCedula(datos.cedula)
        if (persona.encontrado) {
          datosFinales = {
            cedula: persona.cedula,
            nombres: persona.nombres || datos.nombres,
            apellidos: persona.apellidos || datos.apellidos,
          }
          setInfo(`Datos recuperados de registros anteriores: ${persona.ultimo_ticket}`)
        }
      }
      setFormData(prev => ({
        ...prev,
        cedula: datosFinales.cedula || prev.cedula,
        nombres: datosFinales.nombres || prev.nombres,
        apellidos: datosFinales.apellidos || prev.apellidos,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo capturar/procesar la cédula')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      if (!imagenes) {
        throw new Error('Primero captura las imágenes del registro')
      }
      const [response] = await Promise.all([
        apiService.crearIngreso('peatonal', {
          numero_cedula: formData.cedula,
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          hora_entrada: new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          departamento: formData.departamento,
          motivo: formData.motivo,
          imagen_usuario_base64: imagenes.usuario,
          imagen_cedula_base64: imagenes.cedula,
        }),
        delay(1000),
      ])
      onSubmit(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el registro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header red">
          <div className="modal-header-left">
            <p className="modal-eyebrow">Módulo Peatonal</p>
            <h2 className="modal-title">Registro de Ingreso Peatonal</h2>
          </div>
          <div className="modal-header-right">
            <button onClick={onClose} className="btn-close">×</button>
          </div>
        </div>

        <div className="modal-body">
          <div className="photo-col">
            <div className="photo-box tall">
              {imagenes?.cedula ? (
                <>
                  <img
                    src={
                      zonasOcr?.imagen_marcada_base64
                        ? `data:image/png;base64,${zonasOcr.imagen_marcada_base64}`
                        : `data:image/jpeg;base64,${imagenes.cedula}`
                    }
                    alt="Cédula con zonas OCR"
                    className="photo-img"
                  />
                  <span className="ocr-zone-badge">Zonas OCR</span>
                </>
              ) : (
                <div className="photo-add">+</div>
              )}
              <p className="photo-label">Foto Cédula</p>
            </div>

            <div className="photo-box tall">
              {imagenes?.usuario ? (
                <img src={`data:image/jpeg;base64,${imagenes.usuario}`} alt="Rostro" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="photo-add">+</div>
              )}
              <p className="photo-label">Foto Rostro</p>
            </div>
          </div>

          <div className="fields">
            <div className="form-group">
              <label className="form-label">Nombres <em>*</em></label>
              <input
                type="text"
                name="nombres"
                value={formData.nombres}
                onChange={handleChange}
                placeholder="Ingrese el nombre"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Apellidos <em>*</em></label>
              <input
                type="text"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                placeholder="Ingrese los apellidos"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">N° de Cédula <em>*</em></label>
              <input
                type="text"
                name="cedula"
                value={formData.cedula}
                onChange={handleChange}
                placeholder="Ej: 0912345678"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hora de Ingreso</label>
              <input
                type="text"
                value={timeStr}
                readOnly
                className="form-input readonly"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Departamento <em>*</em></label>
              <select
                name="departamento"
                value={formData.departamento}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Seleccionar departamento...</option>
                {departamentos.map((departamento) => (
                  <option key={departamento.id} value={departamento.nombre}>
                    {departamento.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Motivo de Visita <em>*</em></label>
              <select
                name="motivo"
                value={formData.motivo}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Seleccionar motivo...</option>
                {motivos.map((motivo) => (
                  <option key={motivo.id} value={motivo.nombre}>
                    {motivo.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Cédula <em>*</em></label>
              <div className="radio-row">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="tipoCedula"
                    value="nueva"
                    checked={formData.tipoCedula === 'nueva'}
                    onChange={handleChange}
                    style={{ display: 'none' }}
                  />
                  <div className={`radio-circle ${formData.tipoCedula === 'nueva' ? 'active' : ''}`}></div>
                  <span>Cédula Nueva</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="tipoCedula"
                    value="antigua"
                    checked={formData.tipoCedula === 'antigua'}
                    onChange={handleChange}
                    style={{ display: 'none' }}
                  />
                  <div className={`radio-circle ${formData.tipoCedula === 'antigua' ? 'active' : ''}`}></div>
                  <span>Cédula Antigua</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '0 24px 12px', color: '#B42318', fontSize: '14px' }}>
            {error}
          </div>
        )}
        {info && <div className="form-info">{info}</div>}

        <div className="modal-footer">
          <button className="btn-capture" onClick={handleCapturar} disabled={loading}>
            {loading ? 'Procesando...' : 'Capturar nuevo registro'}
          </button>
          <div className="footer-right">
            <button onClick={onClose} className="btn-cancel">Cancelar</button>
            <button onClick={handleSubmit} className="btn-save" disabled={loading || saving}>Guardar Registro</button>
          </div>
        </div>
      </div>
      {saving && <div className="saving-overlay"><div className="saving-box"><span className="saving-spinner" />Guardando registro...</div></div>}
    </div>
  )
}

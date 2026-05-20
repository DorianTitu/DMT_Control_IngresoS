import React, { useEffect, useState } from 'react'
import { apiService } from '@/services/api'
import { CatalogoItem, CupoVehicular, MotivoCatalogo, OcrDebugZonasResponse, TipoCedula } from '@/types'

interface FormVehicularProps {
  onClose: () => void
  onSubmit: (data: any) => void
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const FormVehicular: React.FC<FormVehicularProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    departamento: '',
    motivo: '',
    tipoCedula: 'nueva' as TipoCedula,
  })
  const [imagenes, setImagenes] = useState<{ usuario: string; cedula: string; placa?: string } | null>(null)
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([])
  const [motivos, setMotivos] = useState<MotivoCatalogo[]>([])
  const [cupos, setCupos] = useState<CupoVehicular[]>([])
  const [zonasOcr, setZonasOcr] = useState<OcrDebugZonasResponse | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const busy = capturing || processing

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [deps, cuposList] = await Promise.all([
          apiService.getDepartamentos(),
          apiService.getCuposVehiculares(),
        ])
        setDepartamentos(deps)
        setCupos(cuposList)
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
        const motivosList = await apiService.getMotivos('vehicular', departamento.id)
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
    apiService.debugZonasOcr(imagenes.cedula, formData.tipoCedula, 'vehicular')
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

  const cupoSeleccionado = cupos.find((item) => item.departamento === formData.departamento)

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
    setCapturing(true)
    setProcessing(false)
    setError(null)
    setInfo(null)
    setImagenes(null)
    setZonasOcr(null)
    setFormData(prev => ({
      ...prev,
      nombres: '',
      apellidos: '',
      cedula: '',
    }))
    try {
      const captura = await apiService.capturarRegistro('vehicular')
      setImagenes(captura.imagenes)
      setCapturing(false)
      setProcessing(true)

      const ia = await apiService.procesarCedulaConIA(captura.imagenes.cedula, formData.tipoCedula, 'vehicular')
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
      setCapturing(false)
      setProcessing(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      if (!imagenes?.placa) {
        throw new Error('Primero captura las imágenes del registro vehicular')
      }
      if (cupoSeleccionado?.lleno) {
        throw new Error(`Cupo vehicular lleno para ${formData.departamento}`)
      }
      const [response] = await Promise.all([
        apiService.crearIngreso('vehicular', {
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
          imagen_placa_base64: imagenes.placa,
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
      <div className="modal entry-modal compact-entry-modal">
        <div className="modal-header brown">
          <div className="modal-header-left">
            <p className="modal-eyebrow">Módulo Vehicular</p>
            <h2 className="modal-title">Registro de Ingreso Vehicular</h2>
          </div>
          <div className="modal-header-right">
            <button onClick={onClose} className="btn-close">×</button>
          </div>
        </div>

        <div className="modal-body">
          <div className="photo-col">
            <div className="photo-box tall-vehicle">
              {imagenes?.cedula ? (
                <>
                  <img
                    src={
                      zonasOcr?.imagen_marcada_base64
                        ? `data:image/png;base64,${zonasOcr.imagen_marcada_base64}`
                        : `data:image/jpeg;base64,${imagenes.cedula}`
                    }
                    alt="Cédula conductor con zonas OCR"
                    className="photo-img"
                  />
                  {zonasOcr?.imagen_marcada_base64 && <span className="ocr-zone-badge">Zonas OCR</span>}
                </>
              ) : capturing ? (
                <div className="photo-loading">
                  <span className="saving-spinner" />
                  <p>Capturando cédula...</p>
                </div>
              ) : (
                <div className="photo-add">+</div>
              )}
              <p className="photo-label">Foto Cédula Conductor</p>
            </div>

            <div className="two-col">
              <div className="photo-box med">
                {imagenes?.usuario ? (
                  <img src={`data:image/jpeg;base64,${imagenes.usuario}`} alt="Rostro" className="photo-img" />
                ) : capturing ? (
                  <div className="photo-loading">
                    <span className="saving-spinner" />
                    <p>Capturando rostro...</p>
                  </div>
                ) : (
                  <div className="photo-add">+</div>
                )}
                <p className="photo-label">Rostro</p>
              </div>
              <div className="photo-box med">
                {imagenes?.placa ? (
                  <img src={`data:image/jpeg;base64,${imagenes.placa}`} alt="Placa" className="photo-img" />
                ) : capturing ? (
                  <div className="photo-loading">
                    <span className="saving-spinner" />
                    <p>Capturando placa...</p>
                  </div>
                ) : (
                  <div className="photo-add">+</div>
                )}
                <p className="photo-label">Placa</p>
              </div>
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
              <label className="form-label">Cédula del Conductor <em>*</em></label>
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

            {cupoSeleccionado?.cupo_vehicular !== null && cupoSeleccionado?.cupo_vehicular !== undefined && (
              <div className={`capacity-alert ${cupoSeleccionado.lleno ? 'full' : ''}`}>
                Parqueo: {cupoSeleccionado.ocupados}/{cupoSeleccionado.cupo_vehicular} ocupados
                {cupoSeleccionado.lleno ? ' · cupo lleno' : ''}
              </div>
            )}

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
          <button className="btn-capture" onClick={handleCapturar} disabled={busy}>
            {capturing ? 'Capturando...' : processing ? 'Procesando datos...' : 'Capturar nuevo registro'}
          </button>
          <div className="footer-right">
            <button onClick={onClose} className="btn-cancel">Cancelar</button>
            <button onClick={handleSubmit} className="btn-save brown" disabled={busy || saving}>Guardar Registro</button>
          </div>
        </div>
      </div>
      {saving && <div className="saving-overlay"><div className="saving-box"><span className="saving-spinner" />Guardando registro...</div></div>}
    </div>
  )
}

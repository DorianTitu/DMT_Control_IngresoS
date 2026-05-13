import React, { useEffect, useMemo, useState } from 'react'
import { apiService } from '@/services/api'
import { CatalogoItem, CupoVehicular, MotivoCatalogo, TipoMotivo } from '@/types'

interface CatalogosConfigProps {
  onClose: () => void
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const CatalogosConfig: React.FC<CatalogosConfigProps> = ({ onClose }) => {
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([])
  const [motivos, setMotivos] = useState<MotivoCatalogo[]>([])
  const [cupos, setCupos] = useState<CupoVehicular[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [nuevoDepartamento, setNuevoDepartamento] = useState('')
  const [nuevoMotivo, setNuevoMotivo] = useState('')
  const [tipoMotivo, setTipoMotivo] = useState<TipoMotivo>('ambos')
  const [deptDraft, setDeptDraft] = useState({ nombre: '', cupo_vehicular: '', aforo_vehicular_activo: false })
  const [motivoDrafts, setMotivoDrafts] = useState<Record<string, { nombre: string; tipo: TipoMotivo }>>({})
  const [loading, setLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const withActionFeedback = async (message: string, action: () => Promise<void>) => {
    setActionMessage(message)
    setError(null)
    try {
      await Promise.all([action(), delay(1000)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción')
    } finally {
      setActionMessage(null)
    }
  }

  const fetchCatalogos = async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, cuposData] = await Promise.all([
        apiService.getCatalogos(),
        apiService.getCuposVehiculares(),
      ])
      setDepartamentos(data.departamentos)
      setMotivos(data.motivos)
      setCupos(cuposData)
      setSelectedDeptId((current) => current || data.departamentos[0]?.id || '')
      setMotivoDrafts(Object.fromEntries(data.motivos.map((item) => [item.id, {
        nombre: item.nombre,
        tipo: item.tipo,
      }])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los catálogos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCatalogos()
  }, [])

  const selectedDepartamento = useMemo(
    () => departamentos.find((item) => item.id === selectedDeptId) || null,
    [departamentos, selectedDeptId],
  )

  const motivosDepartamento = useMemo(
    () => motivos.filter((item) => item.departamento_id === selectedDeptId),
    [motivos, selectedDeptId],
  )

  const cupoDepartamento = useMemo(
    () => cupos.find((item) => item.departamento_id === selectedDeptId) || null,
    [cupos, selectedDeptId],
  )

  useEffect(() => {
    if (!selectedDepartamento) return
    setDeptDraft({
      nombre: selectedDepartamento.nombre,
      cupo_vehicular: selectedDepartamento.cupo_vehicular == null ? '' : String(selectedDepartamento.cupo_vehicular),
      aforo_vehicular_activo: selectedDepartamento.cupo_vehicular != null,
    })
  }, [selectedDepartamento])

  const handleCrearDepartamento = async () => {
    if (!nuevoDepartamento.trim()) return
    await withActionFeedback('Agregando departamento...', async () => {
      const creado = await apiService.createDepartamento(nuevoDepartamento.trim(), null)
      setNuevoDepartamento('')
      setSelectedDeptId(creado.id)
      await fetchCatalogos()
    })
  }

  const handleGuardarDepartamento = async () => {
    if (!selectedDepartamento) return
    if (deptDraft.aforo_vehicular_activo && !deptDraft.cupo_vehicular) {
      setError('Ingresa el cupo vehicular máximo o desactiva el control de aforo.')
      return
    }
    await withActionFeedback('Guardando departamento...', async () => {
      await apiService.updateDepartamento(selectedDepartamento.id, {
        nombre: deptDraft.nombre,
        cupo_vehicular: deptDraft.aforo_vehicular_activo ? Number(deptDraft.cupo_vehicular) : null,
        activo: selectedDepartamento.activo,
      })
      await fetchCatalogos()
    })
  }

  const handleToggleDepartamento = async () => {
    if (!selectedDepartamento) return
    await withActionFeedback(selectedDepartamento.activo ? 'Desactivando departamento...' : 'Reactivando departamento...', async () => {
      await apiService.updateDepartamento(selectedDepartamento.id, { activo: !selectedDepartamento.activo })
      await fetchCatalogos()
    })
  }

  const handleResetParqueo = async () => {
    if (!selectedDepartamento) return
    await withActionFeedback('Reseteando cupos vehiculares...', async () => {
      await apiService.resetParqueoDepartamento(selectedDepartamento.id)
      await fetchCatalogos()
    })
  }

  const handleCrearMotivo = async () => {
    if (!nuevoMotivo.trim() || !selectedDeptId) return
    await withActionFeedback('Agregando motivo...', async () => {
      await apiService.createMotivo(nuevoMotivo.trim(), tipoMotivo, selectedDeptId)
      setNuevoMotivo('')
      setTipoMotivo('ambos')
      await fetchCatalogos()
    })
  }

  const handleGuardarMotivo = async (item: MotivoCatalogo) => {
    const next = motivoDrafts[item.id] || { nombre: item.nombre, tipo: item.tipo }
    await withActionFeedback('Guardando motivo...', async () => {
      await apiService.updateMotivo(item.id, {
        nombre: next.nombre,
        tipo: next.tipo,
        departamento_id: selectedDeptId,
        activo: item.activo,
      })
      await fetchCatalogos()
    })
  }

  const handleMoverMotivo = async (item: MotivoCatalogo, departamentoId: string) => {
    await withActionFeedback('Moviendo motivo...', async () => {
      await apiService.updateMotivo(item.id, { departamento_id: departamentoId })
      await fetchCatalogos()
    })
  }

  const handleToggleMotivo = async (item: MotivoCatalogo) => {
    await withActionFeedback(item.activo ? 'Desactivando motivo...' : 'Reactivando motivo...', async () => {
      await apiService.updateMotivo(item.id, { activo: !item.activo })
      await fetchCatalogos()
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal catalog-modal-v2">
        <div className="modal-header neutral">
          <div className="modal-header-left">
            <p className="modal-eyebrow">Configuración</p>
            <h2 className="modal-title">Departamentos, motivos y cupos</h2>
          </div>
          <button type="button" onClick={onClose} className="btn-close">×</button>
        </div>

        <div className="catalog-layout">
          {error && <div className="catalog-error">{error}</div>}

          <aside className="catalog-sidebar">
            <div className="catalog-section-title">
              <h3>Departamentos</h3>
              <span>{departamentos.filter((item) => item.activo).length} activos</span>
            </div>

            <div className="catalog-add-inline">
              <input
                className="form-input"
                value={nuevoDepartamento}
                onChange={(event) => setNuevoDepartamento(event.target.value)}
                placeholder="Nuevo departamento"
              />
              <button type="button" className="btn-save" onClick={handleCrearDepartamento} disabled={loading || !!actionMessage}>Agregar</button>
            </div>

            <div className="department-list">
              {departamentos.map((item) => {
                const deptCupo = cupos.find((cupo) => cupo.departamento_id === item.id)
                const deptMotivos = motivos.filter((motivo) => motivo.departamento_id === item.id && motivo.activo).length
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`department-option ${item.id === selectedDeptId ? 'active' : ''} ${item.activo ? '' : 'inactive'}`}
                    onClick={() => setSelectedDeptId(item.id)}
                  >
                    <span className="department-name">{item.nombre}</span>
                    <span className="department-meta">
                      {deptMotivos} motivos
                      {deptCupo?.cupo_vehicular != null ? ` · ${deptCupo.ocupados}/${deptCupo.cupo_vehicular} parqueos` : ' · sin cupo'}
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>

          <main className="catalog-detail">
            {!selectedDepartamento ? (
              <div className="empty-state">Agrega o selecciona un departamento para configurarlo.</div>
            ) : (
              <>
                <section className="dept-config-card">
                  <div className="catalog-section-title">
                    <h3>{selectedDepartamento.nombre}</h3>
                    <span>{selectedDepartamento.activo ? 'Activo' : 'Inactivo'}</span>
                  </div>

                  <div className="dept-config-grid">
                    <label>
                      Nombre del departamento
                      <input
                        className="form-input"
                        value={deptDraft.nombre}
                        onChange={(event) => setDeptDraft((prev) => ({ ...prev, nombre: event.target.value }))}
                      />
                    </label>
                    <label>
                      Control de aforo vehicular
                      <button
                        type="button"
                        className={`aforo-toggle ${deptDraft.aforo_vehicular_activo ? 'active' : ''}`}
                        onClick={() => setDeptDraft((prev) => ({
                          ...prev,
                          aforo_vehicular_activo: !prev.aforo_vehicular_activo,
                          cupo_vehicular: prev.aforo_vehicular_activo ? '' : (prev.cupo_vehicular || '10'),
                        }))}
                      >
                        <span>{deptDraft.aforo_vehicular_activo ? 'Activado' : 'Desactivado'}</span>
                        <strong>{deptDraft.aforo_vehicular_activo ? 'Controlar cupos' : 'Sin límite'}</strong>
                      </button>
                    </label>
                    {deptDraft.aforo_vehicular_activo && (
                      <label>
                        Cupo vehicular máximo
                        <input
                          className="form-input"
                          type="number"
                          min="1"
                          value={deptDraft.cupo_vehicular}
                          onChange={(event) => setDeptDraft((prev) => ({ ...prev, cupo_vehicular: event.target.value }))}
                          placeholder="Ej. 10"
                        />
                      </label>
                    )}
                  </div>

                  <div className="aforo-help">
                    El aforo se descuenta solo con ingresos vehiculares activos. Los ingresos peatonales al mismo departamento o motivo no ocupan parqueadero.
                  </div>

                  <div className={`parking-status ${cupoDepartamento?.lleno ? 'full' : ''}`}>
                    <div>
                      <strong>Parqueo vehicular</strong>
                      <span>
                        {cupoDepartamento?.cupo_vehicular == null
                          ? 'Sin límite configurado'
                          : `${cupoDepartamento.ocupados}/${cupoDepartamento.cupo_vehicular} cupos ocupados`}
                      </span>
                    </div>
                    <button type="button" className="btn-small muted" onClick={handleResetParqueo} disabled={!!actionMessage}>Resetear a cero</button>
                  </div>

                  <div className="catalog-actions">
                    <button type="button" className="btn-save" onClick={handleGuardarDepartamento} disabled={!!actionMessage}>Guardar departamento</button>
                    <button type="button" className="btn-small muted" onClick={handleToggleDepartamento} disabled={!!actionMessage}>
                      {selectedDepartamento.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </div>
                </section>

                <section className="motives-card">
                  <div className="catalog-section-title">
                    <h3>Motivos de {selectedDepartamento.nombre}</h3>
                    <span>{motivosDepartamento.filter((item) => item.activo).length} activos</span>
                  </div>

                  <div className="motive-add-row">
                    <input
                      className="form-input"
                      value={nuevoMotivo}
                      onChange={(event) => setNuevoMotivo(event.target.value)}
                      placeholder="Nuevo motivo"
                    />
                    <select className="form-select" value={tipoMotivo} onChange={(event) => setTipoMotivo(event.target.value as TipoMotivo)}>
                      <option value="ambos">Ambos</option>
                      <option value="peatonal">Peatonal</option>
                      <option value="vehicular">Vehicular</option>
                    </select>
                    <button type="button" className="btn-save" onClick={handleCrearMotivo} disabled={!!actionMessage}>Agregar</button>
                  </div>

                  <div className="motives-list">
                    {motivosDepartamento.length === 0 && (
                      <div className="empty-state compact">Este departamento todavía no tiene motivos.</div>
                    )}
                    {motivosDepartamento.map((item) => (
                      <div key={item.id} className={`motive-row ${item.activo ? '' : 'inactive'}`}>
                        <input
                          className="form-input"
                          value={motivoDrafts[item.id]?.nombre || ''}
                          onChange={(event) => setMotivoDrafts((prev) => ({
                            ...prev,
                            [item.id]: { nombre: event.target.value, tipo: prev[item.id]?.tipo || item.tipo },
                          }))}
                        />
                        <select
                          className="form-select"
                          value={motivoDrafts[item.id]?.tipo || item.tipo}
                          onChange={(event) => setMotivoDrafts((prev) => ({
                            ...prev,
                            [item.id]: { nombre: prev[item.id]?.nombre || item.nombre, tipo: event.target.value as TipoMotivo },
                          }))}
                        >
                          <option value="ambos">Ambos</option>
                          <option value="peatonal">Peatonal</option>
                          <option value="vehicular">Vehicular</option>
                        </select>
                        <select
                          className="form-select"
                          value={selectedDeptId}
                          onChange={(event) => handleMoverMotivo(item, event.target.value)}
                          title="Mover a otro departamento"
                        >
                          {departamentos.map((dept) => <option key={dept.id} value={dept.id}>{dept.nombre}</option>)}
                        </select>
                        <div className="catalog-actions">
                          <button type="button" className="btn-small" onClick={() => handleGuardarMotivo(item)} disabled={!!actionMessage}>Guardar</button>
                          <button type="button" className="btn-small muted" onClick={() => handleToggleMotivo(item)} disabled={!!actionMessage}>
                            {item.activo ? 'Desactivar' : 'Reactivar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
      {actionMessage && <div className="saving-overlay"><div className="saving-box"><span className="saving-spinner" />{actionMessage}</div></div>}
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { apiService } from '@/services/api'
import { CatalogoItem, ExportarIngresosFiltros, MotivoCatalogo } from '@/types'

interface ExportarIngresosModalProps {
  onClose: () => void
}

export const ExportarIngresosModal: React.FC<ExportarIngresosModalProps> = ({ onClose }) => {
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([])
  const [motivos, setMotivos] = useState<MotivoCatalogo[]>([])
  const [dateMode, setDateMode] = useState<'dia' | 'rango'>('dia')
  const [filters, setFilters] = useState<ExportarIngresosFiltros>({
    fecha: new Date().toISOString().split('T')[0],
    tipo: '',
    departamento: '',
    motivo: '',
    estado: '',
  })

  useEffect(() => {
    const load = async () => {
      const data = await apiService.getCatalogos()
      setDepartamentos(data.departamentos.filter((item) => item.activo))
      setMotivos(data.motivos.filter((item) => item.activo))
    }
    load()
  }, [])

  const setFilter = (key: keyof ExportarIngresosFiltros, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleDateModeChange = (mode: 'dia' | 'rango') => {
    setDateMode(mode)
    setFilters((prev) => ({
      ...prev,
      fecha: mode === 'dia' ? (prev.fecha || new Date().toISOString().split('T')[0]) : '',
      fecha_desde: mode === 'rango' ? (prev.fecha_desde || prev.fecha || new Date().toISOString().split('T')[0]) : '',
      fecha_hasta: mode === 'rango' ? (prev.fecha_hasta || prev.fecha || new Date().toISOString().split('T')[0]) : '',
    }))
  }

  const selectedDepartamento = departamentos.find((item) => item.nombre === filters.departamento)
  const filteredMotivos = motivos.filter((item) => {
    const matchesDepartamento = !selectedDepartamento || item.departamento_id === selectedDepartamento.id
    const matchesTipo = !filters.tipo || item.tipo === 'ambos' || item.tipo === filters.tipo
    return matchesDepartamento && matchesTipo
  })

  const handleExportar = () => {
    apiService.exportarIngresos(filters)
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal export-modal">
        <div className="modal-header neutral">
          <div className="modal-header-left">
            <p className="modal-eyebrow">Exportación</p>
            <h2 className="modal-title">Filtros para Excel</h2>
          </div>
          <button type="button" onClick={onClose} className="btn-close">×</button>
        </div>

        <div className="export-modal-body">
          <div className="export-date-mode">
            <button type="button" className={dateMode === 'dia' ? 'active' : ''} onClick={() => handleDateModeChange('dia')}>Por día</button>
            <button type="button" className={dateMode === 'rango' ? 'active' : ''} onClick={() => handleDateModeChange('rango')}>Por rango</button>
          </div>

          {dateMode === 'dia' ? (
            <label>
              Fecha
              <input type="date" value={filters.fecha || ''} onChange={(event) => setFilter('fecha', event.target.value)} />
            </label>
          ) : (
            <>
              <label>
                Desde
                <input type="date" value={filters.fecha_desde || ''} onChange={(event) => setFilter('fecha_desde', event.target.value)} />
              </label>
              <label>
                Hasta
                <input type="date" value={filters.fecha_hasta || ''} onChange={(event) => setFilter('fecha_hasta', event.target.value)} />
              </label>
            </>
          )}
          <label>
            Cédula
            <input
              type="text"
              inputMode="numeric"
              value={filters.numero_cedula || ''}
              onChange={(event) => setFilter('numero_cedula', event.target.value)}
              placeholder="Ej: 1723456789"
            />
          </label>
          <label>
            Tipo de entrada
            <select value={filters.tipo || ''} onChange={(event) => setFilter('tipo', event.target.value)}>
              <option value="">Todos</option>
              <option value="peatonal">Peatonal</option>
              <option value="vehicular">Vehicular</option>
            </select>
          </label>
          <label>
            Departamento
            <select value={filters.departamento || ''} onChange={(event) => setFilter('departamento', event.target.value)}>
              <option value="">Todos</option>
              {departamentos.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}
            </select>
          </label>
          <label>
            Motivo
            <select value={filters.motivo || ''} onChange={(event) => setFilter('motivo', event.target.value)}>
              <option value="">Todos</option>
              {filteredMotivos.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}
            </select>
          </label>
          <label>
            Estado
            <select value={filters.estado || ''} onChange={(event) => setFilter('estado', event.target.value)}>
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="salida">Salió</option>
            </select>
          </label>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-save" onClick={handleExportar}>Exportar Excel</button>
        </div>
      </div>
    </div>
  )
}

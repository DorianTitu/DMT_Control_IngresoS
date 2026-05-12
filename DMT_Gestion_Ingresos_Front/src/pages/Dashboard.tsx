import React, { useEffect, useMemo, useState } from 'react'
import { IconThemeLight, IconThemeDark, IconChevronLeft, IconChevronRight } from '@/icons'
import { DrilldownPanel } from './DrilldownPanel'
import { IngresoDetalleModal } from './IngresoDetalleModal'
import { ExportarIngresosModal } from './ExportarIngresosModal'
import { apiService } from '@/services/api'
import { IngresoRegistro, TipoIngreso } from '@/types'

interface DashboardProps {
  onNewRegistro: () => void
  onToggleTheme: () => void
  onConfig: () => void
  currentTheme: 'dark' | 'light'
}

export const Dashboard: React.FC<DashboardProps> = ({ onNewRegistro, onToggleTheme, onConfig, currentTheme }) => {
  const [activeTab, setActiveTab] = useState<'vehicular' | 'peatonal'>('vehicular')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentPage, setCurrentPage] = useState(0)
  const [drilldownOpen, setDrilldownOpen] = useState<'peatonal' | 'vehicular' | null>(null)
  const [detalleTicket, setDetalleTicket] = useState<{ tipo: TipoIngreso; ticket: string } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [registros, setRegistros] = useState<IngresoRegistro[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ITEMS_PER_PAGE = 5

  const fetchRegistros = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiService.listarIngresosDia(selectedDate)
      setRegistros(response.tickets)
      setCurrentPage(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando registros')
      setRegistros([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegistros()
  }, [selectedDate])

  useEffect(() => {
    const handler = () => fetchRegistros()
    window.addEventListener('dmt-registro-creado', handler)
    return () => window.removeEventListener('dmt-registro-creado', handler)
  }, [selectedDate])

  const rows = useMemo(() => registros.map((item) => ({
    id: item.ticket,
    name: `${item.nombres} ${item.apellidos}`.trim(),
    cedula: item.numero_cedula,
    dept: item.departamento,
    motivo: item.motivo,
    time: item.hora_entrada,
    status: item.estado,
    type: item.tipo,
  })), [registros])

  // Calcular estadísticas por tipo con desglose por departamento
  const getStatsForType = (type: 'peatonal' | 'vehicular') => {
    const filtered = rows.filter(item => item.type === type)
    const deptMap = new Map<string, { total: number; activos: number; salidos: number }>()
    
    filtered.forEach(item => {
      const existing = deptMap.get(item.dept) || { total: 0, activos: 0, salidos: 0 }
      existing.total += 1
      if (item.status === 'activo') {
        existing.activos += 1
      } else {
        existing.salidos += 1
      }
      deptMap.set(item.dept, existing)
    })

    const sorted = Array.from(deptMap.entries())
      .map(([dept, metrics]) => ({ dept, ...metrics }))
      .sort((a, b) => b.total - a.total)

    const total = filtered.length
    const activeCount = filtered.filter(i => i.status === 'activo').length
    const salidosCount = filtered.filter(i => i.status === 'salida').length
    const departmentsWithData = deptMap.size

    return {
      total,
      activeCount,
      salidosCount,
      departmentsWithData,
      byDepartment: sorted,
    }
  }

  const peatonalStats = getStatsForType('peatonal')
  const vehicularStats = getStatsForType('vehicular')

  const filteredData = rows.filter((item) => {
    const matchesType = item.type === activeTab
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.cedula.includes(searchQuery) ||
      item.id.includes(searchQuery)
    return matchesType && matchesSearch
  })

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
  const paginatedData = filteredData.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  )

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handleRegistrarSalida = async (tipo: TipoIngreso, ticket: string) => {
    await apiService.registrarSalida(tipo, ticket)
    await fetchRegistros()
  }

  const currentDate = new Date()
  const dateStr = currentDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="dashboard-container">
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <img src="/logo-salesianos.png" alt="Salesianos San José Artesano" />
          </div>
          <div className="topbar-info">
            <h1 className="topbar-name">Salesianos San José Artesano</h1>
            <p className="topbar-sub">Control de acceso institucional</p>
          </div>
        </div>
        <div className="topbar-center">
          <h2 className="topbar-title">CONTROL DE ACCESO</h2>
          <p className="topbar-date">{dateStr}</p>
        </div>
        <div className="topbar-right">
          <button onClick={onToggleTheme} className="btn-theme" title={`Cambiar a modo ${currentTheme === 'dark' ? 'claro' : 'oscuro'}`}>
            {currentTheme === 'dark' ? (
              <IconThemeLight size={20} color="currentColor" />
            ) : (
              <IconThemeDark size={20} color="currentColor" />
            )}
          </button>
          <button type="button" onClick={onConfig} className="btn-config-main">
            Configurar
          </button>
          <button onClick={onNewRegistro} className="btn-nuevo">
            Nuevo Registro
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-inner">
          <div className="stats-grid">
            <div 
              className="stat-card clickable"
              onClick={() => setDrilldownOpen(drilldownOpen === 'peatonal' ? null : 'peatonal')}
              style={{ cursor: 'pointer' }}
            >
              <p className="stat-label">Ingresos Peatonales</p>
              <p className="stat-value">{peatonalStats.total}</p>
              <p className="stat-sub">registros hoy</p>
            </div>

            <div 
              className="stat-card clickable"
              onClick={() => setDrilldownOpen(drilldownOpen === 'vehicular' ? null : 'vehicular')}
              style={{ cursor: 'pointer' }}
            >
              <p className="stat-label">Ingresos Vehiculares</p>
              <p className="stat-value">{vehicularStats.total}</p>
              <p className="stat-sub">registros hoy</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Total Ingresos</p>
              <p className="stat-value neutral">{peatonalStats.total + vehicularStats.total}</p>
              <p className="stat-sub">registros hoy</p>
            </div>

            <div className="tabs-card">
              <button
                onClick={() => setActiveTab('vehicular')}
                className={`tab-btn ${activeTab === 'vehicular' ? 'active' : 'inactive'}`}
              >
                Vehicular
              </button>
              <button
                onClick={() => setActiveTab('peatonal')}
                className={`tab-btn ${activeTab === 'peatonal' ? 'active' : 'inactive'}`}
              >
                Peatonal
              </button>
            </div>
          </div>

          <div className="toolbar">
            <span className="toolbar-label">Fecha</span>
            <div className="toolbar-date-wrap">
              <button className="toolbar-nav-btn" title="Fecha anterior">
                <IconChevronLeft size={16} color="currentColor" />
              </button>
              <input
                type="date"
                value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
                className="toolbar-date"
              />
              <button className="toolbar-nav-btn" title="Fecha siguiente">
                <IconChevronRight size={16} color="currentColor" />
              </button>
            </div>
            <div className="toolbar-divider"></div>
            <span className="toolbar-label">Buscar</span>
            <input
              type="text"
              placeholder="Nombre, cedula o ticket..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(0)
              }}
              className="toolbar-search"
            />
            <button className="btn-ver" onClick={fetchRegistros}>Actualizar</button>
            <button className="btn-export" onClick={() => setExportOpen(true)}>Exportar</button>
          </div>

          <div className="table-card">
            <div className="table-header">
              <h3 className="table-title">
                Ingresos {activeTab === 'vehicular' ? 'Vehiculares' : 'Peatonales'}
              </h3>
              <span className="table-count">{loading ? 'Cargando...' : `${filteredData.length} registros`}</span>
            </div>

            {error && (
              <div style={{ padding: '10px 16px', color: '#B42318', fontSize: '14px' }}>
                {error}
              </div>
            )}

            {filteredData.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '12%' }}>Ticket</th>
                        <th style={{ width: '21%' }}>Persona</th>
                        <th style={{ width: '15%' }}>Cedula</th>
                        <th style={{ width: '17%' }}>Departamento</th>
                        <th style={{ width: '13%' }}>Motivo</th>
                        <th style={{ width: '10%' }}>Ingreso</th>
                        <th style={{ width: '10%' }}>Estado</th>
                        <th style={{ width: '12%' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item) => (
                        <tr key={item.id}>
                          <td className="td-id">{item.id}</td>
                          <td>{item.name}</td>
                          <td>{item.cedula}</td>
                          <td>{item.dept}</td>
                          <td>{item.motivo}</td>
                          <td>{item.time}</td>
                          <td>
                            {item.status === 'activo' ? (
                              <span className="badge badge-active">Activo</span>
                            ) : (
                              <span className="badge badge-out">Salió</span>
                            )}
                          </td>
                          <td>
                            <div className="row-actions">
                              <button className="btn-action" onClick={() => setDetalleTicket({ tipo: item.type, ticket: item.id })}>Ver detalle</button>
                              {item.status === 'activo' && (
                                <button className="btn-action primary" onClick={() => handleRegistrarSalida(item.type, item.id)}>Salida</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Página {currentPage + 1} de {totalPages}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 0}
                      className="btn-action"
                      style={{
                        opacity: currentPage === 0 ? 0.5 : 1,
                        cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 10px',
                      }}
                    >
                      <IconChevronLeft size={18} color="currentColor" />
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages - 1}
                      className="btn-action"
                      style={{
                        opacity: currentPage >= totalPages - 1 ? 0.5 : 1,
                        cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 10px',
                      }}
                    >
                      <IconChevronRight size={18} color="currentColor" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                No hay registros disponibles
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <span>Sistema desarrollado por Dorian Tituana</span>
      </footer>

      {drilldownOpen && (
        <DrilldownPanel
          type={drilldownOpen}
          departmentMetrics={
            drilldownOpen === 'peatonal' 
              ? peatonalStats.byDepartment.map(d => ({
                  dept: d.dept,
                  totalIngresos: d.total,
                  activos: d.activos,
                  salidos: d.salidos,
                }))
              : vehicularStats.byDepartment.map(d => ({
                  dept: d.dept,
                  totalIngresos: d.total,
                  activos: d.activos,
                  salidos: d.salidos,
                }))
          }
          totalIngresos={drilldownOpen === 'peatonal' ? peatonalStats.total : vehicularStats.total}
          totalActivos={drilldownOpen === 'peatonal' ? peatonalStats.activeCount : vehicularStats.activeCount}
          totalSalidos={drilldownOpen === 'peatonal' ? peatonalStats.salidosCount : vehicularStats.salidosCount}
          onClose={() => setDrilldownOpen(null)}
        />
      )}

      {detalleTicket && (
        <IngresoDetalleModal
          tipo={detalleTicket.tipo}
          ticket={detalleTicket.ticket}
          onClose={() => setDetalleTicket(null)}
          onSaved={fetchRegistros}
        />
      )}

      {exportOpen && (
        <ExportarIngresosModal onClose={() => setExportOpen(false)} />
      )}
    </div>
  )
}

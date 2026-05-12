import React from 'react'
import { IconClose } from '@/icons'

interface DepartmentMetrics {
  dept: string
  totalIngresos: number
  activos: number
  salidos: number
}

interface DrilldownPanelProps {
  type: 'peatonal' | 'vehicular'
  departmentMetrics: DepartmentMetrics[]
  totalIngresos: number
  totalActivos: number
  totalSalidos: number
  onClose: () => void
}

export const DrilldownPanel: React.FC<DrilldownPanelProps> = ({
  type,
  departmentMetrics,
  totalIngresos,
  totalActivos,
  totalSalidos,
  onClose,
}) => {
  const badgeColor = type === 'peatonal' ? '#C0392B' : '#2E86AB'
  const maxOccupancy = Math.max(...departmentMetrics.map(d => d.activos), 1)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px' }}>
        <div className="modal-header" style={{ backgroundColor: badgeColor, padding: '20px 32px' }}>
          <div>
            <span className="modal-eyebrow">Métricas de Control</span>
            <h2 className="modal-title">
              {type === 'peatonal' ? 'Gestión de Plazas Peatonales' : 'Gestión de Estacionamientos'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn-close"
            title="Cerrar"
          >
            <IconClose size={24} color="currentColor" />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '28px', gridTemplateColumns: 'none', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {/* Resumen General */}
          <div className="metrics-summary">
            <div className="summary-card">
              <p className="summary-label">Total Ingresados</p>
              <p className="summary-value" style={{ color: badgeColor }}>
                {totalIngresos}
              </p>
            </div>
            <div className="summary-card">
              <p className="summary-label">Activos Ahora</p>
              <p className="summary-value" style={{ color: '#27AE60' }}>
                {totalActivos}
              </p>
            </div>
            <div className="summary-card">
              <p className="summary-label">Salidos</p>
              <p className="summary-value" style={{ color: '#7F8C8D' }}>
                {totalSalidos}
              </p>
            </div>
            <div className="summary-card">
              <p className="summary-label">Tasa de Ocupación</p>
              <p className="summary-value">
                {totalIngresos > 0 ? ((totalActivos / totalIngresos) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>

          {/* Detalle por Departamento */}
          <div className="dept-details">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: 'var(--text)', letterSpacing: '0.02em' }}>
              Desglose por Departamento
            </h3>
            <div className="dept-grid">
              {departmentMetrics.map((dept, idx) => {
                const occupancyPercent = dept.totalIngresos > 0 
                  ? ((dept.activos / dept.totalIngresos) * 100).toFixed(0)
                  : 0
                const occupancyBar = (dept.activos / maxOccupancy) * 100

                return (
                  <div key={idx} className="dept-card">
                    <div className="dept-header">
                      <span className="dept-name">{dept.dept}</span>
                      <span 
                        className="dept-badge"
                        style={{
                          backgroundColor: `${badgeColor}20`,
                          color: badgeColor,
                        }}
                      >
                        {occupancyPercent}%
                      </span>
                    </div>

                    <div className="dept-bar-container">
                      <div
                        className="dept-bar-fill"
                        style={{
                          width: `${occupancyBar}%`,
                          backgroundColor: badgeColor,
                        }}
                      />
                    </div>

                    <div className="dept-stats">
                      <div className="stat-row">
                        <span className="stat-label">Ingresados</span>
                        <span className="stat-value">{dept.totalIngresos}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Dentro</span>
                        <span className="stat-value" style={{ color: '#27AE60', fontWeight: 600 }}>
                          {dept.activos}
                        </span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Salidos</span>
                        <span className="stat-value">{dept.salidos}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Leyenda */}
          <div className="legend" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#27AE60', borderRadius: '2px' }} />
                <span>Dentro = Personas/Vehículos activos en este departamento</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#7F8C8D', borderRadius: '2px' }} />
                <span>Salidos = Total de personas/vehículos que salieron</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


import React from 'react'

interface SelectModuleProps {
  onSelectPeatonal: () => void
  onSelectVehicular: () => void
  onClose: () => void
}

export const SelectModule: React.FC<SelectModuleProps> = ({
  onSelectPeatonal,
  onSelectVehicular,
  onClose,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal select-modal">
        <div className="modal-header neutral">
          <div className="modal-header-left">
            <p className="modal-eyebrow">Nuevo Registro</p>
            <h2 className="modal-title">Selecciona el tipo de ingreso</h2>
          </div>
          <div className="modal-header-right">
            <button type="button" onClick={onClose} className="btn-close">×</button>
          </div>
        </div>

        <div className="select-modal-content">
          <div className="select-cards">
            <button type="button" className="select-card" onClick={onSelectPeatonal}>
              <div className="select-card-line red"></div>
              <h3 className="select-card-h">Ingreso Peatonal</h3>
              <p className="select-card-p">Persona, cédula y rostro.</p>
              <span className="select-card-cta">Continuar</span>
            </button>

            <button type="button" className="select-card" onClick={onSelectVehicular}>
              <div className="select-card-line brown"></div>
              <h3 className="select-card-h">Ingreso Vehicular</h3>
              <p className="select-card-p">Conductor, vehículo y placa.</p>
              <span className="select-card-cta">Continuar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

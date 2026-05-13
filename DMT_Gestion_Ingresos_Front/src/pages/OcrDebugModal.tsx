import React from 'react'
import { OcrDebugZonasResponse } from '@/types'

interface OcrDebugModalProps {
  data: OcrDebugZonasResponse
  onClose: () => void
}

export const OcrDebugModal: React.FC<OcrDebugModalProps> = ({ data, onClose }) => {
  const recortes = Object.values(data.recortes)

  return (
    <div className="modal-overlay">
      <div className="modal ocr-debug-modal">
        <div className="modal-header neutral">
          <div className="modal-header-left">
            <p className="modal-eyebrow">Diagnóstico OCR</p>
            <h2 className="modal-title">Zonas analizadas</h2>
          </div>
          <button type="button" onClick={onClose} className="btn-close">×</button>
        </div>

        <div className="ocr-debug-body">
          <div className="ocr-debug-main">
            <img src={`data:image/png;base64,${data.imagen_marcada_base64}`} alt="Zonas OCR marcadas" />
          </div>

          <div className="ocr-debug-side">
            <div className="ocr-debug-meta">
              <span>Cédula {data.tipo_cedula}</span>
              <span>Cámara {data.tipo_camara}</span>
              <span>{data.dimensiones_imagen.width}×{data.dimensiones_imagen.height}px</span>
            </div>

            {recortes.map((recorte) => (
              <div key={recorte.label} className="ocr-crop-card">
                <div className="ocr-crop-head">
                  <strong>{recorte.label}</strong>
                  <span>{recorte.zona.join(', ')}</span>
                </div>
                <img src={`data:image/png;base64,${recorte.imagen_base64}`} alt={recorte.label} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

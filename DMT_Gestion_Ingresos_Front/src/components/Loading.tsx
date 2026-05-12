/**
 * Componente Loading
 */

import React from 'react'

export const Loading: React.FC<{ message?: string }> = ({ message = 'Cargando...' }) => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-secondary-600">{message}</p>
      </div>
    </div>
  )
}

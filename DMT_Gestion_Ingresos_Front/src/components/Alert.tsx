/**
 * Componente Alert
 */

import React from 'react'
import { clsx } from '@/utils'

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  onClose?: () => void
}

const alertStyles = {
  success: 'bg-green-50 border-green-200 text-green-700',
  error: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-orange-50 border-orange-200 text-orange-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  return (
    <div
      className={clsx(
        'p-4 rounded-lg border flex items-start justify-between gap-3 animate-in fade-in',
        alertStyles[type]
      )}
    >
      <p>{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 font-semibold hover:opacity-70"
        >
          ✕
        </button>
      )}
    </div>
  )
}

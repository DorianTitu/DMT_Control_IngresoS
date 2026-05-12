/**
 * Componente Card
 */

import React from 'react'
import { clsx } from '@/utils'

interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
  hoverable?: boolean
}

export const Card: React.FC<CardProps> = ({
  title,
  children,
  className,
  hoverable = false,
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-lg shadow-md p-6 border border-gray-100',
        hoverable && 'hover:shadow-lg transition-shadow duration-200 cursor-pointer',
        className
      )}
    >
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      {children}
    </div>
  )
}

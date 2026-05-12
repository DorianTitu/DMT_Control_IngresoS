/**
 * Contexto global de la aplicación
 * Gestiona el estado global sin dependencias externas
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import { IncomeData, MetricsData } from '@/types'

interface AppContextType {
  incomes: IncomeData[]
  metrics: MetricsData | null
  isLoading: boolean
  error: string | null

  setIncomes: (incomes: IncomeData[]) => void
  addIncome: (income: IncomeData) => void
  updateIncome: (id: string, income: IncomeData) => void
  removeIncome: (id: string) => void
  setMetrics: (metrics: MetricsData) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incomes, setIncomes] = useState<IncomeData[]>([])
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addIncome = useCallback((income: IncomeData) => {
    setIncomes((prev) => [...prev, income])
  }, [])

  const updateIncomeData = useCallback((id: string, income: IncomeData) => {
    setIncomes((prev) => prev.map((inc) => (inc.id === id ? income : inc)))
  }, [])

  const removeIncome = useCallback((id: string) => {
    setIncomes((prev) => prev.filter((inc) => inc.id !== id))
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setIncomes([])
    setMetrics(null)
    setError(null)
    setIsLoading(false)
  }, [])

  const value: AppContextType = {
    incomes,
    metrics,
    isLoading,
    error,
    setIncomes,
    addIncome,
    updateIncome: updateIncomeData,
    removeIncome,
    setMetrics,
    setLoading: setIsLoading,
    setError,
    clearError,
    reset,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext debe ser usado dentro de AppProvider')
  }
  return context
}

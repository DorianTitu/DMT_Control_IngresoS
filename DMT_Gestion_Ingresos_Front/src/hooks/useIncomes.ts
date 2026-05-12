/**
 * Custom Hook para gestionar ingresos
 */

import { useEffect, useState } from 'react'
import { useAppContext } from '@/context/AppContext'
import { apiService } from '@/services/api'
import { IncomeData } from '@/types'

export const useIncomes = (autoFetch = true) => {
  const { incomes, setIncomes, addIncome, removeIncome, updateIncome, setLoading, setError } =
    useAppContext()
  const [isRefetching, setIsRefetching] = useState(false)

  const fetchIncomes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getIncomes()
      setIncomes(data)
      return data
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al cargar ingresos'
      setError(errorMsg)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const createIncome = async (data: Omit<IncomeData, 'id'>) => {
    try {
      const newIncome = await apiService.createIncome(data)
      addIncome(newIncome)
      return newIncome
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al crear ingreso'
      setError(errorMsg)
      throw error
    }
  }

  const updateIncomeData = async (id: string, data: Partial<IncomeData>) => {
    try {
      const updated = await apiService.updateIncome(id, data)
      updateIncome(id, updated)
      return updated
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al actualizar ingreso'
      setError(errorMsg)
      throw error
    }
  }

  const deleteIncomeData = async (id: string) => {
    try {
      await apiService.deleteIncome(id)
      removeIncome(id)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al eliminar ingreso'
      setError(errorMsg)
      throw error
    }
  }

  const refetch = async () => {
    setIsRefetching(true)
    try {
      await fetchIncomes()
    } finally {
      setIsRefetching(false)
    }
  }

  useEffect(() => {
    if (autoFetch && incomes.length === 0) {
      fetchIncomes()
    }
  }, [autoFetch])

  return {
    incomes,
    fetchIncomes,
    createIncome,
    updateIncomeData,
    deleteIncomeData,
    refetch,
    isRefetching,
  }
}

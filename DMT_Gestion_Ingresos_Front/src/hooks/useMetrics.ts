/**
 * Custom Hook para métricas
 */

import { useEffect, useState } from 'react'
import { useAppContext } from '@/context/AppContext'
import { apiService } from '@/services/api'

export const useMetrics = (autoFetch = true, refetchInterval?: number) => {
  const { metrics, setMetrics, setLoading, setError } = useAppContext()
  const [isRefetching, setIsRefetching] = useState(false)

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getMetrics()
      setMetrics(data)
      return data
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al cargar métricas'
      setError(errorMsg)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const refetch = async () => {
    setIsRefetching(true)
    try {
      await fetchMetrics()
    } finally {
      setIsRefetching(false)
    }
  }

  useEffect(() => {
    if (autoFetch && !metrics) {
      fetchMetrics()
    }
  }, [autoFetch])

  useEffect(() => {
    if (!refetchInterval) return

    const interval = setInterval(refetch, refetchInterval)
    return () => clearInterval(interval)
  }, [refetchInterval])

  return { metrics, refetch, isRefetching, fetchMetrics }
}

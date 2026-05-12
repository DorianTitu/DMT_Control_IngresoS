/**
 * Custom Hook para manejo de imágenes
 */

import { useCallback } from 'react'
import { useAppContext } from '@/context/AppContext'
import { apiService } from '@/services/api'

export const useImageUpload = () => {
  const { setError } = useAppContext()

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  const uploadImage = useCallback(
    async (file: File, description?: string) => {
      try {
        const base64 = await fileToBase64(file)
        const response = await apiService.uploadImage({
          imageBase64: base64,
          filename: file.name,
          description,
        })
        return response
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error al subir imagen'
        setError(errorMsg)
        throw error
      }
    },
    [fileToBase64, setError]
  )

  return { uploadImage, fileToBase64 }
}

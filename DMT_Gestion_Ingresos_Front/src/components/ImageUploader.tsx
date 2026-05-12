/**
 * Componente ImageUploader
 */

import React, { useRef, useState } from 'react'
import { Card } from './Card'
import { Button } from './Button'
import { Alert } from './Alert'
import { useImageUpload } from '@/hooks'
import { MAX_IMAGE_SIZE_MB, ALLOWED_IMAGE_TYPES, MESSAGES } from '@/constants'
import { clsx } from '@/utils'

interface ImageUploaderProps {
  onSuccess?: (imageUrl: string, filename: string) => void
  onError?: (error: string) => void
  description?: string
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onSuccess,
  onError,
  description,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [filename, setFilename] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { uploadImage } = useImageUpload()

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return MESSAGES.INVALID_FILE
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return `${MESSAGES.FILE_TOO_LARGE} (Máximo: ${MAX_IMAGE_SIZE_MB}MB)`
    }
    return null
  }

  const handleFileSelect = async (file: File) => {
    setError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      onError?.(validationError)
      return
    }

    try {
      setIsLoading(true)

      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
        setFilename(file.name)
      }
      reader.readAsDataURL(file)

      const response = await uploadImage(file, description)
      onSuccess?.(response.imageUrl, file.name)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg)
      onError?.(errorMsg)
      setPreview(null)
      setFilename('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-blue-50', 'border-blue-400')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-blue-50', 'border-blue-400')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-blue-50', 'border-blue-400')
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleClear = () => {
    setPreview(null)
    setFilename('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card title="Subir Imagen">
      <div className="space-y-4">
        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}

        {!preview ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-lg p-8 cursor-pointer transition-all text-center',
              'hover:bg-blue-50 hover:border-blue-400',
              'bg-gray-50 border-gray-300'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <svg
                className="w-10 h-10 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <p className="font-medium text-gray-900">
                Arrastra tu imagen o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-600">
                Máximo {MAX_IMAGE_SIZE_MB}MB - PNG, JPG, GIF, WebP
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600 truncate">{filename}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClear}
                disabled={isLoading}
              >
                Limpiar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

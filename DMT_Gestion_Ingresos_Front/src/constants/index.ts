/**
 * Constantes de la aplicación
 */

export const APP_NAME = 'DMT - Gestión de Ingresos'
export const APP_VERSION = '1.0.0'

export const API_TIMEOUT = 30000

export const MAX_IMAGE_SIZE_MB = 5
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export const DEFAULT_PAGE_SIZE = 10

export const MESSAGES = {
  ERROR_LOAD: 'Error al cargar los datos',
  ERROR_SAVE: 'Error al guardar los datos',
  ERROR_DELETE: 'Error al eliminar los datos',
  SUCCESS_SAVE: 'Datos guardados correctamente',
  SUCCESS_DELETE: 'Datos eliminados correctamente',
  CONFIRM_DELETE: '¿Estás seguro de que deseas eliminar esto?',
  INVALID_FILE: 'Archivo no válido',
  FILE_TOO_LARGE: 'El archivo es demasiado grande',
}

export const COLORS = {
  primary: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
}

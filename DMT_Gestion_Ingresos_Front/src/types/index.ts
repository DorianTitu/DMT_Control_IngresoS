export type TipoIngreso = 'peatonal' | 'vehicular'
export type TipoCedula = 'nueva' | 'antigua'
export type TipoMotivo = TipoIngreso | 'ambos'

export interface CatalogoItem {
  id: string
  nombre: string
  activo: boolean
  cupo_vehicular?: number | null
  parqueo_reset_at?: string | null
}

export interface MotivoCatalogo extends CatalogoItem {
  tipo: TipoMotivo
  departamento_id: string
}

export interface CatalogosResponse {
  departamentos: CatalogoItem[]
  motivos: MotivoCatalogo[]
}

export interface IngresoRegistro {
  ticket: string
  tipo: TipoIngreso
  fecha_ingreso: string
  numero_cedula: string
  nombres: string
  apellidos: string
  departamento: string
  motivo: string
  hora_entrada: string
  hora_salida: string
  estado: 'activo' | 'salida'
}

export interface IngresoDetalle extends IngresoRegistro {
  imagen_usuario_base64?: string
  imagen_cedula_base64?: string
  imagen_placa_base64?: string
}

export interface LeerIngresoResponse {
  exito: boolean
  datos: IngresoDetalle
}

export interface ActualizarIngresoPayload {
  numero_cedula?: string
  nombres?: string
  apellidos?: string
  departamento?: string
  motivo?: string
}

export interface ExportarIngresosFiltros {
  fecha?: string
  fecha_desde?: string
  fecha_hasta?: string
  tipo?: TipoIngreso | ''
  numero_cedula?: string
  departamento?: string
  motivo?: string
  estado?: 'activo' | 'salida' | ''
}

export interface CupoVehicular {
  departamento_id: string
  departamento: string
  cupo_vehicular: number | null
  ocupados: number
  disponibles: number | null
  lleno: boolean
  parqueo_reset_at?: string | null
}

export interface ListarIngresosResponse {
  exito: boolean
  fecha: string
  cantidad_tickets: number
  tickets: IngresoRegistro[]
}

export interface CapturaRegistroResponse {
  exito: boolean
  tipo: TipoIngreso
  imagenes: {
    usuario: string
    cedula: string
    placa?: string
  }
}

export interface ResultadoIA {
  cedula: string
  nombres: string
  apellidos: string
  confianza: number
  cache: boolean
  origen: string
  error?: string
}

export interface ProcesarCedulaResponse {
  tipo_cedula: TipoCedula
  tipo_camara: TipoIngreso
  resultado_ia: ResultadoIA
  ocr_crudo: {
    numero: string
    nombres: string
    apellidos: string
  }
}

export interface CrearIngresoPayload {
  numero_cedula: string
  nombres: string
  apellidos: string
  hora_entrada: string
  departamento: string
  motivo: string
  imagen_usuario_base64: string
  imagen_cedula_base64: string
  imagen_placa_base64?: string
}

export interface CrearIngresoResponse {
  exito: boolean
  mensaje: string
  ticket: string
  fecha_registro: string
  hora_entrada: string
}

export interface MetricsData {
  fecha: string
  total: number
  peatonal: {
    total: number
    activos: number
    salidos: number
    departamentos: Array<{ departamento: string; total: number; activos: number; salidos: number }>
  }
  vehicular: {
    total: number
    activos: number
    salidos: number
    departamentos: Array<{ departamento: string; total: number; activos: number; salidos: number }>
  }
}

// Tipos heredados usados por hooks que todavía no están montados en la UI principal.
export interface IncomeData {
  id: string
  amount?: number
  description?: string
  date?: string
  category?: string
  imageUrl?: string
}

export interface UploadImagePayload {
  imageBase64: string
  filename: string
  description?: string
}

export interface UploadImageResponse {
  success: boolean
  imageUrl: string
  message: string
}

import {
  CapturaRegistroResponse,
  CatalogoItem,
  CatalogosResponse,
  ActualizarIngresoPayload,
  CrearIngresoPayload,
  CrearIngresoResponse,
  CupoVehicular,
  ExportarIngresosFiltros,
  IncomeData,
  LeerIngresoResponse,
  ListarIngresosResponse,
  MetricsData,
  MotivoCatalogo,
  ProcesarCedulaResponse,
  TipoCedula,
  TipoIngreso,
  TipoMotivo,
  UploadImagePayload,
  UploadImageResponse,
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_TIMEOUT = 60000

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const detail = await response.text()
        throw new Error(`API Error ${response.status}: ${detail || response.statusText}`)
      }

      return response.json() as Promise<T>
    } catch (error) {
      clearTimeout(timeout)
      console.error('API Request Error:', error)
      throw error
    }
  }

  listarIngresosDia(fecha: string): Promise<ListarIngresosResponse> {
    return this.request<ListarIngresosResponse>(`/ingresos/listar/dia?fecha=${encodeURIComponent(fecha)}`)
  }

  getMetrics(fecha?: string): Promise<MetricsData> {
    const qs = fecha ? `?fecha=${encodeURIComponent(fecha)}` : ''
    return this.request<MetricsData>(`/metrics${qs}`)
  }

  capturarRegistro(tipo: TipoIngreso): Promise<CapturaRegistroResponse> {
    return this.request<CapturaRegistroResponse>(`/camaras/capturar-registro?tipo=${tipo}`)
  }

  procesarCedulaConIA(
    imagenBase64: string,
    tipoCedula: TipoCedula,
    tipoCamara: TipoIngreso,
  ): Promise<ProcesarCedulaResponse> {
    return this.request<ProcesarCedulaResponse>('/ia/cedula/procesar', {
      method: 'POST',
      body: JSON.stringify({
        imagen_base64: imagenBase64,
        tipo_cedula: tipoCedula,
        tipo_camara: tipoCamara,
      }),
    })
  }

  crearIngreso(tipo: TipoIngreso, data: CrearIngresoPayload): Promise<CrearIngresoResponse> {
    const endpoint = tipo === 'peatonal' ? '/ingresos-peatonal/create' : '/ingresos-vehicular/create'
    return this.request<CrearIngresoResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  registrarSalida(tipo: TipoIngreso, ticket: string): Promise<{ exito: boolean; ticket: string; hora_salida: string; estado: string }> {
    const endpoint = tipo === 'peatonal' ? `/ingresos-peatonal/${ticket}/salida` : `/ingresos-vehicular/${ticket}/salida`
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify({}),
    })
  }

  leerIngreso(tipo: TipoIngreso, ticket: string): Promise<LeerIngresoResponse> {
    const endpoint = tipo === 'peatonal' ? `/ingresos-peatonal/${ticket}` : `/ingresos-vehicular/${ticket}`
    return this.request<LeerIngresoResponse>(endpoint)
  }

  actualizarIngreso(tipo: TipoIngreso, ticket: string, data: ActualizarIngresoPayload): Promise<{ exito: boolean; ticket: string; mensaje: string }> {
    const endpoint = tipo === 'peatonal' ? `/ingresos-peatonal/${ticket}` : `/ingresos-vehicular/${ticket}`
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  exportarIngresos(filtros: ExportarIngresosFiltros): void {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    window.location.href = `${API_BASE_URL}/ingresos/exportar?${params.toString()}`
  }

  healthCheck(): Promise<{ estado: string }> {
    return this.request<{ estado: string }>('/health')
  }

  getCatalogos(): Promise<CatalogosResponse> {
    return this.request<CatalogosResponse>('/catalogos')
  }

  async getDepartamentos(): Promise<CatalogoItem[]> {
    const data = await this.request<{ departamentos: CatalogoItem[] }>('/catalogos/departamentos')
    return data.departamentos
  }

  async getMotivos(tipo?: TipoIngreso, departamentoId?: string): Promise<MotivoCatalogo[]> {
    const params = new URLSearchParams()
    if (tipo) params.set('tipo', tipo)
    if (departamentoId) params.set('departamento_id', departamentoId)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const data = await this.request<{ motivos: MotivoCatalogo[] }>(`/catalogos/motivos${qs}`)
    return data.motivos
  }

  createDepartamento(nombre: string, cupoVehicular?: number | null): Promise<CatalogoItem> {
    return this.request<CatalogoItem>('/catalogos/departamentos', {
      method: 'POST',
      body: JSON.stringify({ nombre, cupo_vehicular: cupoVehicular }),
    })
  }

  updateDepartamento(id: string, payload: Partial<Pick<CatalogoItem, 'nombre' | 'activo' | 'cupo_vehicular'>>): Promise<CatalogoItem> {
    return this.request<CatalogoItem>(`/catalogos/departamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  resetParqueoDepartamento(id: string): Promise<CatalogoItem> {
    return this.request<CatalogoItem>(`/catalogos/departamentos/${id}/reset-parqueo`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  deleteDepartamento(id: string): Promise<CatalogoItem> {
    return this.request<CatalogoItem>(`/catalogos/departamentos/${id}`, {
      method: 'DELETE',
    })
  }

  createMotivo(nombre: string, tipo: TipoMotivo, departamentoId: string): Promise<MotivoCatalogo> {
    return this.request<MotivoCatalogo>('/catalogos/motivos', {
      method: 'POST',
      body: JSON.stringify({ nombre, tipo, departamento_id: departamentoId }),
    })
  }

  updateMotivo(id: string, payload: Partial<Pick<MotivoCatalogo, 'nombre' | 'tipo' | 'departamento_id' | 'activo'>>): Promise<MotivoCatalogo> {
    return this.request<MotivoCatalogo>(`/catalogos/motivos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  async getCuposVehiculares(): Promise<CupoVehicular[]> {
    const data = await this.request<{ cupos: CupoVehicular[] }>('/vehicular/cupos')
    return data.cupos
  }

  deleteMotivo(id: string): Promise<MotivoCatalogo> {
    return this.request<MotivoCatalogo>(`/catalogos/motivos/${id}`, {
      method: 'DELETE',
    })
  }

  async getIncomes(): Promise<IncomeData[]> {
    const today = new Date().toISOString().split('T')[0]
    const data = await this.listarIngresosDia(today)
    return data.tickets.map((item) => ({
      id: item.ticket,
      description: `${item.nombres} ${item.apellidos}`,
      date: item.fecha_ingreso,
      category: item.tipo,
    }))
  }

  async createIncome(data: Omit<IncomeData, 'id'>): Promise<IncomeData> {
    return { ...data, id: crypto.randomUUID() }
  }

  async updateIncome(id: string, data: Partial<IncomeData>): Promise<IncomeData> {
    return { id, ...data }
  }

  async deleteIncome(_id: string): Promise<void> {
    return
  }

  async uploadImage(_payload: UploadImagePayload): Promise<UploadImageResponse> {
    throw new Error('Carga manual de imágenes no está conectada al backend actual')
  }
}

export const apiService = new ApiService()

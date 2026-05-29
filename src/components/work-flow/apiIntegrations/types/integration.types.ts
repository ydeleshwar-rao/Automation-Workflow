// // features/integrations/types.ts

export interface IntegrationEngine<T = any> {
  onSetup?: (eventData: any) => Promise<T>
  onConfigure?: (eventData: any) => Promise<T>
  onTest?: (eventData: any) => Promise<T>
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}
export interface WebhookData {
  id: string;
  data: any;
  timestamp: string;
  headers?: Record<string, string>;
  method: string;
}

export interface WebhookResponse {
  status: 'success' | 'error' | 'waiting';
  message: string;
  payload?: WebhookData;
}

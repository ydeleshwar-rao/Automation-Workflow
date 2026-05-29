


export type WebhookMethod = "GET" | "POST" | "PUT" | "DELETE"

export type WebhookMode = "test" | "live"

export type WebhookStatus = "active" | "inactive"

// export interface CreateWebhookResponse {
//   id:string
//   full_url: string
// }
// export interface Response {
//   "success": boolean,
//   "message":string,
//   "data": string
// }

export interface CreateWebhookResponse {
  id: string
  full_url: string
}


export interface CreateWebhookPayload {
  name: string
 // method: "POST" | "GET"
  action_type: string
  workflow_id: string
 // mode: "test" | "live"
 user_id: string
}
/** Row from GET webhook events — body may appear under several keys (see `parseWebhookRequestBody.ts`). */
export interface GetWebhookResponse {
  id: string;
  webhook_id?: string;
  request_body?: Record<string, any>;
  requestBody?: Record<string, any>;
  body?: Record<string, any>;
  payload?: Record<string, any>;
  data?: Record<string, any>;
  request?: Record<string, unknown>;
}

export interface UpdateWebhookPayload {
  request_body: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}






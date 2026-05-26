// Mail API — Type Definitions

// ─── SMTP Connection ──────────────────────────────────────────────────────────
// Connections are global — no location_id.
// created_by is the admin/developer UUID who registered the account.

export interface CreateSmtpConnectionPayload {
  name: string;
  host: string;
  port: number;
  username: string;
  encrypted_password: string;
  use_tls: boolean;
}

export interface SmtpConnection {
  id: string;
  created_by: string;
  name: string;
  host: string;
  port: number;
  use_tls: boolean;
  status: "active" | "inactive";
  total_sent: number;
  total_failed: number;
  created_at: string;
}

export interface CreateSmtpConnectionResponse {
  success: boolean;
  message: string;
  data: { data: SmtpConnection };
}

export interface GetConnectionsResponse {
  success: boolean;
  message: string;
  data: SmtpConnection[];
}

// ─── Send Email ───────────────────────────────────────────────────────────────
// location_id removed — backend derives user context from the auth token

export interface SendEmailPayload {
  smtp_id: string;
  name?: string;
  subject: string;
  html_template: string;
  body?: string;
  to_email: string;
  cc?: string[];
  bcc?: string[];
  attachments?: string[];
  data?: Record<string, any>;
}

export interface SendEmailResponse {
  success: boolean;
  message: string;
  data: { status: "success" | "failed"; error?: string };
}

// ─── Email Logs ───────────────────────────────────────────────────────────────
// user_id tracks which user triggered the send

export interface EmailLog {
  id: string;
  user_id: string;
  smtp_id: string;
  template_id: string;
  to_email: string;
  subject: string;
  status: "success" | "failed";
  error_message: string | null;
  attempt_count: number;
  sent_at: string;
  cc: string[];
  bcc: string[];
  created_at: string;
}

export interface GetEmailLogsResponse {
  success: boolean;
  message: string;
  data: EmailLog[];
}

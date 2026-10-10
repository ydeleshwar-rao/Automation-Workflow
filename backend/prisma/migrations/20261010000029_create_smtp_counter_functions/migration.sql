-- Functions: increment_total_mail_sent / increment_total_mail_failed
-- Called via supabase.rpc() by the mail service to count sent/failed emails per SMTP connection.

CREATE OR REPLACE FUNCTION increment_total_mail_sent(smtp_id_input UUID)
RETURNS VOID LANGUAGE sql AS $$
  UPDATE "smtp_connections" SET "total_sent" = "total_sent" + 1 WHERE "id" = smtp_id_input;
$$;

CREATE OR REPLACE FUNCTION increment_total_mail_failed(smtp_id_input UUID)
RETURNS VOID LANGUAGE sql AS $$
  UPDATE "smtp_connections" SET "total_failed" = "total_failed" + 1 WHERE "id" = smtp_id_input;
$$;

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "user_id" TEXT NOT NULL,
    "phone_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "webhook_url" TEXT,
    "webhook_secret" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "whatsapp_auth_keys" (
    "user_id" TEXT NOT NULL,
    "key_id" TEXT NOT NULL,
    "key_data" JSONB NOT NULL,

    CONSTRAINT "whatsapp_auth_keys_pkey" PRIMARY KEY ("user_id","key_id")
);

-- CreateTable
CREATE TABLE "google_forms_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "needs_reauth" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_forms_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_sheets_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "needs_reauth" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_sheets_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zoho_inventory_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "organization_id" TEXT NOT NULL DEFAULT '',
    "needs_reauth" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zoho_inventory_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zoho_forms_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "needs_reauth" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zoho_forms_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "razorpay_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "key_id" TEXT NOT NULL,
    "key_secret" TEXT NOT NULL,
    "webhook_secret" TEXT,
    "razorpay_webhook_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "razorpay_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ghl_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ghl_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_input_webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "payload" JSONB NOT NULL,
    "headers" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_input_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polling_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "integration_key" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "poll_interval" INTEGER NOT NULL DEFAULT 300,
    "cursor_value" TEXT,
    "last_polled_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "polling_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polling_seen_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscription_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "polling_seen_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_checkpoints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "integration" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "last_page" INTEGER NOT NULL DEFAULT 0,
    "records_synced" INTEGER NOT NULL DEFAULT 0,
    "cooldown_minutes" INTEGER NOT NULL DEFAULT 15,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "response_status" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_form_watches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "form_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMPTZ(6),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_form_watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_sheet_watches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "spreadsheet_id" TEXT NOT NULL,
    "sheet_name" TEXT NOT NULL DEFAULT 'Sheet1',
    "trigger_type" TEXT NOT NULL,
    "last_row_count" INTEGER NOT NULL DEFAULT 0,
    "last_synced_at" TIMESTAMPTZ(6),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_sheet_watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_sheet_row_fingerprints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "watch_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_sheet_row_fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zoho_form_webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "form_id" TEXT NOT NULL,
    "webhook_url" TEXT NOT NULL,
    "zoho_webhook_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zoho_form_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "smtp_id" UUID,
    "to_email" TEXT NOT NULL,
    "cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bcc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_client_access" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "client_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_client_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_whatsapp_auth_keys_user" ON "whatsapp_auth_keys"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_forms_integrations_user_id_key" ON "google_forms_integrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_sheets_integrations_user_id_key" ON "google_sheets_integrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "zoho_inventory_integrations_user_id_key" ON "zoho_inventory_integrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "zoho_forms_integrations_user_id_key" ON "zoho_forms_integrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_integrations_user_id_key" ON "razorpay_integrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ghl_tokens_location_id_key" ON "ghl_tokens"("location_id");

-- CreateIndex
CREATE INDEX "lead_input_webhooks_client_id_idx" ON "lead_input_webhooks"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "polling_subscriptions_node_id_key" ON "polling_subscriptions"("node_id");

-- CreateIndex
CREATE INDEX "polling_subscriptions_workflow_id_idx" ON "polling_subscriptions"("workflow_id");

-- CreateIndex
CREATE INDEX "polling_subscriptions_user_id_idx" ON "polling_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "polling_subscriptions_is_active_error_count_last_polled_at_idx" ON "polling_subscriptions"("is_active", "error_count", "last_polled_at");

-- CreateIndex
CREATE UNIQUE INDEX "polling_seen_records_subscription_id_external_id_key" ON "polling_seen_records"("subscription_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "sync_checkpoints_user_id_integration_entity_key" ON "sync_checkpoints"("user_id", "integration", "entity");

-- CreateIndex
CREATE INDEX "webhook_attempts_event_id_idx" ON "webhook_attempts"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_form_watches_user_id_form_id_key" ON "google_form_watches"("user_id", "form_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_sheet_watches_user_id_spreadsheet_id_sheet_name_trig_key" ON "google_sheet_watches"("user_id", "spreadsheet_id", "sheet_name", "trigger_type");

-- CreateIndex
CREATE UNIQUE INDEX "google_sheet_row_fingerprints_watch_id_row_number_key" ON "google_sheet_row_fingerprints"("watch_id", "row_number");

-- CreateIndex
CREATE UNIQUE INDEX "zoho_form_webhooks_user_id_form_id_key" ON "zoho_form_webhooks"("user_id", "form_id");

-- CreateIndex
CREATE INDEX "email_logs_user_id_idx" ON "email_logs"("user_id");

-- CreateIndex
CREATE INDEX "user_client_access_client_user_id_idx" ON "user_client_access"("client_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_client_access_user_id_client_user_id_key" ON "user_client_access"("user_id", "client_user_id");

-- AddForeignKey
ALTER TABLE "google_forms_integrations" ADD CONSTRAINT "google_forms_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "google_sheets_integrations" ADD CONSTRAINT "google_sheets_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "zoho_inventory_integrations" ADD CONSTRAINT "zoho_inventory_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "zoho_forms_integrations" ADD CONSTRAINT "zoho_forms_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "razorpay_integrations" ADD CONSTRAINT "razorpay_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "polling_subscriptions" ADD CONSTRAINT "polling_subscriptions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "polling_subscriptions" ADD CONSTRAINT "polling_subscriptions_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "workflow_nodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "polling_subscriptions" ADD CONSTRAINT "polling_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "polling_seen_records" ADD CONSTRAINT "polling_seen_records_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "polling_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sync_checkpoints" ADD CONSTRAINT "sync_checkpoints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "webhook_attempts" ADD CONSTRAINT "webhook_attempts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "webhook_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "google_form_watches" ADD CONSTRAINT "google_form_watches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "google_sheet_watches" ADD CONSTRAINT "google_sheet_watches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "google_sheet_row_fingerprints" ADD CONSTRAINT "google_sheet_row_fingerprints_watch_id_fkey" FOREIGN KEY ("watch_id") REFERENCES "google_sheet_watches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "zoho_form_webhooks" ADD CONSTRAINT "zoho_form_webhooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_smtp_id_fkey" FOREIGN KEY ("smtp_id") REFERENCES "smtp_connections"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_client_access" ADD CONSTRAINT "user_client_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_client_access" ADD CONSTRAINT "user_client_access_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;


import { Router } from "express";
import { createApp } from "./config/app.config.js";
import { API_PREFIX } from "./config/api.config.js";
import { metricsMiddleware, metricsHandler } from "./middlewares/metrics.middleware.js";
import leadsHubRouter from "./modules/leadshub/leadshub.routes.js";
import webhooksRoutes from "./modules/webhooks/dynamicApis/routes/webhook.route.js"
import { handleIncomingWebhook } from "./modules/webhooks/dynamicApis/controllers/webhook.controller.js"
import emailRoutes from "./modules/mail/smtp-connection/routes/mail.routes.js"
import automationRoutes from "./modules/workflow-automation/workflow-automation.routes.js"
import { errorHandler } from "./middlewares/errorHandler.js";

import servicem8Routes from "./modules/initgrations/serviceM8/route/serviceM8.routes.js"
import authRoutes from "./modules/auth/routes/auth.routes.js"
import accessRoutes from "./modules/access/access.routes.js"
import ssoRoutes from "./modules/sso/sso.routes.js"

import commusoftRoutes from "./modules/initgrations/commusoft/route/commusoft.routes.js"
import simproRoutes from "./modules/initgrations/simpro/route/simpro.routes.js"
import zohoRoutes from "./modules/initgrations/zoho/route/zoho.routes.js"
import whatsappRoutes from "./modules/initgrations/whatsapp/route/whatsapp.routes.js"
import zohoFormsRoutes from "./modules/initgrations/zohoForms/route/zohoForms.routes.js"
import googleFormsRoutes from "./modules/initgrations/googleForms/route/googleForms.routes.js"
import googleSheetsRoutes from "./modules/initgrations/googleSheets/route/googleSheets.routes.js"
import razorpayRoutes from "./modules/initgrations/razorpay/route/razorpay.routes.js"
import bigqueryRoutes from "./modules/bigquery/route/bigqueryClients.routes.js"
import webhookEngineReceiverRoutes from "./modules/webhook-engine/webhook.routes.js"
import pollingRouter from "./modules/polling-engine/polling.routes.js"
import aiWorkflowRouter from "./modules/ai-workflow/ai-workflow.router.js"

import {
  globalRateLimiter,
  integrationRateLimiter,
  getRateLimitEvents,
} from "./middlewares/rateLimiter.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";
import { requireRole } from "./middlewares/access.middleware.js";

const app = createApp();

app.use(metricsMiddleware);
app.get("/metrics", metricsHandler);

// ─── Global rate limiter — applied to every route ────────────────────────────
app.use(globalRateLimiter);

// ─── Versioned API: every route lives under /api/v1 ─────────────────────────
const v1 = Router();

v1.use("/auth", authRoutes);           // login / signup / refresh token
v1.use("/access", accessRoutes);       // role-based access (clients, assignments, permissions)
v1.use("/sso", ssoRoutes);            // company SSO + Google/Microsoft sign-in
v1.use("/leadshub", leadsHubRouter);
v1.use(webhooksRoutes)                 // dynamic webhooks: /webhooks, /getwebhook/:id/event
v1.use("/mail", emailRoutes)
v1.use("/automation", automationRoutes);
v1.use("/ai-workflow", authMiddleware, aiWorkflowRouter);

// Third-party integration routes — additional per-user rate limiting
v1.use("/servicem8", integrationRateLimiter, servicem8Routes);
v1.use("/commusoft", integrationRateLimiter, commusoftRoutes);
v1.use("/simpro", integrationRateLimiter, simproRoutes);
v1.use("/zoho", integrationRateLimiter, zohoRoutes);
v1.use("/whatsapp", authMiddleware, integrationRateLimiter, whatsappRoutes);
v1.use("/zoho-forms", integrationRateLimiter, zohoFormsRoutes);
v1.use("/google-forms", integrationRateLimiter, googleFormsRoutes);
v1.use("/google-sheets", integrationRateLimiter, googleSheetsRoutes);
v1.use("/razorpay", integrationRateLimiter, razorpayRoutes);
v1.use("/bigquery", integrationRateLimiter, bigqueryRoutes);

// Polling engine (subscriptions + manual poll-now)
v1.use("/polling", integrationRateLimiter, pollingRouter);

// Vendor-facing webhook receiver (ServiceM8, GHL, Commusoft push events arrive here)
v1.use("/webhooks-receiver", webhookEngineReceiverRoutes);

// ─── Admin: rate limit event log (admin / developer only) ────────────────────
v1.get(
  "/admin/rate-limit-logs",
  authMiddleware,
  requireRole("admin", "developer"),
  (_req, res) => {
    const events = getRateLimitEvents();
    res.json({ success: true, count: events.length, events });
  }
);

app.use(API_PREFIX, v1);

// ─── Legacy unversioned inbound webhook URLs ─────────────────────────────────
// Already stored in the DB (webhook full_url) and registered with vendors, so
// keep accepting them. New URLs are generated under /api/v1.
app.all("/api/webhooks/:hookPath", handleIncomingWebhook);
app.use("/api/webhooks-receiver", webhookEngineReceiverRoutes);

// Global error handler
app.use(errorHandler);

export default app;

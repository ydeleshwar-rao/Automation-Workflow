import nodemailer from "nodemailer";
import { rsaDecrypt, aesEncrypt, aesDecrypt } from "../../../../utils/smtp-crypto.util.js";
import { smtpLogger as log } from "../../../../utils/logger.js";
import { ApiError } from "../../../../utils/ApiError.js";
import {
  smtpConnectionRepository,
  type CreateEmailLogInput,
  type PublicSmtpConnection,
} from "../repositories/smtp-connection.repository.js";

const SMTPS_PORT = 465;

/** The table column is user_id; the API has always exposed it as created_by. */
function toConnectionResponse({ user_id, ...connection }: PublicSmtpConnection) {
  return { ...connection, created_by: user_id };
}

/** Logging and counting must never change the send result, so failures here are only logged. */
async function recordEmailOutcome(emailLog: CreateEmailLogInput) {
  try {
    await smtpConnectionRepository.createEmailLog(emailLog);
    if (emailLog.status === "success") {
      await smtpConnectionRepository.incrementSentCount(emailLog.smtp_id);
    } else {
      await smtpConnectionRepository.incrementFailedCount(emailLog.smtp_id);
    }
  } catch (error: any) {
    log.error("failed to record email outcome", { smtpId: emailLog.smtp_id, error: error.message });
  }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Build a lookup: normalized key → value, for fuzzy matching prefixed tokens.
function buildNormMap(data: Record<string, any>): Map<string, string> {
  const m = new Map<string, string>();
  for (const key in data) {
    // Strip node-id prefix like "315896032__" before normalizing
    const bare = key.replace(/^[^_]+__/, "");
    m.set(normalize(bare), String(data[key]));
    m.set(normalize(key), String(data[key]));
  }
  return m;
}

function mapTemplate(html: string, data: Record<string, any>): string {
  const normMap = buildNormMap(data);

  // 1. Resolve {{map:fieldId|label|fallback}} tokens
  let output = html.replace(
    /\{\{map:([^|]*)\|([^|]*)\|([^}]*)\}\}/g,
    (_, fieldId, label, fallback) => {
      const v = data[fieldId] ?? data[label] ?? normMap.get(normalize(fieldId)) ?? normMap.get(normalize(label));
      return v !== undefined ? String(v) : fallback;
    }
  );

  // 2. Resolve exact {{key}} matches
  for (const key in data) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, "g"), String(data[key]));
  }

  // 3. Resolve prefixed tokens like {{315896032__firstName}} by stripping the prefix and fuzzy-matching
  output = output.replace(/\{\{(?!map:)([^}]+)\}\}/g, (match, raw) => {
    // Try stripping node-id prefix
    const bare = raw.replace(/^[^_]+__/, "");
    const val = normMap.get(normalize(bare)) ?? normMap.get(normalize(raw));
    return val !== undefined ? val : match;
  });

  return output;
}

// ── Create SMTP ───────────────────────────────────────────────────────────────
// created_by is injected by the controller from req.user.id (admin/developer only).
// Credentials arrive RSA-encrypted — never plaintext in DevTools.
export async function createSmtpConnection(payload: any) {
  const { name, host, port, username, encrypted_password, use_tls, created_by } = payload;

  const cleanHost = (host as string).trim();
  const cleanUsername = (username as string).trim();

  const plainPassword = rsaDecrypt(encrypted_password);

  const transporter = nodemailer.createTransport({
    host: cleanHost,
    port,
    secure: port === SMTPS_PORT,
    auth: { user: cleanUsername, pass: plainPassword },
  });

  log.info("verifying SMTP connection", { host: cleanHost, port, username: cleanUsername, createdBy: created_by });

  await transporter.verify();

  log.info("SMTP verified", { host: cleanHost, port });

  // AES-256-GCM at rest — DB stores only ciphertext
  const connection = await smtpConnectionRepository.create({
    user_id: created_by,
    name: name?.trim() || cleanUsername,
    host: cleanHost,
    port,
    username: aesEncrypt(cleanUsername),
    encrypted_password: aesEncrypt(plainPassword),
    use_tls: use_tls ?? true,
  });

  log.info("SMTP account created", {
    smtpId: connection.id,
    name: connection.name,
    host: connection.host,
    port: connection.port,
    useTls: connection.use_tls,
    createdBy: connection.user_id,
  });

  return { data: toConnectionResponse(connection) };
}

// ── Send Email ────────────────────────────────────────────────────────────────
// user_id injected by controller from req.user.id.
// Logs are per-user (user_id). Templates are not stored — the HTML is rendered and sent.
export async function sendAndSaveEmail(payload: any) {
  const {
    smtp_id,
    user_id,
    name,
    subject,
    html_template,
    body,
    to_email,
    cc = [],
    bcc = [],
    attachments = [],
    data = {},
  } = payload;

  if (!smtp_id || !user_id || !to_email || !subject || !html_template) {
    throw new Error("Missing required fields");
  }

  const smtp = await smtpConnectionRepository.findActiveById(smtp_id);
  if (!smtp) {
    log.error("active SMTP not found", { smtpId: smtp_id, userId: user_id, to: to_email });
    throw new ApiError(404, "Active SMTP not found");
  }

  log.info("SMTP resolved", {
    smtpId: smtp.id,
    smtpName: smtp.name,
    host: smtp.host,
    port: smtp.port,
    userId: user_id,
    to: to_email,
    subject,
  });

  const plainPassword = aesDecrypt(smtp.encrypted_password);
  const plainUsername = aesDecrypt(smtp.username);

  const finalHtml = mapTemplate(html_template, data);
  const finalBody = body ? mapTemplate(body, data) : undefined;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === SMTPS_PORT,
    auth: { user: plainUsername, pass: plainPassword },
  });

  const emailLogBase = { user_id, smtp_id, to_email, cc, bcc, attachments, subject };

  try {
    await transporter.sendMail({
      from: `"${name || plainUsername}" <${plainUsername}>`,
      to: to_email,
      cc,
      bcc,
      replyTo: plainUsername,
      subject,
      html: finalHtml,
      ...(finalBody !== undefined ? { text: finalBody } : {}),
    });
  } catch (error: any) {
    await recordEmailOutcome({ ...emailLogBase, status: "failed", error_message: error.message });

    log.error("email send failed", {
      smtpId: smtp.id,
      smtpName: smtp.name,
      host: smtp.host,
      userId: user_id,
      to: to_email,
      subject,
      error: error.message,
    });

    return { status: "failed", error: error.message };
  }

  await recordEmailOutcome({ ...emailLogBase, status: "success", error_message: null });

  log.info("email sent", {
    smtpId: smtp.id,
    smtpName: smtp.name,
    host: smtp.host,
    userId: user_id,
    to: to_email,
    subject,
    cc: cc.length ? cc : undefined,
    bcc: bcc.length ? bcc : undefined,
    status: "success",
  });

  return { status: "success" };
}

// ── Connections ───────────────────────────────────────────────────────────────
// Global — all authenticated users see all SMTP connections.
// Never returns username or encrypted_password to the client.
export async function getConnectionsService() {
  const connections = await smtpConnectionRepository.findAllPublic();
  return connections.map(toConnectionResponse);
}

// ── Logs ──────────────────────────────────────────────────────────────────────
// Each user sees only the emails they triggered.
export function getEmailLogs(userId: string) {
  return smtpConnectionRepository.findEmailLogsByUserId(userId);
}

import { ApiError } from "../../../../utils/ApiError.js";
import { whatsappRepository } from "../repository/whatsapp.repository.js";
import {
  createSession,
  getSession,
  terminateSession,
  resetSessionForNewQr,
  formatJid,
} from "../session/session.manager.js";
import type {
  WASendTextPayload,
  WASendMediaPayload,
  WASendLocationPayload,
  WASendContactPayload,
  WASendButtonsPayload,
  WASendListPayload,
  WABulkMessageItem,
  WACreateGroupPayload,
} from "../types/whatsapp.types.js";

// ─── Internal helpers ─────────────────────────────────────────────────────────

const requireConnected = (userId: string) => {
  const sess = getSession(userId);
  if (!sess) {
    throw new ApiError(
      400,
      "WhatsApp not connected. Call POST /whatsapp/connect first."
    );
  }
  if (sess.status !== "connected") {
    throw new ApiError(
      400,
      `WhatsApp status is "${sess.status}". Wait for the connection to open.`
    );
  }
  return sess.socket;
};

const getSessionRow = (userId: string) => whatsappRepository.findSession(userId);

// ─── Service ──────────────────────────────────────────────────────────────────

export class WhatsAppService {

  // ── Connection ──────────────────────────────────────────────────────────────

  static async connect(userId: string, options: { reset?: boolean } = {}) {
    const sess = getSession(userId);
    const row = await getSessionRow(userId);

    if (sess?.status === "connected") {
      return {
        message: "WhatsApp is already connected.",
        status: "connected",
        phone_number: sess.phoneNumber,
      };
    }
    if (options.reset) {
      await resetSessionForNewQr(userId);
      await createSession(userId);
      return {
        message: "Previous WhatsApp credentials cleared. Poll GET /whatsapp/qr for the new QR code.",
        status: "connecting",
      };
    }
    if (sess?.status === "connecting" || sess?.status === "qr_ready") {
      return {
        message: "WhatsApp session already started. Poll GET /whatsapp/qr for the QR code.",
        status: sess.status,
        qr: sess.qrCode,
        phone_number: sess.phoneNumber,
      };
    }

    if (row?.status && row.status !== "disconnected") {
      await createSession(userId);
      return {
        message: "WhatsApp session restored. Poll GET /whatsapp/status for connection status.",
        status: "connecting",
        phone_number: row.phone_number ?? null,
      };
    }

    await createSession(userId);
    return {
      message: "WhatsApp session initiated. Poll GET /whatsapp/qr for the QR code.",
      status: "connecting",
    };
  }

  static async getQrCode(userId: string) {
    const sess = getSession(userId);
    const row = await getSessionRow(userId);

    if (!sess) {
      if (row?.status === "connected") {
        await createSession(userId);
        return {
          status: "connecting",
          qr: null,
          phone_number: row.phone_number ?? null,
          message: "Restoring WhatsApp session - retry in a few seconds.",
        };
      }

      await createSession(userId);
      return { status: "connecting", qr: null, message: "Session starting - retry in a few seconds." };
    }

    return {
      status: sess.status,
      qr: sess.status === "connected" ? null : sess.qrCode ?? null,
      phone_number: sess.phoneNumber ?? row?.phone_number ?? null,
      message: sess.status === "connected"
        ? "Already connected"
        : sess.qrCode
        ? "Scan this QR code in WhatsApp -> Linked Devices"
        : "QR not yet ready - retry in 2s",
    };
  }
  static async getConnectionStatus(userId: string) {
    const sess = getSession(userId);
    const row = await getSessionRow(userId);
    if (!sess && row?.status === "connected") {
      await createSession(userId);
    }

    const status = sess?.status ?? (row?.status === "connected" ? "connecting" : row?.status) ?? "disconnected";
    return {
      connected: status === "connected",
      status,
      phone_number: sess?.phoneNumber ?? row?.phone_number ?? null,
      webhook_url: row?.webhook_url ?? null,
      has_webhook: Boolean(row?.webhook_url),
    };
  }
  static async disconnect(userId: string) {
    await terminateSession(userId);
    return { disconnected: true };
  }

  // ── Webhook config ──────────────────────────────────────────────────────────

  static async setWebhook(
    userId: string,
    webhookUrl: string,
    webhookSecret?: string
  ) {
    await whatsappRepository.upsertWebhook(userId, {
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret ?? null,
    });
    return { webhook_url: webhookUrl };
  }

  static async getWebhook(userId: string) {
    const row = await getSessionRow(userId);
    return { webhook_url: row?.webhook_url ?? null };
  }

  static async removeWebhook(userId: string) {
    await whatsappRepository.clearWebhook(userId);
    return { removed: true };
  }

  // ── Messages: Text ──────────────────────────────────────────────────────────

  static async sendText(userId: string, payload: WASendTextPayload) {
    const sock = requireConnected(userId);
    const jid = formatJid(payload.to);
    const result = await sock.sendMessage(jid, { text: payload.message });
    return { message_id: result?.key.id };
  }

  // ── Messages: Image ─────────────────────────────────────────────────────────

  static async sendImage(userId: string, payload: WASendMediaPayload) {
    const sock = requireConnected(userId);
    const jid = formatJid(payload.to);
    const result = await sock.sendMessage(jid, {
      image: { url: payload.url },
      mimetype: payload.mimetype ?? "image/jpeg",
      ...(payload.caption !== undefined ? { caption: payload.caption } : {}),
    });
    return { message_id: result?.key.id };
  }

  // ── Messages: Video ─────────────────────────────────────────────────────────

  static async sendVideo(userId: string, payload: WASendMediaPayload) {
    const sock = requireConnected(userId);
    const jid = formatJid(payload.to);
    const result = await sock.sendMessage(jid, {
      video: { url: payload.url },
      mimetype: payload.mimetype ?? "video/mp4",
      ...(payload.caption !== undefined ? { caption: payload.caption } : {}),
    });
    return { message_id: result?.key.id };
  }

  // ── Messages: Audio ─────────────────────────────────────────────────────────

  static async sendAudio(userId: string, payload: WASendMediaPayload) {
    const sock = requireConnected(userId);
    const jid = formatJid(payload.to);
    const result = await sock.sendMessage(jid, {
      audio: { url: payload.url },
      mimetype: payload.mimetype ?? "audio/mpeg",
      ptt: false,
    });
    return { message_id: result?.key.id };
  }

  // ── Messages: Voice note (PTT) ──────────────────────────────────────────────

  static async sendVoiceNote(userId: string, payload: WASendMediaPayload) {
    const sock = requireConnected(userId);
    const jid = formatJid(payload.to);
    const result = await sock.sendMessage(jid, {
      audio: { url: payload.url },
      mimetype: payload.mimetype ?? "audio/ogg; codecs=opus",
      ptt: true,
    });
    return { message_id: result?.key.id };
  }

  // ── Messages: Document ──────────────────────────────────────────────────────

  static async sendDocument(userId: string, payload: WASendMediaPayload) {
    const sock = requireConnected(userId);
    const jid = formatJid(payload.to);
    const result = await sock.sendMessage(jid, {
      document: { url: payload.url },
      fileName: payload.filename ?? "document",
      mimetype: payload.mimetype ?? "application/octet-stream",
      ...(payload.caption !== undefined ? { caption: payload.caption } : {}),
    });
    return { message_id: result?.key.id };
  }

  // ── Messages: Location ──────────────────────────────────────────────────────

  static async sendLocation(userId: string, payload: WASendLocationPayload) {
    const sock = requireConnected(userId);
    const jid = formatJid(payload.to);
    const result = await sock.sendMessage(jid, {
      location: {
        degreesLatitude: payload.lat,
        degreesLongitude: payload.lng,
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.address !== undefined ? { address: payload.address } : {}),
      },
    });
    return { message_id: result?.key.id };
  }

  // ── Messages: Contact card ──────────────────────────────────────────────────

  static async sendContact(userId: string, payload: WASendContactPayload) {
    const sock = requireConnected(userId);
    const jid = formatJid(payload.to);
    const cleaned = payload.phone.replace(/[^0-9]/g, "");
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${payload.name}`,
      `TEL;type=CELL;type=VOICE;waid=${cleaned}:${payload.phone}`,
      payload.org ? `ORG:${payload.org}` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await sock.sendMessage(jid, {
      contacts: {
        displayName: payload.name,
        contacts: [{ displayName: payload.name, vcard }],
      },
    });
    return { message_id: result?.key.id };
  }

  // ── Messages: Interactive buttons ───────────────────────────────────────────

  static async sendButtons(userId: string, payload: WASendButtonsPayload) {
    const sock = requireConnected(userId);
    const jid = formatJid(payload.to);

    // Uses native WhatsApp interactive message (Baileys v6+)
    const result = await sock.sendMessage(jid, {
      text: payload.text,
      footer: payload.footer ?? "",
      buttons: payload.buttons.map((button) => ({
        buttonId: button.id,
        buttonText: { displayText: button.text },
        type: 1,
      })),
      headerType: 1,
    } as any);

    return { message_id: result?.key.id };
  }

  // ── Messages: Interactive list ───────────────────────────────────────────────

  static async sendList(userId: string, payload: WASendListPayload) {
    const sock = requireConnected(userId);
    const jid = formatJid(payload.to);

    const result = await sock.sendMessage(jid, {
      text: payload.text,
      footer: payload.footer ?? "",
      title: payload.title,
      buttonText: payload.buttonText,
      sections: payload.sections,
    } as any);

    return { message_id: result?.key.id };
  }

  // ── Messages: Bulk ──────────────────────────────────────────────────────────

  static async sendBulk(userId: string, messages: WABulkMessageItem[]) {
    const results: Array<{
      to: string;
      status: "sent" | "failed";
      message_id?: string;
      error?: string;
    }> = [];

    for (const bulkMessage of messages) {
      try {
        const sendResult = await WhatsAppService.sendText(userId, {
          to: bulkMessage.to,
          message: bulkMessage.message,
        });
        results.push({ to: bulkMessage.to, status: "sent", ...(sendResult.message_id ? { message_id: sendResult.message_id } : {}) });
      } catch (sendError: any) {
        results.push({ to: bulkMessage.to, status: "failed", error: sendError.message });
      }

      // Anti-spam delay between messages
      if (bulkMessage.delay_ms && bulkMessage.delay_ms > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(bulkMessage.delay_ms!, 10_000)));
      }
    }

    return {
      total: messages.length,
      sent: results.filter((result) => result.status === "sent").length,
      failed: results.filter((result) => result.status === "failed").length,
      results,
    };
  }

  // ── Groups ──────────────────────────────────────────────────────────────────

  static async getGroups(userId: string) {
    const sock = requireConnected(userId);
    const groups = await sock.groupFetchAllParticipating();
    return Object.values(groups).map((group) => ({
      id: group.id,
      name: group.subject,
      description: group.desc ?? null,
      participant_count: group.participants.length,
      participants: group.participants.map((participant) => ({
        jid: participant.id,
        role: participant.admin ?? "member",
      })),
      created_at: group.creation,
    }));
  }

  static async getGroupInfo(userId: string, groupId: string) {
    const sock = requireConnected(userId);
    const jid = `${groupId.replace("@g.us", "")}@g.us`;
    const meta = await sock.groupMetadata(jid);
    return {
      id: meta.id,
      name: meta.subject,
      description: meta.desc ?? null,
      participant_count: meta.participants.length,
      participants: meta.participants.map((participant) => ({
        jid: participant.id,
        role: participant.admin ?? "member",
      })),
      created_at: meta.creation,
    };
  }

  static async createGroup(userId: string, payload: WACreateGroupPayload) {
    const sock = requireConnected(userId);
    const participantJids = payload.participants.map((participant) => formatJid(participant));
    const result = await sock.groupCreate(payload.name, participantJids);
    return {
      group_id: result.id,
      name: payload.name,
      participants: result.participants,
    };
  }

  static async addGroupParticipants(
    userId: string,
    groupId: string,
    participants: string[]
  ) {
    const sock = requireConnected(userId);
    const jid = `${groupId.replace("@g.us", "")}@g.us`;
    const result = await sock.groupParticipantsUpdate(
      jid,
      participants.map((participant) => formatJid(participant)),
      "add"
    );
    return { result };
  }

  static async removeGroupParticipants(
    userId: string,
    groupId: string,
    participants: string[]
  ) {
    const sock = requireConnected(userId);
    const jid = `${groupId.replace("@g.us", "")}@g.us`;
    const result = await sock.groupParticipantsUpdate(
      jid,
      participants.map((participant) => formatJid(participant)),
      "remove"
    );
    return { result };
  }

  static async promoteGroupParticipants(
    userId: string,
    groupId: string,
    participants: string[]
  ) {
    const sock = requireConnected(userId);
    const jid = `${groupId.replace("@g.us", "")}@g.us`;
    const result = await sock.groupParticipantsUpdate(
      jid,
      participants.map((participant) => formatJid(participant)),
      "promote"
    );
    return { result };
  }

  static async demoteGroupParticipants(
    userId: string,
    groupId: string,
    participants: string[]
  ) {
    const sock = requireConnected(userId);
    const jid = `${groupId.replace("@g.us", "")}@g.us`;
    const result = await sock.groupParticipantsUpdate(
      jid,
      participants.map((participant) => formatJid(participant)),
      "demote"
    );
    return { result };
  }

  static async sendGroupMessage(
    userId: string,
    groupId: string,
    message: string
  ) {
    const sock = requireConnected(userId);
    const jid = `${groupId.replace("@g.us", "")}@g.us`;
    const result = await sock.sendMessage(jid, { text: message });
    return { message_id: result?.key.id };
  }

  static async updateGroupSubject(
    userId: string,
    groupId: string,
    subject: string
  ) {
    const sock = requireConnected(userId);
    const jid = `${groupId.replace("@g.us", "")}@g.us`;
    await sock.groupUpdateSubject(jid, subject);
    return { updated: true };
  }

  static async updateGroupDescription(
    userId: string,
    groupId: string,
    description: string
  ) {
    const sock = requireConnected(userId);
    const jid = `${groupId.replace("@g.us", "")}@g.us`;
    await sock.groupUpdateDescription(jid, description);
    return { updated: true };
  }

  static async leaveGroup(userId: string, groupId: string) {
    const sock = requireConnected(userId);
    const jid = `${groupId.replace("@g.us", "")}@g.us`;
    await sock.groupLeave(jid);
    return { left: true };
  }

  static async getGroupInviteLink(userId: string, groupId: string) {
    const sock = requireConnected(userId);
    const jid = `${groupId.replace("@g.us", "")}@g.us`;
    const code = await sock.groupInviteCode(jid);
    return { invite_link: `https://chat.whatsapp.com/${code}` };
  }

  // ── Status / Story ──────────────────────────────────────────────────────────

  static async sendTextStatus(
    userId: string,
    text: string,
    backgroundColor?: string
  ) {
    const sock = requireConnected(userId);
    const bgArgb = backgroundColor
      ? parseInt(backgroundColor.replace("#", "FF"), 16)
      : 0xff000000;

    const result = await sock.sendMessage("status@broadcast", {
      text,
      backgroundArgb: bgArgb,
      font: 0, // SANS_SERIF
    } as any);

    return { message_id: result?.key.id };
  }

  static async sendImageStatus(
    userId: string,
    imageUrl: string,
    caption?: string
  ) {
    const sock = requireConnected(userId);
    const result = await sock.sendMessage("status@broadcast", {
      image: { url: imageUrl },
      ...(caption !== undefined ? { caption } : {}),
    });
    return { message_id: result?.key.id };
  }

  static async sendVideoStatus(
    userId: string,
    videoUrl: string,
    caption?: string
  ) {
    const sock = requireConnected(userId);
    const result = await sock.sendMessage("status@broadcast", {
      video: { url: videoUrl },
      ...(caption !== undefined ? { caption } : {}),
    });
    return { message_id: result?.key.id };
  }

  // ── Channels ────────────────────────────────────────────────────────────────

  static async getChannels(userId: string) {
    const sock = requireConnected(userId);
    try {
      const channels = await (sock as any).fetchNewsletterInfo?.();
      return { channels: channels ?? [] };
    } catch {
      return { channels: [], note: "Channel feature may require updated Baileys version" };
    }
  }

  static async sendChannelMessage(
    userId: string,
    channelJid: string,
    message: string
  ) {
    const sock = requireConnected(userId);
    const result = await sock.sendMessage(channelJid, { text: message });
    return { message_id: result?.key.id };
  }

  // ── Profile info ────────────────────────────────────────────────────────────

  static async getProfilePicture(userId: string, targetPhone: string) {
    const sock = requireConnected(userId);
    const jid = formatJid(targetPhone);
    try {
      const url = await sock.profilePictureUrl(jid, "image");
      return { picture_url: url };
    } catch {
      return { picture_url: null };
    }
  }

  static async checkNumberExists(userId: string, phone: string) {
    const sock = requireConnected(userId);
    const jid = formatJid(phone);
    const results = await sock.onWhatsApp(jid);
    const result = results?.[0];
    return {
      exists: result?.exists ?? false,
      jid: result?.jid ?? null,
    };
  }
}

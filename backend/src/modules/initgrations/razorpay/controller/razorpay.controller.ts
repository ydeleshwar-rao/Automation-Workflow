import { Request, Response } from "express";
import { RazorpayService } from "../service/razorpay.service.js";
import { ApiResponse } from "../../../../utils/ApiResponse.js";
import { ApiError } from "../../../../utils/ApiError.js";
import { getUserId } from "../../../../common/function.js";

export class RazorpayController {
  // ─── Connect (API Key auth — no OAuth needed) ─────────────────────────

  static connect = async (req: Request, res: Response) => {
    const userId = await getUserId(req);
    const { key_id, key_secret } = req.body ?? {};

    if (!key_id || typeof key_id !== "string" || !key_id.trim())
      throw new ApiError(400, "key_id is required (e.g. rzp_live_xxxx or rzp_test_xxxx)");
    if (!key_secret || typeof key_secret !== "string" || !key_secret.trim())
      throw new ApiError(400, "key_secret is required");

    const data = await RazorpayService.connect(userId, key_id.trim(), key_secret.trim());
    return ApiResponse(res, 200, "Razorpay connected successfully", data);
  };

  static connectionStatus = async (req: Request, res: Response) => {
    const userId = await getUserId(req);
    const data = await RazorpayService.getConnectionStatus(userId);
    return ApiResponse(res, 200, "Status fetched", data);
  };

  static disconnect = async (req: Request, res: Response) => {
    const userId = await getUserId(req);
    const data = await RazorpayService.disconnect(userId);
    return ApiResponse(res, 200, "Razorpay disconnected successfully", data);
  };

  // ─── Webhook registration on Razorpay Dashboard ───────────────────────

  static registerWebhook = async (req: Request, res: Response) => {
    const userId = await getUserId(req);
    const data = await RazorpayService.registerWebhook(userId);
    return ApiResponse(res, 201, "Webhook registered on Razorpay", data);
  };

  // ─── Incoming Webhook Receiver (public — no auth middleware) ──────────
  // Razorpay POSTs here instantly when any of the 7 events fire.
  // Events: payment.captured, payment.failed, invoice.paid,
  //         invoice.partially_paid, payment_link.paid,
  //         payment_link.partially_paid, payment_page.paid

  static incomingWebhook = async (req: Request, res: Response) => {
    const rawUserId = req.params.userId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    const webhookSecret = await RazorpayService.getWebhookSecret(userId);

    if (!webhookSecret) {
      return res.status(200).json({ success: false, message: "Integration not found" });
    }

    // Verify signature
    const signature = req.headers["x-razorpay-signature"] as string;
    if (!signature) {
      return res.status(400).json({ success: false, message: "Missing X-Razorpay-Signature" });
    }

    // req.body must be raw Buffer — ensure express raw body parser is used for this route
    const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);
    const isValid = RazorpayService.verifySignature(rawBody, signature, webhookSecret);

    if (!isValid) {
      console.warn(`[Razorpay] ❌ Invalid signature for user=${userId}`);
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event: string = req.body?.event ?? "";

    try {
      const result = await RazorpayService.handleWebhookEvent(userId, event, req.body);
      // Always return 200 quickly — Razorpay retries on non-200
      return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      console.error(`[Razorpay] Webhook handler error:`, err.message);
      return res.status(200).json({ success: false, message: err.message });
    }
  };

  // ─── Triggers: live reads from Razorpay ──────────────────────────────

  // Trigger: Payment Captured / Payment Failed
  static getPayments = async (req: Request, res: Response) => {
    const userId = await getUserId(req);
    const data = await RazorpayService.getPayments(userId);
    return ApiResponse(res, 200, "Payments fetched", data);
  };

  // Trigger: Invoice Paid / Invoice Partially Paid
  static getInvoices = async (req: Request, res: Response) => {
    const userId = await getUserId(req);
    const data = await RazorpayService.getInvoices(userId);
    return ApiResponse(res, 200, "Invoices fetched", data);
  };

  // Trigger: Payment Link Paid / Partially Paid / Payment Page Paid
  static getPaymentLinks = async (req: Request, res: Response) => {
    const userId = await getUserId(req);
    const data = await RazorpayService.getPaymentLinks(userId);
    return ApiResponse(res, 200, "Payment links fetched", data);
  };
}

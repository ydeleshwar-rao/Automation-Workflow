import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { setAuthCookies, publicAuthPayload, type AuthResult } from "../auth/controllers/auth.controller.js";
import { verifyIdToken, OidcError, type SsoProvider } from "../../lib/auth/oidc.js";
import { SsoService, type SsoIntent } from "./sso.service.js";

const PROVIDERS: SsoProvider[] = ["google", "microsoft"];
const INTENTS: SsoIntent[] = ["signin", "company-setup"];

async function verifiedIdentity(body: Record<string, unknown>) {
  const provider = body.provider as SsoProvider;
  const idToken = typeof body.id_token === "string" ? body.id_token.trim() : "";
  const nonce = typeof body.nonce === "string" ? body.nonce : "";

  if (!PROVIDERS.includes(provider)) throw new ApiError(400, "provider must be google or microsoft");
  if (!idToken) throw new ApiError(400, "id_token is required");

  try {
    return await verifyIdToken(provider, idToken, nonce);
  } catch (err) {
    if (err instanceof OidcError) throw new ApiError(401, err.message);
    throw err;
  }
}

function requireUser(req: Request) {
  if (!req.user?.id || !req.user.organizationId) throw new ApiError(401, "Unauthorized");
  return { userId: req.user.id, organizationId: req.user.organizationId };
}

export class SsoController {
  /**
   * POST /api/v1/sso/callback
   * Body: { provider, id_token, nonce, intent?: "signin" | "company-setup", organization_name? }
   * Signs in (creating the account / workspace when needed) and sets auth cookies.
   */
  static callback = catchAsync(async (req: Request, res: Response) => {
    const identity = await verifiedIdentity(req.body ?? {});
    const intent = (INTENTS.includes(req.body?.intent) ? req.body.intent : "signin") as SsoIntent;
    const organizationName = typeof req.body?.organization_name === "string" ? req.body.organization_name : undefined;

    const result = (await SsoService.signIn(identity, intent, organizationName)) as AuthResult;
    setAuthCookies(res, result);
    return ApiResponse(res, 200, intent === "company-setup" ? "Company workspace created" : "Signed in", publicAuthPayload(result));
  });

  /** GET /sso/discover?email=name@company.com → SSO providers for that company domain */
  static discover = catchAsync(async (req: Request, res: Response) => {
    const email = String(req.query.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) throw new ApiError(400, "A valid email is required");
    return ApiResponse(res, 200, "SSO discovery", await SsoService.discover(email));
  });

  /** POST /sso/connect (admin) — link Google Workspace / Microsoft 365 to the current workspace */
  static connect = catchAsync(async (req: Request, res: Response) => {
    const admin = requireUser(req);
    const identity = await verifiedIdentity(req.body ?? {});
    return ApiResponse(res, 200, "SSO connected", await SsoService.connectToOrganization(identity, admin));
  });

  /** GET /sso/settings (admin) */
  static settings = catchAsync(async (req: Request, res: Response) => {
    const { userId, organizationId } = requireUser(req);
    return ApiResponse(res, 200, "SSO settings", await SsoService.getSettings(organizationId, userId));
  });

  /** PATCH /sso/settings (admin) — Body: { sso_required: boolean } */
  static updateSettings = catchAsync(async (req: Request, res: Response) => {
    const { userId, organizationId } = requireUser(req);
    if (typeof req.body?.sso_required !== "boolean") throw new ApiError(400, "sso_required must be true or false");
    return ApiResponse(res, 200, "SSO settings updated", await SsoService.setSsoRequired(organizationId, userId, req.body.sso_required));
  });

  /** DELETE /sso/connections/:id (admin) */
  static removeConnection = catchAsync(async (req: Request, res: Response) => {
    const { userId, organizationId } = requireUser(req);
    return ApiResponse(res, 200, "SSO connection removed", await SsoService.removeConnection(organizationId, userId, String(req.params.id)));
  });
}

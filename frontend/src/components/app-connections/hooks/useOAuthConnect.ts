"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch } from "@/src/store/hooks";
import { openAuthPopup } from "@/src/lib/open-auth-popup";
import { getApiErrorMessage } from "@/src/lib/api-error";
import {
  INTEGRATION_STATUS_TAG,
  integrationsApi,
  isOAuthAppId,
  useStartOAuthConnectMutation,
  type OAuthAppId,
} from "../apiIntegrations/integrationsApi";

/** How the app tells us the user finished in the popup when no success message is posted back. */
type CompletionSignal = "popup-closed" | "window-focus";

interface OAuthPopupFlow {
  popupName: string;
  /** Page the provider redirects back to inside the popup. */
  returnPath: string;
  completionSignal: CompletionSignal;
}

const OAUTH_POPUP_FLOWS: Record<OAuthAppId, OAuthPopupFlow> = {
  servicem8: { popupName: "ServiceM8", returnPath: "/dashboard/servicem8", completionSignal: "popup-closed" },
  leadshub:  { popupName: "LeadsHub", returnPath: "/dashboard/connections/ghl-callback", completionSignal: "window-focus" },
};

/** Message types the OAuth callback pages post to `window.opener`. */
const OAUTH_SUCCESS_MESSAGE_TYPES = [
  "GHL_CONNECT_SUCCESS",
  "SERVICEM8_CONNECT_SUCCESS",
  "SIMPRO_CONNECT_SUCCESS",
  "OAUTH_SUCCESS",
];
const OAUTH_ERROR_MESSAGE_TYPE = "GHL_CONNECT_ERROR";

const POPUP_CLOSED_CHECK_INTERVAL_MS = 1000;
const START_FAILED_MESSAGE = "Failed to start connection";
const CONNECTION_FAILED_MESSAGE = "Connection failed";

function readMessageField(messageData: unknown, field: "type" | "message"): string | undefined {
  if (typeof messageData !== "object" || messageData === null || !(field in messageData)) return undefined;
  const value = (messageData as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}

/** Reacts to the success / error messages the OAuth callback page posts from the popup. */
function useOAuthResultMessages(onSuccess: () => void, onError: (message: string) => void) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const messageType = readMessageField(event.data, "type");
      if (messageType && OAUTH_SUCCESS_MESSAGE_TYPES.includes(messageType)) onSuccess();
      if (messageType === OAUTH_ERROR_MESSAGE_TYPE) {
        onError(readMessageField(event.data, "message") ?? CONNECTION_FAILED_MESSAGE);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, onError]);
}

/**
 * Connects an OAuth integration (ServiceM8, LeadsHub) through a popup and refreshes
 * the integration statuses once the user is done. Other apps are a no-op.
 */
export function useOAuthConnect(appId: string, appName: string) {
  const dispatch = useAppDispatch();
  const [startOAuthConnect] = useStartOAuthConnectMutation();
  const [isConnecting, setIsConnecting] = useState(false);
  const popupWatchIntervalRef = useRef<number | null>(null);

  const stopWatchingPopup = useCallback(() => {
    if (popupWatchIntervalRef.current !== null) window.clearInterval(popupWatchIntervalRef.current);
    popupWatchIntervalRef.current = null;
  }, []);

  useEffect(() => stopWatchingPopup, [stopWatchingPopup]);

  const finishConnecting = useCallback(() => {
    setIsConnecting(false);
    dispatch(integrationsApi.util.invalidateTags([INTEGRATION_STATUS_TAG]));
  }, [dispatch]);

  const failConnecting = useCallback((message: string) => {
    setIsConnecting(false);
    toast.error(message);
  }, []);

  const handleSuccessMessage = useCallback(() => {
    toast.success(`${appName} connected!`);
    finishConnecting();
  }, [appName, finishConnecting]);

  useOAuthResultMessages(handleSuccessMessage, failConnecting);

  const waitForCompletion = useCallback(
    (popup: Window, completionSignal: CompletionSignal) => {
      if (completionSignal === "window-focus") {
        window.addEventListener("focus", finishConnecting, { once: true });
        return;
      }
      stopWatchingPopup();
      popupWatchIntervalRef.current = window.setInterval(() => {
        if (!popup.closed) return;
        stopWatchingPopup();
        finishConnecting();
      }, POPUP_CLOSED_CHECK_INTERVAL_MS);
    },
    [finishConnecting, stopWatchingPopup],
  );

  const startConnect = useCallback(async () => {
    if (!isOAuthAppId(appId)) return;
    const flow = OAUTH_POPUP_FLOWS[appId];
    setIsConnecting(true);
    // Opened before awaiting the backend so the browser treats it as user-initiated (not blocked).
    const popup = openAuthPopup(flow.popupName);
    try {
      const { authUrl, message } = await startOAuthConnect({
        appId,
        returnUrl: window.location.origin + flow.returnPath,
      }).unwrap();
      if (!authUrl || !popup) {
        popup?.close();
        failConnecting(message ?? START_FAILED_MESSAGE);
        return;
      }
      popup.location.href = authUrl;
      waitForCompletion(popup, flow.completionSignal);
    } catch (error) {
      popup?.close();
      failConnecting(getApiErrorMessage(error, CONNECTION_FAILED_MESSAGE));
    }
  }, [appId, startOAuthConnect, failConnecting, waitForCompletion]);

  return { startConnect, isConnecting };
}

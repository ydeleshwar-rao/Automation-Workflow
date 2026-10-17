"use client";

import { useCallback } from "react";
import { useGetWhatsAppStatusQuery, type WhatsAppStatus } from "../../apiIntegrations/integrationsApi";

const CONNECTED_SESSION_STATES = ["connected", "ready"];

function isWhatsAppConnected(whatsAppStatus: WhatsAppStatus | undefined): boolean {
  const sessionState = String(whatsAppStatus?.status ?? "").toLowerCase();
  return whatsAppStatus?.connected === true || CONNECTED_SESSION_STATES.includes(sessionState);
}

export function useWhatsAppStatus() {
  const { data: whatsAppStatus, isLoading, refetch } = useGetWhatsAppStatusQuery();

  // Callers poll with this and read the fresh status, so it resolves with the data (and throws on failure).
  const refetchStatus = useCallback(() => refetch().unwrap(), [refetch]);

  return {
    data: whatsAppStatus ?? null,
    connected: isWhatsAppConnected(whatsAppStatus),
    isLoading,
    refetch: refetchStatus,
  };
}

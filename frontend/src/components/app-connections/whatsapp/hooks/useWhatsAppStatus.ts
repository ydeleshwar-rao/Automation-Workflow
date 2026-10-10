"use client";

import { useCallback, useEffect, useState } from "react";
import { getWhatsAppStatus, WhatsAppStatus } from "../api/whatsapp.api";

function isConnected(data: WhatsAppStatus | null) {
  const status = String(data?.status ?? "").toLowerCase();
  return data?.connected === true || status === "connected" || status === "ready";
}

export function useWhatsAppStatus() {
  const [data, setData] = useState<WhatsAppStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await getWhatsAppStatus();
      setData(next);
      return next;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    data,
    connected: isConnected(data),
    isLoading,
    refetch,
  };
}

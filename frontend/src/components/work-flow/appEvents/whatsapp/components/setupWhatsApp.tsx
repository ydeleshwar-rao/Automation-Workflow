"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2, Loader2, LucideIcon, MessageCircle, QrCode } from "lucide-react";
import { AppSection, SelectSection } from "@/src/components/work-flow/appEvents/mail/components/shared/SelectorFields";
import { SelectionPopup } from "@/src/components/ui/selection-popup";
import { connectWhatsApp, getWhatsAppQr } from "@/src/components/app-connections/whatsapp/api/whatsapp.api";
import { useWhatsAppStatus } from "@/src/components/app-connections/whatsapp/hooks/useWhatsAppStatus";
import { WHATSAPP_ACTION_EVENTS, WHATSAPP_TRIGGER_EVENTS } from "./whatsappEvents";

interface WhatsAppSetupStepProps {
  selectedEvent: string | null;
  onEventSelect: (event: string) => void;
  selectedApp: { label: string; icon?: LucideIcon; color: string };
  isTrigger: boolean;
  onChangeApp?: () => void;
}

export function WhatsAppSetupStep({
  selectedEvent,
  onEventSelect,
  selectedApp,
  isTrigger,
  onChangeApp,
}: WhatsAppSetupStepProps) {
  const [isEventPopupOpen, setIsEventPopupOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasStartedConnect, setHasStartedConnect] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Disconnected");
  const [error, setError] = useState<string | null>(null);
  const { connected, data, refetch } = useWhatsAppStatus();

  const events = isTrigger ? WHATSAPP_TRIGGER_EVENTS : WHATSAPP_ACTION_EVENTS;
  const AppIcon = selectedApp.icon || MessageCircle;
  const displayLabel = events.find((e) => e.id === selectedEvent)?.label ?? selectedEvent;

  const sections = useMemo(
    () => [{
      id: "whatsapp-events",
      title: isTrigger ? "WhatsApp triggers" : "WhatsApp actions",
      items: events,
      defaultOpen: true,
    }],
    [events, isTrigger]
  );

  const startConnect = async () => {
    setIsConnecting(true);
    setHasStartedConnect(true);
    setError(null);
    setStatusText("Starting WhatsApp session...");
    try {
      await connectWhatsApp({ reset: true });
      const qrData = await getWhatsAppQr();
      setQr(qrData.qr ?? qrData.qrCode ?? qrData.qr_code ?? null);
      setStatusText(qrData.message ?? qrData.status ?? "Waiting for QR...");
      const latest = await refetch();
      if (latest?.connected) setStatusText("Connected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start WhatsApp connection");
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (connected) {
      setQr(null);
      setHasStartedConnect(false);
      setStatusText(`Connected${data?.phone_number ? `: ${data.phone_number}` : ""}`);
      return;
    }
    if (!hasStartedConnect) return;

    const timer = window.setInterval(async () => {
      try {
        const latest = await refetch();
        setStatusText(latest?.status ?? "Checking connection...");
        if (latest?.connected) {
          setQr(null);
          setHasStartedConnect(false);
          setStatusText(`Connected${latest.phone_number ? `: ${latest.phone_number}` : ""}`);
          return;
        }
        const qrData = await getWhatsAppQr().catch(() => null);
        setQr(qrData?.qr ?? qrData?.qrCode ?? qrData?.qr_code ?? null);
        if (qrData?.message) setStatusText(qrData.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not check WhatsApp status");
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [connected, data?.phone_number, hasStartedConnect, refetch]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <AppSection
        appName="WhatsApp"
        appIcon={AppIcon}
        onOverride={onChangeApp}
        connected={connected}
      />

      {!connected && (
        <div className="nm-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="nm-inset flex h-10 w-10 items-center justify-center rounded-xl">
              <QrCode className="h-5 w-5 text-[#25D366]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Connect WhatsApp</h3>
              <p className="text-xs text-muted-foreground">{statusText}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
              {error}
            </div>
          )}

          {qr && (
            <div className="nm-inset rounded-xl bg-white p-3 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="WhatsApp QR code" className="h-48 w-48 object-contain" />
            </div>
          )}

          <button
            type="button"
            onClick={startConnect}
            disabled={isConnecting}
            className="nm-btn flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-foreground"
          >
            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {qr ? "Refresh QR" : "Connect WhatsApp"}
          </button>
        </div>
      )}

      {connected && (
        <>
          <SelectSection
            label={isTrigger ? "Trigger event" : "Action event"}
            value={displayLabel}
            placeholder="Choose an event"
            onClick={() => setIsEventPopupOpen(!isEventPopupOpen)}
            isOpen={isEventPopupOpen}
          />

          <SelectionPopup
            isOpen={isEventPopupOpen}
            onClose={() => setIsEventPopupOpen(false)}
            onSelect={(item) => {
              onEventSelect(item.id);
              setIsEventPopupOpen(false);
            }}
            selectedId={selectedEvent ?? undefined}
            sections={sections}
            title="Select WhatsApp event"
            position={{ top: 180, right: 470 }}
          />
        </>
      )}
    </div>
  );
}

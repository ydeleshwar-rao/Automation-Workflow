"use client";

import React, { useState } from "react";
import { Mail, AlertCircle } from "lucide-react";
import { EventSelectorPopup } from "./EventSelectorPopup";
import { AccountSelectorPopup } from "./AccountSelectorPopup";
import { SmtpConnectionPopup } from "./SmtpConnectionPopup";
import { MailConnectionLoader } from "./MailConnectionLoader";
import { MailAccount, SmtpConfig } from "@/src/components/work-flow/appEvents/mail/apiIntegrations/use-mail";
import { AppSection, SelectSection, AccountSection } from "@/src/components/work-flow/appEvents/mail/components/shared/SelectorFields";
import { useAppSelector } from "@/src/store/hooks";

interface WebhookSetupStepProps {
  selectedEvent: string | null;
  onEventSelect: (event: string) => void;
  selectedAccount: MailAccount | null;
  onAccountSelect: (account: MailAccount) => void;
  accounts: MailAccount[];
  isLoadingAccounts?: boolean;
  onAddAccount: (config: SmtpConfig) => Promise<void>;
  onRemoveAccount?: (id: string) => void;
  selectedApp: { label: string; icon: any; color: string };
  isTrigger: boolean;
  onChangeApp?: () => void;
}

export function MailSetupStep({
  selectedEvent,
  onEventSelect,
  selectedAccount,
  onAccountSelect,
  accounts,
  isLoadingAccounts,
  onAddAccount,
  onRemoveAccount,
  selectedApp,
  isTrigger,
  onChangeApp,
}: WebhookSetupStepProps) {
  const [isEventPopupOpen, setIsEventPopupOpen] = useState(false);
  const [isAccountPopupOpen, setIsAccountPopupOpen] = useState(false);
  const [isSmtpPopupOpen, setIsSmtpPopupOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Only admin and developer can add new SMTP accounts
  const userRole = useAppSelector((state) => state.access.user?.role);
  const canAddAccount = userRole === "admin" || userRole === "developer";

  const handleSmtpConfirm = async (config: SmtpConfig) => {
    setIsSmtpPopupOpen(false);
    setIsConnecting(true);
    setConnectError(null);
    try {
      await onAddAccount(config);
    } catch (err: any) {
      setConnectError(err.message || "Failed to connect SMTP account. Please check your credentials.");
    } finally {
      setIsConnecting(false);
    }
  };

  const displayName = selectedAccount?.name || null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <AppSection
        appName="SMTP by Zapier"
        appIcon={selectedApp.icon || Mail}
        onOverride={onChangeApp}
      />

      <SelectSection
        label="Action event"
        value={selectedEvent}
        placeholder="Choose an event"
        onClick={() => {
          setIsAccountPopupOpen(false);
          setIsEventPopupOpen(!isEventPopupOpen);
        }}
        isOpen={isEventPopupOpen}
      />

      <EventSelectorPopup
        isOpen={isEventPopupOpen}
        onClose={() => setIsEventPopupOpen(false)}
        onSelect={onEventSelect}
        selectedEvent={selectedEvent}
      />

      {connectError && (
        <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg animate-in fade-in duration-300">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">Connection Failed</p>
            <p className="text-xs text-red-600 mt-0.5">{connectError}</p>
          </div>
          <button
            onClick={() => setConnectError(null)}
            className="ml-auto text-red-400 hover:text-red-600 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div className="relative">
        <AccountSection
          selectedAccountName={isLoadingAccounts ? "Loading accounts..." : displayName}
          isConnected={!!selectedAccount && !isLoadingAccounts}
          onOpenPopup={() => {
            if (isLoadingAccounts) return;
            setIsEventPopupOpen(false);
            setIsAccountPopupOpen(!isAccountPopupOpen);
          }}
          isOpen={isAccountPopupOpen}
          onChange={() => {
            setIsEventPopupOpen(false);
            setIsAccountPopupOpen(true);
          }}
          isLoadingAccounts={isLoadingAccounts}
        />

        <AccountSelectorPopup
          isOpen={isAccountPopupOpen}
          onClose={() => setIsAccountPopupOpen(false)}
          accounts={accounts}
          selectedAccount={selectedAccount}
          onSelect={(account) => {
            onAccountSelect(account);
            setIsAccountPopupOpen(false);
          }}
          onConnectNew={() => {
            setIsAccountPopupOpen(false);
            setIsSmtpPopupOpen(true);
          }}
          onRemoveAccount={onRemoveAccount}
          canAddAccount={canAddAccount}
        />
      </div>

      {/* SMTP Connection Popup — only reachable by admin/developer via canAddAccount guard */}
      <SmtpConnectionPopup
        isOpen={isSmtpPopupOpen}
        onClose={() => setIsSmtpPopupOpen(false)}
        onConfirm={handleSmtpConfirm}
      />

      <MailConnectionLoader isOpen={isConnecting} />
    </div>
  );
}

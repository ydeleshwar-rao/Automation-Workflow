"use client";

import React from "react";
import { MailAccount } from "@/src/components/work-flow/appEvents/mail/apiIntegrations/use-mail";
import { Trash2, PlusCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface AccountSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (account: MailAccount) => void;
  onConnectNew: () => void;
  onRemoveAccount?: (id: string) => void;
  accounts: MailAccount[];
  selectedAccount: MailAccount | null;
  canAddAccount?: boolean;
}

export function AccountSelectorPopup({
  isOpen,
  onClose,
  onSelect,
  onConnectNew,
  onRemoveAccount,
  accounts,
  selectedAccount,
  canAddAccount = false,
}: AccountSelectorPopupProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute left-0 right-0 z-50 mt-2 bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ top: "100%" }}
    >
      <div className="p-3">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">
          Connected Accounts
        </p>

        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-3">No accounts connected yet.</p>
        ) : (
          <ul className="space-y-1">
            {accounts.map((account) => {
              const isSelected = selectedAccount?.id === account.id;
              return (
                <li
                  key={account.id}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-muted",
                    isSelected && "bg-primary/10 hover:bg-primary/10"
                  )}
                >
                  <div
                    className="flex items-center gap-2 flex-1 min-w-0"
                    onClick={() => onSelect(account)}
                  >
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-medium truncate",
                        isSelected ? "text-primary" : "text-foreground"
                      )}
                    >
                      {account.name}
                    </span>
                  </div>
                  {onRemoveAccount && canAddAccount && (
                    <button
                      type="button"
                      title="Disconnect account"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAccount(account.id);
                      }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Only admin and developer can register new SMTP connections */}
      {canAddAccount && (
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onConnectNew();
            }}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Connect a new account
          </button>
        </div>
      )}
    </div>
  );
}

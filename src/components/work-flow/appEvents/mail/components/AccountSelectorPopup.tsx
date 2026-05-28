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
      className="absolute left-0 right-0 z-50 mt-2 nm-card rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ top: "100%" }}
    >
      {/* ── Header ── */}
      <div className="px-4 py-2.5 border-b border-black/8 dark:border-white/5">
        <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-widest">
          Connected Accounts
        </p>
      </div>

      {/* ── Account list ── */}
      <div className="p-2">
        {accounts.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-sm text-muted-foreground">No accounts connected yet.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {accounts.map((account) => {
              const isSelected = selectedAccount?.id === account.id;
              return (
                <li
                  key={account.id}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                    isSelected ? "nm-inset" : "nm-btn"
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
                        "text-sm font-semibold truncate",
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
                      className="nm-btn flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive transition-all shrink-0"
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

      {/* ── Connect new ── */}
      {canAddAccount && (
        <div className="p-2 border-t border-black/8 dark:border-white/5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onConnectNew();
            }}
            className="nm-btn flex items-center gap-2.5 w-full px-3 py-2.5 rounded-2xl text-sm font-semibold text-primary hover:text-primary/80 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Connect a new account
          </button>
        </div>
      )}
    </div>
  );
}

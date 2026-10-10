"use client";

import React from "react";
import { Trash2, PlusCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface LcAccountSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (account: any) => void;
  onConnectNew: () => void;
  onRemoveAccount?: (id: string) => void;
  accounts: any[];
  selectedAccount: any | null;
}

export function LcAccountSelectorPopup({
  isOpen,
  onClose,
  onSelect,
  onConnectNew,
  onRemoveAccount,
  accounts,
  selectedAccount,
}: LcAccountSelectorPopupProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute left-0 right-0 z-50 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ top: "100%" }}
    >
      <div className="p-3">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
          Connected Accounts
        </p>

        {accounts.length === 0 ? (
          <p className="text-sm text-slate-500 px-2 py-3">No accounts connected yet.</p>
        ) : (
          <ul className="space-y-1">
            {accounts.map((account) => {
              const isSelected = selectedAccount?.id === account.id;
              return (
                <li
                  key={account.id}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-slate-50",
                    isSelected && "bg-indigo-50 hover:bg-indigo-50"
                  )}
                >
                  <div
                    className="flex items-center gap-2 flex-1 min-w-0"
                    onClick={() => onSelect(account)}
                  >
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-medium truncate",
                        isSelected ? "text-indigo-700" : "text-slate-700"
                      )}
                    >
                      {account.name}
                    </span>
                  </div>
                  {onRemoveAccount && (
                    <button
                      type="button"
                      title="Disconnect account"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAccount(account.id);
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
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

      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={() => {
            onClose();
            onConnectNew();
          }}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Connect a new account
        </button>
      </div>
    </div>
  );
}

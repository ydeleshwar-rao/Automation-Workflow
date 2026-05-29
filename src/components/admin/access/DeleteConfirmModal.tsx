"use client";

/**
 * DeleteConfirmModal
 * ─────────────────────────────────────────────────────────────
 * Reusable danger-confirmation modal for account deletion.
 * Shows the account name/email, a red warning, and requires
 * the admin to click "Delete" after reading the warning.
 */

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Modal }  from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";

interface DeleteConfirmModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  onConfirm:   () => void | Promise<void>;
  isDeleting:  boolean;
  displayName: string;
  email:       string;
  accountType: "developer" | "admin";
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  displayName,
  email,
  accountType,
}: DeleteConfirmModalProps) {
  const label = accountType === "admin" ? "admin" : "developer";

  return (
    <Modal
      isOpen={isOpen}
      onClose={isDeleting ? () => {} : onClose}
      maxWidth="max-w-[460px]"
    >
      <div className="flex flex-col items-center text-center gap-4">

        {/* Warning icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 border-2 border-destructive/20">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">Delete {label} account?</h3>
          <p className="text-sm text-muted-foreground">
            This action is <span className="font-semibold text-destructive">permanent</span> and cannot be undone.
          </p>
        </div>

        {/* Account info card */}
        <div className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-left">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-medium">Account to be deleted</p>
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>

        {/* Warning banner */}
        <div className="w-full rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-left space-y-1">
          <p className="text-xs font-semibold text-destructive">What will be deleted:</p>
          <ul className="text-xs text-destructive/80 space-y-0.5 list-disc list-inside">
            <li>Account login access</li>
            <li>Profile and all personal data</li>
            <li>All assigned page permissions</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex w-full gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1 gap-2"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Yes, delete
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

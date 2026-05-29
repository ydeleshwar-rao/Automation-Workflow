"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronDown, Lock, Mail, Server, Shield, AtSign } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { SmtpConfig } from "@/src/components/work-flow/appEvents/mail/apiIntegrations/use-mail";
import { Modal } from "@/src/components/ui/modal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/src/components/ui/dropdown-menu";

// ── Schema ──────────────────────────────────────────────────────────────────

const smtpSchema = z.object({
  host:      z.string().min(1, "Host is required"),
  user:      z.string().min(1, "User is required"),
  pass:      z.string().min(1, "Password is required"),
  tls:       z.boolean(),
  port:      z.number().int().positive(),
  fromEmail: z.string().email("Invalid email").or(z.literal("")),
});

type SmtpFormValues = z.infer<typeof smtpSchema>;

interface Option<T> {
  label: string;
  value: T;
}

// ── Neumorphic select dropdown ───────────────────────────────────────────────

function NmSelect<T extends string | number | boolean>({
  value,
  onChange,
  options,
  placeholder = "Select…",
}: {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  placeholder?: string;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-full h-11 px-3 nm-inset rounded-xl flex items-center justify-between text-sm font-medium text-foreground focus:outline-none transition-all"
        >
          <span className={selected ? "text-foreground" : "text-muted-foreground"}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="z-[300] w-[--radix-dropdown-menu-trigger-width] min-w-[160px] nm-card rounded-2xl border-none p-1"
        align="start"
      >
        {options.map((opt) => (
          <DropdownMenuItem
            key={String(opt.value)}
            onSelect={() => onChange(opt.value)}
            className={cn(
              "flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer text-sm font-medium transition-all",
              opt.value === value
                ? "nm-inset text-primary"
                : "hover:bg-primary/5"
            )}
          >
            <span>{opt.label}</span>
            {opt.value === value && <Check className="w-3.5 h-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Field component ──────────────────────────────────────────────────────────

function SmtpField({
  label,
  required,
  icon: Icon,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ElementType;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
        {label}
        {required
          ? <span className="text-[11px] font-normal text-orange-500 ml-0.5">(required)</span>
          : <span className="text-[11px] font-normal text-muted-foreground ml-0.5">(optional)</span>
        }
      </label>
      {children}
      {error && (
        <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}

// ── NmInput ──────────────────────────────────────────────────────────────────

function NmInput({
  type = "text",
  placeholder,
  hasError,
  autoComplete,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  return (
    <div className={cn(
      "nm-inset rounded-xl h-11 flex items-center px-3 transition-all",
      hasError && "outline outline-1 outline-destructive"
    )}>
      <input
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
        {...rest}
      />
    </div>
  );
}

// ── Options ──────────────────────────────────────────────────────────────────

const tlsOptions: Option<boolean>[] = [
  { label: "Yes — TLS enabled", value: true  },
  { label: "No  — plain SMTP",  value: false },
];

const portOptions: Option<number>[] = [
  { label: "587", value: 587  },
  { label: "465", value: 465  },
  { label: "80",  value: 80   },
  { label: "110", value: 110  },
  { label: "2525", value: 2525 },
];

// ── SmtpConnectionPopup ──────────────────────────────────────────────────────

interface SmtpConnectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: SmtpConfig) => void;
}

export function SmtpConnectionPopup({
  isOpen,
  onClose,
  onConfirm,
}: SmtpConnectionPopupProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<SmtpFormValues>({
    resolver: zodResolver(smtpSchema),
    mode: "onChange",
    defaultValues: { host: "", user: "", pass: "", tls: true, port: 587, fromEmail: "" },
  });

  const onSubmit = (data: SmtpFormValues) => {
    onConfirm({ ...data, fromEmail: data.fromEmail || "" } as SmtpConfig);
    onClose();
    reset();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect your SMTP Account"
      maxWidth="max-w-[480px]"
    >
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-4">

        {/* Host */}
        <SmtpField label="Host" required icon={Server} error={errors.host?.message}>
          <NmInput
            {...register("host")}
            placeholder="e.g. smtp.gmail.com"
            hasError={!!errors.host}
            autoComplete="off"
          />
        </SmtpField>

        {/* Email / Username */}
        <SmtpField label="Email / Username" required icon={AtSign} error={errors.user?.message}>
          <NmInput
            {...register("user")}
            placeholder="you@example.com"
            hasError={!!errors.user}
            autoComplete="off"
          />
        </SmtpField>

        {/* Password */}
        <SmtpField label="Password" required icon={Lock} error={errors.pass?.message}>
          <NmInput
            {...register("pass")}
            type="password"
            placeholder="••••••••"
            hasError={!!errors.pass}
            autoComplete="new-password"
          />
        </SmtpField>

        {/* TLS + Port — side by side */}
        <div className="grid grid-cols-2 gap-3">
          <SmtpField label="Use TLS?" icon={Shield}>
            <Controller
              control={control}
              name="tls"
              render={({ field }) => (
                <NmSelect value={field.value} onChange={field.onChange} options={tlsOptions} />
              )}
            />
          </SmtpField>
          <SmtpField label="Port">
            <Controller
              control={control}
              name="port"
              render={({ field }) => (
                <NmSelect value={field.value} onChange={field.onChange} options={portOptions} />
              )}
            />
          </SmtpField>
        </div>

        {/* From Email */}
        <SmtpField label="From Email" icon={Mail} error={errors.fromEmail?.message}>
          <NmInput
            {...register("fromEmail")}
            placeholder="Optional sender email"
            hasError={!!errors.fromEmail}
            autoComplete="off"
          />
        </SmtpField>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-[3px_3px_8px_rgba(99,102,241,0.4),-2px_-2px_6px_rgba(255,255,255,0.1)] hover:shadow-[4px_4px_12px_rgba(99,102,241,0.5),-3px_-3px_8px_rgba(255,255,255,0.12)]"
          >
            Yes, Continue
          </button>
          <button
            type="button"
            onClick={onClose}
            className="nm-btn flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            Cancel
          </button>
        </div>

      </form>
    </Modal>
  );
}

"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronDown, Check } from "lucide-react";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { SmtpConfig } from "@/src/components/work-flow/appEvents/mail/apiIntegrations/use-mail";
import { Modal } from "@/src/components/ui/modal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/src/components/ui/dropdown-menu";
import { cn } from "@/src/lib/utils";

const smtpSchema = z.object({
  host: z.string().min(1, "Host is required"),
  user: z.string().min(1, "User is required"),
  pass: z.string().min(1, "Password is required"),
  tls: z.boolean(),
  port: z.number().int().positive(),
  fromEmail: z.string().email("Invalid email").or(z.literal("")),
});

type SmtpFormValues = z.infer<typeof smtpSchema>;

interface Option<T> {
  label: string;
  value: T;
}

function ThemeSelect<T extends string | number | boolean>({
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
          className={cn(
            "w-full h-9 px-3 flex items-center justify-between",
            "bg-card border border-border rounded-lg",
            "text-sm font-medium text-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary",
            "transition-all hover:border-primary/50",
            !selected && "text-muted-foreground"
          )}
        >
          <span>{selected ? selected.label : placeholder}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-[300] w-[--radix-dropdown-menu-trigger-width] min-w-[180px]" align="start">
        {options.map((opt) => (
          <DropdownMenuItem
            key={String(opt.value)}
            onSelect={() => onChange(opt.value)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{opt.label}</span>
            {opt.value === value && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const tlsOptions: Option<boolean>[] = [
  { label: "Yes", value: true },
  { label: "No", value: false },
];

const portOptions: Option<number>[] = [
  { label: "587", value: 587 },
  { label: "465", value: 465 },
  { label: "80",  value: 80  },
  { label: "110", value: 110 },
  { label: "2525", value: 2525 },
];

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
    defaultValues: {
      host: "",
      user: "",
      pass: "",
      tls: true,
      port: 587,
      fromEmail: "",
    },
  });

  const onSubmit = (data: SmtpFormValues) => {
    onConfirm({ ...data, fromEmail: data.fromEmail || "" } as SmtpConfig);
    onClose();
    reset();
  };

  const fieldLabel = (label: string, required?: boolean) => (
    <label className="text-sm font-semibold text-foreground block">
      {label}{" "}
      <span className={cn("font-normal text-xs", required ? "text-orange-500" : "text-muted-foreground")}>
        {required ? "(required)" : "(optional)"}
      </span>
    </label>
  );

  const inputClass = (hasError?: boolean) =>
    cn(
      "h-9 rounded-lg border-border bg-card text-foreground text-sm",
      "placeholder:text-muted-foreground",
      "focus-visible:ring-primary/20 focus-visible:border-primary",
      hasError && "border-red-500 focus-visible:ring-red-500/20"
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Allow Job Management to access your SMTP Account?"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
        className="space-y-3 text-left"
      >
        {/* Host */}
        <div className="space-y-1">
          {fieldLabel("Host", true)}
          <Input {...register("host")} className={inputClass(!!errors.host)} autoComplete="off" />
          {errors.host && <p className="text-xs text-red-500">{errors.host.message}</p>}
        </div>

        {/* Email / Username */}
        <div className="space-y-1">
          {fieldLabel("Email / Username", true)}
          <Input {...register("user")} className={inputClass(!!errors.user)} autoComplete="off" />
          {errors.user && <p className="text-xs text-red-500">{errors.user.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1">
          {fieldLabel("Password", true)}
          <Input
            type="password"
            {...register("pass")}
            className={inputClass(!!errors.pass)}
            autoComplete="new-password"
          />
          {errors.pass && <p className="text-xs text-red-500">{errors.pass.message}</p>}
        </div>

        {/* TLS + Port — side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            {fieldLabel("Use TLS?")}
            <Controller
              control={control}
              name="tls"
              render={({ field }) => (
                <ThemeSelect value={field.value} onChange={field.onChange} options={tlsOptions} />
              )}
            />
          </div>
          <div className="space-y-1">
            {fieldLabel("Port")}
            <Controller
              control={control}
              name="port"
              render={({ field }) => (
                <ThemeSelect value={field.value} onChange={field.onChange} options={portOptions} />
              )}
            />
          </div>
        </div>

        {/* From Email */}
        <div className="space-y-1">
          {fieldLabel("From Email")}
          <Input
            {...register("fromEmail")}
            className={inputClass(!!errors.fromEmail)}
            autoComplete="off"
          />
          {errors.fromEmail && <p className="text-xs text-red-500">{errors.fromEmail.message}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-9 rounded-lg font-semibold transition-all shadow-sm text-sm"
          >
            Yes, Continue
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="bg-muted hover:bg-muted/80 text-muted-foreground px-6 h-9 rounded-lg font-semibold border border-border transition-all text-sm"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

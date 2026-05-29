"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Modal } from "@/src/components/ui/modal";
import { cn } from "@/src/lib/utils";

interface LcConnectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: any) => void;
}

export function LcConnectionPopup({
  isOpen,
  onClose,
  onConfirm,
}: LcConnectionPopupProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    mode: "onChange",
    defaultValues: {
      apiKey: "",
      locationId: "",
      name: "",
    },
  });

  const onSubmit = async (data: any) => {
    // Basic validation
    if (!data.apiKey || !data.locationId || !data.name) {
      return;
    }
    await onConfirm(data);
    onClose();
    reset();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect LeadConnector Account"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-6 text-left">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 block">
            Reference Name <span className="text-orange-500 font-normal">(required)</span>
          </label>
          <p className="text-[12px] text-slate-500">A name to identify this account (e.g. "Main Agency").</p>
          <Input
            {...register("name", { required: "Reference Name is required" })}
            className={cn(
              "h-12 bg-white border-slate-200 rounded-lg focus-visible:ring-[#4f46e5]/20 text-slate-900 font-medium",
              errors.name && "border-red-500 focus-visible:ring-red-500/20"
            )}
            placeholder="GoHighLevel Account A"
          />
          {errors.name && <p className="text-xs text-red-500 font-medium">{(errors.name as any).message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 block">
            API Key <span className="text-orange-500 font-normal">(required)</span>
          </label>
          <p className="text-[12px] text-slate-500">Your LeadConnector / GoHighLevel API Key.</p>
          <Input
            type="password"
            {...register("apiKey", { required: "API Key is required" })}
            className={cn(
              "h-12 bg-white border-slate-200 rounded-lg focus-visible:ring-[#4f46e5]/20 text-slate-900 font-medium",
              errors.apiKey && "border-red-500 focus-visible:ring-red-500/20"
            )}
            placeholder="Your API Key"
          />
          {errors.apiKey && <p className="text-xs text-red-500 font-medium">{(errors.apiKey as any).message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 block">
            Location ID <span className="text-orange-500 font-normal">(required)</span>
          </label>
          <p className="text-[12px] text-slate-500">The unique identifier for your location.</p>
          <Input
            {...register("locationId", { required: "Location ID is required" })}
            className={cn(
              "h-12 bg-white border-slate-200 rounded-lg focus-visible:ring-[#4f46e5]/20 text-slate-900 font-medium",
              errors.locationId && "border-red-500 focus-visible:ring-red-500/20"
            )}
            placeholder="Location ID"
          />
          {errors.locationId && <p className="text-xs text-red-500 font-medium">{(errors.locationId as any).message}</p>}
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-600 font-bold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-6 h-11 rounded-lg font-bold transition-all shadow-md active:scale-95"
          >
            {isSubmitting ? "Connecting..." : "Connect Account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

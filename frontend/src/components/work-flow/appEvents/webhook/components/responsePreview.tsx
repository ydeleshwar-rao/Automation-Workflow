"use client";

import React from "react";
import { Check, Pencil, Info } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { SidePopup } from "@/src/components/ui/side-popup";

interface JsonPreviewProps {
  data: any;
  onClose: () => void;
  title?: string;
}

export function JsonPreview({ data, onClose, title = "Request Data" }: JsonPreviewProps) {
  if (!data) return null;

  return (
    <SidePopup
      isOpen={!!data}
      onClose={onClose}
      title={title}
      width="w-[420px]"
      position={{ top: 150, right: 480 }}
    >
      <div className="p-7 space-y-7">
        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 py-1 bg-slate-50 border border-slate-100 rounded-md">
                  {key}
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-100 to-transparent" />
              </div>
             
              <div className="space-y-3 pl-2 border-l-2 border-slate-100 ml-1">
                {typeof value === 'object' && value !== null && !Array.isArray(value) ? (
                  Object.entries(value).length > 0 ? (
                    Object.entries(value).map(([subK, subV]) => (
                      <div key={subK} className="flex items-center justify-between text-[13px] group/item">
                        <span className="text-slate-500 font-medium">{subK}</span>
                        <span className="font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-transparent font-mono break-all text-right ml-4">
                          {typeof subV === 'object' ? JSON.stringify(subV) : String(subV)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="italic text-slate-300 text-xs py-1">empty</div>
                  )
                ) : (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-900 font-mono text-[13px] break-all">{String(value)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 bg-slate-50/80 backdrop-blur-sm border-t border-slate-100 flex justify-between items-center gap-3">
        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          Values available in map steps
        </p>
        <Button variant="outline" size="sm" className="h-9 px-4 gap-2 font-bold text-slate-700 bg-white border-slate-200">
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </Button>
      </div>
    </SidePopup>
  );
}


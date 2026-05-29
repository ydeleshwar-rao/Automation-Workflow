"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { cn } from "@/src/lib/utils";

export type ServiceM8Job = {
  uuid: string;
  generated_job_id: string;
  date: string;
  status: string;
  total_invoice_amount: string;
  payment_processed: string; // '1' or '0' or boolean
  job_address: string;
  job_contacts?: {
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
  }[];
  companies?: { name: string };
};

export const columns: ColumnDef<ServiceM8Job>[] = [
  {
    id: "rowNumber",
    header: "#",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-[13px]">{row.index + 1}</span>
    ),
  },
  {
    id: "customer",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="p-0 hover:bg-transparent text-xs font-semibold text-muted-foreground uppercase tracking-wider"
      >
        CUSTOMER
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    accessorFn: (row) => {
      const contact = row.job_contacts?.[0];
      if (contact) return `${contact.first_name} ${contact.last_name}`;
      return row.companies?.name || "Unknown";
    },
    cell: ({ row }) => {
      const contact = row.original.job_contacts?.[0];
      const name = contact
        ? `${contact.first_name} ${contact.last_name || ""}`
        : row.original.companies?.name || "Unknown";
      return <span className="font-semibold text-[13px] text-foreground">{name}</span>;
    },
  },
  {
    id: "email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="p-0 hover:bg-transparent text-xs font-semibold text-muted-foreground uppercase tracking-wider"
      >
        EMAIL
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    accessorFn: (row) => row.job_contacts?.[0]?.email || "",
    cell: ({ row }) => {
      const email = row.original.job_contacts?.[0]?.email || "—";
      return <span className="text-muted-foreground text-[13px]">{email}</span>;
    },
  },
  {
    id: "phone",
    header: "PHONE",
    cell: ({ row }) => {
      const contact = row.original.job_contacts?.[0];
      const phone = contact?.mobile || "—";
      return <span className="text-muted-foreground text-[13px]">{phone}</span>;
    },
  },
  {
    id: "actions",
    header: "ACTIONS",
    cell: ({ row, table }) => {
      const name = row.original.job_contacts?.[0]
        ? `${row.original.job_contacts[0].first_name} ${row.original.job_contacts[0].last_name}`
        : row.original.companies?.name || "Unknown";
      
      return (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 text-[12px] font-bold"
          onClick={() => (table.options.meta as any)?.onRowClick?.(name)}
        >
          Job details
        </Button>
      );
    },
  },
];

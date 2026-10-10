"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/src/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, ChevronDown, ArrowLeft } from "lucide-react";

const createUserSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["user", "admin", "client"]),
  job_app_type: z.string().min(1, "Primary application is required"),
  website_url: z.string().optional(),
  leadhub_key: z.string().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

const inputCls = "bg-background border-border text-foreground placeholder:text-muted-foreground/50 rounded-xl h-10 px-4 focus:ring-1 focus:ring-ring transition-all text-sm";
const selectCls = "w-full h-10 bg-background border border-border text-foreground rounded-xl px-4 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer";

export function CreateUserForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [clients, setClients] = useState<string[]>([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const companyFieldRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      first_name: "", last_name: "", email: "", phone: "",
      password: "", role: "user", job_app_type: "", website_url: "", leadhub_key: "",
    },
  });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/bigquery/getclientskeydetails`)
      .then((r) => r.json())
      .then((json) => {
        const rows = json?.data?.rows ?? [];
        const uniqueClients = Array.from<string>(
          new Set<string>(
            rows
              .map((client: Record<string, unknown>) => {
                const possibleName =
                  typeof client.company_name === "string" ? client.company_name :
                  typeof client.display_name === "string" ? client.display_name :
                  typeof client.name === "string" ? client.name :
                  null;

                return possibleName?.trim();
              })
              .filter((name: string | undefined): name is string => Boolean(name))
          )
        ).sort((a, b) => a.localeCompare(b));

        setClients(uniqueClients);
      })
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (companyFieldRef.current && !companyFieldRef.current.contains(event.target as Node)) {
        setShowCompanySuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const trimmedCompanyQuery = companyName.trim();
  const filteredClients =
    trimmedCompanyQuery.length === 0
      ? []
      : clients.filter((client) =>
          client.toLowerCase().includes(trimmedCompanyQuery.toLowerCase())
        );

  const onSubmit = async (data: CreateUserFormData) => {
    setLoading(true);
    setSuccess(false);
    setServerError(null);

    const trimmedCompanyName = companyName.trim();
    if (!trimmedCompanyName) {
      setServerError("Please enter a company name");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...data,
        company_name: trimmedCompanyName,
      };

      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        const errMsg = result.error || "Failed to create user";
        if (errMsg.toLowerCase().includes("email already exists")) {
          setError("email", { message: errMsg });
        } else {
          setServerError(errMsg);
        }
      } else {
        setSuccess(true);
        reset();
        setCompanyName("");
        setTimeout(() => { router.push("/dashboard/connections"); }, 1500);
      }
    } catch {
      setServerError("A network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto bg-card border border-border rounded-[2rem] shadow-2xl p-6 md:p-8">
      <CardHeader className="px-0 pt-0 pb-6 space-y-1">
        <Button 
          variant="ghost" 
          className="w-fit p-0 hover:bg-transparent mb-4 text-muted-foreground hover:text-foreground flex items-center"
          onClick={() => router.push("/admin")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Button>
        <CardTitle className="text-2xl font-bold text-foreground tracking-tight">Create New User</CardTitle>
        <CardDescription className="text-muted-foreground text-sm">Add a new member to the system.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
          {/* Row 1: Names */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" placeholder="John" className={inputCls} {...register("first_name")} />
              {errors.first_name && <p className="text-destructive text-xs">{errors.first_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" placeholder="Doe" className={inputCls} {...register("last_name")} />
              {errors.last_name && <p className="text-destructive text-xs">{errors.last_name.message}</p>}
            </div>
          </div>

          {/* Row 2: Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" placeholder="john@example.com" className={inputCls} {...register("email")} />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>

          {/* Row 3: Phone + Role */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="+1 (555) 000-0000" className={inputCls} {...register("phone")} />
              {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Account Role</Label>
              <div className="relative">
                <select id="role" className={selectCls} {...register("role")}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="admin">Developer</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
              </div>
              {errors.role && <p className="text-destructive text-xs">{errors.role.message}</p>}
            </div>
          </div>

          {/* Row 4: Password + App */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Login Password</Label>
              <Input id="password" type="password" placeholder="••••••" className={inputCls} {...register("password")} />
              {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job_app_type">Primary Application</Label>
              <div className="relative">
                <select id="job_app_type" className={selectCls} {...register("job_app_type")}>
                  <option value="" disabled>Select app</option>
                  <option value="servicem8">ServiceM8</option>
                  <option value="commusoft">Commusoft</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
              </div>
              {errors.job_app_type && <p className="text-destructive text-xs">{errors.job_app_type.message}</p>}
            </div>
          </div>

          {/* Row 5: Company (Smart search with free text fallback) */}
          <div className="space-y-1.5" ref={companyFieldRef}>
            <Label className="text-foreground font-semibold text-sm">Company Name</Label>
            <div className="relative">
              <Input
                id="company_name"
                value={companyName}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setCompanyName(nextValue);
                  setServerError(null);
                  setShowCompanySuggestions(nextValue.trim().length > 0);
                }}
                onFocus={() => {
                  if (companyName.trim().length > 0) {
                    setShowCompanySuggestions(true);
                  }
                }}
                placeholder="Search or type company name..."
                className={inputCls}
                autoComplete="off"
              />
              {showCompanySuggestions && filteredClients.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl">
                  {filteredClients.map((client) => (
                    <button
                      key={client}
                      type="button"
                      onClick={() => {
                        setCompanyName(client);
                        setShowCompanySuggestions(false);
                        setServerError(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      {client}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {serverError === "Please enter a company name" && (
              <p className="text-destructive text-xs">{serverError}</p>
            )}
          </div>

          {/* Row 6: Website URL */}
          <div className="space-y-1.5">
            <Label htmlFor="website_url">Website URL</Label>
            <Input
              id="website_url"
              placeholder="https://company.co.uk"
              className={`${inputCls} border-amber-500/80 focus:ring-amber-500`}
              {...register("website_url")}
            />
          </div>

          {serverError && serverError !== "Please enter a company name" && (
            <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle className="w-4 h-4" /><span>{serverError}</span></div>
          )}

          {success && (
            <div className="flex items-center justify-center gap-2 text-emerald-500 text-sm font-medium"><CheckCircle2 className="w-4 h-4" /><span>User successfully created!</span></div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base rounded-xl transition-all shadow-sm">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create User Now"}
          </Button>

        </form>
      </CardContent>
    </Card>
  );
}

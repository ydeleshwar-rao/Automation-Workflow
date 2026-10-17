"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
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
import { useCreateDeveloperMutation } from "@/src/components/admin/access/apiIntegrations/accessApi";
import { getApiErrorMessage, getApiErrorStatus } from "@/src/lib/api-error";

const MINIMUM_PASSWORD_LENGTH = 8;
const HTTP_CONFLICT = 409;
const REDIRECT_DELAY_MS = 1500;
const ACCESS_PAGE_PATH = "/admin/access";

const createUserSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(MINIMUM_PASSWORD_LENGTH, `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters`),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

const inputClassName = "bg-background border-border text-foreground placeholder:text-muted-foreground/50 rounded-xl h-10 px-4 focus:ring-1 focus:ring-ring transition-all text-sm";

/**
 * Creates a developer account through the backend (POST /api/v1/access/developers).
 * New developers start with no page access; the admin grants it on the Access page.
 */
export function CreateUserForm() {
  const [createDeveloper, { isLoading: isSubmitting }] = useCreateDeveloperMutation();
  const [isCreated, setIsCreated] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { first_name: "", last_name: "", email: "", password: "" },
  });

  const showCreateUserError = (error: unknown) => {
    const status = getApiErrorStatus(error);
    if (status === undefined) {
      setServerError("A network error occurred.");
      return;
    }
    const errorMessage = getApiErrorMessage(error, "Failed to create user");
    if (status === HTTP_CONFLICT) {
      setError("email", { message: errorMessage });
    } else {
      setServerError(errorMessage);
    }
  };

  const onSubmit = async (formData: CreateUserFormData) => {
    setIsCreated(false);
    setServerError(null);

    try {
      await createDeveloper({
        email: formData.email,
        full_name: `${formData.first_name} ${formData.last_name}`,
        password: formData.password,
      }).unwrap();
      setIsCreated(true);
      reset();
      setTimeout(() => router.push(ACCESS_PAGE_PATH), REDIRECT_DELAY_MS);
    } catch (error) {
      showCreateUserError(error);
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
        <CardDescription className="text-muted-foreground text-sm">
          Adds a developer to your workspace. Grant page access afterwards on the Access page.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" placeholder="John" className={inputClassName} {...register("first_name")} />
              {errors.first_name && <p className="text-destructive text-xs">{errors.first_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" placeholder="Doe" className={inputClassName} {...register("last_name")} />
              {errors.last_name && <p className="text-destructive text-xs">{errors.last_name.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" placeholder="john@example.com" className={inputClassName} {...register("email")} />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Login Password</Label>
            <Input id="password" type="password" placeholder="••••••••" className={inputClassName} {...register("password")} />
            {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
          </div>

          {serverError && (
            <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle className="w-4 h-4" /><span>{serverError}</span></div>
          )}

          {isCreated && (
            <div className="flex items-center justify-center gap-2 text-emerald-500 text-sm font-medium"><CheckCircle2 className="w-4 h-4" /><span>User successfully created!</span></div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base rounded-xl transition-all shadow-sm">
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create User Now"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

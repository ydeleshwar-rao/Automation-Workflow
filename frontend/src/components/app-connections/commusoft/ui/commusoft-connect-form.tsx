"use client";

import { useState } from "react";
import { Loader2, Lock, User, Info } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/src/components/ui/card";
import { commusoftApi } from "../api/commusoft.api";
import { cn } from "@/src/lib/utils";

interface CommusoftConnectFormProps {
  onSuccess: () => void;
}

export function CommusoftConnectForm({ onSuccess }: CommusoftConnectFormProps) {
  const [clientId, setClientId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !username || !password) {
      setError("Please enter Client ID, username and password");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await commusoftApi.connect({ clientId, username, password });
      if (result.url) {
        window.location.href = result.url;
      } else {
        setSuccess(result.message || "Commusoft connected successfully.");
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to Commusoft. Please check your credentials and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-border/50 shadow-xl overflow-hidden rounded-3xl">
        <div className="h-2 bg-[#f58320]" />
        <CardHeader className="pt-8 pb-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-[#f58320]/10 flex items-center justify-center mx-auto mb-4 border border-[#f58320]/20">
            <Lock className="h-7 w-7 text-[#f58320]" />
          </div>
          <CardTitle className="text-2xl font-bold">Connect Commusoft</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Enter your Commusoft login credentials to sync your jobs and customers.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 px-8 pb-8">
            {success && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[13px] font-medium">
                {success}
              </div>
            )}
            {error && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[13px] font-medium flex items-start gap-2.5">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Client ID</label>
              <div className="relative group">
                <Input
                  type="text"
                  placeholder="e.g. 20225"
                  className="pl-10 h-12 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-all"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={isLoading}
                />
                <Info className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#f58320] transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Username</label>
              <div className="relative group">
                <Input
                  type="text"
                  placeholder="Your username"
                  className="pl-10 h-12 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#f58320] transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#f58320] transition-colors" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="px-8 pb-8 pt-0">
            <Button
              type="submit"
              className="w-full h-12 bg-[#f58320] hover:bg-[#e67500] text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all text-[15px]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Authorize Connection"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <p className="text-center mt-6 text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
        By connecting, you authorize LeadsHub to sync your job and customer data from Commusoft. 
        {/* <span className="block mt-1 font-medium">Your credentials are never stored on our servers.</span> */}
      </p>
    </div>
  );
}

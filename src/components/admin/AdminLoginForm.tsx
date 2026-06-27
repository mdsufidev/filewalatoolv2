"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, LockKeyhole, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminLoginFormProps = {
  nextPath: string;
};

export function AdminLoginForm({ nextPath }: AdminLoginFormProps) {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user, password }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "Could not sign in.");
        return;
      }

      router.replace(nextPath);
    } catch {
      setError("Could not sign in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
      <CardHeader className="gap-1.5 px-5 pb-2 pt-5">
        <CardTitle className="flex items-center gap-2 text-lg text-[#171717]">
          <LockKeyhole className="size-4 text-primary" aria-hidden="true" />
          Admin login
        </CardTitle>
        <CardDescription className="text-sm leading-6">
          Sign in to view submitted contact messages.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="admin-user" className="text-xs font-medium text-[#171717]">
              Username
            </Label>
            <Input
              id="admin-user"
              value={user}
              onChange={(event) => setUser(event.target.value)}
              className="h-11 rounded-xl border-[#E5E7EB] bg-white text-sm shadow-none focus-visible:ring-3 focus-visible:ring-ring/30"
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-password" className="text-xs font-medium text-[#171717]">
              Password
            </Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-xl border-[#E5E7EB] bg-white text-sm shadow-none focus-visible:ring-3 focus-visible:ring-ring/30"
              autoComplete="current-password"
            />
          </div>

          {error ? <p className="rounded-xl border border-primary/20 bg-[#FFF1F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</p> : null}

          <Button type="submit" className="min-h-11 w-full bg-primary hover:bg-[#B91C1C]" disabled={isSubmitting}>
            <LogIn className="size-4" />
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ChevronRight className="size-3.5" aria-hidden="true" />
            Access is limited to the admin login.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig, isMockMode } from "@/env";
import { mockSignIn } from "./mock-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  // Local mock backend: skip magic links, offer a one-click demo sign-in.
  if (isMockMode()) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Easy Logi Console</CardTitle>
            <CardDescription>Local demo — in-memory backend, no Supabase.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={mockSignIn} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Signed in as <strong>Demo Ops Admin</strong> (demo@easylogi.local). Data lives in
                memory and resets when the dev server restarts.
              </p>
              <Button type="submit" className="w-full">
                Enter the console
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }
  return <SupabaseLoginPage />;
}

function SupabaseLoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const configured = hasSupabaseConfig();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setStatus("sent");
      setMessage("Check your email for a magic link to sign in.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not send the magic link.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Easy Logi Console</CardTitle>
          <CardDescription>Sign in with a magic link.</CardDescription>
        </CardHeader>
        <CardContent>
          {!configured ? (
            <p className="text-sm text-muted-foreground">
              Supabase is not configured. Copy <code>.env.example</code> to{" "}
              <code>.env.local</code> and set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.co.sz"
                />
              </div>
              <Button type="submit" className="w-full" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send magic link"}
              </Button>
              {message && (
                <p
                  className={
                    status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"
                  }
                >
                  {message}
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

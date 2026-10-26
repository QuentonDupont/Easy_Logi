"use client";

import { useState } from "react";
import { Building2, User, ShieldCheck } from "lucide-react";
import { Logo } from "@easy-logi/ui";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig, isMockMode } from "@/env";
import { DEMO_LOGINS } from "@/lib/mock/demo-logins";
import { mockSignIn } from "./mock-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DOORS = {
  business: {
    icon: Building2,
    title: "Business account",
    body: "Importers, workshops and fleets. Run imports under your company's customs number, with company documents.",
  },
  individual: {
    icon: User,
    title: "Personal account",
    body: "Buying a part for your own vehicle. Easy Logi handles sourcing, shipping and customs; you upload your ID and payments.",
  },
  staff: {
    icon: ShieldCheck,
    title: "Easy Logi staff",
    body: "Operations: every account, every order, document overrides.",
  },
} as const;

export default function LoginPage() {
  // Local mock backend: skip magic links, offer one-click demo sign-ins for each side.
  if (isMockMode()) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-4">
        <Logo size={36} variant="dark" />
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Sign in to Easy Logi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Local demo — in-memory data, resets when the dev server restarts.
          </p>
        </div>
        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
          {DEMO_LOGINS.map((l) => {
            const door = DOORS[l.kind];
            const Icon = door.icon;
            return (
              <form key={l.userId} action={mockSignIn} className="flex flex-col gap-3 rounded-lg border bg-card p-5">
                <input type="hidden" name="userId" value={l.userId} />
                <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">{door.title}</h2>
                <p className="flex-1 text-sm text-muted-foreground">{door.body}</p>
                <p className="text-xs text-muted-foreground">
                  Demo: <strong className="text-foreground">{l.name}</strong> · {l.org}
                </p>
                <Button type="submit" variant={l.kind === "staff" ? "outline" : "default"} className="w-full">
                  Continue as {l.kind === "staff" ? "staff" : l.kind === "business" ? "a business" : "an individual"}
                </Button>
              </form>
            );
          })}
        </div>
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

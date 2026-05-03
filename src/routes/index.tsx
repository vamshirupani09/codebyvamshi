import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Code2, Bot, Map, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import heroImg from "@/assets/hero-illustration.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});
type FormData = z.infer<typeof schema>;

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: FormData) => {
    setBusy(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to verify.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(values);
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/dashboard` });
    if (r.error) {
      toast.error(r.error.message ?? "Google sign-in failed");
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!resetEmail) return;
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Reset link sent. Check your email.");
      setShowReset(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <section className="relative hidden lg:flex flex-col justify-between p-12 bg-cream overflow-hidden">
        <div className="flex items-center gap-2 z-10">
          <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <span className="font-display text-2xl">Codex</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-5xl leading-tight">
            Code smarter with a team of <em className="text-coral not-italic">AI agents</em>.
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Practice DSA, run code in Java, Python, C++ and JS, and get instant help from coder, debugger,
            test-case and explainer agents.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              { icon: Code2, t: "Online compiler with custom inputs" },
              { icon: Bot, t: "Multi-agent AI: Coder, Debugger, Tests, Explainer" },
              { icon: Map, t: "Structured DSA roadmap & weekly assignments" },
              { icon: CheckCircle2, t: "Track progress, bookmarks & resources" },
            ].map((f) => (
              <li key={f.t} className="flex items-center gap-3">
                <f.icon className="size-4 text-primary" /> {f.t}
              </li>
            ))}
          </ul>
        </div>

        <img
          src={heroImg}
          alt=""
          width={1024}
          height={1280}
          className="pointer-events-none absolute -right-24 -bottom-24 w-[640px] opacity-90 mix-blend-multiply"
        />
        <div className="text-xs text-muted-foreground z-10">© Codex — minimalist learning, for builders.</div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="font-display text-2xl">Codex</span>
          </div>
          <h2 className="font-display text-3xl">Welcome</h2>
          <p className="text-muted-foreground mt-1">Sign in or create an account to continue.</p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="mt-8">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" />
            <TabsContent value="signup" />
          </Tabs>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password">Password</Label>
                {tab === "signin" && (
                  <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowReset((s) => !s)}>
                    Forgot password?
                  </button>
                )}
              </div>
              <Input id="password" type="password" autoComplete={tab === "signup" ? "new-password" : "current-password"} {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            {showReset && (
              <div className="rounded-lg border border-border p-3 bg-secondary/40 space-y-2">
                <Label className="text-xs">Send reset link to</Label>
                <div className="flex gap-2">
                  <Input value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@example.com" />
                  <Button type="button" variant="secondary" onClick={reset}>Send</Button>
                </div>
              </div>
            )}

            <Button type="submit" disabled={busy} className="w-full">
              {tab === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">OR</span></div>
          </div>

          <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
            <svg className="size-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.28-1.93-6.15-4.53H2.17v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.85 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.17a11 11 0 0 0 0 9.86l3.68-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.17 7.07l3.68 2.84C6.72 7.31 9.14 5.38 12 5.38z"/></svg>
            Continue with Google
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-6">
            By continuing you agree to our terms.{" "}
            <Link to="/" className="hover:underline">Need help?</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

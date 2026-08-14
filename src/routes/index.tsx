import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Code2, Bot, Map, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
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
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const n = typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined;
    return n ? { next: n } : {};
  },
  component: Landing,
});

const emailField = z.string().trim().email("Enter a valid email").max(255);

const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password required").max(72),
});

const signUpSchema = z
  .object({
    email: emailField,
    password: z
      .string()
      .min(8, "At least 8 characters")
      .max(72, "Max 72 characters")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/[a-z]/, "Add a lowercase letter")
      .regex(/[0-9]/, "Add a number"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Incorrect email or password.";
  if (m.includes("email not confirmed")) return "Please verify your email before signing in.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "That email is already registered. Try signing in.";
  if (m.includes("rate")) return "Too many attempts. Please wait a moment.";
  return msg;
}

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const { next } = Route.useSearch();
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "";

  useEffect(() => {
    if (!loading && user) {
      if (safeNext) window.location.href = safeNext;
      else navigate({ to: "/dashboard" });
    }
  }, [loading, user, navigate, safeNext]);

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirm: "" },
  });

  const onSignIn = async (values: SignInForm) => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) throw error;
      toast.success("Welcome back!");
    } catch (e: unknown) {
      toast.error(friendlyAuthError(e instanceof Error ? e.message : "Sign-in failed"));
    } finally {
      setBusy(false);
    }
  };

  const onSignUp = async (values: SignUpForm) => {
    setBusy(true);
    try {
      const emailRedirectTo = safeNext
        ? `${window.location.origin}${safeNext}`
        : `${window.location.origin}/dashboard`;
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { emailRedirectTo },
      });
      if (error) throw error;
      if (data.session) toast.success("Account created — you're in!");
      else toast.success("Account created! Check your email to verify.");
    } catch (e: unknown) {
      toast.error(friendlyAuthError(e instanceof Error ? e.message : "Sign-up failed"));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const redirect_uri = safeNext
        ? `${window.location.origin}${safeNext}`
        : window.location.origin;
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri });
      if (r.error) {
        toast.error(r.error.message ?? "Google sign-in failed");
        setBusy(false);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
      setBusy(false);
    }
  };

  const reset = async () => {
    const parsed = emailField.safeParse(resetEmail);
    if (!parsed.success) return toast.error("Enter a valid email");
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(friendlyAuthError(error.message));
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
            Practice DSA, run code in 6 languages, and get instant help from coder, debugger,
            complexity, optimizer and hint agents.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              { icon: Code2, t: "Online compiler — Python, JS, TS, Java, C, C++" },
              { icon: Bot, t: "7 AI agents: Coder, Debugger, Tests, Explainer, Complexity, Optimizer, Hints" },
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

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" autoComplete="email" {...signInForm.register("email")} />
                  {signInForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{signInForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="si-pw">Password</Label>
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowReset((s) => !s)}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="si-pw"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      {...signInForm.register("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {signInForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{signInForm.formState.errors.password.message}</p>
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
                  {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" autoComplete="email" {...signUpForm.register("email")} />
                  {signUpForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pw">Password</Label>
                  <div className="relative">
                    <Input
                      id="su-pw"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      {...signUpForm.register("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {signUpForm.formState.errors.password ? (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.password.message}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">8+ chars, upper &amp; lower case, a number.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-confirm">Confirm password</Label>
                  <Input
                    id="su-confirm"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    {...signUpForm.register("confirm")}
                  />
                  {signUpForm.formState.errors.confirm && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.confirm.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

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

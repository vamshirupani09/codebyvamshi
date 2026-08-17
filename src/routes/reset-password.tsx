import { seoHead } from "@/lib/seo";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => seoHead({ path: "/reset-password", title: "Reset Your Password | Codex", description: "Choose a new password for your Codex account and get back to your DSA practice, AI assistant and interview preparation.", noindex: true }),
  component: ResetPassword,
});

function ResetPassword() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const validate = (): string | null => {
    if (pw.length < 8) return "At least 8 characters";
    if (!/[A-Z]/.test(pw)) return "Add an uppercase letter";
    if (!/[a-z]/.test(pw)) return "Add a lowercase letter";
    if (!/[0-9]/.test(pw)) return "Add a number";
    if (pw !== confirm) return "Passwords don't match";
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) return toast.error(err);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="font-display text-3xl">Set a new password</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a strong password to secure your account.</p>
        </div>
        <div className="space-y-2">
          <Label>New password</Label>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          <p className="text-[11px] text-muted-foreground">8+ chars, upper &amp; lower case, a number.</p>
        </div>
        <div className="space-y-2">
          <Label>Confirm password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
          Update password
        </Button>
      </div>
    </div>
  );
}

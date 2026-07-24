import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

type AuthorizationDetails = {
  client?: { name?: string; client_uri?: string; logo_uri?: string } | null;
  redirect_uri?: string | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

// Local typed wrapper — the supabase.auth.oauth namespace is beta.
type OAuthClient = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: Error | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: Error | null }>;
};

const authOAuth = () =>
  (supabase.auth as unknown as { oauth: OAuthClient }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await authOAuth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen grid place-items-center p-8">
      <Card className="max-w-md p-6">
        <h1 className="font-display text-xl mb-2">Authorization unavailable</h1>
        <p className="text-sm text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </p>
      </Card>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await authOAuth().approveAuthorization(authorization_id)
      : await authOAuth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-background">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <span className="font-display text-xl">Codex</span>
        </div>

        <div>
          <h1 className="font-display text-2xl">Connect {clientName} to your account</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This lets {clientName} use Codex as you — reading and updating your bookmarks,
            DSA progress, and notifications on your behalf.
          </p>
        </div>

        <div className="text-xs text-muted-foreground rounded-md bg-muted p-3">
          This does not bypass Codex permissions or backend policies. You can revoke access
          at any time from your account settings.
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => decide(false)} className="flex-1">
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => decide(true)} className="flex-1">
            {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
            Approve
          </Button>
        </div>
      </Card>
    </main>
  );
}

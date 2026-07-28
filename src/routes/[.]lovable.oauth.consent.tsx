import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, ShieldCheck, X } from "lucide-react";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthClient = { name?: string; logo_uri?: string; client_uri?: string };
type OAuthDetails = { client?: OAuthClient; redirect_url?: string; redirect_to?: string; scopes?: string[] };
type OAuthResult = { redirect_url?: string; redirect_to?: string };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
};
function oauthApi(): OAuthApi {
  const anyAuth = supabase.auth as unknown as { oauth: OAuthApi };
  return anyAuth.oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="bg-aurora flex min-h-screen items-center justify-center p-6">
      <div className="glass-strong max-w-md rounded-3xl p-8 text-center">
        <h1 className="text-lg font-semibold">Could not load this authorization request</h1>
        <p className="mt-2 text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </div>
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
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an application";

  return (
    <main className="bg-aurora relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 grid-3d opacity-30" />
      <div className="glass-strong z-10 w-full max-w-md rounded-3xl p-8 pop-in">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11">
            <div className="absolute inset-0 rounded-xl btn-glow" />
            <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">AI StudyMate Pro</div>
            <div className="font-semibold">Connect an integration</div>
          </div>
        </div>

        <h1 className="mt-6 text-xl font-bold">
          Allow <span className="text-gradient">{clientName}</span> to use AI StudyMate Pro as you?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It will be able to call your tools on your behalf — generating notes, summaries, quizzes, translations, and reading your saved items.
          You can revoke this at any time.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="btn-glow inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold hover:btn-glow-hover disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="glass inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/10 disabled:opacity-60"
          >
            <X className="h-4 w-4" /> Deny
          </button>
        </div>
      </div>
    </main>
  );
}

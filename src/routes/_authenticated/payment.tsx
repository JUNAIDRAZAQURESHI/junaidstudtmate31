import { BackBar } from "@/components/BackBar";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  getPaymentSettings,
  listPlans,
  submitPaymentRequest,
  listMyPaymentRequests,
  getMySubscription,
} from "@/lib/billing.functions";
import { supabase } from "@/integrations/supabase/client";

type Search = { plan?: "pro_monthly" | "pro_yearly" };

export const Route = createFileRoute("/_authenticated/payment")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    plan: s.plan === "pro_yearly" ? "pro_yearly" : s.plan === "pro_monthly" ? "pro_monthly" : undefined,
  }),
  component: PaymentPage,
});

function PaymentPage() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const fSettings = useServerFn(getPaymentSettings);
  const fPlans = useServerFn(listPlans);
  const fSubmit = useServerFn(submitPaymentRequest);
  const fMine = useServerFn(listMyPaymentRequests);
  const fSub = useServerFn(getMySubscription);

  const { data: settingsData } = useQuery({ queryKey: ["payment-settings"], queryFn: () => fSettings() });
  const { data: plansData } = useQuery({ queryKey: ["plans"], queryFn: () => fPlans() });
  const { data: mine } = useQuery({ queryKey: ["my-payments"], queryFn: () => fMine() });
  const { data: sub } = useQuery({ queryKey: ["my-sub"], queryFn: () => fSub() });

  const settings = settingsData?.settings;
  const plans = (plansData?.plans ?? []).filter((p) => p.id !== "free");
  const methods = (settings?.methods as { key: string; name: string; color: string }[] | undefined) ?? [];

  const [planId, setPlanId] = useState<"pro_monthly" | "pro_yearly">(search.plan ?? "pro_monthly");
  const selectedPlan = plans.find((p) => p.id === planId);
  const [method, setMethod] = useState<string>(methods[0]?.name ?? "EasyPaisa");
  const [senderName, setSenderName] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan) return;
    setBusy(true);
    try {
      let screenshotPath: string | undefined;
      if (file) {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) throw new Error("Not signed in");
        const ext = file.name.split(".").pop() || "png";
        const path = `${uid}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, {
          contentType: file.type || "image/png",
          upsert: false,
        });
        if (upErr) throw new Error(upErr.message);
        screenshotPath = path;
      }
      await fSubmit({
        data: {
          planId,
          method,
          senderName,
          senderNumber,
          amountUsd: Number(selectedPlan.price_usd),
          screenshotPath,
        },
      });
      toast.success("Payment submitted! We'll activate your Pro plan after verification.");
      setSenderName(""); setSenderNumber(""); setFile(null);
      qc.invalidateQueries({ queryKey: ["my-payments"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  const currentPlan = sub?.plan?.name ?? "Free";
  const currentPlanId = sub?.plan?.id ?? "free";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="glass-strong rounded-3xl p-6 md:p-8 pop-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Upgrade to <span className="text-gradient">Pro</span></h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Current plan: <span className="font-semibold text-foreground">{currentPlan}</span>
              {sub?.subscription?.expires_at && currentPlanId !== "free" ? (
                <> · renews {new Date(sub.subscription.expires_at).toLocaleDateString()}</>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: plan + payment details */}
        <div className="space-y-6">
          <div className="glass-strong rounded-3xl p-6">
            <h2 className="text-lg font-semibold">1. Choose your plan</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlanId(p.id as "pro_monthly" | "pro_yearly")}
                  className={`glass rounded-2xl p-4 text-left transition ${planId === p.id ? "ring-2 ring-primary" : "hover:bg-white/5"}`}
                >
                  <div className="text-xs text-muted-foreground">{p.name}</div>
                  <div className="mt-1 text-2xl font-bold">${Number(p.price_usd)}</div>
                  <div className="text-xs text-muted-foreground">/ {p.interval}</div>
                  <div className="mt-2 text-xs">{p.daily_credits} credits / day</div>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-6">
            <h2 className="text-lg font-semibold">2. Send payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send exactly <span className="font-semibold text-foreground">${selectedPlan ? Number(selectedPlan.price_usd) : 0}</span> to any of these numbers, then submit the form.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {methods.map((m) => (
                <div key={m.key} className="glass rounded-2xl p-4 text-center">
                  <div className="mx-auto h-2 w-10 rounded-full" style={{ background: m.color }} />
                  <div className="mt-2 text-sm font-semibold">{m.name}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CopyRow label="Account Name" value={settings?.account_name ?? ""} />
              <CopyRow label="Account Number" value={settings?.account_number ?? ""} highlight />
              <CopyRow label="Contact" value={settings?.contact_number ?? ""} />
              <CopyRow label="Support Email" value={settings?.support_email ?? ""} />
            </div>
            {settings?.instructions ? (
              <p className="mt-3 text-xs text-muted-foreground">{settings.instructions}</p>
            ) : null}
          </div>
        </div>

        {/* Right: submission form */}
        <form onSubmit={onSubmit} className="glass-strong rounded-3xl p-6">
          <h2 className="text-lg font-semibold">3. Confirm your payment</h2>
          <p className="mt-1 text-sm text-muted-foreground">We'll activate Pro within a few hours after verification.</p>

          <label className="mt-4 block text-xs text-muted-foreground">Payment method</label>
          <select
            value={method} onChange={(e) => setMethod(e.target.value)}
            className="glass mt-1 w-full rounded-xl px-4 py-3 text-sm outline-none"
          >
            {methods.map((m) => <option key={m.key} value={m.name}>{m.name}</option>)}
          </select>

          <label className="mt-3 block text-xs text-muted-foreground">Your name (on the sending account)</label>
          <input required minLength={2} value={senderName} onChange={(e) => setSenderName(e.target.value)}
            className="glass mt-1 w-full rounded-xl px-4 py-3 text-sm outline-none" />

          <label className="mt-3 block text-xs text-muted-foreground">Your account number</label>
          <input required minLength={6} value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)}
            className="glass mt-1 w-full rounded-xl px-4 py-3 text-sm outline-none" />

          <label className="mt-3 block text-xs text-muted-foreground">Payment screenshot (optional but recommended)</label>
          <label className="glass mt-1 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-3 text-sm">
            <Upload className="h-4 w-4" />
            <span className="truncate">{file?.name ?? "Choose image…"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          <button
            disabled={busy}
            className="btn-glow mt-5 w-full rounded-xl px-5 py-3 text-sm font-semibold hover:btn-glow-hover disabled:opacity-60"
          >
            {busy ? "Submitting…" : `Submit payment · $${selectedPlan ? Number(selectedPlan.price_usd) : 0}`}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="glass-strong mt-6 rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Your payment history</h2>
        {mine?.requests?.length ? (
          <div className="mt-3 divide-y divide-white/10">
            {mine.requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <div className="font-medium">{r.plan_id === "pro_yearly" ? "Pro Yearly" : "Pro Monthly"} · ${Number(r.amount_usd)}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.method} · {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p>
        )}
      </div>
    </div>
  );
}

function CopyRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label} copied`); }}
      className={`glass flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm hover:bg-white/10 ${highlight ? "ring-1 ring-primary/50" : ""}`}
    >
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-sm">{value}</div>
      </div>
      <Copy className="h-4 w-4 shrink-0 opacity-70" />
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-300"><CheckCircle2 className="h-3 w-3" /> Approved</span>;
  if (status === "rejected") return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300"><XCircle className="h-3 w-3" /> Rejected</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-200"><Clock className="h-3 w-3" /> Pending</span>;
}

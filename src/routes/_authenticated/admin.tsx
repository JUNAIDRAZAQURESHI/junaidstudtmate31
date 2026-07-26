import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ShieldCheck, Mail } from "lucide-react";
import { amIAdmin, claimFirstAdmin, listPendingPayments, decidePayment, listContactMessages } from "@/lib/admin.functions";
import { signedScreenshotUrl } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const fAdmin = useServerFn(amIAdmin);
  const fClaim = useServerFn(claimFirstAdmin);
  const fList = useServerFn(listPendingPayments);
  const fDecide = useServerFn(decidePayment);
  const fContact = useServerFn(listContactMessages);
  const fSigned = useServerFn(signedScreenshotUrl);
  const qc = useQueryClient();

  const { data: admin, refetch: refetchAdmin } = useQuery({ queryKey: ["am-admin"], queryFn: () => fAdmin() });
  const isAdmin = admin?.isAdmin ?? false;

  const { data: payments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => fList(),
    enabled: isAdmin,
  });
  const { data: contact } = useQuery({
    queryKey: ["admin-contact"],
    queryFn: () => fContact(),
    enabled: isAdmin,
  });

  async function claim() {
    try {
      const res = await fClaim();
      if (res.claimed) {
        toast.success("You are now the admin.");
        refetchAdmin();
      } else {
        toast.error("An admin already exists.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function view(path: string) {
    try {
      const res = await fSigned({ data: { path } });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function decide(id: string, decision: "approve" | "reject") {
    try {
      await fDecide({ data: { id, decision } });
      toast.success(`Payment ${decision}d`);
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="glass-strong rounded-3xl p-8 text-center pop-in">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You are not an admin yet. If no admin exists in the system, you can claim the first admin role.
          </p>
          <button onClick={claim} className="btn-glow mt-6 rounded-xl px-5 py-3 text-sm font-semibold hover:btn-glow-hover">
            Claim first admin role
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="glass-strong rounded-3xl p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Approve payments, review messages.</p>
      </div>

      <div className="glass-strong rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Payment requests</h2>
        {payments?.requests?.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">User</th><th>Plan</th><th>Method</th><th>Amount</th><th>Status</th><th>Screenshot</th><th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {payments.requests.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3">
                      <div className="font-medium">{r.sender_name}</div>
                      <div className="text-xs text-muted-foreground">{r.sender_number}</div>
                    </td>
                    <td>{r.plan_id === "pro_yearly" ? "Yearly" : "Monthly"}</td>
                    <td>{r.method}</td>
                    <td>${Number(r.amount_usd)}</td>
                    <td>
                      {r.status === "pending" && <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-200">pending</span>}
                      {r.status === "approved" && <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-300">approved</span>}
                      {r.status === "rejected" && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">rejected</span>}
                    </td>
                    <td>
                      {r.screenshot_path ? (
                        <button onClick={() => view(r.screenshot_path!)} className="text-primary hover:underline text-xs">View</button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="text-right">
                      {r.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => decide(r.id, "approve")} className="glass rounded-lg px-3 py-1 text-xs hover:bg-green-500/20">
                            <CheckCircle2 className="mr-1 inline h-3 w-3" /> Approve
                          </button>
                          <button onClick={() => decide(r.id, "reject")} className="glass rounded-lg px-3 py-1 text-xs hover:bg-red-500/20">
                            <XCircle className="mr-1 inline h-3 w-3" /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-2 text-sm text-muted-foreground">No payment requests.</p>}
      </div>

      <div className="glass-strong rounded-3xl p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Contact messages</h2>
        {contact?.messages?.length ? (
          <div className="mt-3 space-y-3">
            {contact.messages.map((m) => (
              <div key={m.id} className="glass rounded-2xl p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="font-medium">{m.subject}</div>
                  <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{m.name} · {m.email}</div>
                <p className="mt-2 whitespace-pre-wrap">{m.message}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-2 text-sm text-muted-foreground">No messages.</p>}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";
import { getProfile, updateProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

function ProfilePage() {
  const getFn = useServerFn(getProfile);
  const updFn = useServerFn(updateProfile);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");

  const q = useQuery({ queryKey: ["profile"], queryFn: () => getFn() });

  useEffect(() => {
    if (q.data?.profile) {
      setDisplayName(q.data.profile.display_name ?? "");
      setBio(q.data.profile.bio ?? "");
      setAvatar(q.data.profile.avatar_url ?? "");
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => updFn({ data: { display_name: displayName, bio, avatar_url: avatar } }),
    onSuccess: () => toast.success("Profile updated"),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="glass-strong rounded-3xl p-8 pop-in">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-1 text-muted-foreground">Update how you appear across StudyMate.</p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        className="glass rounded-3xl p-6 space-y-4"
      >
        <div className="flex items-center gap-4">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full btn-glow">
              <User className="h-7 w-7 text-white" />
            </div>
          )}
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Avatar URL</label>
            <input
              value={avatar} onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://…"
              className="glass mt-1 w-full rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Display name</label>
          <input
            value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="glass mt-1 w-full rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Bio</label>
          <textarea
            value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
            className="glass mt-1 w-full resize-y rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={save.isPending}
          className="btn-glow inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold hover:btn-glow-hover disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
        </button>
      </form>
    </div>
  );
}

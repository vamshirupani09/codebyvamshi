import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, BookmarkX } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/profile")({
  component: () => (
    <DashboardLayout>
      <Profile />
    </DashboardLayout>
  ),
});

interface Bookmark { id: string; problem_title: string; problem_url: string; topic: string | null }

function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("bookmarks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (p?.full_name) setName(p.full_name);
      if (b) setBookmarks(b as Bookmark[]);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: name, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const removeBookmark = async (id: string) => {
    await supabase.from("bookmarks").delete().eq("id", id);
    setBookmarks((p) => p.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl">Profile</h1>
        <p className="text-sm text-muted-foreground">Your details and saved problems.</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <Button onClick={save} disabled={busy}>Save</Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-xl mb-3">Bookmarks</h2>
        {bookmarks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookmarks yet — save problems from the Assignments page.</p>
        ) : (
          <ul className="space-y-2">
            {bookmarks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 border-b last:border-0 pb-2">
                <a href={b.problem_url} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
                  {b.problem_title} <ExternalLink className="size-3" />
                </a>
                <button onClick={() => removeBookmark(b.id)} className="text-muted-foreground hover:text-destructive">
                  <BookmarkX className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

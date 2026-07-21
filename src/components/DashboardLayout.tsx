import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Code2,
  Map,
  CalendarDays,
  Bot,
  BookOpen,
  User as UserIcon,
  LogOut,
  Bell,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AIMentor } from "@/components/AIMentor";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/compiler", label: "Compiler", icon: Code2 },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
  { to: "/roadmap", label: "DSA Roadmap", icon: Map },
  { to: "/assignments", label: "Assignments", icon: CalendarDays },
  { to: "/resources", label: "Resources", icon: BookOpen },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifs, setNotifs] = useState<Array<{ id: string; title: string; message: string | null; read: boolean; created_at: string }>>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/", search: { redirect: location.pathname } as never });
  }, [loading, user, navigate, location.pathname]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => data && setNotifs(data));
  }, [user]);

  const unread = notifs.filter((n) => !n.read).length;
  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifs((p) => p.map((n) => ({ ...n, read: true })));
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar p-4 sticky top-0 h-screen">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-3">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <span className="font-display text-xl">Codex</span>
        </Link>
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((n) => {
            const active = location.pathname === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto text-xs text-muted-foreground px-2">
          <p className="font-display text-sm text-foreground">Tip</p>
          <p className="mt-1">Use the AI Assistant for explanations, debugging & test cases.</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-background/80 backdrop-blur px-4 md:px-8 h-16">
          <div className="md:hidden flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Sparkles className="size-3.5" />
            </div>
            <span className="font-display text-lg">Codex</span>
          </div>
          <div className="flex-1" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between p-3 border-b">
                <span className="font-display text-sm">Notifications</span>
                {unread > 0 && (
                  <button className="text-xs text-primary hover:underline" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <ScrollArea className="h-72">
                {notifs.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
                ) : (
                  <ul className="divide-y">
                    {notifs.map((n) => (
                      <li key={n.id} className={`p-3 ${!n.read ? "bg-secondary/40" : ""}`}>
                        <p className="text-sm font-medium">{n.title}</p>
                        {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm max-w-[140px] truncate">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}>
                <UserIcon className="size-4 mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="size-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
      <AIMentor />
    </div>
  );
}

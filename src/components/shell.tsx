import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Archive, CalendarDays, Plus, Route, Users, Waypoints } from "lucide-react";
import { Mark } from "@/components/monogram";
import { PersonDialog } from "@/components/person-dialog";
import { ReminderRunner } from "@/components/reminder-runner";
import { RestoreDialog } from "@/components/restore-dialog";
import { ThemeSwitch } from "@/components/theme-switch";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyReminder } from "@/lib/family/mail.functions";
import { Button, buttonClass } from "@/components/ui/button";
import { useEditor } from "@/lib/family/editor";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Tree", icon: Waypoints, exact: true },
  { to: "/directory", label: "Directory", icon: Users, exact: true },
  { to: "/kinship", label: "Kinship", icon: Route, exact: true },
  { to: "/occasions", label: "Events", icon: CalendarDays, exact: true },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const openCreate = useEditor((state) => state.openCreate);

  return (
    <div className="kolam-ground flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="silk-edge z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 md:gap-4 md:px-5">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-strong">
            <Mark className="size-6" />
          </span>
          <span className="min-w-0 leading-none">
            <span className="block truncate font-display text-xl tracking-tight">Lineage</span>
            <span lang="ta" className="block truncate text-xs text-gold">
              வம்சம்
            </span>
          </span>
        </Link>
        <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex h-11 items-center rounded-lg px-3 text-sm transition-colors duration-200"
              activeProps={{ className: "bg-accent-soft text-accent-strong" }}
              inactiveProps={{ className: "text-muted hover:text-ink" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <AuthSlot />
          <Link to="/record" aria-label="Record" className={buttonClass("ghost", "px-3")}>
            <Archive className="size-4" />
            <span className="sr-only sm:not-sr-only">Record</span>
          </Link>
          <ThemeSwitch />
          <Button onClick={openCreate} aria-label="Add person" className="px-3">
            <Plus className="size-4" />
            <span className="sr-only sm:not-sr-only">Add person</span>
          </Button>
        </div>
      </header>
      <main id="main" className="relative min-h-0 flex-1">
        {children}
      </main>
      <nav
        className="silk-edge-top fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface md:hidden"
        aria-label="Primary"
      >
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact }}
            className="flex h-16 flex-col items-center justify-center gap-1 text-xs"
            activeProps={{ className: "text-accent-strong" }}
            inactiveProps={{ className: "text-muted" }}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>
      <PersonDialog />
      <RestoreDialog />
      <ReminderRunner />
    </div>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    void getMyReminder()
      .then((prefs) => {
        if (!cancelled) setIsAdmin(prefs.isAdmin);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (isPending) return <div className="size-9 animate-pulse rounded-full bg-accent-soft" aria-hidden />;
  if (!user) {
    return (
      <Link to="/login" className={buttonClass("ghost", "px-3")}>
        Sign in
      </Link>
    );
  }
  return (
    <div className="auth-slot flex min-w-0 items-center gap-1">
      {isAdmin ? (
        <Link to="/admin" className={buttonClass("ghost", "hidden px-3 sm:inline-flex")}>
          Admin
        </Link>
      ) : null}
      <UserButton />
    </div>
  );
}

export function Pane({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("absolute inset-0 overflow-auto px-4 py-6 pb-24 md:px-8 md:pb-10", className)}>
      {children}
    </div>
  );
}

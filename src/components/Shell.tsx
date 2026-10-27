"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  ClipboardList,
  FileText,
  Gem,
  Hammer,
  Images,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Truck,
  Users,
  Repeat,
  ChevronRight,
  CornerDownLeft,
} from "lucide-react";
import { can, login, logout, useDB, useStore, useUser } from "@/lib/store";
import { setTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/format";
import { Wordmark } from "./brand";
import { Avatar, Drawer, IconButton, Kbd, Modal } from "./ui";
import { ActivityFeed } from "./domain";

export const NAV = [
  {
    group: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/board", label: "Production board", icon: KanbanSquare },
    ],
  },
  {
    group: "Orders",
    items: [
      { href: "/orders", label: "Orders", icon: ClipboardList },
      { href: "/pieces", label: "Pieces", icon: Gem },
      { href: "/customers", label: "Customers", icon: Users },
    ],
  },
  {
    group: "Workshop",
    items: [
      { href: "/karigars", label: "Karigars", icon: Hammer },
      { href: "/work-orders", label: "Work orders", icon: FileText },
      { href: "/job-work", label: "Outside job work", icon: Sparkles },
    ],
  },
  {
    group: "Dispatch & insight",
    items: [
      { href: "/deliveries", label: "Deliveries", icon: Truck },
      { href: "/photos", label: "Photo vault", icon: Images },
      { href: "/reports", label: "Reports", icon: BarChart3, perm: "reports.view" },
      { href: "/settings", label: "Settings", icon: Settings2, perm: "settings.manage" },
    ],
  },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const status = useStore((s) => s.status);
  const user = useUser();
  const router = useRouter();
  const [palette, setPalette] = useState(false);
  const [feed, setFeed] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (status !== "ready") return;
    if (!user) router.replace("/");
    else if (user.role === "KARIGAR") router.replace("/k");
  }, [status, user, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!user || user.role === "KARIGAR") return null;

  return (
    <div className="relative z-10 min-h-dvh lg:pl-[264px]">
      <Sidebar />
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 md:px-8">
          <div className="lg:hidden">
            <Wordmark className="[&_svg]:size-7 [&_.font-display]:text-xl" />
          </div>
          <button
            onClick={() => setPalette(true)}
            className="ml-auto flex h-10 items-center gap-2.5 rounded-full border border-line bg-panel px-3 text-sm text-faint transition hover:border-gold/40 hover:text-muted lg:ml-0 lg:w-[380px] lg:px-4"
          >
            <Search className="size-4" />
            <span className="hidden lg:inline">Search orders, pieces, karigars…</span>
            <span className="ml-auto hidden gap-1 lg:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <div className="flex items-center gap-1 lg:ml-auto">
            <IconButton label="Activity" onClick={() => setFeed(true)} className="relative">
              <Bell className="size-5" />
              <span className="pulse-dot absolute top-2.5 right-2.5 size-2 rounded-full bg-gold shadow-[0_0_0_3px_var(--bg)]" />
            </IconButton>
            <ThemeToggle />
            <Link
              href="/orders/new"
              className="gold-fill ml-1 hidden h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-[0_8px_24px_-10px_var(--gold)] transition hover:brightness-110 md:inline-flex"
            >
              <Plus className="size-4" /> New order
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 pt-6 pb-32 md:px-8 lg:pb-16">{children}</main>

      <MobileDock onMore={() => setMore(true)} />
      <MoreSheet open={more} onClose={() => setMore(false)} />
      {palette && <CommandPalette open onClose={() => setPalette(false)} />}
      <Drawer open={feed} onClose={() => setFeed(false)} title="Atelier activity">
        <ActivityFeed limit={60} />
      </Drawer>
    </div>
  );
}

function useNavItems() {
  const db = useDB();
  const user = useUser();
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => !("perm" in i) || can(db, user?.role, i.perm)) })).filter((g) => g.items.length);
}

function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

function Sidebar() {
  const path = usePathname();
  const db = useDB();
  const groups = useNavItems();
  const counts: Record<string, number> = {
    "/work-orders": db.workOrders.filter((w) => db.settings.workStatuses.find((s) => s.id === w.statusId)?.category === "SUBMITTED").length,
    "/job-work": db.jobWorks.filter((j) => !j.returnedAt).length,
    "/deliveries": db.pieces.filter((p) => p.location === "READY").length,
  };
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[264px] flex-col border-r border-line bg-bg/60 backdrop-blur-xl lg:flex">
      <div className="px-6 pt-6 pb-5">
        <Link href="/dashboard">
          <Wordmark />
        </Link>
      </div>
      <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[.26em] text-faint">{g.group}</div>
            {g.items.map((i) => {
              const active = isActive(path, i.href);
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  className={cn(
                    "group relative mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition",
                    active ? "bg-gradient-to-r from-gold/15 to-transparent text-text" : "text-muted hover:bg-panel hover:text-text",
                  )}
                >
                  {active && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-gold shadow-[0_0_12px_var(--gold)]" />}
                  <i.icon className={cn("size-[18px]", active ? "text-gold" : "text-faint group-hover:text-gold")} />
                  {i.label}
                  {!!counts[i.href] && (
                    <span className="tabular ml-auto rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">{counts[i.href]}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <UserCard />
      </div>
    </aside>
  );
}

function UserCard() {
  const user = useUser()!;
  const db = useDB();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const others = db.users.filter((u) => u.id !== user.id);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-panel">
        <Avatar name={user.name} hue={user.role === "OWNER" ? 40 : user.role === "MANAGER" ? 200 : 300} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{user.name}</div>
          <div className="truncate text-[11px] text-gold">{user.title}</div>
        </div>
        <Repeat className="size-4 text-faint" />
      </button>
      {open && (
        <div className="pop absolute right-0 bottom-full left-0 mb-2 rounded-2xl border border-line-2 bg-solid p-2 shadow-2xl">
          <div className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-[.22em] text-faint">Switch role (demo)</div>
          <div className="scroll-thin max-h-72 overflow-y-auto">
            {others.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  login(u.id);
                  setOpen(false);
                  router.push(u.role === "KARIGAR" ? "/k" : "/dashboard");
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-panel-2"
              >
                <Avatar name={u.name} hue={db.artisans.find((a) => a.id === u.artisanId)?.hue ?? 40} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{u.name}</span>
                  <span className="block truncate text-[10px] text-muted">{u.role === "KARIGAR" ? "Karigar portal" : u.title}</span>
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-line px-2 py-2.5 text-[13px] text-danger hover:bg-danger/10"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function ThemeToggle() {
  const theme = useTheme();
  return (
    <IconButton label={theme === "noir" ? "Ivory theme" : "Noir theme"} onClick={() => setTheme(theme === "noir" ? "ivory" : "noir")}>
      {theme === "noir" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </IconButton>
  );
}

function MobileDock({ onMore }: { onMore: () => void }) {
  const path = usePathname();
  const items = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: ClipboardList },
    null,
    { href: "/board", label: "Board", icon: KanbanSquare },
  ];
  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-md items-center justify-between rounded-[1.6rem] border border-line-2 bg-solid/85 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
        {items.map((i, idx) =>
          i ? (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "flex w-16 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold",
                isActive(path, i.href) ? "text-gold" : "text-faint",
              )}
            >
              <i.icon className="size-5" />
              {i.label}
            </Link>
          ) : (
            <Link
              key={idx}
              href="/orders/new"
              aria-label="New order"
              className="gold-fill -mt-7 grid size-14 place-items-center rounded-2xl shadow-[0_10px_30px_-8px_var(--gold)] ring-4 ring-bg"
            >
              <Plus className="size-6" />
            </Link>
          ),
        )}
        <button onClick={onMore} className="flex w-16 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold text-faint">
          <Menu className="size-5" />
          More
        </button>
      </div>
    </nav>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const groups = useNavItems();
  const user = useUser();
  const router = useRouter();
  return (
    <Modal open={open} onClose={onClose} title="Menu" sub={user ? `${user.name} · ${user.title}` : undefined}>
      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="mb-2 text-[9px] font-bold uppercase tracking-[.26em] text-faint">{g.group}</div>
            <div className="grid grid-cols-3 gap-2">
              {g.items.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={onClose}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-panel p-3 text-center text-[11px] font-semibold"
                >
                  <i.icon className="size-5 text-gold" />
                  {i.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <ThemeToggle />
          <button
            onClick={() => {
              logout();
              onClose();
              router.push("/");
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line-2 text-sm font-semibold text-muted"
          >
            <Repeat className="size-4" /> Switch role
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────── command palette
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDB();
  const router = useRouter();
  const groups = useNavItems();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out: { href: string; title: string; sub: string; kind: string; img?: string }[] = [];
    const m = (...xs: (string | undefined)[]) => !s || xs.some((x) => x?.toLowerCase().includes(s));
    if (!s) {
      out.push({ href: "/orders/new", title: "Create new order", sub: "Project or single piece", kind: "Action" });
      groups.forEach((g) => g.items.forEach((i) => out.push({ href: i.href, title: i.label, sub: g.group, kind: "Page" })));
      return out;
    }
    db.orders.forEach((o) => {
      const c = db.customers.find((x) => x.id === o.customerId);
      if (m(o.number, o.title, c?.name))
        out.push({ href: `/orders/${o.id}`, title: `${o.number} · ${o.title}`, sub: c?.name ?? "", kind: "Order", img: o.photos[0]?.url });
    });
    db.pieces.forEach((p) => {
      if (m(p.code, p.name, p.category))
        out.push({ href: `/pieces/${p.id}`, title: `${p.code} · ${p.name}`, sub: p.category, kind: "Piece", img: p.photos.at(-1)?.url });
    });
    db.customers.forEach(
      (c) => m(c.name, c.phone, c.city, c.code) && out.push({ href: `/customers/${c.id}`, title: c.name, sub: `${c.city} · ${c.phone}`, kind: "Customer" }),
    );
    db.artisans.forEach((a) => m(a.name, a.speciality, a.code) && out.push({ href: `/karigars/${a.id}`, title: a.name, sub: a.speciality, kind: "Karigar" }));
    db.workOrders.forEach((w) => m(w.number) && out.push({ href: `/pieces/${w.pieceId}`, title: w.number, sub: "Work order", kind: "Work order" }));
    db.jobWorks.forEach(
      (j) =>
        m(j.number, j.process) && out.push({ href: `/pieces/${j.pieceId}`, title: `${j.number} · ${j.process}`, sub: "Job work challan", kind: "Job work" }),
    );
    db.deliveries.forEach(
      (d) => m(d.number, d.receivedBy) && out.push({ href: `/orders/${d.orderId}`, title: d.number, sub: `Delivered to ${d.receivedBy}`, kind: "Delivery" }),
    );
    return out.slice(0, 40);
  }, [q, db, groups]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Search the atelier" icon={<Search className="size-5" />}>
      <input
        autoFocus
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setSel(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setSel((v) => Math.min(results.length - 1, v + 1));
          if (e.key === "ArrowUp") setSel((v) => Math.max(0, v - 1));
          if (e.key === "Enter" && results[sel]) go(results[sel].href);
        }}
        placeholder="Order no., piece code, customer, karigar, phone…"
        className="field h-12 text-base"
      />
      <div className="mt-3 space-y-1">
        {results.map((r, i) => (
          <button
            key={r.href + r.title}
            onMouseEnter={() => setSel(i)}
            onClick={() => go(r.href)}
            className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition", i === sel ? "bg-gold/10" : "hover:bg-panel")}
          >
            {r.img ? (
              <img src={r.img} alt="" className="size-9 rounded-lg object-cover" />
            ) : (
              <span className="grid size-9 place-items-center rounded-lg border border-line bg-panel text-gold">
                <ChevronRight className="size-4" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{r.title}</span>
              <span className="block truncate text-xs text-muted">{r.sub}</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-faint">{r.kind}</span>
            {i === sel && <CornerDownLeft className="size-3.5 text-gold" />}
          </button>
        ))}
        {!results.length && <div className="py-8 text-center text-sm text-faint">Nothing found for “{q}”</div>}
      </div>
    </Modal>
  );
}

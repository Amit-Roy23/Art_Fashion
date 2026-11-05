"use client";
// Live-mode screens: sign in, first-time setup, the saving indicator and user logins.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CloudOff, KeyRound, Loader2, LogIn, Plus, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { loginList, setCredential, setup, signIn } from "@/lib/live";
import { uid } from "@/lib/ops";
import { run, useStore } from "@/lib/store";
import type { DB, Role, User } from "@/lib/types";
import { cn } from "@/lib/format";
import { Wordmark } from "./brand";
import { Avatar, Button, Field, Input, Modal, Panel, SectionTitle, Select } from "./ui";

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="relative z-10 grid min-h-dvh place-items-center px-4 py-10">
      <div className="rise w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Wordmark className="items-center [&_img]:h-20" />
        </div>
        {children}
      </div>
    </main>
  );
}

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong — please try again");

export function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(phone, secret);
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  };
  return (
    <Centered>
      <Panel lux className="p-6 sm:p-7">
        <div className="text-[10px] font-bold uppercase tracking-[.26em] text-gold">Welcome back</div>
        <h1 className="font-display text-3xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Staff use their password. Karigars use their PIN.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="Mobile number">
            <Input
              inputMode="numeric"
              autoComplete="username"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              required
            />
          </Field>
          <Field label="Password or PIN">
            <Input type="password" autoComplete="current-password" value={secret} onChange={(e) => setSecret(e.target.value)} required />
          </Field>
          {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="gold-fill flex h-12 w-full items-center justify-center gap-2 rounded-full font-semibold shadow-[0_8px_24px_-10px_var(--gold)] disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />} Sign in
          </button>
        </form>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-faint">
          <ShieldCheck className="size-3.5" /> Forgot your password? Ask the owner to set a new one.
        </p>
      </Panel>
    </Centered>
  );
}

export function SetupScreen() {
  const [f, setF] = useState({
    key: "",
    name: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.password !== f.confirm) return setError("The two passwords don't match");
    setBusy(true);
    setError("");
    try {
      await setup(f);
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  };
  return (
    <Centered>
      <Panel lux className="p-6 sm:p-7">
        <div className="text-[10px] font-bold uppercase tracking-[.26em] text-gold">First-time setup</div>
        <h1 className="font-display text-3xl font-semibold">Create the owner login</h1>
        <p className="mt-1 text-sm text-muted">This runs once, on an empty database. You can add staff and karigars afterwards in Settings.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="Setup key" hint="The BMS_SETUP_KEY value from the Vercel settings.">
            <Input type="password" value={f.key} onChange={set("key")} required />
          </Field>
          <Field label="Owner name">
            <Input value={f.name} onChange={set("name")} required />
          </Field>
          <Field label="Mobile number" hint="Used to sign in.">
            <Input inputMode="numeric" value={f.phone} onChange={set("phone")} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" hint="At least 8 characters.">
              <Input type="password" autoComplete="new-password" value={f.password} onChange={set("password")} required minLength={8} />
            </Field>
            <Field label="Repeat password">
              <Input type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} required />
            </Field>
          </div>
          {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="gold-fill flex h-12 w-full items-center justify-center gap-2 rounded-full font-semibold disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />} Create owner & open
          </button>
        </form>
      </Panel>
    </Centered>
  );
}

/** Small badge while changes are being saved, or when the connection is lost. */
export function SaveIndicator({ className }: { className?: string }) {
  const mode = useStore((s) => s.mode);
  const pending = useStore((s) => s.pending);
  const offline = useStore((s) => s.offline);
  const [slowFor, setSlowFor] = useState(0);
  // only show "Saving…" when it takes a moment, so quick saves don't flicker
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setSlowFor(pending), 700);
    return () => clearTimeout(t);
  }, [pending]);
  const show = pending > 0 && slowFor > 0;
  if (mode !== "live" || (!offline && !show)) return null;
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap",
        offline ? "bg-danger/15 text-danger" : "bg-panel-2 text-muted",
        className,
      )}
    >
      {offline ? <CloudOff className="size-3.5" /> : <Loader2 className="size-3.5 animate-spin" />}
      {offline ? `No connection — ${pending} change${pending === 1 ? "" : "s"} waiting` : "Saving…"}
    </span>
  );
}

// ─────────────────────────────────────────────── Settings → Users & logins

const ROLES: { value: Role; label: string }[] = [
  { value: "MANAGER", label: "Manager" },
  { value: "STAFF", label: "Staff" },
  { value: "OWNER", label: "Owner (full access)" },
];

export function UsersPanel({ db, me }: { db: DB; me: User }) {
  const [logins, setLogins] = useState<{ id: string; locked: boolean }[] | null>(null);
  const [secretFor, setSecretFor] = useState<User | null>(null);
  const [adding, setAdding] = useState(false);
  const refresh = () =>
    loginList()
      .then(setLogins)
      .catch(() => setLogins([]));
  useEffect(() => {
    refresh();
  }, []);
  const has = (id: string) => logins?.find((l) => l.id === id);
  const staff = db.users.filter((u) => u.role !== "KARIGAR");
  const karigars = db.users.filter((u) => u.role === "KARIGAR");

  const row = (u: User) => (
    <div key={u.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3">
      <Avatar name={u.name} hue={u.role === "KARIGAR" ? (db.artisans.find((a) => a.id === u.artisanId)?.hue ?? 40) : 40} size={34} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">
          {u.name} {u.id === me.id && <span className="text-xs font-normal text-faint">(you)</span>}
        </div>
        <div className="truncate text-xs text-muted">
          {u.role === "KARIGAR" ? "Karigar" : u.title} · {u.phone || "no mobile"}
        </div>
      </div>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
          u.active === false
            ? "bg-danger/10 text-danger"
            : has(u.id)
              ? has(u.id)!.locked
                ? "bg-warn/15 text-warn"
                : "bg-ok/10 text-ok"
              : "bg-panel-2 text-faint",
        )}
      >
        {u.active === false ? "Switched off" : !logins ? "…" : has(u.id) ? (has(u.id)!.locked ? "Locked 15 min" : "Can sign in") : "No login yet"}
      </span>
      <Button size="sm" variant="soft" icon={<KeyRound className="size-3.5" />} onClick={() => setSecretFor(u)} disabled={!u.phone}>
        {u.role === "KARIGAR" ? "Set PIN" : "Set password"}
      </Button>
      {u.id !== me.id && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            run(
              (d) => {
                const x = d.users.find((y) => y.id === u.id)!;
                x.active = x.active === false;
              },
              u.active === false ? "Login switched on" : "Login switched off",
            )
          }
        >
          {u.active === false ? "Switch on" : "Switch off"}
        </Button>
      )}
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel className="p-5">
        <SectionTitle
          kicker="Office"
          title="Staff logins"
          action={
            <Button size="sm" variant="gold" icon={<UserPlus className="size-3.5" />} onClick={() => setAdding(true)}>
              Add staff
            </Button>
          }
        />
        <p className="mb-2 text-sm text-muted">
          Each person signs in with their mobile number and password. What Managers and Staff can do is set in the Access tab.
        </p>
        {staff.map(row)}
      </Panel>
      <Panel className="p-5">
        <SectionTitle kicker="Workshop" title="Karigar PINs" />
        <p className="mb-2 text-sm text-muted">
          Karigars are added on the Karigars page. Give each one a 4–6 digit PIN here; they sign in on their phone and only see their own work.
        </p>
        {karigars.length ? karigars.map(row) : <p className="border-t border-line py-4 text-sm text-faint">No karigars yet.</p>}
      </Panel>
      {secretFor && (
        <SecretDialog
          user={secretFor}
          onClose={() => setSecretFor(null)}
          onDone={() => {
            setSecretFor(null);
            refresh();
          }}
        />
      )}
      {adding && <AddStaff db={db} onClose={() => setAdding(false)} />}
    </div>
  );
}

function SecretDialog({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: () => void }) {
  const pin = user.role === "KARIGAR";
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await setCredential(user.id, v);
      toast.success(`${pin ? "PIN" : "Password"} set for ${user.name}. Tell them in person — it is not shown again.`);
      onDone();
    } catch (e) {
      toast.error(message(e));
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`${pin ? "PIN" : "Password"} for ${user.name}`}
      sub={`Signs in with mobile ${user.phone}. Setting a new one signs them out on every device.`}
      icon={<KeyRound className="size-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="gold" disabled={busy || (pin ? !/^\d{4,6}$/.test(v) : v.length < 8)} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <Field label={pin ? "PIN (4–6 digits)" : "Password (at least 8 characters)"}>
        <Input
          type={pin ? "text" : "password"}
          inputMode={pin ? "numeric" : undefined}
          autoComplete="new-password"
          value={v}
          onChange={(e) => setV(pin ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value)}
          autoFocus
        />
      </Field>
    </Modal>
  );
}

function AddStaff({ db, onClose }: { db: DB; onClose: () => void }) {
  const [f, setF] = useState<{
    name: string;
    phone: string;
    title: string;
    role: Role;
  }>({ name: "", phone: "", title: "", role: "STAFF" });
  const phone = f.phone.replace(/\D/g, "").slice(-10);
  const taken = db.users.some((u) => u.phone.replace(/\D/g, "").slice(-10) === phone);
  const ok = f.name.trim() && phone.length === 10 && !taken;
  return (
    <Modal
      open
      onClose={onClose}
      title="Add staff member"
      sub="After adding, set their password."
      icon={<UserPlus className="size-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="gold"
            icon={<Plus className="size-4" />}
            disabled={!ok}
            onClick={() => {
              const done = run((d) => {
                d.users.push({
                  id: uid("u"),
                  name: f.name.trim(),
                  phone,
                  role: f.role,
                  title: f.title.trim() || ROLES.find((r) => r.value === f.role)!.label.replace(/ \(.*/, ""),
                  active: true,
                });
              }, `${f.name.trim()} added — now set a password`);
              if (done) onClose();
            }}
          >
            Add
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </Field>
        <Field label="Mobile number" required hint={taken ? "Someone already uses this number." : undefined}>
          <Input inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="Role">
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Job title">
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Front desk" />
        </Field>
      </div>
    </Modal>
  );
}

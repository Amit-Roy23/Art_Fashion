"use client";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, ClipboardList, Crown, FileText, Hammer, Scale, ShieldCheck, Smartphone, Sparkles, Truck, UserCog, Users } from "lucide-react";
import { Ready } from "@/components/Providers";
import { Wordmark } from "@/components/brand";
import { Avatar, Panel } from "@/components/ui";
import { login, useDB, useUser } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/format";

export default function Landing() {
  return (
    <Ready>
      <LandingInner />
    </Ready>
  );
}

const ROLE_META = {
  OWNER: { icon: Crown, blurb: "Full control — dashboard, every order, karigars, reports & settings." },
  MANAGER: { icon: UserCog, blurb: "Assigns karigars, reviews submissions, sends job work." },
  STAFF: { icon: Users, blurb: "Books orders, uploads photos, handles deliveries." },
  KARIGAR: { icon: Hammer, blurb: "" },
} as const;

const ORBIT = ["choker-emerald", "ring-solitaire", "jhumka-ruby", "bangle", "pendant-sapphire", "tikka", "necklace-ruby", "nath"];

function LandingInner() {
  const db = useDB();
  const me = useUser();
  const router = useRouter();
  const staff = db.users.filter((u) => u.role !== "KARIGAR");
  const karigars = db.users.filter((u) => u.role === "KARIGAR");

  const enter = (u: User) => {
    login(u.id);
    router.push(u.role === "KARIGAR" ? "/k" : "/dashboard");
  };

  return (
    <main className="relative z-10 mx-auto grid min-h-dvh max-w-7xl gap-10 px-5 py-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-14 lg:px-10">
      {/* story side */}
      <section className="rise">
        <Wordmark />
        <h1 className="font-display mt-10 text-[2.8rem] leading-[1] font-medium sm:text-[3.8rem] xl:text-[4.3rem]">
          Every gram, every gem,
          <br />
          <span className="gold-text shimmer italic">every karigar</span> — one atelier.
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted">
          Order booking, karigar work orders, production stages, outside job work, weight ledgers, photographs and customer deliveries for{" "}
          <b className="text-text">{db.settings.company.name}</b> — on desktop and phone.
        </p>
        <div className="mt-7 hidden flex-wrap gap-2 sm:flex">
          {[
            [ClipboardList, "Project & piece orders"],
            [Hammer, "Karigar allocation"],
            [Scale, "Weight ledger to the mg"],
            [Camera, "Photos at every step"],
            [Sparkles, "Polishing & job work"],
            [Truck, "Delivery history"],
            [FileText, "Work order PDFs"],
          ].map(([Icon, t]) => {
            const I = Icon as typeof Hammer;
            return (
              <span
                key={t as string}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-muted"
              >
                <I className="size-3.5 text-gold" />
                {t as string}
              </span>
            );
          })}
        </div>

        {/* orbiting showcase */}
        <div className="relative mt-12 hidden h-[330px] lg:block">
          <div className="absolute top-1/2 left-[170px] size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line-2" />
          <div className="spin-slow absolute top-1/2 left-[170px] size-[300px] -translate-x-1/2 -translate-y-1/2">
            {ORBIT.map((k, i) => {
              const a = (i / ORBIT.length) * Math.PI * 2;
              return (
                <img
                  key={k}
                  src={`/demo/${k}-final.jpg`}
                  alt=""
                  className="absolute size-16 rounded-full border border-gold/40 object-cover shadow-lg"
                  style={{ left: 150 + 150 * Math.cos(a) - 32, top: 150 + 150 * Math.sin(a) - 32 }}
                />
              );
            })}
          </div>
          <img
            src="/demo/choker-ruby-final.jpg"
            alt=""
            className="float absolute top-1/2 left-[170px] size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold/50 object-cover shadow-[0_0_80px_-10px_var(--gold)]"
          />
          <div className="absolute top-6 left-[380px] max-w-[260px]">
            <div className="font-display text-xl italic text-gold">“From the sketch on paper to the box in her hands.”</div>
            <div className="mt-2 text-xs text-faint">Design → casting → ghat → jadai → polish → QC → delivery, with photos and weights at every hand-off.</div>
          </div>
        </div>
      </section>

      {/* access side */}
      <section className="rise" style={{ animationDelay: ".1s" }}>
        <Panel lux className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.26em] text-gold">Demo access</div>
              <h2 className="font-display text-3xl font-semibold">Choose who you are</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/10 px-3 py-1 text-[11px] font-semibold text-ok">
              <ShieldCheck className="size-3.5" /> No password
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">One tap to sign in. Each role sees what it&apos;s allowed to.</p>

          {me && (
            <button
              onClick={() => enter(me)}
              className="group mt-5 flex w-full items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-3 text-left transition hover:bg-gold/15"
            >
              <Avatar name={me.name} hue={40} size={40} />
              <div className="flex-1">
                <div className="text-xs text-muted">Continue session</div>
                <div className="font-semibold">{me.name}</div>
              </div>
              <ArrowRight className="size-5 text-gold transition group-hover:translate-x-1" />
            </button>
          )}

          <div className="mt-5 space-y-2.5">
            {staff.map((u, i) => {
              const M = ROLE_META[u.role];
              return (
                <button
                  key={u.id}
                  onClick={() => enter(u)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 sm:gap-4 sm:p-4",
                    i === 0 ? "border-gold/50 bg-gradient-to-r from-gold/15 to-transparent" : "border-line bg-panel hover:border-gold/40",
                  )}
                >
                  <span
                    className={cn("grid size-12 shrink-0 place-items-center rounded-xl", i === 0 ? "gold-fill" : "border border-line-2 bg-panel-2 text-gold")}
                  >
                    <M.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold whitespace-nowrap">{u.name}</span>
                      <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">{u.title}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{M.blurb}</span>
                  </span>
                  <ArrowRight className="size-5 text-faint transition group-hover:translate-x-1 group-hover:text-gold" />
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="hairline flex-1" />
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.22em] text-faint">
              <Smartphone className="size-3.5" /> Karigar mobile portal
            </span>
            <div className="hairline flex-1" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3">
            {karigars.map((u) => {
              const a = db.artisans.find((x) => x.id === u.artisanId);
              return (
                <button
                  key={u.id}
                  onClick={() => enter(u)}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-panel p-2.5 text-left transition hover:border-gold/40 hover:bg-panel-2"
                >
                  <Avatar name={u.name} hue={a?.hue} size={34} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold">{u.name}</span>
                    <span className="block truncate text-[10px] text-muted">{u.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-5 text-center text-[11px] text-faint">
            Demo data lives in this browser. Changes are private to you and can be reset anytime from Settings.
          </p>
        </Panel>
      </section>
    </main>
  );
}

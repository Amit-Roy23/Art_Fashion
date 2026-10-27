"use client";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Ready } from "@/components/Providers";
import { Logo } from "@/components/brand";
import { Avatar, IconButton } from "@/components/ui";
import { ThemeToggle } from "@/components/Shell";
import { logout, useDB, useStore, useUser } from "@/lib/store";

function KarigarShell({ children }: { children: ReactNode }) {
  const user = useUser();
  const status = useStore((s) => s.status);
  const db = useDB();
  const router = useRouter();
  useEffect(() => {
    if (status !== "ready") return;
    if (!user) router.replace("/");
    else if (user.role !== "KARIGAR") router.replace("/dashboard");
  }, [status, user, router]);
  if (!user || user.role !== "KARIGAR") return null;
  const a = db.artisans.find((x) => x.id === user.artisanId);
  return (
    <div className="relative z-10 mx-auto min-h-dvh max-w-xl pb-16">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-bg/75 px-4 py-3 backdrop-blur-xl">
        <Link href="/k" className="flex items-center gap-2">
          <Logo className="size-7" />
          <span className="leading-none">
            <span className="font-display gold-text block text-lg font-semibold">Karigar</span>
            <span className="block text-[9px] font-bold uppercase tracking-[.24em] text-faint">{db.settings.company.name}</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <IconButton
            label="Sign out"
            onClick={() => {
              logout();
              router.push("/");
            }}
          >
            <LogOut className="size-5" />
          </IconButton>
          <Avatar name={user.name} hue={a?.hue} size={34} />
        </div>
      </header>
      <main className="px-4 pt-5">{children}</main>
    </div>
  );
}

export default function KarigarLayout({ children }: { children: ReactNode }) {
  return (
    <Ready>
      <KarigarShell>{children}</KarigarShell>
    </Ready>
  );
}

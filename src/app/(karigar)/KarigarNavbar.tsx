"use client";

import * as React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Hammer, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export function KarigarNavbar({ user }: { user: any }) {
  const pathname = usePathname();
  const isWorkDetail = pathname.startsWith("/k/work");

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/95 shadow-xs">
      <div className="flex items-center gap-2">
        {isWorkDetail ? (
          <Link href="/k/home">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white font-bold text-xs shadow-xs">
            <Hammer className="h-4 w-4" />
          </div>
        )}
        <div>
          <h2 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
            BMS Karigar
            <span className="text-[10px] text-amber-800 bg-amber-100 dark:bg-amber-950 dark:text-amber-200 px-1 rounded font-semibold">
              Portal
            </span>
          </h2>
          <p className="text-[10px] text-neutral-500 truncate max-w-[150px]">
            {user?.name || "Artisan"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="h-8 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
        >
          <LogOut className="h-3.5 w-3.5 mr-1" />
          Logout
        </Button>
      </div>
    </header>
  );
}

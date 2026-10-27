"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Gem, Hammer, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_TABS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Pieces", href: "/pieces", icon: Gem },
  { label: "Karigars", href: "/artisans", icon: Hammer },
  { label: "Job Work", href: "/job-work", icon: Flame },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 block md:hidden border-t border-neutral-200 bg-white/95 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/95 shadow-lg">
      <div className="grid grid-cols-5 h-14">
        {MOBILE_TABS.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-amber-600 font-semibold dark:text-amber-400"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

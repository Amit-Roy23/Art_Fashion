"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Gem,
  Hammer,
  ClipboardList,
  Flame,
  Truck,
  BarChart3,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userRole?: string;
  className?: string;
}

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Pieces (WIP)", href: "/pieces", icon: Gem },
  { label: "Karigars", href: "/artisans", icon: Hammer },
  { label: "Work Orders", href: "/assignments", icon: ClipboardList },
  { label: "Job Work", href: "/job-work", icon: Flame },
  { label: "Deliveries", href: "/deliveries", icon: Truck },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings, roleRequired: "OWNER" },
];

export function Sidebar({ userRole = "STAFF", className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 text-white shadow-xs">
          <Gem className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
            BMS <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-mono font-semibold dark:bg-amber-950 dark:text-amber-200">PROD</span>
          </h1>
          <p className="text-[10px] text-neutral-400">Jewellery Operations</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          if (item.roleRequired && userRole !== "OWNER") {
            return null;
          }

          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all group",
                isActive
                  ? "bg-amber-50 font-semibold text-amber-800 shadow-2xs dark:bg-amber-950/50 dark:text-amber-300"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Role Indicator Footer */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2 rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <div className="overflow-hidden">
            <p className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 truncate">
              {userRole} Mode
            </p>
            <p className="text-[9px] text-neutral-400">RBAC Enabled</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

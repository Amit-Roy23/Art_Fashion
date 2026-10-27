"use client";

import * as React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Plus, LogOut, User, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "./GlobalSearch";

interface NavbarProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  onMenuToggle?: () => void;
}

export function Navbar({ user, onMenuToggle }: NavbarProps) {
  const [isDark, setIsDark] = React.useState(false);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      root.classList.remove("dark");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      setIsDark(true);
    }
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "BMS";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-neutral-200 bg-white/85 px-4 backdrop-blur-md sm:px-6 dark:border-neutral-800 dark:bg-neutral-900/85">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="md:hidden h-9 w-9 text-neutral-600"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2.5">
        {/* Quick New Order Action */}
        <Link href="/orders/new">
          <Button variant="gold" size="sm" className="hidden sm:inline-flex text-xs h-8">
            <Plus className="mr-1 h-3.5 w-3.5" />
            New Order
          </Button>
        </Link>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 text-neutral-500 hover:text-amber-600"
          title="Toggle light/dark theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2">
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {user.name || "BMS Staff"}
              </p>
              <p className="text-[11px] text-neutral-500 truncate">{user.email || ""}</p>
              <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                {user.role}
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/orders/new" className="flex items-center gap-2 text-xs">
                <Plus className="h-3.5 w-3.5 text-amber-600" />
                Create New Order
              </Link>
            </DropdownMenuItem>
            {user.role === "OWNER" && (
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 text-xs">
                  <User className="h-3.5 w-3.5 text-neutral-500" />
                  System Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/40 text-xs"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

import * as React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  if (role === "KARIGAR") {
    redirect("/k/home");
  }

  return (
    <div className="flex min-h-screen bg-neutral-50/60 dark:bg-neutral-950">
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar
        userRole={role}
        className="hidden md:flex md:w-60 md:shrink-0 h-screen sticky top-0"
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Navbar user={session.user} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

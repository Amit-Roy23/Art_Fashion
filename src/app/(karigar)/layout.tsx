import * as React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { KarigarNavbar } from "./KarigarNavbar";

export default async function KarigarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  if (role !== "KARIGAR" && role !== "OWNER") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-neutral-100/70 dark:bg-neutral-950 flex flex-col">
      <KarigarNavbar user={session.user} />
      <main className="flex-1 max-w-md w-full mx-auto p-4 pb-20">
        {children}
      </main>
    </div>
  );
}

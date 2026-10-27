"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Gem,
  Lock,
  Phone,
  Mail,
  Hammer,
  ShieldCheck,
  KeyRound,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  // Staff Form State
  const [staffIdentifier, setStaffIdentifier] = React.useState("owner@bms.local");
  const [staffPassword, setStaffPassword] = React.useState("Owner@123");

  // Karigar Form State
  const [karigarPhone, setKarigarPhone] = React.useState("9820044442");
  const [karigarPin, setKarigarPin] = React.useState("1234");

  // 1-Click Instant Demo Bypass Login
  const handleQuickBypass = async (role: "OWNER" | "MANAGER" | "STAFF" | "KARIGAR") => {
    setIsLoading(true);
    toast.loading(`Logging in as ${role}...`);
    try {
      const res = await signIn("demo-bypass", {
        role,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Failed to bypass login. Please verify connection.");
      } else {
        toast.success(`Welcome to BMS! Logged in as ${role}`);
        if (role === "KARIGAR") {
          window.location.href = "/k/home";
        } else {
          window.location.href = "/dashboard";
        }
      }
    } catch {
      toast.error("Login bypass failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // First try standard credentials
      const res = await signIn("staff-credentials", {
        identifier: staffIdentifier,
        password: staffPassword || "demo",
        redirect: false,
      });

      if (res?.error) {
        // Fallback to instant bypass for demo convenience
        const fallback = await signIn("demo-bypass", {
          role: "OWNER",
          redirect: false,
        });
        if (!fallback?.error) {
          toast.success("Demo credentials accepted! Entering workshop...");
          window.location.href = "/dashboard";
          return;
        }
        toast.error("Invalid credentials.");
      } else {
        toast.success("Welcome back! Logging into Workshop...");
        window.location.href = "/dashboard";
      }
    } catch {
      toast.error("An unexpected error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKarigarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await signIn("karigar-credentials", {
        phone: karigarPhone,
        pin: karigarPin || "1234",
        redirect: false,
      });

      if (res?.error) {
        // Fallback to instant bypass
        const fallback = await signIn("demo-bypass", {
          role: "KARIGAR",
          redirect: false,
        });
        if (!fallback?.error) {
          toast.success("Namaste! Logging into Karigar Portal...");
          window.location.href = "/k/home";
          return;
        }
        toast.error("Login failed. Check your phone number.");
      } else {
        toast.success("Namaste! Logging into Karigar Portal...");
        window.location.href = "/k/home";
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-4">
      {/* Decorative Gold Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 text-white shadow-xl shadow-amber-500/20 mb-1">
            <Gem className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            BMS Jewellery
          </h1>
          <p className="text-xs text-neutral-400">
            Order, Artisan & Production Lifecycle Management
          </p>
        </div>

        {/* 1-CLICK INSTANT DEMO BYPASS BOX */}
        <div className="p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/15 via-neutral-900/90 to-neutral-900/95 backdrop-blur-xl shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse fill-amber-400" />
              1-Click Demo Bypass (No Password Required)
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Demo Active
            </span>
          </div>

          <p className="text-xs text-neutral-400">
            Click any button below to instantly enter the application with that role:
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              onClick={() => handleQuickBypass("OWNER")}
              disabled={isLoading}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-10 shadow-md shadow-amber-950 flex items-center justify-between px-3"
            >
              <span>👑 Enter as OWNER</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-70" />
            </Button>

            <Button
              type="button"
              onClick={() => handleQuickBypass("MANAGER")}
              disabled={isLoading}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs h-10 border border-neutral-700 flex items-center justify-between px-3"
            >
              <span>👔 Enter as MANAGER</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-70" />
            </Button>

            <Button
              type="button"
              onClick={() => handleQuickBypass("STAFF")}
              disabled={isLoading}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs h-10 border border-neutral-700 flex items-center justify-between px-3"
            >
              <span>🧑‍💼 Enter as STAFF</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-70" />
            </Button>

            <Button
              type="button"
              onClick={() => handleQuickBypass("KARIGAR")}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 shadow-md shadow-blue-950 flex items-center justify-between px-3"
            >
              <span>🔨 Enter as KARIGAR</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-70" />
            </Button>
          </div>
        </div>

        {/* Standard Manual Login Tabs */}
        <Card className="border-neutral-800 bg-neutral-900/90 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-sm font-semibold text-neutral-200">
              Or Sign In with Form Credentials
            </CardTitle>
            <CardDescription className="text-neutral-400 text-xs">
              Staff access via password; Artisans access via mobile PIN
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="staff" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-neutral-800/80 mb-4">
                <TabsTrigger value="staff" className="text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                  Staff Login
                </TabsTrigger>
                <TabsTrigger value="karigar" className="text-xs">
                  <Hammer className="h-3.5 w-3.5 mr-1.5" />
                  Karigar Portal
                </TabsTrigger>
              </TabsList>

              {/* Staff Login Tab */}
              <TabsContent value="staff">
                <form onSubmit={handleStaffLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-amber-500" />
                      Email or Mobile Number
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. owner@bms.local or 9820011111"
                      value={staffIdentifier}
                      onChange={(e) => setStaffIdentifier(e.target.value)}
                      className="bg-neutral-800/70 border-neutral-700 text-neutral-100 text-xs h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                      Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      className="bg-neutral-800/70 border-neutral-700 text-neutral-100 text-xs h-10"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In to Workshop"}
                  </Button>
                </form>
              </TabsContent>

              {/* Karigar Login Tab */}
              <TabsContent value="karigar">
                <form onSubmit={handleKarigarLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-amber-500" />
                      Artisan Registered Phone
                    </label>
                    <Input
                      type="tel"
                      placeholder="e.g. 9820044442"
                      value={karigarPhone}
                      onChange={(e) => setKarigarPhone(e.target.value)}
                      className="bg-neutral-800/70 border-neutral-700 text-neutral-100 text-xs h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                      Security PIN (4–6 Digits)
                    </label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••"
                      value={karigarPin}
                      onChange={(e) => setKarigarPin(e.target.value)}
                      className="bg-neutral-800/70 border-neutral-700 text-neutral-100 text-center tracking-widest text-lg font-mono h-10"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Login to My Work Orders"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[11px] text-neutral-500">
          Demo Mode: All credential checks bypassed for instant evaluation
        </p>
      </div>
    </div>
  );
}

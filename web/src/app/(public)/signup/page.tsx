"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-client";
import { Car, User, ArrowRight, Lock, Mail, Phone, UserCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"driver" | "owner">("driver");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (phone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
            phone: `+91${phone}`,
          },
        },
      });

      if (error) throw error;

      toast.success("Account created successfully! Please log in.");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-secondary/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-2xl border border-slate-700/30 p-8 shadow-2xl z-10 text-white relative bg-slate-950/80 backdrop-blur-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center shadow-lg mb-3">
            <Car className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Create an Account
          </h1>
          <p className="text-slate-400 text-sm mt-1 text-center">
            Join the ParkShare peer-to-peer marketplace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-primary text-white text-sm font-semibold transition-all"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-primary text-white text-sm font-semibold transition-all"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Phone Number
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400 font-semibold text-sm">+91</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9999999999"
                maxLength={10}
                className="w-full pl-12 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-primary text-white text-sm font-semibold transition-all"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (Min 6 characters)"
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-primary text-white text-sm font-semibold transition-all"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              I want to register as
            </label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={() => setRole("driver")}
                className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
                  role === "driver"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-md shadow-primary/5"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200"
                }`}
                disabled={loading}
              >
                <Car className="w-5 h-5" />
                <span className="text-xs">Driver</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("owner")}
                className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
                  role === "owner"
                    ? "border-secondary bg-secondary/10 text-secondary font-bold shadow-md shadow-secondary/5"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200"
                }`}
                disabled={loading}
              >
                <User className="w-5 h-5" />
                <span className="text-xs">Space Host</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 mt-2 bg-gradient-to-r from-primary to-orange-500 hover:brightness-110 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]"
            disabled={loading}
          >
            <UserCheck className="w-4 h-4" />
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <div className="text-center mt-6 text-sm">
          <span className="text-slate-400">Already have an account? </span>
          <Link href="/login" className="text-primary hover:underline font-bold">
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}

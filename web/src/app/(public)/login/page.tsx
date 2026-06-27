"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { supabase } from "@/lib/supabase-client";
import { Car, Shield, User, Lock, Mail, Phone, Key, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const { fetchCurrentUser, user, loginSandbox } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"driver" | "owner" | "admin">("driver");
  const [method, setMethod] = useState<"phone" | "email" | "password">("phone");
  
  // Input fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchCurrentUser().then((profile) => {
          if (profile) {
            redirectUser(profile.role);
          }
        });
      }
    });
  }, []);

  const redirectUser = (role: string) => {
    if (role === "admin") {
      router.push("/admin/dashboard");
    } else if (role === "owner") {
      router.push("/owner/dashboard");
    } else {
      router.push(redirect === "/" ? "/search" : redirect);
    }
  };

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(redirect)}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Google Sign-In failed");
      setLoading(false);
    }
  };

  // Submit Phone for OTP
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = `+91${phone}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: "sms"
        }
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success("Verification OTP sent to " + phone);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Submit Email for OTP
  const handleEmailOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success("Verification link or code sent to your email!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send email OTP");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP (SMS or Email)
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      let result;
      if (method === "phone") {
        result = await supabase.auth.verifyOtp({
          phone: `+91${phone}`,
          token: otp,
          type: "sms",
        });
      } else {
        result = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "email",
        });
      }

      if (result.error) throw result.error;

      toast.success("Authenticated successfully!");
      
      // Load user profile and redirect
      const profile = await fetchCurrentUser();
      if (profile && profile.role) {
        redirectUser(profile.role);
      } else {
        // First-time user, redirect to onboarding/signup role select
        router.push(`/signup?role=${activeTab}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  // Email/Password login (primarily for Admin or pre-existing profiles)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all credentials");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      toast.success("Logged in successfully!");
      const profile = await fetchCurrentUser();
      if (profile) {
        redirectUser(profile.role);
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md glass-card rounded-2xl border border-slate-700/30 p-8 shadow-2xl z-10 text-white relative bg-slate-950/80 backdrop-blur-xl text-left">
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/30 mb-3">
          <Car className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
          ParkShare
        </h1>
        <p className="text-slate-400 text-sm mt-1 text-center font-medium">
          Premium Peer-to-Peer Parking Platform
        </p>
      </div>

      {/* Role Picker */}
      <div className="flex p-1 bg-slate-900/80 rounded-xl mb-6 border border-slate-800">
        <button
          onClick={() => {
            setActiveTab("driver");
            setOtpSent(false);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
            activeTab === "driver"
              ? "bg-primary text-white shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Car className="w-4 h-4" />
          Driver
        </button>
        <button
          onClick={() => {
            setActiveTab("owner");
            setOtpSent(false);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
            activeTab === "owner"
              ? "bg-secondary text-white shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <User className="w-4 h-4" />
          Owner
        </button>
        <button
          onClick={() => {
            setActiveTab("admin");
            setOtpSent(false);
            setMethod("password");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
            activeTab === "admin"
              ? "bg-slate-700 text-white shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Shield className="w-4 h-4" />
          Admin
        </button>
      </div>

      {/* Method Switcher (for non-admins) */}
      {activeTab !== "admin" && (
        <div className="flex justify-center gap-4 text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">
          <button
            onClick={() => {
              setMethod("phone");
              setOtpSent(false);
            }}
            className={`pb-1 border-b-2 transition-all ${
              method === "phone" ? "border-primary text-white font-extrabold" : "border-transparent"
            }`}
          >
            Phone OTP
          </button>
          <button
            onClick={() => {
              setMethod("email");
              setOtpSent(false);
            }}
            className={`pb-1 border-b-2 transition-all ${
              method === "email" ? "border-primary text-white font-extrabold" : "border-transparent"
            }`}
          >
            Email OTP
          </button>
          <button
            onClick={() => {
              setMethod("password");
              setOtpSent(false);
            }}
            className={`pb-1 border-b-2 transition-all ${
              method === "password" ? "border-primary text-white font-extrabold" : "border-transparent"
            }`}
          >
            Password
          </button>
        </div>
      )}

      {/* OTP Forms */}
      {!otpSent ? (
        <>
          {method === "phone" && activeTab !== "admin" && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Enter Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 font-semibold text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9999999999"
                    maxLength={10}
                    className="w-full pl-12 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-primary text-white transition-all text-sm font-semibold shadow-inner"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-white shadow-lg bg-gradient-to-r from-primary to-orange-500 hover:brightness-110 active:scale-[0.98]`}
                disabled={loading}
              >
                <Phone className="w-4 h-4" />
                {loading ? "Sending..." : "Send OTP SMS"}
              </button>
            </form>
          )}

          {method === "email" && activeTab !== "admin" && (
            <form onSubmit={handleEmailOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Enter Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-primary text-white transition-all text-sm font-semibold"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-white shadow-lg bg-gradient-to-r from-primary to-orange-500 hover:brightness-110 active:scale-[0.98]"
                disabled={loading}
              >
                <Mail className="w-4 h-4" />
                {loading ? "Sending..." : "Send Email Code"}
              </button>
            </form>
          )}

          {method === "password" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-primary text-white transition-all text-sm font-semibold"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        toast.error("Please enter email first to reset password");
                        return;
                      }
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/profile`,
                      });
                      if (error) toast.error(error.message);
                      else toast.success("Password reset link sent to your email!");
                    }}
                    className="text-xs text-primary hover:underline font-bold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-primary text-white transition-all text-sm font-semibold"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-white bg-gradient-to-r from-primary to-orange-500 hover:brightness-110 active:scale-[0.98] shadow-lg"
                disabled={loading}
              >
                <Key className="w-4 h-4" />
                {loading ? "Logging in..." : "Login with Password"}
              </button>
            </form>
          )}
        </>
      ) : (
        <form onSubmit={handleOtpVerify} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Verification OTP
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-primary text-white transition-all text-sm tracking-widest font-bold text-center"
                disabled={loading}
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Please enter the 6-digit verification code sent to you.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl transition"
              disabled={loading}
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 py-3 font-bold rounded-xl transition text-white bg-gradient-to-r from-primary to-orange-500 hover:brightness-110"
              disabled={loading}
            >
              Verify OTP
            </button>
          </div>
        </form>
      )}

      {/* Social Logins */}
      {!otpSent && activeTab !== "admin" && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-950 px-3 text-slate-500 font-bold tracking-wider">
                Or Continue With
              </span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition active:scale-[0.98] shadow"
            disabled={loading}
          >
            <svg className="w-4  h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.68 0-8.497-3.818-8.497-8.497s3.818-8.497 8.497-8.497c2.25 0 4.17.844 5.617 2.226l3.197-3.197C18.157 1.097 15.353 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.76 0 11.76-4.75 11.76-11.76 0-.8-.06-1.57-.18-2.435H12.24z"/>
            </svg>
            Google Authentication
          </button>
        </>
      )}

      {/* Sandbox Developer Sign-In */}
      <div className="relative mt-8 pt-6 border-t border-slate-800/80">
        <h4 className="text-[10px] text-primary font-extrabold uppercase tracking-widest text-center mb-3">
          Sandbox Developer Quick Access
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              loginSandbox("driver");
              toast.success("Signed in as Mock Driver!");
              redirectUser("driver");
            }}
            className="py-2.5 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-[10px] uppercase border border-slate-800 transition active:scale-[0.98] text-center"
          >
            Driver
          </button>
          <button
            type="button"
            onClick={() => {
              loginSandbox("owner");
              toast.success("Signed in as Mock Owner!");
              redirectUser("owner");
            }}
            className="py-2.5 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-[10px] uppercase border border-slate-800 transition active:scale-[0.98] text-center"
          >
            Owner
          </button>
          <button
            type="button"
            onClick={() => {
              loginSandbox("admin");
              toast.success("Signed in as Mock Admin!");
              redirectUser("admin");
            }}
            className="py-2.5 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-[10px] uppercase border border-slate-800 transition active:scale-[0.98] text-center"
          >
            Admin
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-6">
        By signing in, you agree to our Terms of Service & Privacy Policy.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-secondary/20 blur-[120px] pointer-events-none" />
      <Suspense fallback={<div className="text-white text-sm font-semibold">Loading Auth Portal...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { supabase } from "@/lib/supabase-client";
import { Car, User, Lock, Mail, Phone, Key, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const { fetchCurrentUser, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"driver" | "owner">("driver");
  const [method, setMethod] = useState<"phone" | "email" | "password">("phone");
  
  // Input fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Resend OTP Countdown states
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpSent && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, countdown]);

  useEffect(() => {
    // Check if user is already logged in or returning from OAuth
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const storedRole = localStorage.getItem("parkshare_google_role") as "driver" | "owner" | null;
        let profile = await fetchCurrentUser();
        
        if (profile) {
          if (storedRole && profile.role !== storedRole) {
            // Update role in DB to match what the user selected before starting Google Sign-In
            const { error } = await supabase
              .from("profiles")
              .update({ role: storedRole })
              .eq("id", profile.id);
            if (!error) {
              profile.role = storedRole;
              useAuthStore.getState().setUser(profile);
            }
          }
          localStorage.removeItem("parkshare_google_role");
          redirectUser(profile);
        }
      }
    });
  }, []);

  const redirectUser = async (profile: any) => {
    if (!profile) return;

    if (activeTab === "owner") {
      if (profile.role !== "owner") {
        try {
          const { error } = await supabase
            .from("profiles")
            .update({ role: "owner", is_verified: true })
            .eq("id", profile.id);
          
          if (!error) {
            profile.role = "owner";
            profile.is_verified = true;
            useAuthStore.getState().setUser(profile);
            
            // Set cookie manually
            if (typeof document !== "undefined") {
              const secure = typeof window !== "undefined" && window.isSecureContext ? "; secure" : "";
              document.cookie = `parkshare_role=owner; path=/; max-age=604800${secure}; samesite=lax`;
            }
          }
        } catch (dbErr) {
          console.error("Failed to auto-upgrade user role to owner:", dbErr);
        }
      }
      router.push("/owner/dashboard");
    } else {
      if (profile.role === "owner") {
        router.push("/owner/dashboard");
      } else {
        router.push(redirect === "/" ? "/search" : redirect);
      }
    }
  };

  const resetOtpState = () => {
    setOtpSent(false);
    setCountdown(30);
    setCanResend(false);
    setOtp("");
  };

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      localStorage.setItem("parkshare_google_role", activeTab);
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
    if (e) e.preventDefault();
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
      setCountdown(30);
      setCanResend(false);
      toast.success("Verification OTP sent to " + phone);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("SMS") || msg.includes("provider") || msg.includes("Twilio") || msg.includes("not configured")) {
        toast.error("Supabase SMS provider is not configured. Please contact the administrator.", { duration: 6000 });
      } else {
        toast.error(msg || "Failed to send OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit Email for OTP
  const handleEmailOtpSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
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
      setCountdown(30);
      setCanResend(false);
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
        redirectUser(profile);
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

  // Email/Password login for users with pre-existing profiles
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
        redirectUser(profile);
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
            resetOtpState();
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
            resetOtpState();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
            activeTab === "owner"
              ? "bg-secondary text-white shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <User className="w-4 h-4" />
          Host / Owner
        </button>
      </div>

      {/* Method Switcher */}
      {(
        <div className="flex justify-center gap-4 text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">
          <button
            onClick={() => {
              setMethod("phone");
              resetOtpState();
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
              resetOtpState();
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
              resetOtpState();
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
          {method === "phone" && (
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

          {method === "email" && (
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
              onClick={() => resetOtpState()}
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
          <div className="pt-2 text-center">
            {canResend ? (
              <button
                type="button"
                onClick={async (e) => {
                  if (method === "phone") {
                    await handlePhoneSubmit(e);
                  } else {
                    await handleEmailOtpSubmit(e);
                  }
                }}
                className="text-xs text-primary font-bold hover:underline"
                disabled={loading}
              >
                Resend OTP Code
              </button>
            ) : (
              <span className="text-xs text-slate-400">
                Resend code in <span className="font-bold text-slate-300">{countdown}s</span>
              </span>
            )}
          </div>
        </form>
      )}

      {/* Social Logins */}
      {!otpSent && (
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

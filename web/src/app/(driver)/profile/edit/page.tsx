"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { supabase } from "@/lib/supabase-client";
import { User, Mail, Phone, Home, Landmark, ShieldCheck, ArrowLeft, Camera } from "lucide-react";
import imageCompression from "browser-image-compression";
import toast from "react-hot-toast";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, fetchCurrentUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [address, setAddress] = useState("");

  // Owner specific bank details
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankHolderName, setBankHolderName] = useState("");

  // Validation Errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setAvatar(user.avatar_url || "");
      setAddress(user.address || "");
      
      // Load bank details if they are in the database
      fetchBankDetails();
    }
  }, [user]);

  const fetchBankDetails = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("bank_account_number, bank_ifsc, bank_holder_name")
        .eq("id", user.id)
        .single();
      if (!error && data) {
        setBankAccount(data.bank_account_number || "");
        setBankIfsc(data.bank_ifsc || "");
        setBankHolderName(data.bank_holder_name || "");
      }
    } catch (e) {
      console.warn("Failed to load bank details", e);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 0.05, // Compress to ~50KB max
        maxWidthOrHeight: 256,
        useWebWorker: true,
      };
      
      toast.loading("Compressing image...", { id: "compress" });
      const compressedFile = await imageCompression(file, options);
      toast.dismiss("compress");

      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setAvatar(base64data);
        toast.success("Avatar loaded successfully!");
      };
    } catch (err) {
      toast.dismiss("compress");
      toast.error("Failed to process profile image.");
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = "Full name is required.";
    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email format.";
    }
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (phone.length < 10) {
      newErrors.phone = "Phone number must be at least 10 digits.";
    }

    if (user?.role === "owner") {
      if (bankAccount && (bankAccount.length < 9 || bankAccount.length > 18)) {
        newErrors.bankAccount = "Bank account number must be between 9 and 18 digits.";
      }
      if (bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) {
        newErrors.bankIfsc = "Invalid IFSC code format (e.g. HDFC0000240).";
      }
    }

    setErrors(newErrors);
    const firstErr = Object.values(newErrors)[0];
    if (firstErr) {
      toast.error(firstErr);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validate()) return;

    setLoading(true);
    try {
      const updatePayload: any = {
        name,
        email,
        phone,
        avatar_url: avatar,
        address,
      };

      if (user.role === "owner") {
        updatePayload.bank_account_number = bankAccount;
        updatePayload.bank_ifsc = bankIfsc;
        updatePayload.bank_holder_name = bankHolderName;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id);

      if (error) throw error;

      await fetchCurrentUser();
      toast.success("Profile updated successfully!");
      router.push(user.role === "owner" ? "/owner/dashboard" : "/profile");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile details");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 text-slate-800 dark:text-white flex-1 flex flex-col justify-center min-h-screen">
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative text-left space-y-6 bg-white dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Edit Profile Details</h1>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Role: {user.role === "owner" ? "Parking Grid Host" : "Verified Driver"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Upload Box */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border border-slate-250 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center cursor-pointer shadow border-2 border-white dark:border-slate-950 transition-all">
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                <Camera className="w-4 h-4" />
              </label>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Profile Picture</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border ${errors.name ? "border-rose-500" : "border-slate-200 dark:border-slate-700/60"} rounded-xl outline-none focus:border-primary text-sm font-semibold`}
                  required
                />
              </div>
              {errors.name && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.name}</span>}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border ${errors.email ? "border-rose-500" : "border-slate-200 dark:border-slate-700/60"} rounded-xl outline-none focus:border-primary text-sm font-semibold`}
                  required
                />
              </div>
              {errors.email && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.email}</span>}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                    if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }));
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border ${errors.phone ? "border-rose-500" : "border-slate-200 dark:border-slate-700/60"} rounded-xl outline-none focus:border-primary text-sm font-semibold`}
                  maxLength={10}
                  required
                />
              </div>
              {errors.phone && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.phone}</span>}
            </div>

            {/* Address */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Primary Address
              </label>
              <div className="relative">
                <Home className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Chennai, Tamil Nadu"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-primary text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Owner specific bank payout details fields */}
          {user.role === "owner" && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <h3 className="font-bold text-sm text-secondary flex items-center gap-1.5">
                <Landmark className="w-4.5 h-4.5" />
                Bank Payout Details
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Beneficiary Name
                  </label>
                  <input
                    type="text"
                    value={bankHolderName}
                    onChange={(e) => setBankHolderName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => {
                      setBankAccount(e.target.value.replace(/\D/g, ""));
                      if (errors.bankAccount) setErrors(prev => ({ ...prev, bankAccount: "" }));
                    }}
                    placeholder="50100234293842"
                    className={`w-full px-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border ${errors.bankAccount ? "border-rose-500" : "border-slate-200 dark:border-slate-700/60"} rounded-xl outline-none focus:border-secondary text-xs font-semibold`}
                  />
                  {errors.bankAccount && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.bankAccount}</span>}
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={bankIfsc}
                    onChange={(e) => {
                      setBankIfsc(e.target.value.toUpperCase().slice(0, 11));
                      if (errors.bankIfsc) setErrors(prev => ({ ...prev, bankIfsc: "" }));
                    }}
                    placeholder="HDFC0000240"
                    maxLength={11}
                    className={`w-full px-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border ${errors.bankIfsc ? "border-rose-500" : "border-slate-200 dark:border-slate-700/60"} rounded-xl outline-none focus:border-secondary text-xs font-semibold`}
                  />
                  {errors.bankIfsc && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.bankIfsc}</span>}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-primary hover:brightness-110 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-1.5 shadow"
              disabled={loading}
            >
              {loading ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Building, Upload, ArrowRight, ShieldCheck, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

export default function OwnerOnboardingPage() {
  const router = useRouter();
  const { switchRole } = useAuthStore();
  const [step, setStep] = useState(1);
  const [pan, setPan] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleNext = () => {
    if (step === 1 && (!pan || !aadhaar)) {
      toast.error("Please fill in PAN and Aadhaar number details");
      return;
    }
    if (step === 2 && (!bankAccount || !bankName || !ifsc)) {
      toast.error("Please fill in your active payout bank details");
      return;
    }
    if (step === 3 && (!propertyName || !propertyAddress)) {
      toast.error("Please specify your registration listing information");
      return;
    }
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      submitOnboarding();
    }
  };

  const submitOnboarding = async () => {
    setUploading(true);
    try {
      const success = await switchRole("owner");
      if (success) {
        toast.success("Host onboarding completed! Welcome to Host Hub.");
        router.push("/owner/dashboard");
      } else {
        toast.error("Failed to complete onboarding. Please try again.");
      }
    } catch (err) {
      toast.error("An error occurred during onboarding.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden text-white">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-secondary/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg glass-card rounded-2xl border border-slate-700/30 p-8 shadow-2xl z-10 relative">
        {/* Step indicator */}
        <div className="flex justify-between items-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-initial">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition ${
                  step >= s ? "bg-secondary text-white" : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition ${
                    step > s ? "bg-secondary" : "bg-slate-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-secondary animate-pulse" />
            Host (Owner) Verification
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {step === 1 && "Identity Verification (Aadhaar & PAN)"}
            {step === 2 && "Setup Payout Bank Details"}
            {step === 3 && "Primary Property Information"}
          </p>
        </div>

        {/* Step 1: KYC Identification */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                PAN Card Number
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
                maxLength={10}
                placeholder="ABCDE1234F"
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Aadhaar Card Number
              </label>
              <input
                type="text"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
                maxLength={12}
                placeholder="1234 5678 9012"
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition"
              />
            </div>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-secondary/50 transition cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <span className="text-xs text-slate-300 font-semibold block">Upload Aadhaar & PAN Scans</span>
              <span className="text-[10px] text-slate-500 block mt-1">Supports PDF, PNG, JPG up to 5MB</span>
            </div>
          </div>
        )}

        {/* Step 2: Bank details */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Beneficiary Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="HDFC Bank / State Bank of India"
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Bank Account Number
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ""))}
                placeholder="50100234293842"
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                IFSC Code
              </label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase().slice(0, 11))}
                maxLength={11}
                placeholder="HDFC0000240"
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition"
              />
            </div>
          </div>
        )}

        {/* Step 3: Property details */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Listing Property Nickname
              </label>
              <input
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="Nexon Heights Private Garage"
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Property Address
              </label>
              <textarea
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="102, Block C, Green View Apartments, Sector 45, Gurugram, Haryana"
                rows={3}
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition resize-none"
              />
            </div>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-5 text-center hover:border-secondary/50 transition cursor-pointer">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <span className="text-xs text-slate-300 font-semibold block">Upload Property Registry/Utility Bill Proof</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
              disabled={uploading}
            >
              Previous
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-[2] py-3 bg-secondary hover:bg-[#003D6D] font-bold rounded-xl text-white transition flex items-center justify-center gap-2 group"
            disabled={uploading}
          >
            {uploading ? (
              "Saving verification..."
            ) : (
              <>
                {step === 3 ? "Complete Verification" : "Continue"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

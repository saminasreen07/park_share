"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { supabase } from "@/lib/supabase-client";
import { Building, Upload, ArrowRight, ShieldCheck, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

export default function OwnerOnboardingPage() {
  const router = useRouter();
  const { switchRole, user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [pan, setPan] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Upload states
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [propertyFile, setPropertyFile] = useState<File | null>(null);
  const [aadhaarProgress, setAadhaarProgress] = useState(0);
  const [propertyProgress, setPropertyProgress] = useState(0);

  const simulateUpload = (type: "aadhaar" | "property", file: File) => {
    if (errors.aadhaarFile) setErrors(prev => ({ ...prev, aadhaarFile: "" }));
    if (errors.propertyFile) setErrors(prev => ({ ...prev, propertyFile: "" }));

    if (type === "aadhaar") {
      setAadhaarFile(file);
      setAadhaarProgress(10);
      const timer = setInterval(() => {
        setAadhaarProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          return prev + 30;
        });
      }, 300);
    } else {
      setPropertyFile(file);
      setPropertyProgress(10);
      const timer = setInterval(() => {
        setPropertyProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          return prev + 30;
        });
      }, 300);
    }
  };

  const validateStep = () => {
    const newErrors: { [key: string]: string } = {};

    if (step === 1) {
      if (!pan.trim()) {
        newErrors.pan = "PAN number is required.";
      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim())) {
        newErrors.pan = "Invalid PAN card number format (e.g. ABCDE1234F).";
      }
      if (!aadhaar) {
        newErrors.aadhaar = "Aadhaar number is required.";
      } else if (aadhaar.length !== 12) {
        newErrors.aadhaar = "Aadhaar number must be exactly 12 digits.";
      }
      if (!aadhaarFile) {
        newErrors.aadhaarFile = "Please upload Aadhaar Front scan to verify.";
      } else if (aadhaarProgress < 100) {
        newErrors.aadhaarFile = "Aadhaar upload is still in progress.";
      }
    }

    if (step === 2) {
      if (!bankName.trim()) {
        newErrors.bankName = "Bank Name is required.";
      }
      if (!bankAccount.trim()) {
        newErrors.bankAccount = "Bank Account number is required.";
      } else if (bankAccount.trim().length < 9 || bankAccount.trim().length > 18) {
        newErrors.bankAccount = "Bank Account number must be between 9 and 18 digits.";
      }
      if (!ifsc.trim()) {
        newErrors.ifsc = "IFSC code is required.";
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim())) {
        newErrors.ifsc = "Invalid IFSC format (e.g. HDFC0000240).";
      }
    }

    if (step === 3) {
      if (!propertyName.trim()) {
        newErrors.propertyName = "Listing Property Nickname is required.";
      }
      if (!propertyAddress.trim()) {
        newErrors.propertyAddress = "Property Address is required.";
      }
      if (!propertyFile) {
        newErrors.propertyFile = "Please upload property registry or utility proof.";
      } else if (propertyProgress < 100) {
        newErrors.propertyFile = "Property document upload is still in progress.";
      }
    }

    setErrors(newErrors);
    const firstErr = Object.values(newErrors)[0];
    if (firstErr) {
      toast.error(firstErr);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) {
      return;
    }
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      submitOnboarding();
    }
  };

  const submitOnboarding = async () => {
    if (!user) {
      toast.error("You must be logged in to complete onboarding.");
      return;
    }
    setUploading(true);
    try {
      const success = await switchRole("owner");
      if (success) {
        // If not a mock user, update database profile metadata
        const { error: dbError } = await supabase
          .from("profiles")
          .update({
            aadhaar_number: aadhaar,
            bank_account_number: bankAccount,
            bank_ifsc: ifsc,
            bank_holder_name: bankName,
            address: propertyAddress,
            aadhaar_front_url: aadhaarFile ? `https://mock-storage.com/${user.id}/aadhaar.pdf` : null,
            property_proof_url: propertyFile ? `https://mock-storage.com/${user.id}/property.pdf` : null,
            is_verified: true, // Auto-verify in development for instant dashboard access
          })
          .eq("id", user.id);
        
        if (dbError) {
          console.error("Failed to update profile metadata:", dbError);
          toast.error("Warning: Profile updated, but verification details failed to save.");
        }
        
        toast.success("Host onboarding completed! Welcome to Host Hub.");
        router.push("/owner/dashboard");
      } else {
        toast.error("Failed to complete onboarding. Please try again.");
      }
    } catch (err) {
      console.error(err);
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
          <p className="text-slate-400 text-sm mt-1 text-left">
            {step === 1 && "Identity Verification (Aadhaar & PAN)"}
            {step === 2 && "Setup Payout Bank Details"}
            {step === 3 && "Primary Property Information"}
          </p>
        </div>

        {/* Step 1: KYC Identification */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2 text-left">
                PAN Card Number
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => {
                  setPan(e.target.value.toUpperCase().slice(0, 10));
                  if (errors.pan) setErrors(prev => ({ ...prev, pan: "" }));
                }}
                maxLength={10}
                placeholder="ABCDE1234F"
                className={`w-full px-4 py-3 bg-slate-800/85 border ${errors.pan ? "border-rose-500" : "border-slate-700/50"} rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition`}
              />
              {errors.pan && <span className="text-xs text-rose-500 font-semibold mt-1 block text-left">{errors.pan}</span>}
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2 text-left">
                Aadhaar Card Number
              </label>
              <input
                type="text"
                value={aadhaar}
                onChange={(e) => {
                  setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12));
                  if (errors.aadhaar) setErrors(prev => ({ ...prev, aadhaar: "" }));
                }}
                maxLength={12}
                placeholder="1234 5678 9012"
                className={`w-full px-4 py-3 bg-slate-800/85 border ${errors.aadhaar ? "border-rose-500" : "border-slate-700/50"} rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition`}
              />
              {errors.aadhaar && <span className="text-xs text-rose-500 font-semibold mt-1 block text-left">{errors.aadhaar}</span>}
            </div>
            <div 
              onClick={() => document.getElementById("aadhaar-file-input")?.click()}
              className={`border-2 border-dashed ${errors.aadhaarFile ? "border-rose-500" : "border-slate-700 hover:border-secondary"} rounded-xl p-6 text-center transition cursor-pointer relative bg-slate-800/30`}
            >
              <input
                id="aadhaar-file-input"
                type="file"
                className="hidden"
                accept="application/pdf,image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) simulateUpload("aadhaar", file);
                }}
              />
              {aadhaarFile ? (
                <div className="space-y-2">
                  <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                  <span className="text-xs font-bold text-emerald-400 block max-w-full truncate px-4">
                    {aadhaarFile.name}
                  </span>
                  {aadhaarProgress < 100 ? (
                    <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-secondary h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${aadhaarProgress}%` }}
                      />
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 block font-semibold">Upload Complete (100%)</span>
                  )}
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs text-slate-300 font-semibold block">Upload Aadhaar & PAN Scans</span>
                  <span className="text-[10px] text-slate-500 block mt-1">Supports PDF, PNG, JPG up to 5MB</span>
                </>
              )}
            </div>
            {errors.aadhaarFile && <span className="text-xs text-rose-500 font-semibold mt-1 block text-left">{errors.aadhaarFile}</span>}
          </div>
        )}

        {/* Step 2: Bank details */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2 text-left">
                Beneficiary Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value);
                  if (errors.bankName) setErrors(prev => ({ ...prev, bankName: "" }));
                }}
                placeholder="HDFC Bank / State Bank of India"
                className={`w-full px-4 py-3 bg-slate-800/85 border ${errors.bankName ? "border-rose-500" : "border-slate-700/50"} rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition`}
              />
              {errors.bankName && <span className="text-xs text-rose-500 font-semibold mt-1 block text-left">{errors.bankName}</span>}
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2 text-left">
                Bank Account Number
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => {
                  setBankAccount(e.target.value.replace(/\D/g, ""));
                  if (errors.bankAccount) setErrors(prev => ({ ...prev, bankAccount: "" }));
                }}
                placeholder="50100234293842"
                className={`w-full px-4 py-3 bg-slate-800/85 border ${errors.bankAccount ? "border-rose-500" : "border-slate-700/50"} rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition`}
              />
              {errors.bankAccount && <span className="text-xs text-rose-500 font-semibold mt-1 block text-left">{errors.bankAccount}</span>}
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2 text-left">
                IFSC Code
              </label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => {
                  setIfsc(e.target.value.toUpperCase().slice(0, 11));
                  if (errors.ifsc) setErrors(prev => ({ ...prev, ifsc: "" }));
                }}
                maxLength={11}
                placeholder="HDFC0000240"
                className={`w-full px-4 py-3 bg-slate-800/85 border ${errors.ifsc ? "border-rose-500" : "border-slate-700/50"} rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition`}
              />
              {errors.ifsc && <span className="text-xs text-rose-500 font-semibold mt-1 block text-left">{errors.ifsc}</span>}
            </div>
          </div>
        )}

        {/* Step 3: Property details */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2 text-left">
                Listing Property Nickname
              </label>
              <input
                type="text"
                value={propertyName}
                onChange={(e) => {
                  setPropertyName(e.target.value);
                  if (errors.propertyName) setErrors(prev => ({ ...prev, propertyName: "" }));
                }}
                placeholder="Nexon Heights Private Garage"
                className={`w-full px-4 py-3 bg-slate-800/85 border ${errors.propertyName ? "border-rose-500" : "border-slate-700/50"} rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition`}
              />
              {errors.propertyName && <span className="text-xs text-rose-500 font-semibold mt-1 block text-left">{errors.propertyName}</span>}
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2 text-left">
                Property Address
              </label>
              <textarea
                value={propertyAddress}
                onChange={(e) => {
                  setPropertyAddress(e.target.value);
                  if (errors.propertyAddress) setErrors(prev => ({ ...prev, propertyAddress: "" }));
                }}
                placeholder="102, Block C, Green View Apartments, Sector 45, Gurugram, Haryana"
                rows={3}
                className={`w-full px-4 py-3 bg-slate-800/85 border ${errors.propertyAddress ? "border-rose-500" : "border-slate-700/50"} rounded-xl outline-none focus:border-secondary text-white text-sm font-semibold transition resize-none`}
              />
              {errors.propertyAddress && <span className="text-xs text-rose-500 font-semibold mt-1 block text-left">{errors.propertyAddress}</span>}
            </div>
            <div 
              onClick={() => document.getElementById("property-file-input")?.click()}
              className={`border-2 border-dashed ${errors.propertyFile ? "border-rose-500" : "border-slate-700 hover:border-secondary"} rounded-xl p-5 text-center transition cursor-pointer relative bg-slate-800/30`}
            >
              <input
                id="property-file-input"
                type="file"
                className="hidden"
                accept="application/pdf,image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) simulateUpload("property", file);
                }}
              />
              {propertyFile ? (
                <div className="space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                  <span className="text-xs font-bold text-emerald-400 block max-w-full truncate px-4">
                    {propertyFile.name}
                  </span>
                  {propertyProgress < 100 ? (
                    <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-secondary h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${propertyProgress}%` }}
                      />
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 block font-semibold">Upload Complete (100%)</span>
                  )}
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs text-slate-300 font-semibold block">Upload Property Registry/Utility Bill Proof</span>
                </>
              )}
            </div>
            {errors.propertyFile && <span className="text-xs text-rose-500 font-semibold mt-1 block text-left">{errors.propertyFile}</span>}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => {
                setErrors({});
                setStep(step - 1);
              }}
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

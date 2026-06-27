"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Car, Upload, ArrowRight, ShieldCheck, FileText } from "lucide-react";
import toast from "react-hot-toast";

export default function DriverOnboardingPage() {
  const router = useRouter();
  const { switchRole, user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [license, setLicense] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [vehicleType, setVehicleType] = useState("car");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleNext = () => {
    if (step === 1 && (!license || !aadhaar)) {
      toast.error("Please fill in all KYC identification numbers");
      return;
    }
    if (step === 2 && (!vehicleModel || !vehicleNo)) {
      toast.error("Please fill in your vehicle details");
      return;
    }
    if (step === 3 && (!emergencyName || !emergencyPhone)) {
      toast.error("Please fill in emergency contact details");
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
      const success = await switchRole("driver");
      if (success) {
        toast.success("Driver onboarding completed successfully!");
        router.push("/search");
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
                  step >= s ? "bg-primary text-white" : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition ${
                    step > s ? "bg-primary" : "bg-slate-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Car className="w-6 h-6 text-primary animate-pulse" />
            Driver Verification
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {step === 1 && "Identity Verification (KYC Documents)"}
            {step === 2 && "Add Your Primary Vehicle"}
            {step === 3 && "Emergency Contacts & Preferences"}
          </p>
        </div>

        {/* Step 1: KYC Identification */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Driving License Number
              </label>
              <input
                type="text"
                value={license}
                onChange={(e) => setLicense(e.target.value.toUpperCase())}
                placeholder="DL-1420230000000"
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-primary text-white text-sm font-semibold transition"
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
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-primary text-white text-sm font-semibold transition"
              />
            </div>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-primary/50 transition cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <span className="text-xs text-slate-300 font-semibold block">Upload Driving License Front & Back</span>
              <span className="text-[10px] text-slate-500 block mt-1">Supports PDF, PNG, JPG up to 5MB</span>
            </div>
          </div>
        )}

        {/* Step 2: Vehicle details */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Vehicle Model / Variant
              </label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Tata Nexon EV / Honda City"
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-primary text-white text-sm font-semibold transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Registration Plate Number
              </label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                placeholder="DL 3C AB 1234"
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-primary text-white text-sm font-semibold transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Vehicle Classification
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-primary text-white text-sm font-semibold transition"
              >
                <option value="hatchback">Hatchback</option>
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="two-wheeler">Two-Wheeler / Bike</option>
                <option value="ev">Electric Vehicle (EV)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Emergency contact */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Emergency Contact Person
              </label>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Jane Doe (Spouse/Parent)"
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-primary text-white text-sm font-semibold transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Emergency Contact Number
              </label>
              <input
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                maxLength={10}
                placeholder="9999999999"
                className="w-full px-4 py-3 bg-slate-800/85 border border-slate-700/50 rounded-xl outline-none focus:border-primary text-white text-sm font-semibold transition"
              />
            </div>
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-slate-300">
                Your emergency parameters are stored securely. You can edit them at any time in the profile configurations.
              </p>
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
            className="flex-[2] py-3 bg-primary hover:bg-[#E55A2B] font-bold rounded-xl text-white transition flex items-center justify-center gap-2 group"
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

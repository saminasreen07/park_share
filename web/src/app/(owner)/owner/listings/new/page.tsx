"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Car, Upload, ArrowRight, ArrowLeft, Check, MapPin, Compass, ShieldAlert, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function NewListingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [totalSlots, setTotalSlots] = useState("1");

  // Step 2: Location
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("28.4595"); // Gurgaon defaults
  const [lng, setLng] = useState("77.0266");

  // Step 3: Features & Media
  const [hasEV, setHasEV] = useState(false);
  const [isCovered, setIsCovered] = useState(false);
  const [hasCCTV, setHasCCTV] = useState(false);
  const [hasValet, setHasValet] = useState(false);
  const [hasSecurity, setHasSecurity] = useState(false);
  
  // Media files (mock images links for simplicity of testing)
  const [images, setImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600",
  ]);

  const handleNext = () => {
    if (step === 1) {
      if (!title || !pricePerHour) {
        toast.error("Please fill in slot title and hourly price rate");
        return;
      }
    }
    if (step === 2) {
      if (!address || !lat || !lng) {
        toast.error("Please specify listing address and coordinates");
        return;
      }
    }
    
    setStep(step + 1);
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toFixed(6));
          setLng(position.coords.longitude.toFixed(6));
          toast.success("Coordinates resolved successfully from browser!");
        },
        (error) => {
          toast.error("Failed to fetch location from browser. Please type manually.");
        }
      );
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.post("/spaces", {
        title,
        description,
        address,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        pricePerHour: parseFloat(pricePerHour),
        totalSlots: parseInt(totalSlots),
        images,
        features: {
          hasEVCharger: hasEV,
          isCovered,
          hasCCTV,
          hasValet,
          hasSecurity,
        },
      });

      if (response.data && response.data.success) {
        toast.success("Parking space listed successfully! Admin approval pending.");
        router.push("/owner/listings");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto py-4 text-slate-800 dark:text-white flex-1 flex flex-col justify-center">
      {/* Wizard indicators */}
      <div className="flex justify-between items-center mb-8 bg-slate-100 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition ${
                step >= s ? "bg-secondary text-white" : "bg-slate-300 text-slate-600"
              }`}
            >
              {s}
            </div>
            <span className="text-xs font-bold text-slate-650 dark:text-slate-300">
              {s === 1 && "Basic Info"}
              {s === 2 && "Location"}
              {s === 3 && "Amenities"}
            </span>
          </div>
        ))}
      </div>

      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative">
        <h1 className="text-2xl font-bold tracking-tight mb-6">List Parking Space</h1>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Step 1: Info */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Listing Title / Spot Nickname
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Premium Covered Slot Near Metro"
                  className="w-full px-4 py-3 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold text-foreground"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Pricing Rate (INR Per Hour)
                </label>
                <input
                  type="number"
                  value={pricePerHour}
                  onChange={(e) => setPricePerHour(e.target.value)}
                  placeholder="40"
                  className="w-full px-4 py-3 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold text-foreground"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                    Slot Capacity
                  </label>
                  <input
                    type="number"
                    value={totalSlots}
                    onChange={(e) => setTotalSlots(e.target.value)}
                    min="1"
                    placeholder="1"
                    className="w-full px-4 py-3 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Brief description (Rules, Height limits, access card details)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Secure residential spot with 24x7 gate guard. Ground level, covered."
                  rows={3}
                  className="w-full px-4 py-3 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold text-foreground resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full btn-secondary py-3 flex items-center justify-center gap-1.5"
              >
                Continue to Location
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Location coords */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Complete Address (Visible to confirmed drivers)
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Sector 21 Metro Station, Gurugram, Haryana"
                  rows={2}
                  className="w-full px-4 py-3 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold text-foreground resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold text-foreground"
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleLocateMe}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-white rounded-xl border border-slate-250 dark:border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Compass className="w-4 h-4 text-secondary" />
                Resolve Current Coordinates
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-[2] btn-secondary py-3 flex items-center justify-center gap-1.5"
                >
                  Continue to Amenities
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Features & uploads */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              {/* Amenities checklist */}
              <div className="space-y-3">
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Check Grid Amenities Available
                </label>
                <div className="grid grid-cols-2 gap-3.5 pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasEV}
                      onChange={(e) => setHasEV(e.target.checked)}
                      className="accent-secondary rounded"
                    />
                    EV Charging Outlet
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCovered}
                      onChange={(e) => setIsCovered(e.target.checked)}
                      className="accent-secondary rounded"
                    />
                    Covered Space
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCCTV}
                      onChange={(e) => setHasCCTV(e.target.checked)}
                      className="accent-secondary rounded"
                    />
                    CCTV Surveillance
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasSecurity}
                      onChange={(e) => setHasSecurity(e.target.checked)}
                      className="accent-secondary rounded"
                    />
                    Gate Guard Security
                  </label>
                </div>
              </div>

              {/* Uploads simulation */}
              <div className="space-y-2">
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Photos Media (Minimum 1 Required)
                </label>
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-secondary/50 transition cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs text-slate-300 font-semibold block">Drag & Drop Slot Images Here</span>
                  <span className="text-[10px] text-slate-500 block mt-1">Supports PNG, JPG (Simulated upload link configured)</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  className="flex-[2] btn-secondary py-3 flex items-center justify-center gap-1.5"
                  disabled={loading}
                >
                  {loading ? "Listing..." : "Submit Listing"}
                  <Check className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}

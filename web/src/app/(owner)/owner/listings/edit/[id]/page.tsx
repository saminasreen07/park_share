"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { ArrowLeft, Car, MapPin, Landmark, ShieldCheck, Save, Sparkles, Image as ImageIcon, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";

export default function EditListingPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Field states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [pricePerHour, setPricePerHour] = useState(0);
  const [totalSlots, setTotalSlots] = useState(1);
  const [availableSlots, setAvailableSlots] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  // Features checkboxes
  const [hasEVCharger, setHasEVCharger] = useState(false);
  const [hasCCTV, setHasCCTV] = useState(false);
  const [isCovered, setIsCovered] = useState(false);
  const [isSecurityGuarded, setIsSecurityGuarded] = useState(false);

  // Classification checkboxes
  const [vehicleTypes, setVehicleTypes] = useState<string[]>(["4-wheeler"]);

  useEffect(() => {
    if (id) {
      fetchListingDetails();
    }
  }, [id]);

  const fetchListingDetails = async () => {
    try {
      const response = await apiClient.get(`/spaces/${id}`);
      if (response.data && response.data.success && response.data.data) {
        const space = response.data.data;
        setTitle(space.title);
        setDescription(space.description || "");
        setAddress(space.address);
        setPricePerHour(space.pricePerHour || 0);
        setTotalSlots(space.totalSlots || 1);
        setAvailableSlots(space.availableSlots || 1);
        setImages(space.images || []);
        
        if (space.features) {
          setHasEVCharger(!!space.features.hasEVCharger);
          setHasCCTV(!!space.features.hasCCTV);
          setIsCovered(!!space.features.isCovered);
          setIsSecurityGuarded(!!space.features.isSecurityGuarded);
        }
        if (space.vehicleTypes) {
          setVehicleTypes(space.vehicleTypes);
        }
      } else {
        toast.error("Failed to load listing details");
      }
    } catch (err) {
      toast.error("Listing not found or API access error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    if (!newImageUrl.startsWith("http://") && !newImageUrl.startsWith("https://")) {
      toast.error("Image link must start with http:// or https://");
      return;
    }
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl("");
    toast.success("Image link appended!");
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    toast.success("Image link removed");
  };

  const handleVehicleTypeToggle = (type: string) => {
    if (vehicleTypes.includes(type)) {
      setVehicleTypes(vehicleTypes.filter((t) => t !== type));
    } else {
      setVehicleTypes([...vehicleTypes, type]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !address.trim() || pricePerHour < 0 || totalSlots <= 0) {
      toast.error("Please provide valid details for all required parameters");
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.put(`/spaces/${id}`, {
        title,
        description,
        address,
        pricePerHour: Number(pricePerHour),
        totalSlots: Number(totalSlots),
        availableSlots: Math.min(Number(availableSlots), Number(totalSlots)),
        features: {
          hasEVCharger,
          hasCCTV,
          isCovered,
          isSecurityGuarded
        },
        vehicleTypes,
        images
      });

      if (response.data && response.data.success) {
        toast.success("Listing details updated successfully!");
        router.push("/owner/listings");
      } else {
        throw new Error(response.data.message || "Failed to update space");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit updates");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center text-white animate-pulse">
        <div className="h-10 bg-slate-800 rounded w-1/3 mx-auto mb-6" />
        <div className="h-96 bg-slate-800 rounded-2xl" />
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 text-slate-800 dark:text-white flex-1 min-h-screen">
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 bg-white dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
              <Car className="w-6 h-6 text-secondary" />
              Edit Parking Space
            </h1>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Listing ID: {id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Listing Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Covered EV Garage with 24/7 Guard"
                className="w-full px-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold"
                required
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your parking space, instructions, rules..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold resize-none"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Complete Address *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="12, Green Heights Apartments, Chennai"
                className="w-full px-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold"
                required
              />
            </div>

            {/* Price per Hour */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Price per Hour (INR) *
              </label>
              <input
                type="number"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(Math.max(0, Number(e.target.value)))}
                className="w-full px-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold"
                required
              />
            </div>

            {/* Slots Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Total Slots *
                </label>
                <input
                  type="number"
                  value={totalSlots}
                  onChange={(e) => setTotalSlots(Math.max(1, Number(e.target.value)))}
                  className="w-full px-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Available Slots *
                </label>
                <input
                  type="number"
                  value={availableSlots}
                  onChange={(e) => setAvailableSlots(Math.max(0, Number(e.target.value)))}
                  className="w-full px-4 py-2.5 bg-slate-55 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-sm font-semibold"
                  required
                />
              </div>
            </div>
          </div>

          {/* Features Checkboxes */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              Features & Amenities
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={hasEVCharger}
                  onChange={(e) => setHasEVCharger(e.target.checked)}
                  className="accent-secondary w-4.5 h-4.5"
                />
                EV Charger Available
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={hasCCTV}
                  onChange={(e) => setHasCCTV(e.target.checked)}
                  className="accent-secondary w-4.5 h-4.5"
                />
                CCTV / Security Cam
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={isCovered}
                  onChange={(e) => setIsCovered(e.target.checked)}
                  className="accent-secondary w-4.5 h-4.5"
                />
                Covered Spot
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={isSecurityGuarded}
                  onChange={(e) => setIsSecurityGuarded(e.target.checked)}
                  className="accent-secondary w-4.5 h-4.5"
                />
                Guarded Gate
              </label>
            </div>
          </div>

          {/* Vehicle Classifications */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              Permitted Vehicle Types
            </label>
            <div className="flex flex-wrap gap-2">
              {["2-wheeler", "4-wheeler", "heavy-vehicle"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleVehicleTypeToggle(type)}
                  className={`py-2 px-4 rounded-full border text-xs font-bold transition ${
                    vehicleTypes.includes(type)
                      ? "border-secondary bg-secondary/10 text-secondary"
                      : "border-slate-200 dark:border-slate-800 bg-transparent text-slate-500"
                  }`}
                >
                  {type === "2-wheeler" && "Two-Wheeler / Bike"}
                  {type === "4-wheeler" && "Cars / Sedan / SUV"}
                  {type === "heavy-vehicle" && "Heavy Vehicle / Trucks"}
                </button>
              ))}
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              Parking Gallery Image Links
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Paste parking space photo link (e.g. https://images.unsplash.com/...)"
                className="flex-1 px-4 py-2 bg-slate-55 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-secondary text-xs font-semibold"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="px-4 py-2 bg-secondary hover:brightness-110 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* List of image previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden aspect-[4/3] border border-slate-200 dark:border-slate-800">
                    <img src={url} alt={`Listing Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg opacity-90 hover:opacity-100 transition shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-secondary hover:brightness-110 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-1.5 shadow"
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving Changes..." : "Save Listing"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

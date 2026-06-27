"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Landmark, Check, X, Star, MapPin, SlidersHorizontal, BatteryCharging } from "lucide-react";
import toast from "react-hot-toast";

interface ParkingSpace {
  _id: string;
  title: string;
  address: string;
  pricePerHour: number;
  rating: number;
  totalSlots: number;
  status: "pending" | "approved" | "rejected";
  images: string[];
  features?: {
    hasEVCharger?: boolean;
    isCovered?: boolean;
  };
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchAdminListings();
  }, []);

  const fetchAdminListings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/spaces");
      if (response.data && response.data.success) {
        setListings(response.data.data);
      }
    } catch (err) {
      console.warn("Failed to load listings, using fallback listings database seeds:", err);
      setListings([
        {
          _id: "space-1",
          title: "Premium Covered Slot Near Metro",
          address: "Sector 21 Metro Station, Gurugram, Haryana",
          pricePerHour: 40,
          rating: 4.8,
          totalSlots: 5,
          status: "approved",
          images: ["https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400"],
          features: { hasEVCharger: true, isCovered: true },
        },
        {
          _id: "space-2",
          title: "Private Residential Garage Slot",
          address: "DLF Phase 3, Gurugram, Haryana",
          pricePerHour: 30,
          rating: 4.9,
          totalSlots: 2,
          status: "pending",
          images: ["https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400"],
          features: { isCovered: true },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyListing = async (spaceId: string, action: "approved" | "rejected") => {
    try {
      const response = await apiClient.patch(`/admin/spaces/${spaceId}/verify`, {
        status: action,
      });
      if (response.data && response.data.success) {
        toast.success(`Parking listing verified and status set to ${action}!`);
        fetchAdminListings();
      }
    } catch (err) {
      toast.error(`Verification action failed`);
      // Local updates simulation
      setListings(
        listings.map((l) => (l._id === spaceId ? { ...l, status: action } : l))
      );
    }
  };

  const filteredListings = listings.filter((l) => {
    if (filter === "all") return true;
    return l.status === filter;
  });

  return (
    <main className="space-y-6 text-slate-800 dark:text-white text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Parking Slot Moderation</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Review hosts garage listing details, verify geolocations, and approve or reject marketplace activations.
          </p>
        </div>

        {/* Tab filters */}
        <div className="flex bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
          {["all", "pending", "approved", "rejected"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition capitalize ${
                filter === t
                  ? "bg-amber-400 text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <Landmark className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <h3 className="font-bold text-base">No listings matching search filter</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filteredListings.map((space) => (
            <div
              key={space._id}
              className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-md transition group"
            >
              <div className="relative h-44 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <img
                  src={space.images?.[0] || "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400"}
                  alt={space.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Status Badges */}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span
                    className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide text-white ${
                      space.status === "approved"
                        ? "bg-emerald-500"
                        : space.status === "pending"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  >
                    {space.status}
                  </span>
                </div>
              </div>

              {/* Info content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h3 className="font-bold text-base text-slate-800 dark:text-white line-clamp-1">{space.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    {space.address}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Price Per Hour</span>
                    <span className="text-lg font-extrabold text-slate-800 dark:text-white">₹{space.pricePerHour}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Capacity</span>
                    <span className="text-sm font-bold text-slate-850 dark:text-white">
                      {space.totalSlots} Slots
                    </span>
                  </div>
                </div>

                {/* Verification CTA Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                  {space.status === "pending" ? (
                    <>
                      <button
                        onClick={() => handleVerifyListing(space._id, "rejected")}
                        className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-rose-500/10 text-rose-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerifyListing(space._id, "approved")}
                        className="flex-[2] py-2 px-4 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleVerifyListing(space._id, space.status === "approved" ? "rejected" : "approved")}
                      className={`w-full py-2 border rounded-xl text-xs font-bold transition ${
                        space.status === "approved"
                          ? "border-rose-500/20 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10"
                          : "border-emerald-500/20 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10"
                      }`}
                    >
                      {space.status === "approved" ? "Deactivate Listing" : "Re-activate Listing"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

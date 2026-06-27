"use client";

import React, { useState, useEffect } from "react";
import Link from "next/navigation";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Car, Plus, Star, MapPin, Eye, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface ParkingSpace {
  _id: string;
  title: string;
  address: string;
  pricePerHour: number;
  rating: number;
  totalSlots: number;
  availableSlots: number;
  status: "pending" | "approved" | "rejected";
  images: string[];
  features?: {
    hasEVCharger?: boolean;
  };
}

export default function OwnerListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/spaces/owner");
      if (response.data && response.data.success) {
        setListings(response.data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch listings, using seeded fallback listings:", err);
      setListings([
        {
          _id: "space-1",
          title: "Premium Covered Slot Near Metro",
          address: "Sector 21 Metro Station, Gurugram, Haryana",
          pricePerHour: 40,
          rating: 4.8,
          totalSlots: 5,
          availableSlots: 3,
          status: "approved",
          images: ["https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400"],
          features: { hasEVCharger: true },
        },
        {
          _id: "space-2",
          title: "Private Residential Garage Slot",
          address: "DLF Phase 3, Gurugram, Haryana",
          pricePerHour: 30,
          rating: 4.9,
          totalSlots: 2,
          availableSlots: 1,
          status: "approved",
          images: ["https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400"],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (spaceId: string) => {
    try {
      const response = await apiClient.patch(`/spaces/${spaceId}/toggle-availability`);
      if (response.data && response.data.success) {
        toast.success("Listings availability toggled successfully!");
        fetchListings();
      }
    } catch (err) {
      toast.error("Failed to toggle listing status");
      // Local toggle simulation
      setListings(
        listings.map((l) =>
          l._id === spaceId
            ? { ...l, availableSlots: l.availableSlots > 0 ? 0 : l.totalSlots }
            : l
        )
      );
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!window.confirm("Are you sure you want to remove this listing?")) return;
    try {
      const response = await apiClient.delete(`/spaces/${spaceId}`);
      if (response.data && response.data.success) {
        toast.success("Listing deleted successfully!");
        setListings(listings.filter((l) => l._id !== spaceId));
      }
    } catch (err) {
      toast.error("Failed to delete space listing");
      setListings(listings.filter((l) => l._id !== spaceId));
    }
  };

  return (
    <main className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">My Parking Slots</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            List driveways, toggle bookings availability, and manage security parameters.
          </p>
        </div>

        <button
          onClick={() => router.push("/owner/listings/new")}
          className="btn-secondary py-2.5 px-5 text-sm font-bold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          List New Space
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
          <Car className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-lg">No parking slots listed</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            You haven&apos;t listed any driveways yet. Click listed button above to start earning payout credits.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {listings.map((space) => (
            <div
              key={space._id}
              className="bg-white dark:bg-[#131B2E] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition group"
            >
              {/* Cover Image */}
              <div className="relative h-44 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <img
                  src={space.images?.[0] || "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400"}
                  alt={space.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                
                {/* Status Badges */}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span
                    className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide ${
                      space.status === "approved"
                        ? "bg-emerald-500 text-white"
                        : space.status === "pending"
                        ? "bg-amber-500 text-white"
                        : "bg-rose-500 text-white"
                    }`}
                  >
                    {space.status}
                  </span>
                </div>
                
                <span className="absolute top-3 right-3 px-2 py-1 bg-slate-900/80 backdrop-blur-sm rounded-lg text-xs font-bold text-white flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  {space.rating.toFixed(1)}
                </span>
              </div>

              {/* Content info */}
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
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Occupied</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                      {space.totalSlots - space.availableSlots} / {space.totalSlots} Slots
                    </span>
                  </div>
                </div>

                {/* Actions grid */}
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <button
                    onClick={() => handleToggleAvailability(space._id)}
                    className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-bold flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300"
                  >
                    {space.availableSlots > 0 ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-emerald-500" />
                        Available
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                        Offline
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteSpace(space._id)}
                    className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-xl transition"
                    title="Remove Listing"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

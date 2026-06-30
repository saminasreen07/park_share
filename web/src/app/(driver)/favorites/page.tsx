"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Heart, MapPin, Star, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface ParkingSpace {
  _id: string;
  title: string;
  address: string;
  pricePerHour: number;
  rating?: number;
  averageRating?: number;
  images: string[];
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    let apiFavs: ParkingSpace[] = [];
    try {
      setLoading(true);
      const response = await apiClient.get("/favorites");
      if (response.data && response.data.success) {
        apiFavs = response.data.data;
      }
    } catch (err) {
      console.error("Failed to load favorites:", err);
    }

    // Load local favorites from localStorage
    let localFavs: ParkingSpace[] = [];
    if (typeof window !== "undefined") {
      try {
        localFavs = JSON.parse(localStorage.getItem("parkshare_local_favorites") || "[]");
      } catch (e) {
        console.error("Failed to load local favorites:", e);
      }
    }

    // Combine them, making sure they are unique by _id
    const combined = [...localFavs];
    apiFavs.forEach((af) => {
      if (!combined.some((cf) => cf._id === af._id)) {
        combined.push(af);
      }
    });

    setFavorites(combined);
    setLoading(false);
  };

  const removeFavorite = async (spaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Clean from localStorage
    if (typeof window !== "undefined") {
      try {
        const localFavs = JSON.parse(localStorage.getItem("parkshare_local_favorites") || "[]");
        const nextFavs = localFavs.filter((f: any) => f._id !== spaceId);
        localStorage.setItem("parkshare_local_favorites", JSON.stringify(nextFavs));
      } catch (e) {}
    }

    try {
      const response = await apiClient.delete(`/favorites?spaceId=${spaceId}`);
      if (response.data && response.data.success) {
        setFavorites(favorites.filter((f) => f._id !== spaceId));
        toast.success("Removed from saved spots");
      } else {
        setFavorites(favorites.filter((f) => f._id !== spaceId));
        toast.success("Removed from saved spots");
      }
    } catch (err) {
      console.warn("Failed to remove favorite via API, updating UI locally:", err);
      setFavorites(favorites.filter((f) => f._id !== spaceId));
      toast.success("Removed from saved spots");
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-800 dark:text-white flex-1 flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent inline-block">
          Saved Parking Spots
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-semibold">
          Access your favorite spaces and quickly check availability to book again.
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-xs text-slate-400 font-semibold mt-4">Loading your favorites...</p>
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">No saved spots yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
            Tap the heart icon on any parking spot details page or search results list to quickly save it here.
          </p>
          <Link href="/search" className="btn-primary py-2.5 px-6 text-sm flex items-center gap-1.5 font-bold shadow-lg">
            Find Parking Spots <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((space) => (
            <div
              key={space._id}
              onClick={() => router.push(`/parking/${space._id}`)}
              className="group bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md hover:border-primary/30 dark:hover:border-primary/20 transition duration-200 flex flex-col relative"
            >
              {/* Image and heart overlay */}
              <div className="h-48 bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                <img
                  src={space.images?.[0] || "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400"}
                  alt={space.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                />
                
                {/* Heart Button overlay */}
                <button
                  onClick={(e) => removeFavorite(space._id, e)}
                  className="absolute top-3.5 right-3.5 p-2 rounded-full bg-slate-900/70 backdrop-blur-md text-red-500 hover:bg-slate-900 transition-all z-10 shadow"
                  title="Remove from favorites"
                >
                  <Heart className="w-4.5 h-4.5 fill-red-500 text-red-500" />
                </button>

                {/* Price tag */}
                <div className="absolute bottom-3.5 left-3.5 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-white font-extrabold text-xs flex items-baseline gap-0.5">
                  ₹{space.pricePerHour} <span className="text-[9px] font-semibold text-slate-300">/hr</span>
                </div>
              </div>

              {/* Card content */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1 group-hover:text-primary transition">
                      {space.title}
                    </h3>
                    <span className="flex items-center gap-0.5 text-xs font-bold text-yellow-500 flex-shrink-0">
                      <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                      {(space.rating ?? space.averageRating ?? 4.5).toFixed(1)}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-1 flex items-center gap-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    {space.address}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400 dark:text-slate-500">Fast Book Available</span>
                  <span className="text-primary group-hover:translate-x-0.5 transition flex items-center gap-1">
                    Book Spot <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

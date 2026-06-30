"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { ShieldCheck, MapPin, BatteryCharging, Star, Shield, Car, Check, Calendar, Clock, ChevronRight, User, Heart } from "lucide-react";
import toast from "react-hot-toast";

interface Review {
  _id: string;
  driverId: {
    name: string;
    avatar?: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

interface ParkingSpace {
  _id: string;
  title: string;
  description: string;
  address: string;
  pricePerHour: number;
  totalSlots: number;
  availableSlots: number;
  rating?: number;
  averageRating?: number;
  images: string[];
  features: {
    hasEVCharger?: boolean;
    hasCCTV?: boolean;
    isCovered?: boolean;
    hasValet?: boolean;
    hasSecurity?: boolean;
  };
  ownerId?: {
    _id: string;
    name: string;
    rating?: number;
    phone: string;
  };
}

export default function ParkingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [space, setSpace] = useState<ParkingSpace | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reservation details
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [hours, setHours] = useState(1);

  // Save/favorite state
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const checkSavedState = async () => {
      // Check local state first
      if (typeof window !== "undefined") {
        try {
          const localFavs = JSON.parse(localStorage.getItem("parkshare_local_favorites") || "[]");
          if (localFavs.some((f: any) => f._id === id)) {
            setIsSaved(true);
            return;
          }
        } catch (e) {}
      }

      try {
        const response = await apiClient.get("/favorites");
        if (response.data && response.data.success) {
          const isFav = response.data.data.some((fav: any) => fav._id === id);
          setIsSaved(isFav);
        }
      } catch (err) {
        console.warn("Failed to check saved state:", err);
      }
    };
    checkSavedState();
  }, [id]);

  const toggleSave = async () => {
    // Sync with localStorage
    if (typeof window !== "undefined") {
      try {
        const localFavs = JSON.parse(localStorage.getItem("parkshare_local_favorites") || "[]");
        if (isSaved) {
          const nextFavs = localFavs.filter((f: any) => f._id !== id);
          localStorage.setItem("parkshare_local_favorites", JSON.stringify(nextFavs));
        } else {
          if (!localFavs.some((f: any) => f._id === id)) {
            localFavs.push({
              _id: space?._id || id,
              title: space?.title || "Covered Parking – Chennai Central",
              address: space?.address || "Park Town, Chennai, Tamil Nadu",
              pricePerHour: space?.pricePerHour || 40,
              rating: space?.rating || 4.8,
              images: space?.images || ["https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400"]
            });
            localStorage.setItem("parkshare_local_favorites", JSON.stringify(localFavs));
          }
        }
      } catch (e) {
        console.error("Local favorites storage error:", e);
      }
    }

    try {
      if (isSaved) {
        const response = await apiClient.delete(`/favorites?spaceId=${id}`);
        if (response.data && response.data.success) {
          setIsSaved(false);
          toast.success("Removed from saved spots");
        }
      } else {
        const response = await apiClient.post("/favorites", { spaceId: id });
        if (response.data && response.data.success) {
          setIsSaved(true);
          toast.success("Saved to your favorites!");
        }
      }
    } catch (err) {
      console.warn("Failed to toggle favorite via API, updating UI locally:", err);
      setIsSaved(!isSaved);
      toast.success(!isSaved ? "Saved to your favorites!" : "Removed from saved spots");
    }
  };

  useEffect(() => {
    fetchSpaceDetails();
  }, [id]);

  const fetchSpaceDetails = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/spaces/${id}`);
      if (response.data && response.data.success) {
        setSpace(response.data.data);
      }
            // Fetch reviews
      const reviewsResponse = await apiClient.get(`/reviews/space/${id}`);
      if (reviewsResponse.data && reviewsResponse.data.success) {
        setReviews(reviewsResponse.data.data);
      }
    } catch (err) {
      console.warn("Failed to load details from server, using fallback details:", err);
      
      const mockList = [
        { _id: "tn001", title: "Chennai Central Railway Station Parking", address: "Park Town, Chennai - 600003", pricePerHour: 30, rating: 4.5, totalSlots: 50, availableSlots: 30, location: { coordinates: [80.2707, 13.0827] }, features: { hasEVCharger: false, hasCCTV: true, isCovered: false, hasSecurity: true }, ownerId: { _id: "owner-cmrl", name: "CMRL Authority", rating: 4.5, phone: "+919999999991" }, description: "Convenient transit parking slot located directly at Chennai Central Railway Station. Safe, monitored, and open 24/7." },
        { _id: "tn002", title: "T. Nagar Pondy Bazaar Multi-Level Parking", address: "Pondy Bazaar, T. Nagar, Chennai - 600017", pricePerHour: 40, rating: 4.8, totalSlots: 120, availableSlots: 80, location: { coordinates: [80.2341, 13.0418] }, features: { hasEVCharger: true, hasCCTV: true, isCovered: true, hasSecurity: true }, ownerId: { _id: "owner-priya", name: "Priya Lakshmi", rating: 4.6, phone: "+919999999992" }, description: "Premium covered multi-level parking in the heart of T. Nagar shopping district. EV charging available." },
        { _id: "tn003", title: "Anna Nagar East Covered Parking", address: "Anna Nagar East, Chennai - 600102", pricePerHour: 35, rating: 4.7, totalSlots: 30, availableSlots: 18, location: { coordinates: [80.2101, 13.0858] }, features: { hasEVCharger: false, hasCCTV: true, isCovered: true, hasSecurity: true }, ownerId: { _id: "owner-suresh", name: "Suresh Narayanan", rating: 4.9, phone: "+919888888888" }, description: "Secure, covered residential style parking lot located in Anna Nagar East. Monitored with CCTV." },
        { _id: "tn004", title: "Express Avenue Mall Basement Parking", address: "Royapettah, Chennai - 600002", pricePerHour: 50, rating: 4.9, totalSlots: 200, availableSlots: 120, location: { coordinates: [80.2619, 13.0569] }, features: { hasEVCharger: true, hasCCTV: true, isCovered: true, hasSecurity: true }, ownerId: { _id: "owner-express", name: "Phoenix Group", rating: 4.8, phone: "+919999999994" }, description: "Basement mall parking slot in Express Avenue. Fully monitored, secure and clean." }
      ];

      const spaceIdStr = Array.isArray(id) ? id[0] : id;
      const foundMock = mockList.find(item => item._id === spaceIdStr);

      if (foundMock) {
        setSpace({
          ...foundMock,
          images: [
            "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800",
            "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800",
            "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800",
          ]
        });
      } else {
        // Fallback detail seed
        setSpace({
          _id: spaceIdStr || "65f80b12a3d0ef0000000001",
          title: "Premium Covered Slot Near Metro",
          description: "Secure private parking slot located in a safe residential community just 2 minutes walking distance from the metro station. Equipped with 24x7 CCTV cameras, physical guard surveillance, and a dedicated EV charging station. Ideal for daily commuters, long term stays, or weekend travelers.",
          address: "Sector 21 Metro Station, Gurugram, Haryana - 122002",
          pricePerHour: 40,
          totalSlots: 5,
          availableSlots: 3,
          rating: 4.8,
          images: [
            "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800",
            "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800",
            "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800",
          ],
          features: { hasEVCharger: true, hasCCTV: true, isCovered: true, hasSecurity: true },
          ownerId: {
            _id: "owner-1234",
            name: "Rajesh Kumar",
            rating: 4.7,
            phone: "+919876543210",
          },
        });
      }

      setReviews([
        {
          _id: "rev-1",
          driverId: { name: "Aman Verma" },
          rating: 5,
          comment: "Super convenient slot, host was very cooperative and guided me all the way to the grid parking marker. Highly recommended!",
          createdAt: "2026-06-20T10:00:00Z",
        },
        {
          _id: "rev-2",
          driverId: { name: "Nisha Singhal" },
          rating: 4,
          comment: "Clean parking spot, very secure. A bit tight for SUVs but worked out nicely.",
          createdAt: "2026-06-18T14:30:00Z",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingRedirect = () => {
    if (!startDate || !startTime) {
      toast.error("Please select a date and start time for your reservation");
      return;
    }
    
    // Store reservation details in query params
    const query = new URLSearchParams({
      start: `${startDate}T${startTime}`,
      hours: hours.toString(),
      price: (space?.pricePerHour || 40).toString(),
    });
    
    toast.success("Booking initiated! Let's select your vehicle...");
    router.push(`/booking/${id}/new?${query.toString()}`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="h-8 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="text-center py-24 text-white">
        <h2 className="text-2xl font-bold">Listing details not found</h2>
        <button onClick={() => router.push("/search")} className="btn-primary mt-4">
          Back to Search
        </button>
      </div>
    );
  }

  const calculatedTotal = space.pricePerHour * hours;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-800 dark:text-white flex-1 flex flex-col">
      {/* breadcrumbs */}
      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-4 font-semibold uppercase tracking-wider">
        <span className="cursor-pointer hover:text-primary" onClick={() => router.push("/")}>Home</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="cursor-pointer hover:text-primary" onClick={() => router.push("/search")}>Search</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-400 font-bold truncate">{space.title}</span>
      </div>

      {/* Main Image Grid / Carousel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 relative h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg group">
          <img
            src={space.images[activeImageIndex] || "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800"}
            alt={space.title}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-4 right-4 px-3 py-1 bg-slate-900/80 backdrop-blur-sm rounded-lg text-xs font-bold text-white flex items-center gap-1.5 shadow">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            {(space.rating ?? space.averageRating ?? 5.0).toFixed(1)} ({reviews.length} reviews)
          </span>
        </div>

        {/* Small thumbnail listing */}
        <div className="flex lg:flex-col gap-3 h-28 lg:h-96 overflow-x-auto lg:overflow-y-auto custom-scrollbar">
          {space.images.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setActiveImageIndex(idx)}
              className={`w-28 lg:w-full h-24 lg:h-28 rounded-xl overflow-hidden cursor-pointer border-2 transition-all flex-shrink-0 ${
                activeImageIndex === idx ? "border-primary scale-[0.98]" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={img} alt={`thumbnail-${idx}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Detail breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left side details */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex justify-between items-start gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{space.title}</h1>
              <button
                onClick={toggleSave}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131B2E] shadow-sm text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition flex-shrink-0"
                title={isSaved ? "Remove from saved spots" : "Save to favorites"}
              >
                <Heart className={`w-5 h-5 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
              </button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 flex items-center gap-1.5 font-semibold">
              <MapPin className="w-4.5 h-4.5 text-primary flex-shrink-0" />
              {space.address}
            </p>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Host info */}
          <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                <User className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Parking Host</span>
                <span className="font-bold text-sm text-slate-800 dark:text-white">{space.ownerId?.name || "System Host"}</span>
              </div>
            </div>
            {space.ownerId?.rating !== undefined && (
              <span className="px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-500 text-xs font-bold flex items-center gap-1">
                {space.ownerId.rating.toFixed(1)} ★ Host
              </span>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="font-bold text-lg">About This Space</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {space.description || "No description provided for this listing."}
            </p>
          </div>

          {/* Amenities checklist */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg">Spot Amenities & Features</h3>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${space.features?.isCovered ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}>
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold">Covered (Garage/Basement)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${space.features?.hasEVCharger ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}>
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold">EV Charger Enabled</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${space.features?.hasCCTV ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}>
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold">CCTV Surveillance</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${space.features?.hasSecurity ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}>
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold">24x7 Security Guard</span>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Reviews list */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Reviews ({reviews.length})</h3>
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium">No reviews written for this listing yet.</p>
            ) : (
              <div className="space-y-3.5">
                {reviews.map((rev) => (
                  <div key={rev._id} className="p-4 bg-slate-100 dark:bg-slate-800/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs">{rev.driverId?.name || "Verified Driver"}</span>
                      <span className="flex items-center gap-0.5 text-xs text-yellow-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                        {rev.rating}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side billing calculator card */}
        <div>
          <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl sticky top-24 space-y-5">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Price Per Hour</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-800 dark:text-white">₹{space.pricePerHour}</span>
                <span className="text-xs font-semibold text-slate-400">/ hour</span>
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            <div className="space-y-3">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Select Booking Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 text-slate-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker();
                      } catch (err) {}
                    }}
                    style={{ colorScheme: 'dark' }}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-primary text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Arrival Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-3 text-slate-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker();
                      } catch (err) {}
                    }}
                    style={{ colorScheme: 'dark' }}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-primary text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Duration: {hours} {hours === 1 ? "hour" : "hours"}
                </label>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
                  <span>1 hr</span>
                  <span>12 hrs</span>
                  <span>24 hrs</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#131B2E]/50 rounded-xl p-3.5 border border-slate-200/50 dark:border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>₹{space.pricePerHour} × {hours} hours</span>
                <span>₹{calculatedTotal}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Platform commission fee</span>
                <span>₹10</span>
              </div>
              <hr className="border-slate-200 dark:border-slate-800" />
              <div className="flex justify-between text-sm font-bold">
                <span>Estimated Total</span>
                <span className="text-primary">₹{calculatedTotal + 10}</span>
              </div>
            </div>

            <button
              onClick={handleBookingRedirect}
              className="w-full btn-primary py-3 flex items-center justify-center gap-1.5"
            >
              Continue to Book
            </button>
            
            <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed">
              No immediate charges. Payout holds occur on checkout validation screen.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

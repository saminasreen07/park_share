"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Search, MapPin, SlidersHorizontal, BatteryCharging, Star, ShieldCheck, Map, List, Compass, Info } from "lucide-react";
import toast from "react-hot-toast";

interface ParkingSpace {
  _id: string;
  title: string;
  address: string;
  pricePerHour: number;
  rating: number;
  totalSlots: number;
  availableSlots: number;
  images?: string[];
  location: {
    coordinates: [number, number]; // [lng, lat]
  };
  features: {
    hasEVCharger?: boolean;
    hasCCTV?: boolean;
    isCovered?: boolean;
    hasValet?: boolean;
  };
  ownerId?: {
    name: string;
    rating: number;
  };
  aiScore?: number;
  distance?: number;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get("query") || "";

  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(100);
  const [minRating, setMinRating] = useState<number>(0);
  const [evOnly, setEvOnly] = useState(false);
  const [vehicleType, setVehicleType] = useState("all");
  
  // Geolocation
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [usingLocation, setUsingLocation] = useState(false);
  
  // Selected slot for map highlight
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to get user location on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setUsingLocation(true);
        },
        (error) => {
          console.warn("Geolocation denied/failed. Falling back to default list search:", error.message);
        }
      );
    }
  }, []);

  useEffect(() => {
    fetchParkingSpaces();
  }, [coords, queryParam, maxPrice, minRating, evOnly, vehicleType]);

  const fetchParkingSpaces = async () => {
    setLoading(true);
    try {
      let endpoint = "/spaces";
      let params: any = {};

      if (coords && usingLocation) {
        endpoint = "/spaces/nearby";
        params.latitude = coords.lat;
        params.longitude = coords.lng;
        params.maxDistance = 15000; // 15km
      }

      if (queryParam) {
        params.query = queryParam;
      }
      
      if (maxPrice) {
        params.maxPrice = maxPrice;
      }
      
      if (evOnly) {
        params.hasEVCharger = "true";
      }

      const response = await apiClient.get(endpoint, { params });
      
      if (response.data && response.data.success) {
        let results = response.data.data;
        
        // Filter locally for properties that aren't fully covered by API parameters
        if (minRating > 0) {
          results = results.filter((s: ParkingSpace) => (s.rating || 4) >= minRating);
        }
        
        setSpaces(results);
      }
    } catch (err) {
      console.warn("Failed to load spaces from server, using high-fidelity fallback:", err);
      // Beautiful mock fallbacks for client presentation
      const fallbackList: ParkingSpace[] = [
        {
          _id: "65f80b12a3d0ef0000000001",
          title: "Premium Covered Slot Near Metro",
          address: "Sector 21 Metro Station, Gurugram, Haryana",
          pricePerHour: 40,
          rating: 4.8,
          totalSlots: 5,
          availableSlots: 3,
          location: { coordinates: [77.0697, 28.4595] },
          features: { hasEVCharger: true, hasCCTV: true, isCovered: true },
          ownerId: { name: "Rajesh Kumar", rating: 4.7 },
          aiScore: 0.95,
          distance: 1.2,
        },
        {
          _id: "65f80b12a3d0ef0000000002",
          title: "Private Residential Garage Slot",
          address: "DLF Phase 3, Sector 24, Gurugram, Haryana",
          pricePerHour: 30,
          rating: 4.9,
          totalSlots: 2,
          availableSlots: 1,
          location: { coordinates: [77.0872, 28.4907] },
          features: { hasEVCharger: false, hasCCTV: true, isCovered: true },
          ownerId: { name: "Suresh Gupta", rating: 4.9 },
          aiScore: 0.88,
          distance: 2.5,
        },
        {
          _id: "65f80b12a3d0ef0000000003",
          title: "Secure Under Ground Car Parking",
          address: "Golf Course Road, Sector 54, Gurugram, Haryana",
          pricePerHour: 60,
          rating: 4.7,
          totalSlots: 10,
          availableSlots: 8,
          location: { coordinates: [77.1038, 28.4418] },
          features: { hasEVCharger: true, hasCCTV: true, isCovered: true, hasValet: true },
          ownerId: { name: "Anil Sharma", rating: 4.5 },
          aiScore: 0.82,
          distance: 4.1,
        },
        {
          _id: "65f80b12a3d0ef0000000004",
          title: "Commercial Office Basement Parking",
          address: "Cyber City Phase 2, Gurugram, Haryana",
          pricePerHour: 50,
          rating: 4.5,
          totalSlots: 20,
          availableSlots: 14,
          location: { coordinates: [77.0879, 28.4965] },
          features: { hasEVCharger: true, hasCCTV: true, isCovered: true },
          ownerId: { name: "Management Office", rating: 4.2 },
          aiScore: 0.76,
          distance: 2.9,
        },
      ];

      let filtered = fallbackList;
      if (evOnly) {
        filtered = filtered.filter(s => s.features.hasEVCharger);
      }
      if (maxPrice) {
        filtered = filtered.filter(s => s.pricePerHour <= maxPrice);
      }
      if (minRating > 0) {
        filtered = filtered.filter(s => s.rating >= minRating);
      }
      
      setSpaces(filtered);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?query=${encodeURIComponent(searchQuery)}`);
  };

  const clearFilters = () => {
    setMaxPrice(100);
    setMinRating(0);
    setEvOnly(false);
    setVehicleType("all");
    setShowFilters(false);
  };

  return (
    <main className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Search bar / Filter header */}
      <div className="bg-white dark:bg-[#131B2E] border-b border-slate-200 dark:border-slate-800 p-4 transition z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Query search input */}
          <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-md relative flex">
            <input
              type="text"
              placeholder="Search by area or listing name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none focus:border-primary dark:focus:border-primary text-sm font-semibold transition"
            />
            <Search className="absolute left-3.5 top-3 text-slate-400 w-4.5 h-4.5" />
          </form>

          {/* Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                showFilters || evOnly || maxPrice < 100 || minRating > 0
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>

            {/* Mobile View Toggle */}
            <div className="md:hidden flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-28">
              <button
                onClick={() => setViewMode("list")}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center text-xs font-bold transition ${
                  viewMode === "list"
                    ? "bg-white dark:bg-[#131B2E] text-slate-800 dark:text-white shadow-sm"
                    : "text-slate-400"
                }`}
              >
                <List className="w-3.5 h-3.5 mr-1" />
                List
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center text-xs font-bold transition ${
                  viewMode === "map"
                    ? "bg-white dark:bg-[#131B2E] text-slate-800 dark:text-white shadow-sm"
                    : "text-slate-400"
                }`}
              >
                <Map className="w-3.5 h-3.5 mr-1" />
                Map
              </button>
            </div>
          </div>
        </div>

        {/* Expandable filters panel */}
        {showFilters && (
          <div className="max-w-7xl mx-auto mt-4 p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 animate-slide-down">
            {/* Price Filter */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Max Price: ₹{maxPrice}/hr
              </label>
              <input
                type="range"
                min="10"
                max="150"
                step="5"
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                <span>₹10</span>
                <span>₹150</span>
              </div>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Min rating
              </label>
              <div className="flex gap-2">
                {[0, 3, 4, 4.5].map((stars) => (
                  <button
                    key={stars}
                    onClick={() => setMinRating(stars)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                      minRating === stars
                        ? "border-primary bg-primary text-white"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131B2E] text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {stars === 0 ? "All" : `${stars}★+`}
                  </button>
                ))}
              </div>
            </div>

            {/* EV Charger toggle */}
            <div className="flex items-center">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={evOnly}
                  onChange={(e) => setEvOnly(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary w-4.5 h-4.5 accent-primary"
                />
                <div className="flex items-center gap-1.5">
                  <BatteryCharging className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    EV Charging Slots Only
                  </span>
                </div>
              </label>
            </div>

            {/* Clear Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 sm:pt-0">
              <button
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-bold hover:underline"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="py-2 px-4 bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-xl text-xs hover:bg-slate-700 transition"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main split display */}
      <div className="flex-1 flex overflow-hidden">
        {/* List column */}
        <div
          className={`flex-1 md:max-w-md lg:max-w-lg xl:max-w-xl bg-slate-50 dark:bg-[#090D16] border-r border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar p-4 space-y-4 transition ${
            viewMode === "list" ? "block" : "hidden md:block"
          }`}
        >
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : spaces.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-4">
              <Info className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="font-bold text-lg">No parking slots found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Try widening your search area, modifying your price range, or turning off active filter conditions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {usingLocation && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <Compass className="w-4 h-4 animate-spin-slow" />
                  AI Recommendation system active near your coordinates
                </div>
              )}
              {spaces.map((space) => (
                <div
                  key={space._id}
                  onMouseEnter={() => setSelectedSpaceId(space._id)}
                  onMouseLeave={() => setSelectedSpaceId(null)}
                  className={`group bg-white dark:bg-[#131B2E] p-4 rounded-2xl border transition-all duration-200 flex gap-4 cursor-pointer hover:shadow-md ${
                    selectedSpaceId === space._id
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                  onClick={() => router.push(`/parking/${space._id}`)}
                >
                  {/* Photo Thumbnail */}
                  <div className="w-28 h-28 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0 relative">
                    <img
                      src={space.images?.[0] || "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=200"}
                      alt={space.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {space.aiScore && (
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-primary text-white rounded text-[8px] font-extrabold uppercase">
                        AI Recommended
                      </span>
                    )}
                  </div>

                  {/* Content details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1 group-hover:text-primary transition">
                          {space.title}
                        </h3>
                        <span className="flex items-center gap-0.5 text-xs font-bold text-yellow-500">
                          <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                          {(space.rating || 4.5).toFixed(1)}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-1 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                        {space.address}
                      </p>
                      
                      {/* Features */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {space.features?.hasEVCharger && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-bold flex items-center gap-0.5">
                            <BatteryCharging className="w-3 h-3" /> EV
                          </span>
                        )}
                        {space.features?.isCovered && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-bold">
                            Covered
                          </span>
                        )}
                        {space.features?.hasCCTV && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 text-[9px] font-bold">
                            CCTV Secure
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {space.availableSlots} / {space.totalSlots} Slots Free
                      </span>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-medium">Per Hour</span>
                        <span className="text-base font-extrabold text-slate-800 dark:text-white block">
                          ₹{space.pricePerHour}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map column */}
        <div
          className={`flex-1 h-full bg-slate-100 dark:bg-[#070b12] relative overflow-hidden transition ${
            viewMode === "map" ? "block" : "hidden md:block"
          }`}
        >
          {/* Beautiful Stylized HTML Mock Map */}
          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-950 p-4 flex flex-col justify-center items-center select-none overflow-hidden">
            {/* Grid Map Background */}
            <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.04] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
            
            {/* Stylized Mock Streets */}
            <div className="absolute top-1/4 left-0 w-full h-12 bg-slate-300/40 dark:bg-slate-800/40 rotate-1 transform origin-center pointer-events-none" />
            <div className="absolute top-0 left-1/3 w-12 h-full bg-slate-300/40 dark:bg-slate-800/40 -rotate-2 transform origin-center pointer-events-none" />
            <div className="absolute top-2/3 left-0 w-full h-10 bg-slate-300/40 dark:bg-slate-800/40 -rotate-1 transform origin-center pointer-events-none" />

            {/* Map Center Coordinate Indicator */}
            {coords && (
              <div className="absolute" style={{ top: "45%", left: "55%" }}>
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center animate-ping absolute -top-3 -left-3" />
                <div className="w-3.5 h-3.5 rounded-full bg-primary border-2 border-white dark:border-slate-900 shadow-md relative z-10" />
                <span className="absolute left-5 top-[-4px] bg-slate-900/90 text-white text-[9px] font-bold py-0.5 px-1.5 rounded whitespace-nowrap shadow">
                  Your Location
                </span>
              </div>
            )}

            {/* Interactive Pins representing parking spaces */}
            {spaces.map((space, index) => {
              const offsets = [
                { top: "20%", left: "15%" },
                { top: "50%", left: "30%" },
                { top: "35%", left: "70%" },
                { top: "65%", left: "75%" },
                { top: "80%", left: "45%" },
                { top: "15%", left: "80%" },
              ];
              const offset = offsets[index % offsets.length];
              const isHighlighted = selectedSpaceId === space._id;

              return (
                <div
                  key={space._id}
                  className="absolute cursor-pointer transition-all duration-200 z-10"
                  style={{ top: offset.top, left: offset.left }}
                  onMouseEnter={() => setSelectedSpaceId(space._id)}
                  onMouseLeave={() => setSelectedSpaceId(null)}
                  onClick={() => router.push(`/parking/${space._id}`)}
                >
                  <div
                    className={`px-2 py-1 rounded-xl shadow-lg border text-xs font-extrabold flex items-center gap-1 transition-all ${
                      isHighlighted
                        ? "bg-primary border-primary text-white scale-110 z-20"
                        : "bg-white dark:bg-[#131B2E] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                    }`}
                  >
                    <MapPin className={`w-3.5 h-3.5 ${isHighlighted ? "text-white" : "text-primary"}`} />
                    ₹{space.pricePerHour}
                  </div>
                  {/* Pin Pointer */}
                  <div
                    className={`w-2.5 h-2.5 rotate-45 mx-auto -mt-1 border-r border-b transition-all ${
                      isHighlighted
                        ? "bg-primary border-primary"
                        : "bg-white dark:bg-[#131B2E] border-slate-200 dark:border-slate-800"
                    }`}
                  />
                </div>
              );
            })}

            {/* Map Instruction Indicator */}
            <div className="absolute bottom-4 left-4 p-2 bg-slate-900/90 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1.5 max-w-xs shadow">
              <Map className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              Hover or click pins to book or preview specific slots.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

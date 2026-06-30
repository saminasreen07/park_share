"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Search, MapPin, SlidersHorizontal, BatteryCharging, Star, ShieldCheck, Map, List, Compass, Info, Heart } from "lucide-react";
import toast from "react-hot-toast";

interface ParkingSpace {
  _id: string;
  title: string;
  address: string;
  pricePerHour: number;
  rating: number;
  averageRating?: number;
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
  const [selectedState, setSelectedState] = useState("Tamil Nadu");
  
  // Geolocation
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [usingLocation, setUsingLocation] = useState(false);
  
  // Selected slot for map highlight
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  // Favorites state
  const [favoritedSpaceIds, setFavoritedSpaceIds] = useState<Set<string>>(new Set());

  // Fetch favorited space IDs when component mounts
  useEffect(() => {
    const fetchFavoriteIds = async () => {
      const savedIds = new Set<string>();
      if (typeof window !== "undefined") {
        try {
          const localFavs = JSON.parse(localStorage.getItem("parkshare_local_favorites") || "[]");
          localFavs.forEach((fav: any) => savedIds.add(fav._id));
        } catch (e) {}
      }

      try {
        const response = await apiClient.get("/favorites");
        if (response.data && response.data.success) {
          response.data.data.forEach((fav: any) => savedIds.add(fav._id));
        }
      } catch (err) {
        console.warn("Failed to load user favorites list:", err);
      }
      setFavoritedSpaceIds(savedIds);
    };
    fetchFavoriteIds();
  }, []);

  const toggleFavorite = async (spaceId: string) => {
    const isFav = favoritedSpaceIds.has(spaceId);
    
    // Sync with localStorage so it works locally and persists on the dashboard
    if (typeof window !== "undefined") {
      try {
        const localFavs = JSON.parse(localStorage.getItem("parkshare_local_favorites") || "[]");
        if (isFav) {
          const nextFavs = localFavs.filter((f: any) => f._id !== spaceId);
          localStorage.setItem("parkshare_local_favorites", JSON.stringify(nextFavs));
        } else {
          // Find the parking space details
          const spaceDetails = spaces.find((s) => s._id === spaceId);
          if (spaceDetails && !localFavs.some((f: any) => f._id === spaceId)) {
            localFavs.push({
              _id: spaceDetails._id,
              title: spaceDetails.title,
              address: spaceDetails.address,
              pricePerHour: spaceDetails.pricePerHour,
              rating: spaceDetails.rating || 4.7,
              images: spaceDetails.images || ["https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400"]
            });
            localStorage.setItem("parkshare_local_favorites", JSON.stringify(localFavs));
          }
        }
      } catch (e) {
        console.error("Local favorites storage error:", e);
      }
    }

    try {
      if (isFav) {
        const response = await apiClient.delete(`/favorites?spaceId=${spaceId}`);
        if (response.data && response.data.success) {
          const nextSet = new Set(favoritedSpaceIds);
          nextSet.delete(spaceId);
          setFavoritedSpaceIds(nextSet);
          toast.success("Removed from saved spots");
        }
      } else {
        const response = await apiClient.post("/favorites", { spaceId });
        if (response.data && response.data.success) {
          const nextSet = new Set(favoritedSpaceIds);
          nextSet.add(spaceId);
          setFavoritedSpaceIds(nextSet);
          toast.success("Saved to your favorites!");
        }
      }
    } catch (err) {
      console.warn("Favorite API failed, toggling locally:", err);
      const nextSet = new Set(favoritedSpaceIds);
      if (isFav) {
        nextSet.delete(spaceId);
        toast.success("Removed from saved spots");
      } else {
        nextSet.add(spaceId);
        toast.success("Saved to your favorites!");
      }
      setFavoritedSpaceIds(nextSet);
    }
  };

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
        
        // Auto-seed if DB is empty
        if (results.length === 0 && !queryParam) {
          try {
            await apiClient.post("/spaces/seed", {}, {
              headers: { "x-admin-secret": "parkshare-seed-2026" }
            });
            // Re-fetch after seeding
            const reResponse = await apiClient.get("/spaces", { params });
            if (reResponse.data && reResponse.data.success) {
              results = reResponse.data.data;
            }
          } catch (seedErr) {
            console.warn("Auto-seed failed:", seedErr);
          }
        }
        
        // Filter locally for properties that aren't fully covered by API parameters
        if (minRating > 0) {
          results = results.filter((s: ParkingSpace) => (s.rating || s.averageRating || 4) >= minRating);
        }
        
        if (results.length > 0) {
          setSpaces(results);
          return;
        }
      }
      // Fall through to fallback if 0 results
      throw new Error("No results from API");
    } catch (err) {
      console.warn("Failed to load spaces from server, using Tamil Nadu fallback list:", err);
      // Comprehensive Tamil Nadu fallback list
      const fallbackList: ParkingSpace[] = [
        { _id: "tn001", title: "Chennai Central Railway Station Parking", address: "Park Town, Chennai - 600003", pricePerHour: 30, rating: 4.5, totalSlots: 50, availableSlots: 30, location: { coordinates: [80.2707, 13.0827] }, features: { hasEVCharger: false, hasCCTV: true, isCovered: false }, ownerId: { name: "CMRL Authority", rating: 4.5 } },
        { _id: "tn002", title: "T. Nagar Pondy Bazaar Multi-Level Parking", address: "Pondy Bazaar, T. Nagar, Chennai - 600017", pricePerHour: 40, rating: 4.8, totalSlots: 120, availableSlots: 80, location: { coordinates: [80.2341, 13.0418] }, features: { hasEVCharger: true, hasCCTV: true, isCovered: true }, ownerId: { name: "Priya Lakshmi", rating: 4.6 } },
        { _id: "tn003", title: "Anna Nagar East Covered Parking", address: "Anna Nagar East, Chennai - 600102", pricePerHour: 35, rating: 4.7, totalSlots: 30, availableSlots: 18, location: { coordinates: [80.2101, 13.0858] }, features: { hasEVCharger: false, hasCCTV: true, isCovered: true }, ownerId: { name: "Suresh Narayanan", rating: 4.9 } },
        { _id: "tn004", title: "Express Avenue Mall Basement Parking", address: "Royapettah, Chennai - 600002", pricePerHour: 50, rating: 4.9, totalSlots: 200, availableSlots: 120, location: { coordinates: [80.2619, 13.0569] }, features: { hasEVCharger: true, hasCCTV: true, isCovered: true }, ownerId: { name: "Phoenix Group", rating: 4.8 } },
        { _id: "tn005", title: "Phoenix MarketCity Covered Parking", address: "Velachery, Chennai - 600042", pricePerHour: 45, rating: 4.8, totalSlots: 300, availableSlots: 180, location: { coordinates: [80.2209, 12.9794] }, features: { hasEVCharger: true, hasCCTV: true, isCovered: true }, ownerId: { name: "Phoenix Mall", rating: 4.8 } },
        { _id: "tn006", title: "Mylapore Kapaleeshwarar Temple Parking", address: "Mylapore, Chennai - 600004", pricePerHour: 20, rating: 4.2, totalSlots: 40, availableSlots: 25, location: { coordinates: [80.2693, 13.0336] }, features: { hasEVCharger: false, hasCCTV: false, isCovered: false }, ownerId: { name: "Temple Trust", rating: 4.0 } },
        { _id: "tn007", title: "Adyar Bus Terminus Parking", address: "Adyar, Chennai - 600020", pricePerHour: 25, rating: 4.3, totalSlots: 60, availableSlots: 40, location: { coordinates: [80.2565, 13.0012] }, features: { hasEVCharger: false, hasCCTV: true, isCovered: false }, ownerId: { name: "TNSTC", rating: 4.2 } },
        { _id: "tn008", title: "Nungambakkam Premium Covered Lot", address: "Nungambakkam, Chennai - 600034", pricePerHour: 45, rating: 4.9, totalSlots: 25, availableSlots: 10, location: { coordinates: [80.2409, 13.0605] }, features: { hasEVCharger: true, hasCCTV: true, isCovered: true }, ownerId: { name: "Raj Enterprises", rating: 5.0 } },
        { _id: "tn009", title: "Velachery IT Corridor Covered Parking", address: "Velachery, Chennai - 600042", pricePerHour: 40, rating: 4.6, totalSlots: 45, availableSlots: 28, location: { coordinates: [80.2180, 12.9830] }, features: { hasEVCharger: true, hasCCTV: true, isCovered: true }, ownerId: { name: "Arun Parking", rating: 4.6 } },
        { _id: "tn010", title: "OMR Sholinganallur IT Park Parking", address: "Sholinganallur, Chennai - 600119", pricePerHour: 35, rating: 4.5, totalSlots: 100, availableSlots: 60, location: { coordinates: [80.2276, 12.9000] }, features: { hasEVCharger: true, hasCCTV: true, isCovered: false }, ownerId: { name: "IT Park Authority", rating: 4.4 } },
        { _id: "tn011", title: "Marina Beach Promenade Parking", address: "Marina Beach, Chennai - 600001", pricePerHour: 15, rating: 4.0, totalSlots: 80, availableSlots: 50, location: { coordinates: [80.2824, 13.0490] }, features: { hasEVCharger: false, hasCCTV: false, isCovered: false }, ownerId: { name: "GCC", rating: 4.0 } },
        { _id: "tn012", title: "Tidel Park Taramani Basement", address: "Taramani, Chennai - 600113", pricePerHour: 30, rating: 4.7, totalSlots: 80, availableSlots: 50, location: { coordinates: [80.2392, 12.9856] }, features: { hasEVCharger: true, hasCCTV: true, isCovered: true }, ownerId: { name: "ELCOT", rating: 4.7 } },
        { _id: "tn013", title: "Coimbatore RS Puram Covered Parking", address: "R.S. Puram, Coimbatore - 641002", pricePerHour: 25, rating: 4.6, totalSlots: 40, availableSlots: 22, location: { coordinates: [76.9613, 11.0022] }, features: { hasEVCharger: false, hasCCTV: true, isCovered: true }, ownerId: { name: "Anitha Selvaraj", rating: 4.5 } },
        { _id: "tn014", title: "Coimbatore Brookefields Mall Parking", address: "Krishnaswamy Road, Coimbatore - 641001", pricePerHour: 35, rating: 4.8, totalSlots: 120, availableSlots: 75, location: { coordinates: [76.9629, 11.0081] }, features: { hasEVCharger: true, hasCCTV: true, isCovered: true }, ownerId: { name: "Brookefields Mall", rating: 4.7 } },
        { _id: "tn015", title: "Madurai Meenakshi Temple Car Park", address: "Madurai City, Madurai - 625001", pricePerHour: 15, rating: 4.2, totalSlots: 70, availableSlots: 45, location: { coordinates: [78.1193, 9.9195] }, features: { hasEVCharger: false, hasCCTV: false, isCovered: false }, ownerId: { name: "Murugan Pillai", rating: 4.2 } },
        { _id: "tn016", title: "Trichy Rock Fort Temple Parking", address: "Rock Fort Area, Trichy - 620002", pricePerHour: 15, rating: 4.0, totalSlots: 50, availableSlots: 30, location: { coordinates: [78.6979, 10.8200] }, features: { hasEVCharger: false, hasCCTV: false, isCovered: false }, ownerId: { name: "Senthil Kumar", rating: 4.8 } },
        { _id: "tn017", title: "Salem Junction Railway Station Parking", address: "Salem Junction, Salem - 636001", pricePerHour: 20, rating: 4.1, totalSlots: 60, availableSlots: 40, location: { coordinates: [78.1460, 11.6643] }, features: { hasEVCharger: false, hasCCTV: true, isCovered: false }, ownerId: { name: "Railway Authority", rating: 4.0 } },
        { _id: "tn018", title: "Vellore CMC Hospital Parking", address: "Arni Road, Vellore - 632004", pricePerHour: 20, rating: 4.3, totalSlots: 80, availableSlots: 55, location: { coordinates: [79.1325, 12.9249] }, features: { hasEVCharger: false, hasCCTV: true, isCovered: false }, ownerId: { name: "CMC Hospital", rating: 4.3 } },
        { _id: "tn019", title: "Ooty Lake Tourist Parking", address: "Ooty Lake Road, Udhagamandalam - 643001", pricePerHour: 25, rating: 4.4, totalSlots: 40, availableSlots: 25, location: { coordinates: [76.6950, 11.4102] }, features: { hasEVCharger: false, hasCCTV: false, isCovered: false }, ownerId: { name: "Tourism Board", rating: 4.3 } },
        { _id: "tn020", title: "Pondicherry MG Road Covered Parking", address: "MG Road, Puducherry - 605001", pricePerHour: 20, rating: 4.5, totalSlots: 35, availableSlots: 20, location: { coordinates: [79.8083, 11.9416] }, features: { hasEVCharger: false, hasCCTV: true, isCovered: false }, ownerId: { name: "Pondicherry Municipality", rating: 4.4 } },
        { _id: "tn021", title: "Pondicherry French Quarter Parking", address: "White Town, Puducherry - 605001", pricePerHour: 30, rating: 4.7, totalSlots: 15, availableSlots: 8, location: { coordinates: [79.8331, 11.9328] }, features: { hasEVCharger: false, hasCCTV: true, isCovered: false }, ownerId: { name: "Heritage Zone", rating: 4.6 } },
        { _id: "tn022", title: "Thanjavur Brihadeeswara Temple Parking", address: "Thanjavur Big Temple, Thanjavur - 613001", pricePerHour: 15, rating: 4.0, totalSlots: 80, availableSlots: 55, location: { coordinates: [79.1317, 10.7825] }, features: { hasEVCharger: false, hasCCTV: false, isCovered: false }, ownerId: { name: "Temple Trust", rating: 4.0 } },
        { _id: "tn023", title: "Kanchipuram Varadaraja Temple Parking", address: "Temple Street, Kanchipuram - 631501", pricePerHour: 15, rating: 4.2, totalSlots: 50, availableSlots: 35, location: { coordinates: [79.7036, 12.8452] }, features: { hasEVCharger: false, hasCCTV: false, isCovered: false }, ownerId: { name: "Temple Authority", rating: 4.1 } },
        { _id: "tn024", title: "Ramanathapuram Rameswaram Temple Parking", address: "Rameswaram Island - 623526", pricePerHour: 20, rating: 4.3, totalSlots: 100, availableSlots: 70, location: { coordinates: [79.3129, 9.2885] }, features: { hasEVCharger: false, hasCCTV: false, isCovered: false }, ownerId: { name: "Temple Board", rating: 4.2 } },
        { _id: "tn025", title: "Kanyakumari Vivekananda Rock Parking", address: "Kanyakumari - 629702", pricePerHour: 20, rating: 4.4, totalSlots: 60, availableSlots: 40, location: { coordinates: [77.5385, 8.0883] }, features: { hasEVCharger: false, hasCCTV: true, isCovered: false }, ownerId: { name: "Tourism Dept", rating: 4.3 } },
        { _id: "tn026", title: "Hosur Electronic City Annex Parking", address: "Hosur Main Road, Hosur - 635109", pricePerHour: 30, rating: 4.5, totalSlots: 80, availableSlots: 50, location: { coordinates: [77.8278, 12.7279] }, features: { hasEVCharger: true, hasCCTV: true, isCovered: false }, ownerId: { name: "SIPCOT", rating: 4.4 } },
        { _id: "tn027", title: "Tirunelveli Town Parking", address: "High Ground Road, Tirunelveli - 627001", pricePerHour: 15, rating: 4.0, totalSlots: 40, availableSlots: 28, location: { coordinates: [77.7567, 8.7139] }, features: { hasEVCharger: false, hasCCTV: false, isCovered: false }, ownerId: { name: "Municipal Corp", rating: 3.9 } },
        { _id: "tn028", title: "Erode Bus Station Parking", address: "Erode Bus Stand, Erode - 638001", pricePerHour: 15, rating: 4.0, totalSlots: 60, availableSlots: 40, location: { coordinates: [77.7172, 11.3410] }, features: { hasEVCharger: false, hasCCTV: false, isCovered: false }, ownerId: { name: "SETC", rating: 3.8 } },
        { _id: "tn029", title: "Kumbakonam Mahamaham Tank Parking", address: "Mahamaham Tank, Kumbakonam - 612001", pricePerHour: 15, rating: 4.1, totalSlots: 60, availableSlots: 42, location: { coordinates: [79.3845, 10.9601] }, features: { hasEVCharger: false, hasCCTV: false, isCovered: false }, ownerId: { name: "Temple Town", rating: 4.0 } },
        { _id: "tn030", title: "Egmore Museum Open Parking", address: "Egmore, Chennai - 600008", pricePerHour: 20, rating: 4.2, totalSlots: 35, availableSlots: 22, location: { coordinates: [80.2626, 13.0716] }, features: { hasEVCharger: false, hasCCTV: false, isCovered: false }, ownerId: { name: "Museums Dept", rating: 4.1 } },
      ];

      let filtered = fallbackList;
      if (evOnly) filtered = filtered.filter(s => s.features.hasEVCharger);
      if (maxPrice) filtered = filtered.filter(s => s.pricePerHour <= maxPrice);
      if (minRating > 0) filtered = filtered.filter(s => s.rating >= minRating);
      if (queryParam) {
        const q = queryParam.toLowerCase();
        filtered = filtered.filter(s =>
          s.title.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)
        );
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
    setSelectedState("Tamil Nadu");
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
            {/* State Filter */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                State / Region
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-semibold focus:border-primary"
              >
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="All India">All India</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Kerala">Kerala</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Telangana">Telangana</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi / NCR</option>
              </select>
            </div>

            {/* Price Filter */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Max Price: â‚¹{maxPrice}/hr
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
                <span>â‚¹10</span>
                <span>â‚¹150</span>
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
                    {stars === 0 ? "All" : `${stars}â˜…+`}
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

                    {/* Heart Button Overlay */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(space._id);
                      }}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-slate-900/60 backdrop-blur-sm text-white hover:bg-slate-900 transition-all z-10 shadow-sm"
                      title={favoritedSpaceIds.has(space._id) ? "Remove from Saved" : "Save to Favorites"}
                    >
                      <Heart className={`w-3.5 h-3.5 ${favoritedSpaceIds.has(space._id) ? "fill-red-500 text-red-500" : "text-white"}`} />
                    </button>

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
                          {(space.rating ?? space.averageRating ?? 4.5).toFixed(1)}
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
                          â‚¹{space.pricePerHour}
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
                    â‚¹{space.pricePerHour}
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

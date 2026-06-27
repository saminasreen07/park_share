"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { apiClient } from "@/lib/api-client";
import { Car, Search, ShieldCheck, MapPin, Compass, Landmark, Star, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

interface ParkingSpace {
  _id: string;
  title: string;
  address: string;
  pricePerHour: number;
  rating: number;
  images: string[];
}

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendedSpaces, setRecommendedSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch nearby/recommended spots from AI recommendations or public spaces
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        // Fallback to generic spaces if user not logged in or AI engine unavailable
        const endpoint = user ? "/spaces/nearby" : "/spaces";
        const response = await apiClient.get(endpoint);
        
        if (response.data && response.data.success) {
          // Display first 4 items as recommendations
          setRecommendedSpaces(response.data.data.slice(0, 4));
        }
      } catch (err) {
        console.warn("Failed to load recommendations, displaying simulated fallback:", err);
        // Simulated spaces for beautiful layout
        setRecommendedSpaces([
          {
            _id: "65f80b12a3d0ef0000000001",
            title: "Premium Covered Slot Near Metro",
            address: "Sector 21 Metro Station, Gurugram",
            pricePerHour: 40,
            rating: 4.8,
            images: ["https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400"],
          },
          {
            _id: "65f80b12a3d0ef0000000002",
            title: "Private Residential Garage Slot",
            address: "DLF Phase 3, Gurugram",
            pricePerHour: 30,
            rating: 4.9,
            images: ["https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400"],
          },
          {
            _id: "65f80b12a3d0ef0000000003",
            title: "Secure Under Ground Car Parking",
            address: "Golf Course Road, Gurugram",
            pricePerHour: 60,
            rating: 4.7,
            images: ["https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=400"],
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      router.push("/search");
    } else {
      router.push(`/search?query=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <main className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative py-24 bg-slate-900 overflow-hidden flex flex-col justify-center items-center px-4">
        {/* Background gradients */}
        <div className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full bg-secondary/10 blur-[130px] pointer-events-none" />

        <div className="max-w-4xl text-center space-y-6 z-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <Compass className="w-3.5 h-3.5" />
            AI-Driven Peer-to-Peer Parking Platform
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Find Parking in Seconds, <br />
            <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              Rent Your Slot
            </span>{" "}
            with Ease
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto font-medium">
            Connect with local hosts who have open driveways or garages. Save up to 50% compared to traditional commercial parking rates.
          </p>

          {/* Large Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 p-2 bg-slate-800/80 border border-slate-700/50 rounded-2xl shadow-xl mt-8"
          >
            <div className="flex-1 flex items-center gap-3 px-3 py-2.5">
              <MapPin className="text-primary w-6 h-6 flex-shrink-0" />
              <input
                type="text"
                placeholder="Where do you want to park? (e.g. Gurugram, DLF Phase 3)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none border-none text-white text-sm font-semibold placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              className="py-3 px-6 bg-primary hover:bg-[#E55A2B] text-white font-bold rounded-xl transition flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-primary/20"
            >
              <Search className="w-5 h-5" />
              Search Spot
            </button>
          </form>
        </div>
      </section>

      {/* Featured / Recommended Spaces */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
              {user ? "Recommended Spots for You" : "Explore Featured Parking"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Top-rated peer-to-peer parking reservations with real-time slot security.
            </p>
          </div>
          <Link
            href="/search"
            className="flex items-center gap-1.5 text-primary hover:text-[#E55A2B] text-sm font-bold transition group"
          >
            View All
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          /* Shimmer skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedSpaces.map((space) => (
              <Link
                key={space._id}
                href={`/parking/${space._id}`}
                className="group glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all duration-200 shadow-md flex flex-col justify-between"
              >
                {/* Space Cover image */}
                <div className="relative h-48 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <img
                    src={space.images[0] || "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400"}
                    alt={space.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 right-3 px-2 py-1 bg-slate-900/80 backdrop-blur-sm rounded-lg text-xs font-bold text-white flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    {space.rating.toFixed(1)}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white line-clamp-1 group-hover:text-primary transition">
                      {space.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {space.address}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Price Per Hour</span>
                      <span className="text-xl font-extrabold text-slate-800 dark:text-white">₹{space.pricePerHour}</span>
                    </div>
                    <span className="btn-primary py-2 px-4 text-xs font-bold">
                      Book Spot
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Trust & Safety Features */}
      <section className="bg-slate-100 dark:bg-slate-900/60 py-16 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
              Why ParkShare?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              We provide the tools and security you need for a frictionless parking experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-[#131B2E] p-6 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">Verified Listings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                All host spots and documents are manually vetted and verified by our system administrators before activation.
              </p>
            </div>
            <div className="bg-white dark:bg-[#131B2E] p-6 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-4">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">AI Recommendations</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Our machine learning models score and prioritize nearby spaces based on your vehicle size, distance, and booking history.
              </p>
            </div>
            <div className="bg-white dark:bg-[#131B2E] p-6 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 mb-4">
                <Landmark className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">Secure Web Payments</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                We tokenise payment methods and execute secure payouts via Razorpay. Support included for mock simulated checkouts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action for Hosts */}
      <section className="bg-gradient-to-tr from-secondary to-[#003D6D] py-16 text-white text-center px-4 relative overflow-hidden">
        <div className="absolute top-[-40%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
        <div className="max-w-3xl mx-auto space-y-6 z-10 relative">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Have an Empty Driveway or Garage?</h2>
          <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto">
            Monetise your vacant parking slots. List your driveway in minutes, choose your pricing, set availability calendars, and receive direct bank payouts.
          </p>
          <Link
            href={user?.role === "owner" ? "/owner/dashboard" : "/onboarding/owner"}
            className="btn-primary py-3.5 px-8 font-extrabold text-sm"
          >
            Become a Parking Host
          </Link>
        </div>
      </section>
    </main>
  );
}

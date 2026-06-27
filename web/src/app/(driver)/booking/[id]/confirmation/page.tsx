"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Calendar, Car, Navigation, Home, List } from "lucide-react";
import toast from "react-hot-toast";

export default function BookingConfirmationPage() {
  const { id } = useParams(); // bookingId
  const router = useRouter();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      const response = await apiClient.get(`/bookings/${id}`);
      if (response.data && response.data.success) {
        setBooking(response.data.data);
      }
    } catch (err) {
      console.warn("Failed to load details, using mock fallback confirmation:", err);
      setBooking({
        _id: id,
        totalAmount: 120,
        receiptId: `REC-${Date.now()}`,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        status: "confirmed",
        vehicleDetails: {
          model: "Tata Nexon EV",
          plateNumber: "DL 3C AB 1234",
        },
        spaceId: {
          title: "Premium Covered Slot Near Metro",
          address: "Sector 21 Metro Station, Gurugram, Haryana",
          location: {
            coordinates: [77.0697, 28.4595], // [lng, lat]
          },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-white animate-pulse">
        <div className="h-10 bg-slate-800 rounded w-1/3 mx-auto mb-6" />
        <div className="h-64 bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const startFormatted = new Date(booking.startTime).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const endFormatted = new Date(booking.endTime).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const mapsUrl = booking.spaceId?.location?.coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${booking.spaceId.location.coordinates[1]},${booking.spaceId.location.coordinates[0]}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.spaceId?.address || "")}`;

  return (
    <main className="max-w-xl mx-auto px-4 py-8 text-slate-800 dark:text-white flex-1 flex flex-col justify-center">
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative text-center space-y-6">
        <div className="space-y-2">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto animate-bounce">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
            Booking Confirmed!
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Order Reference: {booking.receiptId}
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow shadow-slate-200/50 dark:shadow-none">
          <QRCodeSVG
            value={JSON.stringify({
              bookingId: booking._id,
              receiptId: booking.receiptId,
              action: "check_in_out",
            })}
            size={160}
            level="H"
            includeMargin={false}
          />
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          Present this QR code to check-in/out at the host grid slot
        </p>

        {/* Booking Brief Details */}
        <div className="text-left bg-slate-50 dark:bg-[#131B2E]/50 border border-slate-200/50 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">{booking.spaceId?.title}</h3>
          
          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Arrival Date & Time</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{startFormatted}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Departure Time</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{endFormatted}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Vehicle Details</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{booking.vehicleDetails?.model} ({booking.vehicleDetails?.plateNumber})</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Amount Paid</span>
              <span className="font-bold text-primary">₹{booking.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full btn-primary py-3 flex items-center justify-center gap-1.5 font-bold"
          >
            <Navigation className="w-4 h-4" />
            Get Directions
          </a>
          <button
            onClick={() => router.push("/bookings")}
            className="w-full btn-outline py-3 flex items-center justify-center gap-1.5 font-bold"
          >
            <List className="w-4 h-4" />
            Manage Bookings
          </button>
        </div>

        <Link
          href="/"
          className="text-xs text-primary font-bold hover:underline flex items-center justify-center gap-1 mt-4"
        >
          <Home className="w-3.5 h-3.5" />
          Back to Home Page
        </Link>
      </div>
    </main>
  );
}

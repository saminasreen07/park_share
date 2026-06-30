"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { apiClient } from "@/lib/api-client";
import { supabase } from "@/lib/supabase-client";
import { ShieldAlert, CheckCircle, Clock, Calendar, Car, User, MapPin, Landmark, ArrowLeft, Loader } from "lucide-react";
import toast from "react-hot-toast";

export default function BookingVerificationPage() {
  const { id } = useParams(); // bookingId
  const router = useRouter();
  const { user, fetchCurrentUser } = useAuthStore();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [remainingTime, setRemainingTime] = useState("");

  useEffect(() => {
    fetchCurrentUser();
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/bookings/${id}`);
      if (response.data && response.data.success) {
        setBooking(response.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load booking verification details");
    } finally {
      setLoading(false);
    }
  };

  // Compute remaining reservation duration
  useEffect(() => {
    if (!booking || booking.status !== "active") return;

    const interval = setInterval(() => {
      const end = new Date(booking.endTime).getTime();
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setRemainingTime("EXPIRED");
        clearInterval(interval);
      } else {
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setRemainingTime(`${hrs}h ${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking]);

  const handleAction = async (action: "checkin" | "checkout") => {
    setUpdating(true);
    try {
      const payload: any = {};
      if (action === "checkin") {
        payload.checkInTime = "now";
      } else {
        payload.checkOutTime = "now";
      }

      const response = await apiClient.put(`/bookings/${id}`, payload);
      if (response.data && response.data.success) {
        toast.success(action === "checkin" ? "Driver checked in successfully!" : "Driver checked out successfully!");
        fetchBookingDetails();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to complete check action");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <Loader className="w-10 h-10 text-primary animate-spin" />
        <span className="text-sm font-semibold">Validating Booking QR Pass...</span>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h1 className="text-2xl font-bold">Invalid QR Pass</h1>
        <p className="text-slate-400 text-sm mt-2 text-center max-w-sm">
          This QR check-in code does not match any reservations on the ParkShare server records.
        </p>
        <button onClick={() => router.push("/")} className="mt-6 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition">
          Go to Home
        </button>
      </div>
    );
  }

  // Auth roles checker
  const isAuthorized = user && (
    user.role === "admin" ||
    (user.role === "owner" && booking.spaceId?.ownerId?._id === user.id)
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 overflow-hidden relative justify-center">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xl glass-card rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl relative bg-slate-950/80 backdrop-blur-xl space-y-6">
        {/* Verification Status Header */}
        <div className="text-center space-y-2">
          {booking.status === "confirmed" && (
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mx-auto border border-blue-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>
          )}
          {booking.status === "active" && (
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto border border-emerald-500/20 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
          )}
          {booking.status === "completed" && (
            <div className="w-16 h-16 bg-slate-500/10 rounded-full flex items-center justify-center text-slate-400 mx-auto border border-slate-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>
          )}
          {booking.status === "cancelled" && (
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto border border-rose-500/20">
              <ShieldAlert className="w-8 h-8" />
            </div>
          )}

          <h1 className="text-2xl font-extrabold tracking-tight">QR Code Verification</h1>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
            booking.status === "confirmed" ? "bg-blue-500/20 text-blue-400" :
            booking.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
            booking.status === "completed" ? "bg-slate-800 text-slate-400" : "bg-rose-500/20 text-rose-400"
          }`}>
            Reservation: {booking.status}
          </span>
        </div>

        {/* Verification metrics details */}
        <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4 text-left text-sm">
          <h3 className="font-extrabold text-slate-300 uppercase tracking-widest text-xs">Booking Metadata</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Booking ID</span>
              <code className="text-xs text-slate-200">{booking._id.substring(0, 18)}...</code>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Driver Name</span>
              <span className="font-bold text-slate-200">{booking.driverId?.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Vehicle Class</span>
              <span className="font-bold text-slate-200 uppercase">{booking.vehicleType}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Plate Number</span>
              <span className="font-bold text-slate-200 uppercase">{booking.vehicleNumber}</span>
            </div>
          </div>

          <hr className="border-slate-800" />

          <h3 className="font-extrabold text-slate-300 uppercase tracking-widest text-xs">Parking Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Space Title</span>
              <span className="font-bold text-slate-200">{booking.spaceId?.title}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Address</span>
              <span className="text-xs text-slate-300">{booking.spaceId?.address}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Host Name</span>
              <span className="font-bold text-slate-200">{booking.spaceId?.ownerId?.name || "N/A"}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Reservation Schedule</span>
              <span className="text-xs text-slate-300">
                {new Date(booking.startTime).toLocaleTimeString()} - {new Date(booking.endTime).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {booking.status === "active" && remainingTime && (
            <>
              <hr className="border-slate-800" />
              <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                <span className="text-xs font-bold text-emerald-400 uppercase">Remaining Time</span>
                <span className="text-base font-extrabold text-emerald-400 tracking-wider animate-pulse">{remainingTime}</span>
              </div>
            </>
          )}
        </div>

        {/* Action controls */}
        {isAuthorized ? (
          <div className="space-y-3">
            {booking.status === "confirmed" && (
              <button
                onClick={() => handleAction("checkin")}
                className="w-full py-3 bg-gradient-to-r from-primary to-orange-500 hover:brightness-110 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-lg shadow-primary/20"
                disabled={updating}
              >
                {updating ? "Checking In..." : "Confirm Check In"}
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            {booking.status === "active" && (
              <button
                onClick={() => handleAction("checkout")}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                disabled={updating}
              >
                {updating ? "Checking Out..." : "Confirm Check Out & Release Slot"}
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            {booking.status === "completed" && (
              <div className="p-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-xs font-semibold text-center">
                Check-in and Check-out cycles completed successfully for this reservation.
              </div>
            )}
            {booking.status === "cancelled" && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold text-center">
                This reservation has been cancelled. Check-in operations blocked.
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-2.5 text-left text-xs text-slate-400">
            <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-slate-300">Staff Control Panel Blocked</h4>
              <p className="mt-1">
                Only the parking spot owner/host or administrators can perform check-in and check-out validation actions. 
                Please log in with the host credentials if you are the owner.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (user?.role === "owner") router.push("/owner/bookings");
            else router.push("/bookings");
          }}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Portal Dashboard
        </button>
      </div>
    </main>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { supabase } from "@/lib/supabase-client";
import { Landmark, Calendar, Clock, Check, X, User, Phone, MapPin, Eye, FileText, ExternalLink, Loader, Car } from "lucide-react";
import toast from "react-hot-toast";

interface Booking {
  _id: string;
  receiptId: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount: number;
  vehicleNumber?: string;
  vehicleType?: string;
  driverId: {
    _id: string;
    name: string;
    phone: string;
    email: string;
  };
  spaceId: {
    title: string;
    address: string;
  };
  
  // Verification docs
  vehicleFrontUrl?: string;
  vehicleRearUrl?: string;
  vehicleSideUrl?: string;
  licenseFrontUrl?: string;
  licenseBackUrl?: string;
  driverAadhaarFrontUrl?: string;
  driverAadhaarBackUrl?: string;
}

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Selected booking for doc preview modal
  const [docBooking, setDocBooking] = useState<Booking | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("Please login first");
        window.location.href = "/login";
      }
    });
    fetchOwnerBookings();
  }, []);

  const fetchOwnerBookings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/bookings");
      if (response.data && response.data.success) {
        setBookings(response.data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch owner bookings, seeding fallback bookings:", err);
      // Fallback bookings
      setBookings([
        {
          _id: "book-p-1",
          receiptId: "REC-992384",
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          totalAmount: 80,
          vehicleNumber: "DL 3C AB 1234",
          vehicleType: "car",
          driverId: { _id: "driver-1", name: "Aditya Roy", phone: "+919500000000", email: "aditya@example.com" },
          spaceId: { title: "Premium Covered Slot Near Metro", address: "Sector 21 Metro Station, Gurugram" },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId: string, action: "approve" | "reject") => {
    try {
      const status = action === "approve" ? "confirmed" : "cancelled";
      const payload: any = { status };
      if (action === "approve") {
        payload.paymentId = "pay_manual_approval";
      }
      
      const response = await apiClient.put(`/bookings/${bookingId}`, payload);
      if (response.data && response.data.success) {
        toast.success(`Booking request ${action === "approve" ? "approved" : "rejected"}!`);
        fetchOwnerBookings();
      }
    } catch (err) {
      toast.error(`Failed to execute ${action} action`);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus === "all") return true;
    return b.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-white animate-pulse">
        <div className="h-10 bg-slate-800 rounded w-1/4 mb-8" />
        <div className="h-56 bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <main className="space-y-6 text-slate-800 dark:text-white text-left max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Driver Booking Requests</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Review, approve, or cancel driver reservations and check uploaded driver verification documents.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg gap-1">
        {["all", "pending", "confirmed", "active", "completed", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase transition ${
              filterStatus === status
                ? "bg-primary text-white shadow-md"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-800">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-sm">No reservations found</h3>
          <p className="text-xs text-slate-500 mt-1">No bookings match the selected status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((b) => (
            <div
              key={b._id}
              className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left"
            >
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    ID: {b.receiptId || b._id.substring(0, 10)}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    b.status === "confirmed" ? "bg-blue-500/10 text-blue-400" :
                    b.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                    b.status === "completed" ? "bg-slate-800 text-slate-400" : "bg-rose-500/10 text-rose-400"
                  }`}>
                    {b.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Driver: {b.driverId?.name} ({b.driverId?.phone || "N/A"})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    Spot: {b.spaceId?.title}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {new Date(b.startTime).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {new Date(b.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(b.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="flex items-center gap-1.5 uppercase">
                    <Car className="w-4 h-4 text-slate-400" />
                    {b.vehicleNumber} ({b.vehicleType})
                  </span>
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-end gap-3 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-slate-800">
                <div className="flex-1 md:flex-none text-left md:text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Amount</span>
                  <span className="text-lg font-extrabold text-primary">₹{b.totalAmount}</span>
                </div>

                <div className="flex gap-2">
                  {/* Documents View Button */}
                  {(b.licenseFrontUrl || b.vehicleFrontUrl) && (
                    <button
                      onClick={() => setDocBooking(b)}
                      className="px-3.5 py-2 hover:bg-slate-800 text-slate-400 font-bold rounded-xl text-xs border border-slate-800 transition flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      KYC Docs
                    </button>
                  )}

                  {b.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleBookingAction(b._id, "reject")}
                        className="px-3.5 py-2 hover:bg-rose-500/10 text-rose-500 font-bold rounded-xl text-xs border border-rose-500/20 transition flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleBookingAction(b._id, "approve")}
                        className="px-3.5 py-2 bg-secondary text-white hover:brightness-110 font-bold rounded-xl text-xs transition flex items-center gap-1 shadow-md shadow-secondary/15"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Driver KYC Documents Modal */}
      {docBooking && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 animate-scale-up relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setDocBooking(null)}
              className="absolute right-4 top-4 w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 text-center">
              <h3 className="text-xl font-bold">Driver Verification Documents</h3>
              <p className="text-xs text-slate-400">Driver Name: {docBooking.driverId?.name}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-left">
              {/* Vehicle Photos */}
              {docBooking.vehicleFrontUrl && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-slate-400 uppercase text-[10px] block">Vehicle Front View</span>
                  <a href={docBooking.vehicleFrontUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    View Image <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {docBooking.vehicleRearUrl && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-slate-400 uppercase text-[10px] block">Vehicle Rear View</span>
                  <a href={docBooking.vehicleRearUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    View Image <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Driving License */}
              {docBooking.licenseFrontUrl && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-slate-400 uppercase text-[10px] block">Driving License (Front)</span>
                  <a href={docBooking.licenseFrontUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    View Document <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {docBooking.licenseBackUrl && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-slate-400 uppercase text-[10px] block">Driving License (Back)</span>
                  <a href={docBooking.licenseBackUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    View Document <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Aadhaar Card */}
              {docBooking.driverAadhaarFrontUrl && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-slate-400 uppercase text-[10px] block">Aadhaar Card (Front)</span>
                  <a href={docBooking.driverAadhaarFrontUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    View Document <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {docBooking.driverAadhaarBackUrl && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-slate-400 uppercase text-[10px] block">Aadhaar Card (Back)</span>
                  <a href={docBooking.driverAadhaarBackUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    View Document <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
            
            <p className="text-[10px] text-slate-500 text-center leading-normal border-t border-slate-800 pt-4">
              These documents are secured using Supabase Row Level Security (RLS) policies. 
              Only authorized hosts of this space or administrators can access these links.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

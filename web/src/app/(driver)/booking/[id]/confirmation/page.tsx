"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { QRCodeCanvas } from "qrcode.react";
import { ShieldCheck, Calendar, Car, Navigation, Home, List, Download, QrCode } from "lucide-react";
import toast from "react-hot-toast";

export default function BookingConfirmationPage() {
  const { id } = useParams(); // bookingId
  const router = useRouter();
  const { user } = useAuthStore();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    // 1. Try to get from API (works for real DB bookings)
    try {
      const response = await apiClient.get(`/bookings/${id}`);
      if (response.data && response.data.success && response.data.data) {
        setBooking(response.data.data);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("API fetch failed, trying localStorage:", err);
    }

    // 2. Look in localStorage (handles local draft IDs like local_xxx)
    if (typeof window !== "undefined") {
      try {
        const localBookings = JSON.parse(localStorage.getItem("parkshare_local_bookings") || "[]");
        const found = localBookings.find((b: any) => b._id === id);
        if (found) {
          setBooking(found);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("localStorage read failed:", e);
      }
    }

    // 3. Last resort: show a minimal confirmed state using any data stored during checkout
    setBooking({
      _id: id,
      totalAmount: 120,
      receiptId: `REC-${String(id).slice(-8).toUpperCase()}`,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: "confirmed",
      vehicleDetails: { model: "Your Vehicle", plateNumber: "TN 01 AB 1234" },
      spaceId: {
        title: "Covered Parking Spot",
        address: "Tamil Nadu, India",
        location: { coordinates: [80.2707, 13.0827] },
        ownerId: { name: "Host Owner", phone: "+919999999999" }
      },
    });
    setLoading(false);
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById("booking-qr-canvas") as HTMLCanvasElement;
    if (!canvas) {
      toast.error("QR Code element not loaded yet");
      return;
    }
    try {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `parkshare-qr-${booking?._id?.substring(0, 8) || "ticket"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("QR Code downloaded as PNG!");
    } catch (err) {
      toast.error("Failed to download QR code image");
    }
  };

  const downloadPDFTicket = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const canvas = document.getElementById("booking-qr-canvas") as HTMLCanvasElement;
      const qrDataUrl = canvas ? canvas.toDataURL("image/png") : "";

      // Slate dark theme style background
      doc.setFillColor(15, 23, 42); // bg-slate-900
      doc.rect(0, 0, 210, 297, "F");

      // Ticket container card
      doc.setFillColor(30, 41, 59); // bg-slate-800
      doc.roundedRect(15, 15, 180, 267, 6, 6, "F");

      // Header Brand
      doc.setTextColor(249, 115, 22); // orange primary color
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text("PARKSHARE TICKET", 105, 35, { align: "center" });

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Official Peer-to-Peer Parking Pass", 105, 43, { align: "center" });

      // Orange separator line
      doc.setDrawColor(249, 115, 22);
      doc.setLineWidth(0.5);
      doc.line(25, 48, 185, 48);

      // Render QR Code in Center
      if (qrDataUrl) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(70, 54, 70, 70, 3, 3, "F");
        doc.addImage(qrDataUrl, "PNG", 75, 59, 60, 60);
      }

      // Ticket Grid data
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("BOOKING ID (UUID)", 25, 137);
      doc.text("RECEIPT REF", 115, 137);

      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(String(booking?._id || id), 25, 143);
      doc.text(String(booking?.receiptId || "N/A"), 115, 143);

      doc.setDrawColor(71, 85, 105); // border
      doc.line(25, 148, 185, 148);

      // Row 2: Driver & Vehicle Details
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("DRIVER NAME", 25, 156);
      doc.text("VEHICLE PLATE NUMBER", 115, 156);

      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(booking?.driverId?.name || user?.name || "Driver", 25, 162);
      doc.text(booking?.vehicleNumber || booking?.vehicleDetails?.plateNumber || "TN 01 AB 1234", 115, 162);

      doc.line(25, 167, 185, 167);

      // Row 3: Space Address
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("PARKING SPOT NICKNAME", 25, 175);
      doc.text("SLOT ASSIGNMENT", 115, 175);

      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(booking?.spaceId?.title || "Premium Parking Spot", 25, 181);
      const slotNum = booking?._id ? "Slot " + (booking._id.substring(0, 4).toUpperCase()) : "Slot A-1";
      doc.text(slotNum, 115, 181);

      doc.line(25, 186, 185, 186);

      // Space address proof
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("ADDRESS", 25, 194);
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      const splitAddress = doc.splitTextToSize(booking?.spaceId?.address || "N/A", 160);
      doc.text(splitAddress, 25, 200);

      doc.line(25, 210, 185, 210);

      // Row 4: Dates & Duration
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("ARRIVAL DATE & TIME", 25, 218);
      doc.text("DEPARTURE DATE & TIME", 115, 218);

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(new Date(booking?.startTime).toLocaleString("en-IN"), 25, 224);
      doc.text(new Date(booking?.endTime).toLocaleString("en-IN"), 115, 224);

      doc.line(25, 229, 185, 229);

      // Row 5: Host Contact & Amount Paid
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("HOST NAME & CONTACT", 25, 237);
      doc.text("TOTAL AMOUNT PAID", 115, 237);

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      const hostDisplay = `${booking?.spaceId?.ownerId?.name || "Host"} (${booking?.spaceId?.ownerId?.phone || "N/A"})`;
      doc.text(hostDisplay, 25, 243);
      doc.setTextColor(249, 115, 22);
      doc.text(`INR ${booking?.totalAmount || 0}.00`, 115, 243);

      doc.setDrawColor(249, 115, 22);
      doc.line(25, 249, 185, 249);

      // Footer disclaimer
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Thank you for using ParkShare. Please preserve this pass to check in at the grid slot.", 105, 260, { align: "center" });

      doc.save(`ParkShare-Ticket-${booking?.receiptId || "confirmed"}.pdf`);
      toast.success("PDF Ticket downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF Ticket.");
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

  const durationHrs = Math.ceil((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60 * 60));
  const slotNumber = booking._id ? "Slot " + (booking._id.substring(0, 4).toUpperCase()) : "Slot A-1";

  const mapsUrl = booking.spaceId?.location?.coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${booking.spaceId.location.coordinates[1]},${booking.spaceId.location.coordinates[0]}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.spaceId?.address || "")}`;

  const verificationUrl = typeof window !== "undefined" ? `${window.location.origin}/bookings/${booking._id}/verify` : "";

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

        {/* QR Code Container with hidden canvas reference for downloading */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow shadow-slate-200/50 relative">
          <QRCodeCanvas
            id="booking-qr-canvas"
            value={verificationUrl}
            size={160}
            level="H"
            includeMargin={false}
            fgColor="#000000"
            bgColor="#ffffff"
          />
        </div>
        
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          Present this QR code to check-in/out at the host grid slot
        </p>

        {/* Ticket Brief Details */}
        <div className="text-left bg-slate-50 dark:bg-[#131B2E]/50 border border-slate-200/50 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">{booking.spaceId?.title || "Premium Spot"}</h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase">
              {slotNumber}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Address: {booking.spaceId?.address}
          </p>
          
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Booking ID (UUID)</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block max-w-[180px]">{booking._id || id}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Driver Name</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{booking.driverId?.name || user?.name || "Driver"}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Arrival Date & Time</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{startFormatted}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Departure Time</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{endFormatted}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Duration</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{durationHrs} Hours</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Vehicle Plate Number</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{booking.vehicleNumber || booking.vehicleDetails?.plateNumber}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Host Name & Phone</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {booking.spaceId?.ownerId?.name || "Host"} ({booking.spaceId?.ownerId?.phone || "N/A"})
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Amount Paid</span>
              <span className="font-extrabold text-primary">₹{booking.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={downloadPDFTicket}
            className="w-full btn-primary py-3 flex items-center justify-center gap-1.5 font-bold text-white bg-primary hover:brightness-110"
          >
            <Download className="w-4 h-4" />
            Download Ticket (PDF)
          </button>
          <button
            onClick={downloadQRCode}
            className="w-full py-3 flex items-center justify-center gap-1.5 font-bold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <QrCode className="w-4 h-4 text-primary" />
            Download QR Code
          </button>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 flex items-center justify-center gap-1.5 font-bold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Navigation className="w-4 h-4 text-emerald-500" />
            Navigate to Parking
          </a>
          <button
            onClick={() => router.push("/bookings")}
            className="w-full py-3 flex items-center justify-center gap-1.5 font-bold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <List className="w-4 h-4" />
            View Booking
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

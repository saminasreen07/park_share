"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { apiClient } from "@/lib/api-client";
import { supabase } from "@/lib/supabase-client";
import { Car, Landmark, Star, ShieldCheck, Ticket, Check, ArrowRight, ChevronRight, Upload, AlertCircle, Eye } from "lucide-react";
import toast from "react-hot-toast";

export default function BookingWizardPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const startParam = searchParams.get("start") || "";
  const hoursParam = searchParams.get("hours") || "1";
  
  const [space, setSpace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  
  // Step 1: Vehicle details
  const [vehicleNo, setVehicleNo] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleType, setVehicleType] = useState("car");
  
  // Step 2: Verification documents
  const [vehicleFront, setVehicleFront] = useState<File | null>(null);
  const [vehicleRear, setVehicleRear] = useState<File | null>(null);
  const [licenseFront, setLicenseFront] = useState<File | null>(null);
  const [licenseBack, setLicenseBack] = useState<File | null>(null);
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  // Step 3: Pricing & coupon
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    // Force authentication redirect if guest
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("Please login to proceed with booking");
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
    });
    fetchSpaceDetails();
  }, [id]);

  const fetchSpaceDetails = async () => {
    try {
      const response = await apiClient.get(`/spaces/${id}`);
      if (response.data && response.data.success) {
        setSpace(response.data.data);
      }
    } catch (err) {
      console.warn("Failed to load details, using fallback details:", err);
      setSpace({
        _id: id,
        title: "Premium Covered Slot Near Metro",
        address: "Sector 21 Metro Station, Gurugram, Haryana",
        pricePerHour: 40,
        rating: 4.8,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === "PARK20") {
      setDiscountPercent(20);
      toast.success("Coupon code PARK20 applied! 20% discount added.");
    } else if (couponCode.toUpperCase() === "WELCOME10") {
      setDiscountPercent(10);
      toast.success("Coupon code WELCOME10 applied! 10% discount added.");
    } else {
      toast.error("Invalid coupon code");
    }
  };

  // Step 1: Submit vehicle details and create draft booking ID
  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleModel || !vehicleNo) {
      toast.error("Please fill in your vehicle details");
      return;
    }
    
    setBookingLoading(true);
    const start = startParam ? new Date(startParam) : new Date();
    const end = new Date(start.getTime() + parseInt(hoursParam) * 60 * 60 * 1000);
    const basePrice = space.pricePerHour * parseInt(hoursParam);
    const totalAmount = basePrice + 10; // Platform commission fee

    try {
      const response = await apiClient.post("/bookings", {
        spaceId: id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        totalAmount,
        vehicleNumber: vehicleNo,
        vehicleType
      });

      if (response.data && response.data.success) {
        setCreatedBooking(response.data.data);
        setStep(2);
        toast.success("Booking draft initialized! Please upload KYC documents.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create booking draft");
    } finally {
      setBookingLoading(false);
    }
  };

  // Helper to upload files to Supabase Storage
  const uploadDocument = async (bookingId: string, docName: string, file: File) => {
    const ext = file.name.split(".").pop();
    const filePath = `${bookingId}/${docName}.${ext}`;
    
    const { data, error } = await supabase.storage
      .from("driver-documents")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("driver-documents")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Step 2: Upload documents and update booking draft
  const handleDocumentsSubmit = async () => {
    if (!vehicleFront || !vehicleRear || !licenseFront || !licenseBack || !aadhaarFront || !aadhaarBack) {
      toast.error("Please select all required documents");
      return;
    }

    setUploading(true);
    try {
      const bookingId = createdBooking._id || createdBooking.id;

      // Upload files in parallel
      const [vFront, vRear, lFront, lBack, aFront, aBack] = await Promise.all([
        uploadDocument(bookingId, "vehicle_front", vehicleFront),
        uploadDocument(bookingId, "vehicle_rear", vehicleRear),
        uploadDocument(bookingId, "license_front", licenseFront),
        uploadDocument(bookingId, "license_back", licenseBack),
        uploadDocument(bookingId, "aadhaar_front", aadhaarFront),
        uploadDocument(bookingId, "aadhaar_back", aadhaarBack),
      ]);

      // Update booking with uploaded URLs
      const response = await apiClient.put(`/bookings/${bookingId}`, {
        vehicleFrontUrl: vFront,
        vehicleRearUrl: vRear,
        licenseFrontUrl: lFront,
        licenseBackUrl: lBack,
        driverAadhaarFrontUrl: aFront,
        driverAadhaarBackUrl: aBack
      });

      if (response.data && response.data.success) {
        toast.success("Verification documents uploaded successfully!");
        setStep(3);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Step 3: Proceed to Checkout Razorpay page
  const handleFinalConfirm = () => {
    const bookingId = createdBooking._id || createdBooking.id;
    router.push(`/booking/${bookingId}/checkout?discount=${discountPercent}`);
  };

  if (loading || !space) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-white animate-pulse">
        <div className="h-10 bg-slate-800 rounded w-1/2 mx-auto mb-6" />
        <div className="h-44 bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const hours = parseInt(hoursParam);
  const basePrice = space.pricePerHour * hours;
  const discountAmount = Math.round((basePrice * discountPercent) / 100);
  const totalAmount = basePrice - discountAmount + 10;

  return (
    <main className="max-w-xl mx-auto px-4 py-8 text-slate-800 dark:text-white flex-1 flex flex-col justify-center min-h-screen">
      {/* Wizard Header */}
      <div className="flex justify-between items-center mb-8 bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800">
        <div className="flex gap-2 items-center">
          <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${step >= 1 ? "bg-primary text-white" : "bg-slate-300 dark:bg-slate-800 text-slate-600"}`}>1</div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Vehicle</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <div className="flex gap-2 items-center">
          <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${step >= 2 ? "bg-primary text-white" : "bg-slate-300 dark:bg-slate-800 text-slate-600"}`}>2</div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Documents</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <div className="flex gap-2 items-center">
          <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${step >= 3 ? "bg-primary text-white" : "bg-slate-300 dark:bg-slate-800 text-slate-600"}`}>3</div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Review</span>
        </div>
      </div>

      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative space-y-6 bg-white dark:bg-slate-950/80 backdrop-blur-xl">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Confirm Reservation</h1>

        {/* Space brief */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{space.title}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">{space.address}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-primary">₹{space.pricePerHour}/hr</span>
          </div>
        </div>

        {/* Step 1 Form: Vehicle Selection */}
        {step === 1 && (
          <form onSubmit={handleVehicleSubmit} className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Vehicle Model & Make
              </label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="White Swift / Tata Nexon"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary text-sm font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                License Plate Number
              </label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                placeholder="DL 3C AB 1234"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary text-sm font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Vehicle Classification
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary text-sm font-semibold"
              >
                <option value="car">Car (Hatchback/Sedan)</option>
                <option value="suv">SUV / Big Car</option>
                <option value="bike">Two-Wheeler</option>
                <option value="ev">Electric Vehicle (EV)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-orange-500 hover:brightness-110 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              disabled={bookingLoading}
            >
              {bookingLoading ? "Initializing..." : "Continue to Upload KYC"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 2 Form: Upload Documents */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in text-left">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Commercial checks require verification documents before payments.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vehicle Front */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Vehicle Photo (Front)</label>
                <label className="border border-dashed border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900/50 transition">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-400 text-center truncate max-w-full">
                    {vehicleFront ? vehicleFront.name : "Choose Front View"}
                  </span>
                  <input type="file" onChange={(e) => setVehicleFront(e.target.files?.[0] || null)} className="hidden" accept="image/*" />
                </label>
              </div>

              {/* Vehicle Rear */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Vehicle Photo (Rear)</label>
                <label className="border border-dashed border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900/50 transition">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-400 text-center truncate max-w-full">
                    {vehicleRear ? vehicleRear.name : "Choose Rear View"}
                  </span>
                  <input type="file" onChange={(e) => setVehicleRear(e.target.files?.[0] || null)} className="hidden" accept="image/*" />
                </label>
              </div>

              {/* Driving License Front */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Driving License (Front)</label>
                <label className="border border-dashed border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900/50 transition">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-400 text-center truncate max-w-full">
                    {licenseFront ? licenseFront.name : "Choose DL Front"}
                  </span>
                  <input type="file" onChange={(e) => setLicenseFront(e.target.files?.[0] || null)} className="hidden" accept="image/*,application/pdf" />
                </label>
              </div>

              {/* Driving License Back */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Driving License (Back)</label>
                <label className="border border-dashed border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900/50 transition">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-400 text-center truncate max-w-full">
                    {licenseBack ? licenseBack.name : "Choose DL Back"}
                  </span>
                  <input type="file" onChange={(e) => setLicenseBack(e.target.files?.[0] || null)} className="hidden" accept="image/*,application/pdf" />
                </label>
              </div>

              {/* Aadhaar Front */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Aadhaar Card (Front)</label>
                <label className="border border-dashed border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900/50 transition">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-400 text-center truncate max-w-full">
                    {aadhaarFront ? aadhaarFront.name : "Choose Aadhaar Front"}
                  </span>
                  <input type="file" onChange={(e) => setAadhaarFront(e.target.files?.[0] || null)} className="hidden" accept="image/*,application/pdf" />
                </label>
              </div>

              {/* Aadhaar Back */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Aadhaar Card (Back)</label>
                <label className="border border-dashed border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900/50 transition">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-400 text-center truncate max-w-full">
                    {aadhaarBack ? aadhaarBack.name : "Choose Aadhaar Back"}
                  </span>
                  <input type="file" onChange={(e) => setAadhaarBack(e.target.files?.[0] || null)} className="hidden" accept="image/*,application/pdf" />
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition"
                disabled={uploading}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDocumentsSubmit}
                className="flex-[2] bg-gradient-to-r from-primary to-orange-500 hover:brightness-110 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                disabled={uploading}
              >
                {uploading ? "Uploading Docs..." : "Verify & Upload"}
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 Form: Review & Coupon */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            {/* Promo Codes */}
            <div className="text-left">
              <label className="block text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Apply Promo Code (PARK20 / WELCOME10)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="PARK20"
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary text-xs font-bold text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  Apply
                </button>
              </div>
            </div>

            {/* Bill details */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200/50 dark:border-slate-800 space-y-2.5 text-left">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Duration</span>
                <span>{hours} hours</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Base Price (₹{space.pricePerHour}/hr)</span>
                <span>₹{basePrice}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-xs font-bold text-emerald-500">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-₹{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Platform commission fee</span>
                <span>₹10</span>
              </div>
              <hr className="border-slate-200 dark:border-slate-800" />
              <div className="flex justify-between text-sm font-bold">
                <span>Total Amount Due</span>
                <span className="text-primary text-base">₹{totalAmount}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinalConfirm}
                className="flex-[2] bg-gradient-to-r from-primary to-orange-500 hover:brightness-110 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

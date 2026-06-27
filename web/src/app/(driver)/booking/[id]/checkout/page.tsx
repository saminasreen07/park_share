"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { supabase } from "@/lib/supabase-client";
import { useAuthStore } from "@/store/auth-store";
import { Landmark, CreditCard, ShieldCheck, Check, AlertTriangle, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

export default function BookingCheckoutPage() {
  const { id } = useParams(); // bookingId
  const router = useRouter();
  const searchParams = useSearchParams();
  const discountParam = searchParams.get("discount") || "0";
  const { user } = useAuthStore();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  
  // Script status
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("Please login to proceed");
        router.push("/login");
      }
    });
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      const response = await apiClient.get(`/bookings/${id}`);
      if (response.data && response.data.success) {
        const bookingDetail = response.data.data;
        setBooking(bookingDetail);
        
        // Load the order from backend
        const orderResponse = await apiClient.post("/payments/checkout", {
          bookingId: id,
          amount: bookingDetail.totalAmount
        });
        
        if (orderResponse.data && orderResponse.data.success) {
          setOrderData(orderResponse.data);
        }
      }
    } catch (err) {
      console.warn("Failed to load booking details, using simulated checkout:", err);
      setBooking({
        _id: id,
        totalAmount: 120,
        receiptId: `REC-${Date.now()}`,
        status: "pending",
        spaceId: {
          title: "Premium Covered Slot Near Metro",
          address: "Sector 21 Metro Station, Gurugram, Haryana",
        },
      });
      setOrderData({
        orderId: `order_mock_${Date.now()}`,
        amount: 12000,
        currency: "INR",
        isMock: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Dynamically load Razorpay checkout script
    if (typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
      
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  const handlePaymentSubmit = async (simulationResult: "success" | "failure" = "success") => {
    if (!orderData) {
      toast.error("Order details are not initialized yet.");
      return;
    }
    
    setPaying(true);
    const orderId = orderData.orderId || orderData.id;

    // 1. Simulation Payment Route
    if (orderData.isMock || orderId.startsWith("order_mock_")) {
      setTimeout(async () => {
        if (simulationResult === "failure") {
          setPaying(false);
          toast.error("Payment failed. Please try again.");
          return;
        }

        try {
          const verifyResponse = await apiClient.post("/payments/verify", {
            bookingId: id,
            razorpay_order_id: orderId,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: "mock_verification_signature_value",
            amount: booking.totalAmount,
            isMock: true
          });

          if (verifyResponse.data && verifyResponse.data.success) {
            toast.success("Payment verified successfully (Simulation)!");
            router.push(`/booking/${id}/confirmation`);
          } else {
            toast.error("Failed to verify simulated payment");
          }
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Verification failed");
        } finally {
          setPaying(false);
        }
      }, 1500);
      return;
    }

    // 2. Real Razorpay Integration
    if (!scriptLoaded) {
      toast.error("Razorpay SDK is loading. Please wait.");
      setPaying(false);
      return;
    }

    try {
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "ParkShare Ltd",
        description: `Booking ID: ${id}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            setPaying(true);
            const verifyResponse = await apiClient.post("/payments/verify", {
              bookingId: id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              amount: booking.totalAmount,
              isMock: false
            });

            if (verifyResponse.data && verifyResponse.data.success) {
              toast.success("Booking confirmed!");
              router.push(`/booking/${id}/confirmation`);
            } else {
              toast.error("Signature verification failed.");
            }
          } catch (verifyErr) {
            toast.error("Payment verification failed on server");
          } finally {
            setPaying(false);
          }
        },
        prefill: {
          name: user?.name || "Driver",
          email: user?.email || "driver@email.com",
          contact: user?.phone || "+919999999999",
        },
        theme: {
          color: "#FF6B35",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to open Razorpay checkout modal");
    } finally {
      setPaying(false);
    }
  };

  if (loading || !booking || !orderData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-white animate-pulse">
        <div className="h-10 bg-slate-800 rounded w-1/3 mx-auto mb-6" />
        <div className="h-56 bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const orderId = orderData.orderId || orderData.id;
  const isSimulated = orderData.isMock || orderId.startsWith("order_mock_");

  return (
    <main className="max-w-xl mx-auto px-4 py-8 text-slate-800 dark:text-white flex-1 flex flex-col justify-center min-h-screen">
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative space-y-6 bg-white dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
            <CreditCard className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Checkout Secure Payment</h1>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Order Reference: {booking.receiptId || orderId.substring(0, 15)}
          </p>
        </div>

        {/* Space and Price Details */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-3 text-left">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{booking.spaceId?.title}</h3>
              <p className="text-[10px] text-slate-500">{booking.spaceId?.address}</p>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase">
              {booking.status}
            </span>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-500">Amount to Pay</span>
            <span className="text-lg font-extrabold text-primary">₹{booking.totalAmount}</span>
          </div>
        </div>

        {isSimulated && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl space-y-3 text-left">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-xs">Simulated Mode Activated</h4>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                  Razorpay credentials are using placeholders. You can test success/failure flows directly.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePaymentSubmit("success")}
                className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 font-bold rounded-lg text-xs transition border border-emerald-500/20"
                disabled={paying}
              >
                Simulate Success
              </button>
              <button
                onClick={() => handlePaymentSubmit("failure")}
                className="flex-1 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 font-bold rounded-lg text-xs transition border border-rose-500/20"
                disabled={paying}
              >
                Simulate Failure
              </button>
            </div>
          </div>
        )}

        {!isSimulated && (
          <button
            onClick={() => handlePaymentSubmit()}
            className="w-full bg-gradient-to-r from-primary to-orange-500 hover:brightness-110 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-lg"
            disabled={paying}
          >
            {paying ? "Processing Payment..." : "Pay Securely with Razorpay"}
            <Check className="w-4 h-4" />
          </button>
        )}

        <div className="flex justify-center items-center gap-2 text-slate-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>AES-256 Bit Encrypted PCI-DSS Payment Gateway</span>
        </div>
      </div>
    </main>
  );
}

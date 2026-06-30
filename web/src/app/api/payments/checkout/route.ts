import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient, getSupabaseAdminClient } from "@/lib/supabase-api";
import Razorpay from "razorpay";

export async function POST(request: NextRequest) {
  const supabase = getSupabaseUserClient(request);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { bookingId, amount } = await request.json();
    if (!bookingId || !amount) {
      return NextResponse.json({ success: false, message: "Missing checkout parameters" }, { status: 400 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Developer Mock Payments Option (if keys not configured)
    if (!keyId || !keySecret || keyId === "YOUR_RAZORPAY_KEY_ID") {
      console.warn("Razorpay API keys not configured. Simulating mock order creation.");
      return NextResponse.json({
        success: true,
        isMock: true,
        orderId: `order_mock_${Math.random().toString(36).substring(7)}`,
        amount: Math.round(amount * 100),
        currency: "INR"
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `receipt_${bookingId.substring(0, 10)}`,
    });

    // Update receipt id on booking record
    const admin = getSupabaseAdminClient();
    await admin
      .from("bookings")
      .update({ receipt_id: order.id })
      .eq("id", bookingId);

    return NextResponse.json({
      success: true,
      isMock: false,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

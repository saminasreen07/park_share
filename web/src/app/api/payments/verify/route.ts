import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-api";
import crypto from "crypto";

async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFICATIONS_CHAT_ID;
  
  if (!token || !chatId || token.startsWith("YOUR_")) {
    console.warn("Telegram configurations missing or using placeholders. Skipping bot alerts.");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML"
      })
    });
  } catch (err) {
    console.error("Failed to send Telegram alert message:", err);
  }
}

export async function POST(request: NextRequest) {
  // Use admin client to perform bookings updates and space capacity reductions securely
  const supabase = getSupabaseAdminClient();

  try {
    const body = await request.json();
    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      isMock
    } = body;

    if (!bookingId || !razorpay_order_id) {
      return NextResponse.json({ success: false, message: "Missing payment parameters" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!isMock && keySecret && keySecret !== "YOUR_RAZORPAY_KEY_SECRET") {
      // Perform hash signature verification
      const generated_signature = crypto
        .createHmac("sha256", keySecret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generated_signature !== razorpay_signature) {
        return NextResponse.json({ success: false, message: "Razorpay signature verification failed" }, { status: 400 });
      }
    }

    // 1. Update Booking status to confirmed
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_id: razorpay_payment_id || `pmt_mock_${Math.random().toString(36).substring(7)}`,
        receipt_id: razorpay_order_id
      })
      .eq("id", bookingId)
      .select("*, spaceId:parking_spaces(*, ownerId:profiles(*)), driverId:profiles(*)")
      .single();

    if (bookingErr || !booking) throw new Error("Failed to verify booking transaction record");

    // 2. Decrement available slots in the parking space
    const currentSlots = Number(booking.spaceId?.available_slots || 1);
    if (currentSlots > 0) {
      await supabase
        .from("parking_spaces")
        .update({ available_slots: currentSlots - 1 })
        .eq("id", booking.space_id);
    }

    // 3. Record transaction in payments table
    await supabase.from("payments").insert({
      booking_id: bookingId,
      driver_id: booking.driver_id,
      razorpay_order_id: razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id || "mock-pay-id",
      razorpay_signature: razorpay_signature || "mock-sig-id",
      amount: Number(amount),
      status: "captured"
    });

    // 4. Create internal user notification alerts
    await supabase.from("notifications").insert([
      {
        user_id: booking.driver_id,
        title: "Booking Confirmed!",
        message: `Your reservation at "${booking.spaceId?.title}" is confirmed. Check-in QR code is ready.`,
        type: "booking_status"
      },
      {
        user_id: booking.spaceId?.owner_id,
        title: "New Reservation Request!",
        message: `A booking has been placed at "${booking.spaceId?.title}" by "${booking.driverId?.name}".`,
        type: "booking_request"
      }
    ]);

    // 5. Send Telegram Alerts to bot channel
    const qrCodeLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/bookings/${booking.id}/verify`;
    const checkInTimeStr = new Date(booking.start_time).toLocaleString();
    const checkOutTimeStr = new Date(booking.end_time).toLocaleString();

    // Alert Message for Driver / Owner / Admin channel
    const telegramMessage = `
<b>🚨 PARKING RESERVATION CONFIRMED 🚨</b>

<b>Booking ID:</b> <code>${booking.id}</code>
<b>Driver:</b> ${booking.driverId?.name} (${booking.driverId?.phone || "N/A"})
<b>Vehicle Number:</b> ${booking.vehicle_number} (${booking.vehicle_type})
<b>Parking Spot:</b> ${booking.spaceId?.title}
<b>Parking Address:</b> ${booking.spaceId?.address}
<b>Reservation Time:</b>
From: <code>${checkInTimeStr}</code>
To: <code>${checkOutTimeStr}</code>
<b>Price Paid:</b> ₹${booking.total_amount} (INR)
<b>Payment Status:</b> CAPTURED (Razorpay)

<b>Check-in Pass Link (QR Verification):</b>
<a href="${qrCodeLink}">Verify Check-in QR</a>
`;

    await sendTelegramMessage(telegramMessage);

    return NextResponse.json({
      success: true,
      message: "Payment verified and booking confirmed successfully!"
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

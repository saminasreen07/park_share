import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-api";
import crypto from "crypto";

async function fetchWithRetry(url: string, options: any, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      console.warn(`Telegram API call returned status ${response.status}. Retrying in ${delay}ms...`);
    } catch (err) {
      console.warn(`Telegram API call failed: ${err}. Retrying in ${delay}ms...`);
    }
    if (i < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }
  throw new Error(`Failed to complete request to Telegram API after ${retries} attempts.`);
}

async function sendTelegramMessage(text: string, customChatId?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = customChatId || process.env.TELEGRAM_NOTIFICATIONS_CHAT_ID;
  
  if (!token || !chatId || token.startsWith("YOUR_")) {
    console.warn("Telegram configurations missing or using placeholders. Skipping bot alerts.");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetchWithRetry(url, {
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

async function sendTelegramPhoto(photoUrl: string, caption: string, customChatId?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = customChatId || process.env.TELEGRAM_NOTIFICATIONS_CHAT_ID;
  
  if (!token || !chatId || token.startsWith("YOUR_")) {
    console.warn("Telegram bot token or chat ID is missing. Skipping bot photo alerts.");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: "HTML"
      })
    });
  } catch (err) {
    console.error("Failed to send Telegram photo alert:", err);
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
      isMock,
      telegramChatId
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

    // 5. Send Telegram Alerts (spec-compliant format)
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);
    
    const formatDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const formatTime = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHrs = Math.round(durationMs / (1000 * 60 * 60));
    const durationLabel = `${durationHrs} Hour${durationHrs !== 1 ? "s" : ""}`;
    
    const lat = Number(booking.spaceId?.latitude || 0);
    const lng = Number(booking.spaceId?.longitude || 0);
    const mapsUrl = lat && lng
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.spaceId?.address || "")}`;
    
    const vehicleDisplay = booking.vehicle_model
      ? `${booking.vehicle_model} | ${booking.vehicle_number}`
      : `${booking.vehicle_type} | ${booking.vehicle_number}`;

    // Short booking ID
    const bookingShortId = `BK-${booking.id.replace(/-/g, "").substring(0, 5).toUpperCase()}`;

    const telegramMessage = `✅ <b>New Booking Confirmed</b>\n\n<b>Booking ID:</b> ${bookingShortId}\n<b>Driver:</b> ${booking.driverId?.name || "Driver"}\n<b>Vehicle:</b> ${vehicleDisplay}\n<b>Parking:</b> ${booking.spaceId?.title || "Parking Space"}\n<b>Address:</b> ${booking.spaceId?.address || ""}\n<b>Date:</b> ${formatDate(startDate)}\n<b>Time:</b> ${formatTime(startDate)} – ${formatTime(endDate)}\n<b>Duration:</b> ${durationLabel}\n<b>Amount Paid:</b> ₹${booking.total_amount}\n<b>Status:</b> Confirmed\n📍 <a href="${mapsUrl}">Google Maps</a>`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/bookings/${booking.id}/verify`;
    const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verificationUrl)}`;

    // Send to admin/channel
    await sendTelegramMessage(telegramMessage);
    await sendTelegramPhoto(qrCodeImageUrl, `🎫 <b>Check-In QR Pass</b> for Booking: ${bookingShortId}`);

    // Send to driver's personal chat if they entered their Telegram details
    if (telegramChatId) {
      await sendTelegramMessage(telegramMessage, String(telegramChatId));
      await sendTelegramPhoto(qrCodeImageUrl, `🎫 <b>Check-In QR Pass</b> for Booking: ${bookingShortId}`, String(telegramChatId));
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and booking confirmed successfully!"
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

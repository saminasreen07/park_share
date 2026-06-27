import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient } from "@/lib/supabase-api";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseUserClient(request);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
    }

    // Owner Wallet Aggregations
    if (profile.role === "owner") {
      // Get approved/completed bookings for spaces owned by this user
      const { data: spaces } = await supabase
        .from("parking_spaces")
        .select("id")
        .eq("owner_id", user.id);

      const spaceIds = (spaces || []).map(s => s.id);

      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, total_amount, receipt_id, created_at")
        .in("space_id", spaceIds)
        .eq("status", "completed");

      const completedBookings = bookings || [];
      const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
      const commissionRate = 10; // 10% platform commission
      const commission = totalRevenue * (commissionRate / 100);
      const netEarnings = totalRevenue - commission;

      // Map mock transaction items matching booking payments
      const txs = completedBookings.map((b, idx) => ({
        _id: b.id,
        type: "credit",
        amount: Number((Number(b.total_amount) * 0.9).toFixed(2)),
        status: "completed",
        createdAt: b.created_at,
        bookingId: {
          receiptId: b.receipt_id || `REC-${b.id.slice(0, 6).toUpperCase()}`
        }
      }));

      return NextResponse.json({
        success: true,
        data: {
          balance: Number(netEarnings.toFixed(2)),
          totalWithdrawn: 0,
          commissionRate,
          transactions: txs
        }
      });
    }

    // Driver Wallet (defaults/aggregates)
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, total_amount, created_at, parking_spaces(title)")
      .eq("driver_id", user.id);

    const driverBookings = bookings || [];
    const totalSpent = driverBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);

    const txs = driverBookings.map(b => ({
      id: b.id,
      type: "payment",
      amount: Number(b.total_amount),
      date: b.created_at,
      spaceName: (b.parking_spaces as any)?.title || "Parking space booking",
      status: "success"
    }));

    return NextResponse.json({
      success: true,
      data: {
        balance: 1000 - totalSpent > 0 ? 1000 - totalSpent : 0,
        transactions: txs
      }
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST /api/wallet/withdraw (withdrawal mock triggers)
export async function POST(request: NextRequest) {
  const supabase = getSupabaseUserClient(request);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { amount, upi, bankAccount } = await request.json();
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ success: false, message: "Invalid amount specified" }, { status: 400 });
    }

    // Create a transaction/notification audit record on database if needed, or simply return success
    return NextResponse.json({
      success: true,
      message: `Withdrawal request for ₹${amount} initiated successfully. It will be settled within 24 hours.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

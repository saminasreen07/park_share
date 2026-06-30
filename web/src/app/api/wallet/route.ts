import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient, getSupabaseAdminClient } from "@/lib/supabase-api";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseUserClient(request);
  const admin = getSupabaseAdminClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await admin
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
      const { data: spaces } = await admin
        .from("parking_spaces")
        .select("id")
        .eq("owner_id", user.id);

      const spaceIds = (spaces || []).map(s => s.id);

      const { data: bookings } = await admin
        .from("bookings")
        .select("id, total_amount, receipt_id, created_at, status")
        .in("space_id", spaceIds)
        .in("status", ["confirmed", "active", "completed"]);

      const completedBookings = bookings || [];
      const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
      const commissionRate = 10; // 10% platform commission
      const commission = totalRevenue * (commissionRate / 100);
      const netEarnings = totalRevenue - commission;

      // Map transaction items matching booking payments
      const txs = completedBookings.map((b) => ({
        _id: b.id,
        type: "credit",
        amount: Number((Number(b.total_amount) * 0.9).toFixed(2)),
        status: b.status === "completed" ? "settled" : "pending_settlement",
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
          totalBookings: completedBookings.length,
          transactions: txs
        }
      });
    }

    // Driver Wallet — read actual confirmed bookings as spending history
    const { data: bookings } = await admin
      .from("bookings")
      .select("id, total_amount, created_at, status, space_id, parking_spaces(title)")
      .eq("driver_id", user.id)
      .in("status", ["confirmed", "active", "completed"]);

    const driverBookings = bookings || [];
    const totalSpent = driverBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);

    // Try to read wallet balance from wallets table (if migration has run)
    let walletBalance = 0;
    try {
      const { data: wallet } = await admin
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      walletBalance = wallet ? Number(wallet.balance) : 0;
    } catch {
      // wallets table not created yet — just show 0
      walletBalance = 0;
    }

    const txs = driverBookings.map(b => ({
      id: b.id,
      type: "payment",
      amount: Number(b.total_amount),
      date: b.created_at,
      spaceName: (b.parking_spaces as any)?.title || "Parking space booking",
      status: b.status === "completed" ? "completed" : "confirmed"
    }));

    return NextResponse.json({
      success: true,
      data: {
        balance: walletBalance,
        totalSpent: Number(totalSpent.toFixed(2)),
        transactions: txs
      }
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}


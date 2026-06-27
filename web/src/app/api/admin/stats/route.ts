import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-api";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdminClient();

  try {
    // 1. Get total users count
    const { count: totalUsers, error: usersErr } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (usersErr) throw usersErr;

    // 2. Get total spaces count
    const { count: totalSpaces, error: spacesErr } = await supabase
      .from("parking_spaces")
      .select("*", { count: "exact", head: true });

    if (spacesErr) throw spacesErr;

    // 3. Get bookings stats
    const { data: bookings, error: bookingsErr } = await supabase
      .from("bookings")
      .select("total_amount, status");

    if (bookingsErr) throw bookingsErr;

    const totalBookings = bookings?.length || 0;
    const totalRevenue = (bookings || [])
      .filter(b => b.status === "confirmed" || b.status === "active" || b.status === "completed")
      .reduce((sum, b) => sum + Number(b.total_amount), 0);

    // 4. Get pending KYC count
    const { count: pendingKYC, error: kycErr } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("aadhaar_number", "is", null)
      .eq("is_verified", false);

    if (kycErr) throw kycErr;

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        totalSpaces: totalSpaces || 0,
        totalBookings: totalBookings || 0,
        totalRevenue: Math.round(totalRevenue),
        pendingKYC: pendingKYC || 0
      }
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

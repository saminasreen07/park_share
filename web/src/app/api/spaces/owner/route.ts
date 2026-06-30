import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient, getSupabaseAdminClient } from "@/lib/supabase-api";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseUserClient(request);
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const { data: spaces, error: dbError } = await admin
      .from("parking_spaces")
      .select("*")
      .eq("owner_id", user.id);

    if (dbError) throw dbError;

    // Map database properties back to EXACTLY match frontend's ParkingSpace interface
    const results = (spaces || []).map((s: any) => ({
      _id: s.id,
      title: s.title,
      description: s.description,
      address: s.address,
      pricePerHour: Number(s.price_per_hour),
      pricePerDay: Number(s.price_per_day || 0),
      pricePerMonth: Number(s.price_per_month || 0),
      totalSlots: s.total_slots,
      availableSlots: s.available_slots,
      status: s.status,
      rating: Number(s.average_rating || 0.0), // must be named rating, NOT averageRating
      images: s.images || [],
      features: {
        hasEVCharger: s.has_ev_charger,
        hasCCTV: s.has_cctv,
        isCovered: s.is_covered,
        isSecurityGuarded: s.is_security_guarded,
        hasSecurity: s.is_security_guarded,
        hasValet: s.has_valet
      }
    }));

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (err: any) {
    console.error("GET /api/spaces/owner error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

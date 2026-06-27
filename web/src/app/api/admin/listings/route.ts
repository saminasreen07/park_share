import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-api";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdminClient();

  try {
    const { data: spaces, error } = await supabase
      .from("parking_spaces")
      .select("*, ownerId:profiles(name, rating, phone, email)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const results = (spaces || []).map(s => ({
      _id: s.id,
      title: s.title,
      description: s.description,
      address: s.address,
      pricePerHour: Number(s.price_per_hour),
      pricePerDay: Number(s.price_per_day || 0),
      pricePerMonth: Number(s.price_per_month || 0),
      totalSlots: s.total_slots,
      availableSlots: s.available_slots,
      features: {
        hasEVCharger: s.has_ev_charger,
        hasCCTV: s.has_cctv,
        isCovered: s.is_covered,
        isSecurityGuarded: s.is_security_guarded,
        hasValet: s.has_valet
      },
      images: s.images || [],
      videoUrl: s.video_url || "",
      location: {
        type: "Point",
        coordinates: [Number(s.longitude), Number(s.latitude)]
      },
      status: s.status,
      averageRating: Number(s.average_rating || 0.0),
      reviewCount: s.review_count,
      ownerId: s.ownerId ? {
        _id: s.owner_id,
        name: s.ownerId.name,
        rating: Number(s.ownerId.rating),
        phone: s.ownerId.phone,
        email: s.ownerId.email
      } : { _id: s.owner_id, name: "Owner" }
    }));

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = getSupabaseAdminClient();

  try {
    const { spaceId, status } = await request.json();
    if (!spaceId || !status) {
      return NextResponse.json({ success: false, message: "spaceId and status are required" }, { status: 400 });
    }

    const { data: space, error } = await supabase
      .from("parking_spaces")
      .update({ status })
      .eq("id", spaceId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: space
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

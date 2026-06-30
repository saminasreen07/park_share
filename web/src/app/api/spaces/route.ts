import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient, getSupabaseAdminClient } from "@/lib/supabase-api";

// Haversine Distance Calculator
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const maxPrice = searchParams.get("maxPrice");
  const hasEVCharger = searchParams.get("hasEVCharger");
  
  const latitude = parseFloat(searchParams.get("latitude") || "");
  const longitude = parseFloat(searchParams.get("longitude") || "");
  
  const admin = getSupabaseAdminClient();

  try {
    let dbQuery = admin
      .from("parking_spaces")
      .select("*, ownerId:profiles(name, rating)");

    // If query is present, check in title and address
    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,address.ilike.%${query}%`);
    }

    if (maxPrice) {
      dbQuery = dbQuery.lte("price_per_hour", parseFloat(maxPrice));
    }

    if (hasEVCharger === "true") {
      dbQuery = dbQuery.eq("has_ev_charger", true);
    }

    const { data: spaces, error } = await dbQuery;
    if (error) throw error;

    let results = spaces || [];

    // Map database models to match the MongoDB schema format expected by the frontend React pages
    results = results.map(s => ({
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
      rating: Number(s.average_rating || 0.0),
      reviewCount: s.review_count,
      ownerId: s.ownerId ? {
        name: s.ownerId.name,
        rating: Number(s.ownerId.rating)
      } : { name: "Host", rating: 5.0 }
    }));

    // If coordinates are provided, compute distance and sort by distance (Proximity search)
    if (!isNaN(latitude) && !isNaN(longitude)) {
      results = results.map(s => {
        const dist = getDistance(latitude, longitude, s.location.coordinates[1], s.location.coordinates[0]);
        // Implement AI Recommendation Suitability Scoring formula directly
        const raw_score = 1.0 / (1.0 + dist) * 0.4 + (s.averageRating / 5.0) * 0.4 + (1.0 - s.pricePerHour / 200.0) * 0.2;
        return {
          ...s,
          distance: Number(dist.toFixed(2)),
          aiScore: Number(raw_score.toFixed(2))
        };
      });

      // Sort by proximity or aiScore suitability score
      results.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err: any) {
    console.error("GET /api/spaces database error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseUserClient(request);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      address,
      location,
      pricePerHour,
      pricePerDay,
      pricePerMonth,
      totalSlots,
      features,
      availability,
      images,
      videoUrl,
      vehicleTypes,
      amenities,
      rules,
      instructions
    } = body;

    const lat = location?.coordinates?.[1] !== undefined ? location.coordinates[1] : (body.latitude || 0);
    const lng = location?.coordinates?.[0] !== undefined ? location.coordinates[0] : (body.longitude || 0);

    const newSpace = {
      owner_id: user.id,
      title,
      description,
      address,
      latitude: lat,
      longitude: lng,
      price_per_hour: pricePerHour,
      price_per_day: pricePerDay || null,
      price_per_month: pricePerMonth || null,
      total_slots: totalSlots || 1,
      available_slots: totalSlots || 1,
      is_covered: features?.isCovered || false,
      has_ev_charger: features?.hasEVCharger || false,
      has_cctv: features?.hasCCTV || false,
      is_security_guarded: features?.isSecurityGuarded || features?.hasSecurity || false,
      has_valet: features?.hasValet || false,
      vehicle_types: vehicleTypes || ["4-wheeler"],
      amenities: amenities || [],
      rules: rules || "",
      instructions: instructions || "",
      images: images || [],
      video_url: videoUrl || "",
      is_always_available: availability?.isAlwaysAvailable !== false,
      start_time: availability?.startTime || "00:00",
      end_time: availability?.endTime || "23:59",
      days_of_week: availability?.daysOfWeek || [0,1,2,3,4,5,6],
      status: "pending" // Auto require admin approval
    };

    const admin = getSupabaseAdminClient();
    const { data: space, error: dbError } = await admin
      .from("parking_spaces")
      .insert(newSpace)
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      data: space
    });
  } catch (err: any) {
    console.error("POST /api/spaces database error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

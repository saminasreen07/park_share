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

    const { data: favorites, error } = await admin
      .from("favorites")
      .select("*, space_id:parking_spaces(*, ownerId:profiles(*))")
      .eq("user_id", user.id);

    if (error) throw error;

    // Map to matching schema format
    const results = (favorites || []).map(f => {
      const s = f.space_id;
      if (!s) return null;
      return {
        _id: s.id,
        title: s.title,
        description: s.description,
        address: s.address,
        pricePerHour: Number(s.price_per_hour),
        images: s.images || [],
        rating: Number(s.average_rating || 0.0),
        averageRating: Number(s.average_rating || 0.0),
        location: {
          type: "Point",
          coordinates: [Number(s.longitude), Number(s.latitude)]
        },
        ownerId: s.ownerId ? {
          name: s.ownerId.name,
          rating: Number(s.ownerId.rating)
        } : { name: "Host", rating: 5.0 }
      };
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (err: any) {
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

    const { spaceId } = await request.json();
    if (!spaceId) {
      return NextResponse.json({ success: false, message: "spaceId is required" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const { data: favorite, error } = await admin
      .from("favorites")
      .insert({ user_id: user.id, space_id: spaceId })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: favorite
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseUserClient(request);
  const { searchParams } = new URL(request.url);
  const spaceId = searchParams.get("spaceId");

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!spaceId) {
      return NextResponse.json({ success: false, message: "spaceId is required" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const { error } = await admin
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("space_id", spaceId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Favorite removed successfully"
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

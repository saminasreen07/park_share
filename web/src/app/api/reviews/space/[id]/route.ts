import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-api";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = getSupabaseAdminClient();
  const { id } = params;

  try {
    const { data: reviews, error } = await admin
      .from("reviews")
      .select("*, driverId:profiles(name, avatar_url)")
      .eq("space_id", id);

    if (error) throw error;

    // Map database properties back to the frontend Review interface
    const results = (reviews || []).map((r: any) => ({
      _id: r.id,
      driverId: r.driverId ? {
        name: r.driverId.name,
        avatar: r.driverId.avatar_url
      } : { name: "Driver" },
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at
    }));

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (err: any) {
    console.error(`GET /api/reviews/space/${id} error:`, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

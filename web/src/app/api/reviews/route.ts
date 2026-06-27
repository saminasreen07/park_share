import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient } from "@/lib/supabase-api";

export async function POST(request: NextRequest) {
  const supabase = getSupabaseUserClient(request);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { bookingId, spaceId, rating, comment } = await request.json();

    if (!bookingId || !spaceId || !rating) {
      return NextResponse.json({ success: false, message: "Missing required parameters" }, { status: 400 });
    }

    const newReview = {
      booking_id: bookingId,
      user_id: user.id,
      space_id: spaceId,
      rating: Number(rating),
      comment: comment || ""
    };

    const { data: review, error } = await supabase
      .from("reviews")
      .insert(newReview)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: review
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

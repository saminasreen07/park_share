import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient, getSupabaseAdminClient } from "@/lib/supabase-api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseUserClient(request);
  const admin = getSupabaseAdminClient();
  const { id } = params;

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: space, error: fetchError } = await admin
      .from("parking_spaces")
      .select("id, available_slots, total_slots, owner_id")
      .eq("id", id)
      .single();

    if (fetchError || !space) {
      return NextResponse.json({ success: false, message: "Parking space not found" }, { status: 404 });
    }

    if (space.owner_id !== user.id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const newAvailableSlots = space.available_slots > 0 ? 0 : space.total_slots;

    const { data: updatedSpace, error: updateError } = await admin
      .from("parking_spaces")
      .update({ available_slots: newAvailableSlots })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: updatedSpace
    });
  } catch (err: any) {
    console.error(`PATCH /api/spaces/${id}/toggle-availability error:`, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

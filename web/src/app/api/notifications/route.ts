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

    const { data: notifications, error } = await admin
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: notifications || [],
      unreadCount: (notifications || []).filter((n: any) => !n.is_read).length
    });
  } catch (err: any) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = getSupabaseUserClient(request);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const { error } = await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "All notifications marked as read" });
  } catch (err: any) {
    console.error("PUT /api/notifications error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

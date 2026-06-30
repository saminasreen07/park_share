import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient, getSupabaseAdminClient } from "@/lib/supabase-api";

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();
    if (!role || !["driver", "owner", "admin"].includes(role)) {
      return NextResponse.json({ success: false, message: "Invalid role specified" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];



    const supabase = getSupabaseUserClient(request);
    const admin = getSupabaseAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: dbError } = await admin
      .from("profiles")
      .update({ role })
      .eq("id", user.id)
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

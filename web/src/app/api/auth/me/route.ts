import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient, getSupabaseAdminClient } from "@/lib/supabase-api";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1];



  const supabase = getSupabaseUserClient(request);
  const admin = getSupabaseAdminClient();
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: dbError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (dbError || !profile) {
      // Create user profile on-the-fly if trigger was skipped or for metadata sync
      const newProfile = {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
        email: user.email || "",
        phone: user.phone || user.user_metadata?.phone || "",
        role: user.user_metadata?.role || "driver",
        is_verified: false,
        rating: 5.0
      };

      const { data: createdProfile } = await admin
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();

      return NextResponse.json({
        success: true,
        data: createdProfile || newProfile
      });
    }

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

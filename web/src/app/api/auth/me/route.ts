import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient } from "@/lib/supabase-api";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  // Developer Quick Actions Mock Bypass
  if (token && token.startsWith("mock-")) {
    const role = token.split("-")[1];
    return NextResponse.json({
      success: true,
      data: {
        id: `00000000-0000-0000-0000-00000000000${role === "admin" ? "3" : role === "owner" ? "2" : "1"}`,
        name: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        email: `${role}@parkshare.com`,
        phone: "9999999999",
        role,
        is_verified: true,
        rating: 5.0,
        avatar_url: ""
      }
    });
  }

  const supabase = getSupabaseUserClient(request);
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: dbError } = await supabase
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

      const { data: createdProfile } = await supabase
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

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient } from "@/lib/supabase-api";

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();
    if (!role || !["driver", "owner", "admin"].includes(role)) {
      return NextResponse.json({ success: false, message: "Invalid role specified" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    // Developer Mock Bypass
    if (token && token.startsWith("mock-")) {
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: dbError } = await supabase
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

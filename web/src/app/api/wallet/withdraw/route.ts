import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient } from "@/lib/supabase-api";

// POST /api/wallet/withdraw (withdrawal mock triggers)
export async function POST(request: NextRequest) {
  const supabase = getSupabaseUserClient(request);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { amount, upi, bankAccount } = await request.json();
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ success: false, message: "Invalid amount specified" }, { status: 400 });
    }

    // Create a transaction/notification audit record on database if needed, or simply return success
    return NextResponse.json({
      success: true,
      message: `Withdrawal request for ₹${amount} initiated successfully. It will be settled within 24 hours.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

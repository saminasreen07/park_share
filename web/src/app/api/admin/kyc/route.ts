import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-api";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdminClient();

  try {
    // Select users that have onboarding data pending review
    const { data: users, error } = await supabase
      .from("profiles")
      .select("*")
      .not("aadhaar_number", "is", null)
      .eq("is_verified", false);

    if (error) throw error;

    const results = (users || []).map(u => ({
      _id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isVerified: u.is_verified,
      createdAt: u.created_at,
      
      // Onboarding proofs
      address: u.address,
      pinCode: u.pin_code,
      city: u.city,
      state: u.state,
      aadhaar: u.aadhaar_number,
      aadhaarFrontUrl: u.aadhaar_front_url,
      aadhaarBackUrl: u.aadhaar_back_url,
      addressProofUrl: u.address_proof_url,
      propertyProofUrl: u.property_proof_url,
      selfieUrl: u.selfie_url,
      bankDetails: u.bank_account_number ? {
        accountNumber: u.bank_account_number,
        ifsc: u.bank_ifsc,
        holderName: u.bank_holder_name
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = getSupabaseAdminClient();

  try {
    const { userId, isVerified, status } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, message: "userId is required" }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .update({
        is_verified: isVerified === undefined ? (status === "approved") : isVerified
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

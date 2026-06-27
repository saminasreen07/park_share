import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-api";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdminClient();

  try {
    const { data: tickets, error } = await supabase
      .from("tickets")
      .select("*, user_id:profiles(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const results = (tickets || []).map(t => ({
      _id: t.id,
      subject: t.subject,
      description: t.description,
      status: t.status,
      createdAt: t.created_at,
      userId: t.user_id ? {
        _id: t.user_id.id,
        name: t.user_id.name,
        email: t.user_id.email,
        phone: t.user_id.phone
      } : { _id: t.user_id, name: "User" }
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
    const { ticketId, status } = await request.json();
    if (!ticketId || !status) {
      return NextResponse.json({ success: false, message: "ticketId and status are required" }, { status: 400 });
    }

    const { data: ticket, error } = await supabase
      .from("tickets")
      .update({ status })
      .eq("id", ticketId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: ticket
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

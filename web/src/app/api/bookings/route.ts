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

    // Fetch user profile to check role — use admin client to bypass broken profiles RLS
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("GET /api/bookings profile error:", profileError);
      return NextResponse.json({ success: false, message: "User profile not found" }, { status: 404 });
    }

    let bookingsQuery = admin
      .from("bookings")
      .select("*, spaceId:parking_spaces(*, ownerId:profiles(*)), driverId:profiles(*)");

    if (profile.role === "driver") {
      bookingsQuery = bookingsQuery.eq("driver_id", user.id);
    } else if (profile.role === "owner") {
      // Fetch space ids belonging to owner
      const { data: spaces } = await admin
        .from("parking_spaces")
        .select("id")
        .eq("owner_id", user.id);

      const spaceIds = (spaces || []).map(s => s.id);
      bookingsQuery = bookingsQuery.in("space_id", spaceIds);
    } else if (profile.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized access role" }, { status: 403 });
    }

    // Sort by booking creation date
    bookingsQuery = bookingsQuery.order("created_at", { ascending: false });

    const { data: bookings, error } = await bookingsQuery;
    if (error) throw error;

    // Map bookings schema to expected MongoDB format
    const results = (bookings || []).map(b => ({
      _id: b.id,
      driverId: b.driverId ? {
        _id: b.driverId.id,
        name: b.driverId.name,
        phone: b.driverId.phone,
        email: b.driverId.email
      } : { _id: b.driver_id, name: "Driver" },
      spaceId: b.spaceId ? {
        _id: b.spaceId.id,
        title: b.spaceId.title,
        address: b.spaceId.address,
        pricePerHour: Number(b.spaceId.price_per_hour),
        images: b.spaceId.images || [],
        location: {
          type: "Point",
          coordinates: [Number(b.spaceId.longitude), Number(b.spaceId.latitude)]
        },
        ownerId: b.spaceId.ownerId ? {
          _id: b.spaceId.owner_id,
          name: b.spaceId.ownerId.name,
          phone: b.spaceId.ownerId.phone,
          email: b.spaceId.ownerId.email
        } : { _id: b.spaceId.owner_id, name: "Owner" }
      } : null,
      startTime: b.start_time,
      endTime: b.end_time,
      totalAmount: Number(b.total_amount),
      status: b.status,
      vehicleNumber: b.vehicle_number,
      vehicleType: b.vehicle_type,
      
      // Uploaded verification documents
      vehicleFrontUrl: b.vehicle_front_url,
      vehicleRearUrl: b.vehicle_rear_url,
      vehicleSideUrl: b.vehicle_side_url,
      licenseFrontUrl: b.license_front_url,
      licenseBackUrl: b.license_back_url,
      driverAadhaarFrontUrl: b.driver_aadhaar_front_url,
      driverAadhaarBackUrl: b.driver_aadhaar_back_url,
      
      receiptId: b.receipt_id,
      paymentId: b.payment_id,
      checkInTime: b.check_in_time,
      checkOutTime: b.check_out_time,
      createdAt: b.created_at,
      updatedAt: b.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (err: any) {
    console.error("GET /api/bookings database error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseUserClient(request);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      spaceId,
      startTime,
      endTime,
      totalAmount,
      vehicleNumber,
      vehicleType,
      vehicleModel
    } = body;

    if (!spaceId || !startTime || !endTime || !totalAmount) {
      return NextResponse.json({ success: false, message: "Missing required booking details" }, { status: 400 });
    }

    const newBooking: any = {
      driver_id: user.id,
      space_id: spaceId,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      total_amount: Number(totalAmount),
      vehicle_number: vehicleNumber || "",
      vehicle_type: vehicleType || "car",
      status: "pending"
    };

    // Store vehicle_model if the column exists (added via SQL migration)
    if (vehicleModel !== undefined) {
      newBooking.vehicle_model = vehicleModel || "";
    }

    const admin = getSupabaseAdminClient();

    // Try inserting with vehicle_model; if that column doesn't exist yet, retry without it
    let booking: any = null;
    let dbError: any = null;

    const result = await admin
      .from("bookings")
      .insert(newBooking)
      .select()
      .single();

    booking = result.data;
    dbError = result.error;

    // If error is about missing vehicle_model column, retry without it
    if (dbError && dbError.message && dbError.message.includes("vehicle_model")) {
      const { vehicle_model, ...bookingWithoutModel } = newBooking;
      const retryResult = await admin
        .from("bookings")
        .insert(bookingWithoutModel)
        .select()
        .single();
      booking = retryResult.data;
      dbError = retryResult.error;
    }

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      data: booking
    });
  } catch (err: any) {
    console.error("POST /api/bookings database error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

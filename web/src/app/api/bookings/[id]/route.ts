import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient, getSupabaseAdminClient } from "@/lib/supabase-api";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = getSupabaseAdminClient();
  const { id } = params;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  }

  try {
    const { data: booking, error } = await admin
      .from("bookings")
      .select("*, spaceId:parking_spaces(*, ownerId:profiles(*)), driverId:profiles(*)")
      .eq("id", id)
      .single();

    if (error || !booking) {
      console.error(`GET /api/bookings/${id} db error:`, error);
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    // Map schema
    const result = {
      _id: booking.id,
      driverId: booking.driverId ? {
        _id: booking.driverId.id,
        name: booking.driverId.name,
        phone: booking.driverId.phone,
        email: booking.driverId.email
      } : { _id: booking.driver_id, name: "Driver" },
      spaceId: booking.spaceId ? {
        _id: booking.spaceId.id,
        title: booking.spaceId.title,
        address: booking.spaceId.address,
        pricePerHour: Number(booking.spaceId.price_per_hour),
        images: booking.spaceId.images || [],
        location: {
          type: "Point",
          coordinates: [Number(booking.spaceId.longitude), Number(booking.spaceId.latitude)]
        },
        ownerId: booking.spaceId.ownerId ? {
          _id: booking.spaceId.owner_id,
          name: booking.spaceId.ownerId.name,
          phone: booking.spaceId.ownerId.phone,
          email: booking.spaceId.ownerId.email
        } : { _id: booking.spaceId.owner_id, name: "Owner" }
      } : null,
      startTime: booking.start_time,
      endTime: booking.end_time,
      totalAmount: Number(booking.total_amount),
      status: booking.status,
      vehicleNumber: booking.vehicle_number,
      vehicleType: booking.vehicle_type,
      vehicleModel: booking.vehicle_model || "",
      // Convenience object for confirmation/checkout pages
      vehicleDetails: {
        model: booking.vehicle_model || booking.vehicle_type || "Vehicle",
        plateNumber: booking.vehicle_number || ""
      },
      
      // Uploaded verification documents
      vehicleFrontUrl: booking.vehicle_front_url,
      vehicleRearUrl: booking.vehicle_rear_url,
      vehicleSideUrl: booking.vehicle_side_url,
      licenseFrontUrl: booking.license_front_url,
      licenseBackUrl: booking.license_back_url,
      driverAadhaarFrontUrl: booking.driver_aadhaar_front_url,
      driverAadhaarBackUrl: booking.driver_aadhaar_back_url,
      
      receiptId: booking.receipt_id,
      paymentId: booking.payment_id,
      checkInTime: booking.check_in_time,
      checkOutTime: booking.check_out_time,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at
    };

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    console.error(`GET /api/bookings/${id} catch error:`, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseUserClient(request);
  const { id } = params;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      status,
      vehicleNumber,
      vehicleType,
      vehicleModel,
      vehicleFrontUrl,
      vehicleRearUrl,
      vehicleSideUrl,
      licenseFrontUrl,
      licenseBackUrl,
      driverAadhaarFrontUrl,
      driverAadhaarBackUrl,
      checkInTime,
      checkOutTime,
      paymentId
    } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (vehicleNumber !== undefined) updateData.vehicle_number = vehicleNumber;
    if (vehicleType !== undefined) updateData.vehicle_type = vehicleType;
    if (vehicleModel !== undefined) updateData.vehicle_model = vehicleModel;
    if (vehicleFrontUrl !== undefined) updateData.vehicle_front_url = vehicleFrontUrl;
    if (vehicleRearUrl !== undefined) updateData.vehicle_rear_url = vehicleRearUrl;
    if (vehicleSideUrl !== undefined) updateData.vehicle_side_url = vehicleSideUrl;
    if (licenseFrontUrl !== undefined) updateData.license_front_url = licenseFrontUrl;
    if (licenseBackUrl !== undefined) updateData.license_back_url = licenseBackUrl;
    if (driverAadhaarFrontUrl !== undefined) updateData.driver_aadhaar_front_url = driverAadhaarFrontUrl;
    if (driverAadhaarBackUrl !== undefined) updateData.driver_aadhaar_back_url = driverAadhaarBackUrl;
    if (paymentId !== undefined) updateData.payment_id = paymentId;
    
    // Check-in and check-out operation timestamps mapping
    if (checkInTime === "now") {
      updateData.check_in_time = new Date().toISOString();
      updateData.status = "active";
    } else if (checkInTime) {
      updateData.check_in_time = new Date(checkInTime).toISOString();
    }
    
    const admin = getSupabaseAdminClient();
    if (checkOutTime === "now") {
      updateData.check_out_time = new Date().toISOString();
      updateData.status = "completed";
      
      // On check-out completed, release parking space available slots
      const { data: booking } = await admin.from("bookings").select("space_id").eq("id", id).single();
      if (booking) {
        // Increment available slots
        const { data: space } = await admin.from("parking_spaces").select("available_slots, total_slots").eq("id", booking.space_id).single();
        if (space && space.available_slots < space.total_slots) {
          await admin.from("parking_spaces").update({ available_slots: space.available_slots + 1 }).eq("id", booking.space_id);
        }
      }
    } else if (checkOutTime) {
      updateData.check_out_time = new Date(checkOutTime).toISOString();
    }

    const { data: updatedBooking, error: dbError } = await admin
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      data: updatedBooking
    });
  } catch (err: any) {
    console.error(`PUT /api/bookings/${id} error:`, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

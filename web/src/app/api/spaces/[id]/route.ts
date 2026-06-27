import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient } from "@/lib/supabase-api";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseUserClient(request);
  const { id } = params;

  try {
    const { data: space, error } = await supabase
      .from("parking_spaces")
      .select("*, ownerId:profiles(name, rating, phone, email)")
      .eq("id", id)
      .single();

    if (error || !space) {
      console.error(`GET /api/spaces/${id} db error:`, error);
      return NextResponse.json({ success: false, message: "Parking space not found" }, { status: 404 });
    }

    // Map database properties back to MongoDB schema
    const result = {
      _id: space.id,
      title: space.title,
      description: space.description,
      address: space.address,
      pricePerHour: Number(space.price_per_hour),
      pricePerDay: Number(space.price_per_day || 0),
      pricePerMonth: Number(space.price_per_month || 0),
      totalSlots: space.total_slots,
      availableSlots: space.available_slots,
      features: {
        hasEVCharger: space.has_ev_charger,
        hasCCTV: space.has_cctv,
        isCovered: space.is_covered,
        isSecurityGuarded: space.is_security_guarded,
        hasValet: space.has_valet
      },
      images: space.images || [],
      videoUrl: space.video_url || "",
      location: {
        type: "Point",
        coordinates: [Number(space.longitude), Number(space.latitude)]
      },
      status: space.status,
      averageRating: Number(space.average_rating || 0.0),
      reviewCount: space.review_count,
      vehicleTypes: space.vehicle_types || ["4-wheeler"],
      amenities: space.amenities || [],
      rules: space.rules || "",
      instructions: space.instructions || "",
      availability: {
        isAlwaysAvailable: space.is_always_available,
        startTime: space.start_time,
        endTime: space.end_time,
        daysOfWeek: space.days_of_week
      },
      ownerId: space.ownerId ? {
        _id: space.owner_id,
        name: space.ownerId.name,
        rating: Number(space.ownerId.rating),
        phone: space.ownerId.phone,
        email: space.ownerId.email
      } : { _id: space.owner_id, name: "Host", rating: 5.0 }
    };

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    console.error(`GET /api/spaces/${id} catch error:`, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseUserClient(request);
  const { id } = params;

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      address,
      location,
      pricePerHour,
      pricePerDay,
      pricePerMonth,
      totalSlots,
      features,
      availability,
      images,
      videoUrl,
      vehicleTypes,
      amenities,
      rules,
      instructions,
      status
    } = body;

    const lat = location?.coordinates?.[1];
    const lng = location?.coordinates?.[0];

    // Build update payload dynamically
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (lat !== undefined) updateData.latitude = lat;
    if (lng !== undefined) updateData.longitude = lng;
    if (pricePerHour !== undefined) updateData.price_per_hour = pricePerHour;
    if (pricePerDay !== undefined) updateData.price_per_day = pricePerDay;
    if (pricePerMonth !== undefined) updateData.price_per_month = pricePerMonth;
    if (totalSlots !== undefined) updateData.total_slots = totalSlots;
    if (videoUrl !== undefined) updateData.video_url = videoUrl;
    if (images !== undefined) updateData.images = images;
    if (vehicleTypes !== undefined) updateData.vehicle_types = vehicleTypes;
    if (amenities !== undefined) updateData.amenities = amenities;
    if (rules !== undefined) updateData.rules = rules;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (status !== undefined) updateData.status = status;

    if (features) {
      if (features.isCovered !== undefined) updateData.is_covered = features.isCovered;
      if (features.hasEVCharger !== undefined) updateData.has_ev_charger = features.hasEVCharger;
      if (features.hasCCTV !== undefined) updateData.has_cctv = features.hasCCTV;
      if (features.isSecurityGuarded !== undefined) updateData.is_security_guarded = features.isSecurityGuarded;
      if (features.hasValet !== undefined) updateData.has_valet = features.hasValet;
    }

    if (availability) {
      if (availability.isAlwaysAvailable !== undefined) updateData.is_always_available = availability.isAlwaysAvailable;
      if (availability.startTime !== undefined) updateData.start_time = availability.startTime;
      if (availability.endTime !== undefined) updateData.end_time = availability.endTime;
      if (availability.daysOfWeek !== undefined) updateData.days_of_week = availability.daysOfWeek;
    }

    const { data: updatedSpace, error: dbError } = await supabase
      .from("parking_spaces")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      data: updatedSpace
    });
  } catch (err: any) {
    console.error(`PUT /api/spaces/${id} error:`, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseUserClient(request);
  const { id } = params;

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { error: dbError } = await supabase
      .from("parking_spaces")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      message: "parking space deleted successfully"
    });
  } catch (err: any) {
    console.error(`DELETE /api/spaces/${id} error:`, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

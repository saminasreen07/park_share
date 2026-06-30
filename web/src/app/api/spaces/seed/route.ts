import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-api";

// 40+ Tamil Nadu parking locations (real lat/lng coordinates)
const TAMIL_NADU_SPACES = [
  { title: "Chennai Central Railway Station Parking", address: "Park Town, Chennai - 600003", lat: 13.0827, lng: 80.2707, price: 30, slots: 50, ev: false, cctv: true, covered: false, security: true, desc: "Official multi-level car park adjacent to Chennai Central. Secure, covered bays, 24x7 security." },
  { title: "T. Nagar Pondy Bazaar Multi-Level Car Park", address: "Pondy Bazaar, T. Nagar, Chennai - 600017", lat: 13.0418, lng: 80.2341, price: 40, slots: 120, ev: true, cctv: true, covered: true, security: true, desc: "Premium covered multi-level parking in the heart of T. Nagar shopping district. EV charging available." },
  { title: "Anna Nagar East Covered Parking", address: "Anna Nagar East, Chennai - 600102", lat: 13.0858, lng: 80.2101, price: 35, slots: 30, ev: false, cctv: true, covered: true, security: false, desc: "Convenient covered parking near Anna Nagar Tower park. Perfect for shoppers and office workers." },
  { title: "Express Avenue Mall Basement Parking", address: "Express Avenue, Royapettah, Chennai - 600002", lat: 13.0569, lng: 80.2619, price: 50, slots: 200, ev: true, cctv: true, covered: true, security: true, desc: "Large basement parking at Express Avenue mall. EV charging stations, valet service available." },
  { title: "Phoenix MarketCity Covered Parking", address: "Velachery, Chennai - 600042", lat: 12.9794, lng: 80.2209, price: 45, slots: 300, ev: true, cctv: true, covered: true, security: true, desc: "Massive covered parking complex at Phoenix MarketCity. Multiple EV chargers, 24x7 security." },
  { title: "Mylapore Kapaleeshwarar Temple Parking", address: "Mylapore, Chennai - 600004", lat: 13.0336, lng: 80.2693, price: 20, slots: 40, ev: false, cctv: false, covered: false, security: false, desc: "Open-air parking near the famous Kapaleeshwarar Temple. Ideal for pilgrims and tourists." },
  { title: "Adyar Bus Terminus Parking", address: "Adyar, Chennai - 600020", lat: 13.0012, lng: 80.2565, price: 25, slots: 60, ev: false, cctv: true, covered: false, security: true, desc: "Large open parking area near Adyar bus terminus. Affordable daily rates." },
  { title: "Nungambakkam Covered Lot", address: "Nungambakkam, Chennai - 600034", lat: 13.0605, lng: 80.2409, price: 45, slots: 25, ev: true, cctv: true, covered: true, security: true, desc: "Premium private parking in Nungambakkam business district. EV charger, 24x7 access." },
  { title: "Egmore Museum Open Parking", address: "Egmore, Chennai - 600008", lat: 13.0716, lng: 80.2626, price: 20, slots: 35, ev: false, cctv: false, covered: false, security: false, desc: "Open-air parking near Government Museum, Egmore. Great for tourists." },
  { title: "Marina Beach Promenade Parking", address: "Marina Beach, Chennai - 600001", lat: 13.0490, lng: 80.2824, price: 15, slots: 80, ev: false, cctv: false, covered: false, security: true, desc: "Open beach-front parking along the famous Marina Beach promenade." },
  { title: "Velachery IT Corridor Covered Parking", address: "Velachery, Chennai - 600042", lat: 12.9830, lng: 80.2180, price: 40, slots: 45, ev: true, cctv: true, covered: true, security: true, desc: "Modern covered parking serving IT companies along Velachery corridor. Fast EV charging." },
  { title: "OMR Sholinganallur IT Park Parking", address: "Sholinganallur, Chennai - 600119", lat: 12.9000, lng: 80.2276, price: 35, slots: 100, ev: true, cctv: true, covered: false, security: true, desc: "Open parking serving major IT parks on OMR. Corporate monthly passes available." },
  { title: "Tidel Park Taramani Basement", address: "Taramani, Chennai - 600113", lat: 12.9856, lng: 80.2392, price: 30, slots: 80, ev: true, cctv: true, covered: true, security: true, desc: "Basement parking at Tidel Park IT SEZ. Secure, covered, EV charging." },
  { title: "Coimbatore RS Puram Covered Parking", address: "R.S. Puram, Coimbatore - 641002", lat: 11.0022, lng: 76.9613, price: 25, slots: 40, ev: false, cctv: true, covered: true, security: false, desc: "Covered parking in the prime commercial zone of RS Puram, Coimbatore." },
  { title: "Coimbatore Brookefields Mall Parking", address: "Krishnaswamy Road, Coimbatore - 641001", lat: 11.0081, lng: 76.9629, price: 35, slots: 120, ev: true, cctv: true, covered: true, security: true, desc: "Spacious multi-level parking at Brookefields Mall with EV charging." },
  { title: "Madurai Meenakshi Temple Car Park", address: "Madurai City, Madurai - 625001", lat: 9.9195, lng: 78.1193, price: 15, slots: 70, ev: false, cctv: false, covered: false, security: true, desc: "Official parking area near the iconic Meenakshi Amman Temple. Walking distance from the east tower." },
  { title: "Madurai Samanar Hills Commercial Parking", address: "Keelakuilkudi, Madurai - 625001", lat: 9.9248, lng: 78.0876, price: 20, slots: 30, ev: false, cctv: true, covered: false, security: false, desc: "Commercial area parking near Madurai city center." },
  { title: "Trichy Rock Fort Temple Parking", address: "Rock Fort Area, Trichy - 620002", lat: 10.8200, lng: 78.6979, price: 15, slots: 50, ev: false, cctv: false, covered: false, security: false, desc: "Open parking near the famous Rock Fort Ucchi Pillayar Temple, Trichy." },
  { title: "Trichy Thillai Nagar Covered Lot", address: "Thillai Nagar, Trichy - 620018", lat: 10.8114, lng: 78.6980, price: 25, slots: 20, ev: false, cctv: true, covered: true, security: false, desc: "Covered private parking in the upscale Thillai Nagar residential area." },
  { title: "Salem Junction Railway Station Parking", address: "Salem Junction, Salem - 636001", lat: 11.6643, lng: 78.1460, price: 20, slots: 60, ev: false, cctv: true, covered: false, security: true, desc: "Large open parking area adjacent to Salem Railway Junction." },
  { title: "Vellore CMC Hospital Parking", address: "Arni Road, Vellore - 632004", lat: 12.9249, lng: 79.1325, price: 20, slots: 80, ev: false, cctv: true, covered: false, security: true, desc: "Parking near Christian Medical College (CMC) Vellore for patients and visitors." },
  { title: "Ooty Lake Tourist Parking", address: "Ooty Lake Road, Udhagamandalam - 643001", lat: 11.4102, lng: 76.6950, price: 25, slots: 40, ev: false, cctv: false, covered: false, security: false, desc: "Scenic parking near Ooty Lake. Ideal for tourists visiting the Nilgiris." },
  { title: "Kodaikanal Bus Stand Parking", address: "Kodaikanal Bus Stand, Dindigul - 624101", lat: 10.2381, lng: 77.4892, price: 20, slots: 30, ev: false, cctv: false, covered: false, security: false, desc: "Parking near the main bus stand in Kodaikanal hill station." },
  { title: "Pondicherry MG Road Parking", address: "MG Road, Puducherry - 605001", lat: 11.9416, lng: 79.8083, price: 20, slots: 35, ev: false, cctv: true, covered: false, security: false, desc: "Street-side covered parking on the main MG Road, Pondicherry." },
  { title: "Pondicherry French Quarter Parking", address: "White Town, Puducherry - 605001", lat: 11.9328, lng: 79.8331, price: 30, slots: 15, ev: false, cctv: true, covered: false, security: false, desc: "Premium spot in the heritage French Quarter zone. Limited slots — book early!" },
  { title: "Tiruppur Textile Market Parking", address: "Avinashi Road, Tiruppur - 641601", lat: 11.1075, lng: 77.3463, price: 20, slots: 50, ev: false, cctv: true, covered: false, security: false, desc: "Convenient open parking near the famous Tiruppur textile wholesale market." },
  { title: "Erode Bus Station Parking", address: "Erode Bus Stand, Erode - 638001", lat: 11.3410, lng: 77.7172, price: 15, slots: 60, ev: false, cctv: false, covered: false, security: true, desc: "Open parking near Erode Central Bus Stand." },
  { title: "Thanjavur Brihadeeswara Temple Parking", address: "Thanjavur Big Temple, Thanjavur - 613001", lat: 10.7825, lng: 79.1317, price: 15, slots: 80, ev: false, cctv: false, covered: false, security: true, desc: "UNESCO heritage site parking near the Brihadeeswara Temple, Thanjavur." },
  { title: "Kanchipuram Varadaraja Perumal Temple Parking", address: "Temple Street, Kanchipuram - 631501", lat: 12.8452, lng: 79.7036, price: 15, slots: 50, ev: false, cctv: false, covered: false, security: false, desc: "Parking near Varadaraja Perumal Temple in silk city Kanchipuram." },
  { title: "Tirunelveli Town KSRTC Parking", address: "High Ground Road, Tirunelveli - 627001", lat: 8.7139, lng: 77.7567, price: 15, slots: 40, ev: false, cctv: false, covered: false, security: false, desc: "Parking near KSRTC bus stand, Tirunelveli. Easy access to town center." },
  { title: "Sivakasi Fireworks Market Parking", address: "Sivakasi Main Road, Virudhunagar - 626123", lat: 9.4520, lng: 77.7969, price: 15, slots: 25, ev: false, cctv: false, covered: false, security: false, desc: "Open parking near the Sivakasi fireworks market complex." },
  { title: "Ramanathapuram Rameswaram Temple Parking", address: "Rameswaram Island, Ramanathapuram - 623526", lat: 9.2885, lng: 79.3129, price: 20, slots: 100, ev: false, cctv: false, covered: false, security: true, desc: "Large open parking area for pilgrims visiting the Rameswaram Jyotirlinga Temple." },
  { title: "Kanyakumari Vivekananda Rock Parking", address: "Kanyakumari, Kanyakumari District - 629702", lat: 8.0883, lng: 77.5385, price: 20, slots: 60, ev: false, cctv: true, covered: false, security: true, desc: "Parking near Vivekananda Rock Memorial at the tip of India." },
  { title: "Hosur Electronic City Annex Parking", address: "Hosur Main Road, Hosur - 635109", lat: 12.7279, lng: 77.8278, price: 30, slots: 80, ev: true, cctv: true, covered: false, security: true, desc: "Strategic parking near Hosur industrial estates and electronic manufacturing companies." },
  { title: "Krishnagiri National Highway Parking", address: "NH-44, Krishnagiri - 635001", lat: 12.5186, lng: 78.2133, price: 20, slots: 40, ev: false, cctv: true, covered: false, security: true, desc: "Highway-side parking near Krishnagiri. Good for long-distance travelers on NH-44." },
  { title: "Nagercoil Town Bus Stand Parking", address: "Nagercoil Bus Stand, Kanyakumari - 629001", lat: 8.1787, lng: 77.4369, price: 15, slots: 40, ev: false, cctv: false, covered: false, security: false, desc: "Open parking near Nagercoil central bus terminus." },
  { title: "Dindigul Fort Parking", address: "Rock Fort, Dindigul - 624001", lat: 10.3673, lng: 77.9803, price: 15, slots: 30, ev: false, cctv: false, covered: false, security: false, desc: "Open parking near the historic Dindigul Fort and palace." },
  { title: "Kumbakonam Mahamaham Tank Parking", address: "Mahamaham Tank, Kumbakonam - 612001", lat: 10.9601, lng: 79.3845, price: 15, slots: 60, ev: false, cctv: false, covered: false, security: false, desc: "Parking near the sacred Mahamaham tank in Kumbakonam, temple city of Tamil Nadu." },
  { title: "Ariyalur SIDCO Industrial Parking", address: "SIDCO Industrial Estate, Ariyalur - 621704", lat: 11.1412, lng: 79.0750, price: 20, slots: 30, ev: false, cctv: true, covered: false, security: true, desc: "Industrial zone parking near SIDCO estate in Ariyalur." },
  { title: "Periyakulam Town Centre Parking", address: "Periyakulam Town, Theni - 625601", lat: 10.1159, lng: 77.5525, price: 15, slots: 25, ev: false, cctv: false, covered: false, security: false, desc: "Open parking in Periyakulam town center, gateway to the Kumaragiri mountain station." },
];

export async function POST(request: NextRequest) {
  // Admin-only seed endpoint — secured by admin secret header
  const adminSecret = request.headers.get("x-admin-secret");
  if (adminSecret !== (process.env.SEED_SECRET || "parkshare-seed-2026")) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    // Check if spaces already exist
    const { count } = await supabase.from("parking_spaces").select("id", { count: "exact", head: true });
    
    if ((count || 0) >= 10) {
      return NextResponse.json({
        success: true,
        message: `Seed skipped. ${count} spaces already exist in database.`
      });
    }

    // Get any existing owner id (use first profile or a placeholder)
    const { data: profile } = await supabase.from("profiles").select("id").limit(1).single();
    const ownerId = profile?.id || "00000000-0000-0000-0000-000000000001";

    const spacesToInsert = TAMIL_NADU_SPACES.map(s => ({
      owner_id: ownerId,
      title: s.title,
      description: s.desc,
      address: s.address,
      latitude: s.lat,
      longitude: s.lng,
      price_per_hour: s.price,
      price_per_day: s.price * 10,
      price_per_month: s.price * 200,
      total_slots: s.slots,
      available_slots: s.slots,
      has_ev_charger: s.ev,
      has_cctv: s.cctv,
      is_covered: s.covered,
      is_security_guarded: s.security,
      has_valet: false,
      vehicle_types: ["4-wheeler", "2-wheeler"],
      amenities: [],
      rules: "No overnight parking. Park within marked bays.",
      instructions: "Show booking QR code to security guard at entry.",
      images: [],
      video_url: "",
      is_always_available: true,
      start_time: "06:00",
      end_time: "23:00",
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      status: "approved",
      average_rating: (3.8 + Math.random() * 1.2).toFixed(1),
      review_count: Math.floor(Math.random() * 80 + 5)
    }));

    const { data: inserted, error } = await supabase
      .from("parking_spaces")
      .insert(spacesToInsert)
      .select("id, title");

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${inserted.length} Tamil Nadu parking locations`,
      data: inserted
    });
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

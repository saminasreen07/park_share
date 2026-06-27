import { NextRequest, NextResponse } from "next/server";
import { GET as getBookings } from "../route";

export async function GET(request: NextRequest) {
  return getBookings(request);
}

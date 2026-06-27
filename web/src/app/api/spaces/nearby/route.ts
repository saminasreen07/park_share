import { NextRequest, NextResponse } from "next/server";
import { GET as getSpaces } from "../route";

export async function GET(request: NextRequest) {
  // Alias the query parameters to spaces query
  return getSpaces(request);
}

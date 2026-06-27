import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-id.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";

export function getSupabaseUserClient(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  
  const token = authHeader.split(" ")[1];
  
  // Handlers can check if this token is a mock token for development bypass
  // E.g. 'mock-driver', 'mock-owner', 'mock-admin'
  if (token.startsWith("mock-")) {
    // Return admin client for quick developer onboarding testing if keys not fully configured
    return createClient(supabaseUrl, supabaseServiceKey);
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export function getSupabaseAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
}

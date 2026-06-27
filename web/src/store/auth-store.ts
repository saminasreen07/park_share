import { create } from "zustand";
import Cookies from "js-cookie";
import { supabase } from "@/lib/supabase-client";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "driver" | "owner" | "admin" | "";
  is_verified: boolean;
  avatar_url?: string;
  address?: string;
  pin_code?: string;
  city?: string;
  state?: string;
  aadhaar_number?: string;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<UserProfile | null>;
  switchRole: (role: "driver" | "owner") => Promise<boolean>;
  setLoading: (loading: boolean) => void;
  loginSandbox: (role: "driver" | "owner" | "admin") => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    if (user) {
      Cookies.set("parkshare_role", user.role, { expires: 7, secure: true, sameSite: "strict" });
      if (typeof window !== "undefined") {
        localStorage.setItem("parkshare_role", user.role);
      }
      set({ user, isAuthenticated: true, isLoading: false });
    } else {
      Cookies.remove("parkshare_role");
      if (typeof window !== "undefined") {
        localStorage.removeItem("parkshare_role");
      }
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    const token = Cookies.get("parkshare_token");
    if (!token?.startsWith("mock-")) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("SignOut error:", err);
      }
    }
    
    Cookies.remove("parkshare_token");
    Cookies.remove("parkshare_role");
    
    if (typeof window !== "undefined") {
      localStorage.removeItem("parkshare_token");
      localStorage.removeItem("parkshare_role");
    }
    
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true });
    try {
      const mockToken = Cookies.get("parkshare_token") || (typeof window !== "undefined" ? localStorage.getItem("parkshare_token") : null);
      
      // Sandbox bypass check
      if (mockToken && mockToken.startsWith("mock-")) {
        const role = mockToken.replace("mock-", "").replace("-token", "") as "driver" | "owner" | "admin";
        const tempUser: UserProfile = {
          id: `mock-${role}-id`,
          name: `Mock ${role.toUpperCase()}`,
          email: `${role}@parkshare.com`,
          phone: "+919999999999",
          role: role,
          is_verified: true,
        };
        set({ user: tempUser, isAuthenticated: true, isLoading: false });
        return tempUser;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Cookies.remove("parkshare_token");
        Cookies.remove("parkshare_role");
        set({ user: null, isAuthenticated: false, isLoading: false });
        return null;
      }

      Cookies.set("parkshare_token", session.access_token, { expires: 7, secure: true, sameSite: "strict" });

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error || !profile) {
        console.error("Error fetching user profile:", error);
        const tempUser: UserProfile = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User",
          email: session.user.email || "",
          phone: session.user.phone || "",
          role: (session.user.user_metadata?.role as any) || "driver",
          is_verified: false,
        };
        get().setUser(tempUser);
        return tempUser;
      }

      const mappedUser: UserProfile = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        is_verified: profile.is_verified,
        avatar_url: profile.avatar_url,
        address: profile.address,
        pin_code: profile.pin_code,
        city: profile.city,
        state: profile.state,
        aadhaar_number: profile.aadhaar_number
      };

      get().setUser(mappedUser);
      return mappedUser;
    } catch (error) {
      console.error("Error fetching current user session:", error);
      set({ isLoading: false });
      return null;
    }
  },

  switchRole: async (role) => {
    const user = get().user;
    if (!user) return false;
    
    // Sandbox role switcher bypass
    if (user.id.startsWith("mock-")) {
      const updatedUser = { ...user, role };
      get().setUser(updatedUser);
      return true;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", user.id);

      if (error) throw error;

      const updatedUser = { ...user, role };
      get().setUser(updatedUser);
      return true;
    } catch (error) {
      console.error("Error switching role:", error);
      return false;
    }
  },

  loginSandbox: (role) => {
    const mockToken = `mock-${role}-token`;
    Cookies.set("parkshare_token", mockToken, { expires: 7, secure: true, sameSite: "strict" });
    Cookies.set("parkshare_role", role, { expires: 7, secure: true, sameSite: "strict" });
    
    if (typeof window !== "undefined") {
      localStorage.setItem("parkshare_token", mockToken);
      localStorage.setItem("parkshare_role", role);
    }

    const mockUser: UserProfile = {
      id: `mock-${role}-id`,
      name: `Mock ${role.toUpperCase()}`,
      email: `${role}@parkshare.com`,
      phone: "+919999999999",
      role: role,
      is_verified: true
    };

    set({ user: mockUser, isAuthenticated: true, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));

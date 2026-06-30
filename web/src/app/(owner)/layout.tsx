"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { LayoutDashboard, Car, Landmark, Star, CreditCard, ChevronRight, Menu, X, Landmark as Bank, Settings, LogOut, Sun, Moon } from "lucide-react";
import toast from "react-hot-toast";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, fetchCurrentUser } = useAuthStore();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Fetch user profile session
    fetchCurrentUser();

    // Sync theme
    const currentTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark";
    if (currentTheme) {
      setTheme(currentTheme);
    }
  }, [fetchCurrentUser]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const menuItems = [
    { label: "Overview", href: "/owner/dashboard", icon: LayoutDashboard },
    { label: "My Listings", href: "/owner/listings", icon: Car },
    { label: "Bookings List", href: "/owner/bookings", icon: Landmark },
    { label: "Earnings Wallet", href: "/owner/earnings", icon: Bank },
    { label: "Profile Settings", href: "/profile/edit", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] transition-colors duration-200 flex">
      {/* Sidebar navigation */}
      <aside
        className={`bg-white dark:bg-[#131B2E] border-r border-slate-200 dark:border-slate-800 transition-all duration-200 z-30 flex flex-col justify-between ${
          sidebarOpen ? "w-64" : "w-16"
        } fixed md:static h-full min-h-screen`}
      >
        <div className="space-y-6">
          {/* Logo header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
            <Link href="/" className="flex items-center gap-2 group overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-secondary to-[#003D6D] flex items-center justify-center shadow-md">
                <Car className="w-5 h-5 text-white" />
              </div>
              {sidebarOpen && (
                <span className="text-base font-bold bg-gradient-to-r from-secondary to-[#004E89] bg-clip-text text-transparent whitespace-nowrap">
                  HostHub
                </span>
              )}
            </Link>
            
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
            >
              {sidebarOpen ? <X className="w-4 h-4 md:hidden" /> : <Menu className="w-4 h-4 md:hidden" />}
            </button>
          </div>

          {/* Links list */}
          <nav className="px-2 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? "text-secondary bg-secondary/5 dark:bg-secondary/10"
                      : "text-slate-600 dark:text-slate-400 hover:text-secondary hover:bg-slate-100 dark:hover:bg-slate-850"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-2 space-y-1.5 border-t border-slate-200 dark:border-slate-800">
          {/* Switch Portal */}
          <Link
            href="/search"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/5 transition uppercase tracking-wider"
          >
            <RefreshCwIcon className="w-5 h-5 text-primary flex-shrink-0" />
            {sidebarOpen && "Driver Portal"}
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-500/5 transition text-left"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Body columns */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Main top header */}
        <header className="h-16 bg-white dark:bg-[#131B2E] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 transition">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hidden md:block"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-slate-800 dark:text-white capitalize hidden sm:block">
              {pathname.split("/").pop()?.replace("-", " ") || "Host Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Profile Brief */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-sm">
                  {user.name[0]}
                </div>
                <div className="flex flex-col hidden sm:flex text-left">
                  <span className="text-xs font-bold leading-tight">{user.name}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Host Role</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Inline helper icon
function RefreshCwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

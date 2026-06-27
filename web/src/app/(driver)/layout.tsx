"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Car, Bell, Wallet, Star, User, Moon, Sun, Menu, X, Landmark, LogOut } from "lucide-react";
import toast from "react-hot-toast";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(2);

  useEffect(() => {
    // Read theme from document attributes
    const currentTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark";
    if (currentTheme) {
      setTheme(currentTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    toast.success(`Switched to ${nextTheme} theme`);
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const navLinks = [
    { label: "Find Parking", href: "/search", icon: Car },
    { label: "Bookings", href: "/bookings", icon: Landmark },
    { label: "Wallet", href: "/wallet", icon: Wallet },
    { label: "Favorites", href: "/favorites", icon: Star },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] transition-colors duration-200 flex flex-col">
      {/* Navigation Header */}
      <nav className="glass-nav sticky top-0 z-50 w-full transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center shadow-md shadow-primary/20 group-hover:rotate-6 transition-transform">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                  ParkShare
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                      isActive
                        ? "text-primary bg-primary/5 dark:bg-primary/10"
                        : "text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Right Side Icons */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setUnreadNotifications(0);
                  }}
                  className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white dark:border-[#090D16]">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 glass-card rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-4 animate-fade-in text-foreground">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-sm">Notifications</span>
                      <button 
                        onClick={() => setNotificationsOpen(false)}
                        className="text-xs text-primary hover:underline font-semibold"
                      >
                        Close
                      </button>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                      <div className="p-2.5 rounded-lg bg-primary/10 dark:bg-primary/20 border-l-4 border-primary">
                        <p className="text-xs font-bold text-slate-800 dark:text-white">Booking Approved!</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Your booking at Nexon Private Garage has been approved by the host.</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <p className="text-xs font-bold text-slate-800 dark:text-white">Welcome to ParkShare</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Find secure, cheap parking nearby and start saving today.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* User Avatar & Logout */}
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{user.name}</span>
                    <Link
                      href={user.role === "owner" ? "/owner/dashboard" : "/onboarding/owner"}
                      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                    >
                      {user.role === "owner" ? "Host Dashboard" : "Become a Host"}
                    </Link>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Log Out"
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link href="/login" className="btn-primary py-2 px-4 text-sm">
                  Log In
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 dark:text-slate-300 rounded-lg"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-500 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-nav border-t border-slate-200 dark:border-slate-800 px-4 py-4 space-y-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              {user ? (
                <>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{user.name}</span>
                    <Link
                      href={user.role === "owner" ? "/owner/dashboard" : "/onboarding/owner"}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      {user.role === "owner" ? "Host Dashboard" : "Become a Host"}
                    </Link>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-rose-500 font-semibold text-sm hover:bg-rose-500/10 rounded-xl"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary w-full text-center py-2.5"
                >
                  Log In
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {children}
      </div>
    </div>
  );
}

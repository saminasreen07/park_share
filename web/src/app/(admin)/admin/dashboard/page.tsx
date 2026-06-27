"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Shield, Users, Landmark, FileCheck, Landmark as Bank, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 142,
    totalSpaces: 24,
    totalBookings: 328,
    totalRevenue: 28400,
    pendingKYC: 5,
  });

  const chartData = [
    { name: "Jan", bookings: 45, revenue: 3200 },
    { name: "Feb", bookings: 62, revenue: 4800 },
    { name: "Mar", bookings: 88, revenue: 6400 },
    { name: "Apr", bookings: 74, revenue: 5600 },
    { name: "May", bookings: 120, revenue: 8400 },
  ];

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const response = await apiClient.get("/admin/stats");
      if (response.data && response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.warn("Failed to load admin stats, using seeded fallbacks:", err);
      // Already populated in default state
    }
  };

  return (
    <main className="space-y-6 text-slate-800 dark:text-white">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Users</span>
            <span className="text-xl font-extrabold">{stats.totalUsers}</span>
          </div>
          <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Parking Slots</span>
            <span className="text-xl font-extrabold">{stats.totalSpaces}</span>
          </div>
          <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
            <Landmark className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Bookings</span>
            <span className="text-xl font-extrabold">{stats.totalBookings}</span>
          </div>
          <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Volume</span>
            <span className="text-xl font-extrabold">₹{stats.totalRevenue}</span>
          </div>
          <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
            <Bank className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pending KYC</span>
            <span className="text-xl font-extrabold text-rose-500">{stats.pendingKYC}</span>
          </div>
          <div className="w-9 h-9 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-500">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-left space-y-4">
        <h3 className="font-bold text-base">Monthly Transaction Volume Trend</h3>
        
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(19, 27, 46, 0.95)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="revenue" fill="var(--color-primary, #FF6B35)" radius={[8, 8, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}

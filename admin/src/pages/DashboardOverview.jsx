import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  MapPin, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function DashboardOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Simulated chart data
  const chartData = [
    { name: 'Week 1', volume: 12000, revenue: 1200 },
    { name: 'Week 2', volume: 18000, revenue: 1800 },
    { name: 'Week 3', volume: 15000, revenue: 1500 },
    { name: 'Week 4', volume: 24000, revenue: 2400 },
    { name: 'Week 5', volume: 31000, revenue: 3100 },
    { name: 'Week 6', volume: 42000, revenue: 4200 },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/admin/stats');
        if (response.data.success) {
          setData(response.data.data);
        } else {
          setError('Failed to load dashboard metrics');
        }
      } catch (err) {
        setError('Error connecting to backend database');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-950/30 border border-red-500/30 rounded-xl text-red-300">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>{error} - Make sure your backend API is online and MongoDB is connected.</span>
      </div>
    );
  }

  const { stats, recentBookings, recentUsers } = data;

  const cardItems = [
    {
      title: 'Platform Volume',
      value: `₹${(stats.totalVolume || 0).toLocaleString()}`,
      description: 'Gross checkout volume transacted',
      icon: DollarSign,
      color: 'from-blue-600 to-cyan-500',
    },
    {
      title: 'Admin Revenue',
      value: `₹${(stats.platformRevenue || 0).toLocaleString()}`,
      description: '10% platform commission',
      icon: TrendingUp,
      color: 'from-emerald-600 to-teal-500',
    },
    {
      title: 'Active Bookings',
      value: stats.totalBookings || 0,
      description: 'Total reserved parking spaces',
      icon: Calendar,
      color: 'from-indigo-600 to-purple-500',
    },
    {
      title: 'Parking Listings',
      value: stats.totalSpaces || 0,
      description: 'Listed hosts parking spots',
      icon: MapPin,
      color: 'from-pink-600 to-rose-500',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cardItems.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${card.color}`}></div>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</p>
                  <h3 className="text-2xl font-bold font-mono">{card.value}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">{card.description}</p>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/30">
                  <Icon className="h-5 w-5 text-slate-300" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Chart */}
      <div className="glass-card rounded-2xl p-6">
        <h4 className="font-semibold text-base mb-6">Revenue & Volume Growth</h4>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: '#f8fafc'
                }} 
              />
              <Area type="monotone" dataKey="volume" name="Platform Volume" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
              <Area type="monotone" dataKey="revenue" name="Admin Commission" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="glass-card rounded-2xl p-6 xl:col-span-2 overflow-x-auto">
          <h4 className="font-semibold text-base mb-6">Recent Reservations</h4>
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3">Receipt</th>
                <th className="pb-3">Driver</th>
                <th className="pb-3">Parking Spot</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-slate-500">No active bookings yet.</td>
                </tr>
              ) : (
                recentBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-800/20">
                    <td className="py-3.5 font-mono text-xs text-slate-300">{b.receiptId}</td>
                    <td className="py-3.5">{b.driverId?.name || 'Local Driver'}</td>
                    <td className="py-3.5">{b.spaceId?.title || 'Unknown Space'}</td>
                    <td className="py-3.5 font-mono font-medium text-slate-300">₹{b.totalAmount}</td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        b.status === 'confirmed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' :
                        b.status === 'completed' ? 'bg-blue-950 text-blue-400 border border-blue-900/50' :
                        b.status === 'active' ? 'bg-amber-950 text-amber-400 border border-amber-900/50' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Users */}
        <div className="glass-card rounded-2xl p-6">
          <h4 className="font-semibold text-base mb-6">Recent Registrations</h4>
          <div className="space-y-4">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No users registered.</p>
            ) : (
              recentUsers.map((u) => (
                <div key={u._id} className="flex justify-between items-center hover:bg-slate-800/10 p-2.5 rounded-xl border border-transparent hover:border-slate-800/50 transition-all">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    u.role === 'owner' ? 'bg-purple-950 text-purple-400 border border-purple-900/50' :
                    u.role === 'admin' ? 'bg-red-950 text-red-400 border border-red-900/50' :
                    'bg-slate-900 text-slate-400'
                  }`}>
                    {u.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

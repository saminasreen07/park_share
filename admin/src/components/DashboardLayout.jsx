import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, LogOut } from 'lucide-react';

export default function DashboardLayout({ handleLogout }) {
  const location = useLocation();

  const menuItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'User Management', path: '/users', icon: Users },
    { name: 'Parking Listings', path: '/spaces', icon: MapPin },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 glass-card border-y-0 border-l-0 flex flex-col justify-between p-6 z-20">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <span className="text-3xl">🅿️</span>
            <div>
              <h1 className="font-bold text-xl leading-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                ParkShare
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Admin Panel</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/35 border border-indigo-500/30 text-white shadow-lg shadow-indigo-500/10'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Log Out */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 rounded-xl border border-transparent hover:border-red-900/35 transition-all mt-auto"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 glass-card border-x-0 border-t-0 flex items-center justify-between px-8 z-10">
          <h2 className="font-semibold text-lg">
            {menuItems.find((item) => item.path === location.pathname)?.name || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">Administrator</p>
              <p className="text-xs text-slate-400">admin@parkshare.com</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm shadow-md">
              A
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

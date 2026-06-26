import { useState } from 'react';
import axios from 'axios';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage({ setToken }) {
  const [email, setEmail] = useState('admin@parkshare.com');
  const [password, setPassword] = useState('adminpassword123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/auth/admin-login', { email, password });
      if (response.data.success) {
        setToken(response.data.token);
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 px-4">
      <div className="w-full max-w-md glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Background glow decorator */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="flex flex-col items-center gap-2 mb-8">
          <span className="text-5xl">🅿️</span>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            ParkShare Admin Portal
          </h1>
          <p className="text-xs text-slate-400">Verify spaces, manage users, and view platform metrics</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-6 p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-red-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm"
                placeholder="admin@parkshare.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-medium rounded-xl py-3 text-sm transition-all shadow-lg shadow-indigo-500/20 mt-8 flex items-center justify-center"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-800 pt-6 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Default Credentials</p>
          <p className="text-xs text-slate-400 mt-1">admin@parkshare.com / adminpassword123</p>
        </div>
      </div>
    </div>
  );
}

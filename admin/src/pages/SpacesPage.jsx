import { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, X, ShieldAlert, Trash2, MapPin, DollarSign, Calendar } from 'lucide-react';

export default function SpacesPage() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  const fetchSpaces = async () => {
    try {
      const response = await axios.get('/spaces');
      if (response.data.success) {
        setSpaces(response.data.data);
      }
    } catch (err) {
      setError('Error loading parking spaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleVerify = async (spaceId, status) => {
    try {
      const response = await axios.patch(`/admin/spaces/${spaceId}/verify`, { status });
      if (response.data.success) {
        setSpaces(spaces.map(s => s._id === spaceId ? response.data.data : s));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error verifying space');
    }
  };

  const handleDelete = async (spaceId) => {
    if (!window.confirm('Are you sure you want to remove this parking listing?')) return;
    try {
      // In development, let admin delete directly.
      // We can use owner space deletion endpoint if we mock ownership check, 
      // or implement admin space deletion route. Let's send requests to admin verify rejected, 
      // or simulated delete. In this project we'll just verify as 'rejected' or simulate deletion list filters.
      setSpaces(spaces.filter(s => s._id !== spaceId));
    } catch (err) {
      alert('Error removing listing');
    }
  };

  const filteredSpaces = filter === 'all' 
    ? spaces 
    : spaces.filter(s => s.status === filter);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold">Host Parking Spaces Directory</h3>
        
        {/* Filters */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl gap-1">
          {['all', 'pending', 'approved', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                filter === tab
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/25 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Grid of Listings */}
      {filteredSpaces.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
          <ShieldAlert className="h-8 w-8 text-slate-600" />
          <p>No parking listings found in this filter section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSpaces.map((space) => (
            <div key={space._id} className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between">
              {/* Cover Photo */}
              <div className="h-44 relative bg-slate-950">
                <img
                  src={space.images[0] || 'https://images.unsplash.com/photo-1506521788701-1e13a4e83c2a?q=80&w=600&auto=format&fit=crop'}
                  alt={space.title}
                  className="w-full h-full object-cover opacity-80"
                />
                
                {/* Status Badge */}
                <span className={`absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  space.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' :
                  space.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-900/50' :
                  'bg-red-950 text-red-400 border border-red-900/50'
                }`}>
                  {space.status}
                </span>
              </div>

              {/* Space Details */}
              <div className="p-6 space-y-4 flex-1">
                <div>
                  <h4 className="font-bold text-base leading-tight text-white mb-1">{space.title}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{space.address}</span>
                  </p>
                </div>

                {/* Features details */}
                <div className="flex gap-2 flex-wrap">
                  {space.features.hasEVCharger && (
                    <span className="px-2 py-0.5 bg-blue-950/40 text-[9px] font-semibold text-blue-400 border border-blue-900/50 rounded-lg">🔌 EV Charger</span>
                  )}
                  {space.features.hasCCTV && (
                    <span className="px-2 py-0.5 bg-cyan-950/40 text-[9px] font-semibold text-cyan-400 border border-cyan-900/50 rounded-lg">📷 CCTV</span>
                  )}
                  {space.features.isCovered && (
                    <span className="px-2 py-0.5 bg-indigo-950/40 text-[9px] font-semibold text-indigo-400 border border-indigo-900/50 rounded-lg">☂️ Covered</span>
                  )}
                  {space.features.isSecurityGuarded && (
                    <span className="px-2 py-0.5 bg-purple-950/40 text-[9px] font-semibold text-purple-400 border border-purple-900/50 rounded-lg">👮 Security</span>
                  )}
                </div>

                {/* Meta details */}
                <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-4 mt-2">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase text-slate-500 tracking-wider">Host Owner</p>
                    <p className="font-medium text-slate-300">{space.ownerId?.name || 'Local Host'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-slate-500 tracking-wider">Hourly Rate</p>
                    <p className="font-semibold text-indigo-400 font-mono text-sm">₹{space.pricePerHour}/hr</p>
                  </div>
                </div>
              </div>

              {/* Actions panel */}
              <div className="border-t border-slate-800 bg-slate-900/40 px-6 py-4 flex items-center justify-between gap-3">
                {space.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleVerify(space._id, 'rejected')}
                      className="flex-1 flex justify-center items-center gap-1.5 py-2 px-3 border border-red-500/25 bg-red-950/20 hover:bg-red-900/30 text-red-400 rounded-xl text-xs font-semibold transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject Listing
                    </button>
                    <button
                      onClick={() => handleVerify(space._id, 'approved')}
                      className="flex-1 flex justify-center items-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-600/10"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Verify Listing
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDelete(space._id)}
                    className="w-full flex justify-center items-center gap-2 py-2 border border-slate-700 hover:bg-red-950/20 hover:border-red-900/50 hover:text-red-400 rounded-xl text-xs text-slate-400 transition-all font-semibold"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete/Remove Listing
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

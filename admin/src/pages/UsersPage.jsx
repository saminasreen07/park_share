import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Trash2, Search, Edit2, CheckCircle2, XCircle } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState('driver');
  const [editVerified, setEditVerified] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/admin/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err) {
      setError('Error loading users database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await axios.delete(`/admin/users/${id}`);
      if (response.data.success) {
        setUsers(users.filter(u => u._id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting user');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`/admin/users/${editUser._id}`, {
        role: editRole,
        isVerified: editVerified,
      });

      if (response.data.success) {
        setUsers(users.map(u => u._id === editUser._id ? response.data.data : u));
        setEditUser(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating user');
    }
  };

  const startEdit = (user) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditVerified(user.isVerified);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  );

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
        <h3 className="text-xl font-bold">User Registrations Directory</h3>
        
        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or phone..."
            className="w-full glass-input rounded-xl py-2 pl-9 pr-4 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/25 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Edit Overlay Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <h4 className="text-lg font-bold mb-4">Edit User: {editUser.name}</h4>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Account Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3 text-sm bg-slate-900"
                >
                  <option value="driver">Driver</option>
                  <option value="owner">Parking Owner</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Verification Status</span>
                <button
                  type="button"
                  onClick={() => setEditVerified(!editVerified)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    editVerified
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-900'
                      : 'bg-red-950 text-red-400 border-red-900'
                  }`}
                >
                  {editVerified ? 'Verified Host' : 'Unverified'}
                </button>
              </div>

              <div className="flex gap-3 justify-end pt-6">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="glass-card rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Contact Info</th>
              <th className="p-4">Account Role</th>
              <th className="p-4">Verification</th>
              <th className="p-4">Rating</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-4 text-center text-slate-500">No users found.</td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u._id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-xs text-slate-500 font-mono">UID: {u.firebaseUid || 'Local'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p>{u.email}</p>
                    <p className="text-xs text-slate-400 font-mono">{u.phone}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      u.role === 'owner' ? 'bg-purple-950 text-purple-400 border border-purple-900/50' :
                      u.role === 'admin' ? 'bg-red-950 text-red-400 border border-red-900/50' :
                      'bg-slate-900 text-slate-400'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      {u.isVerified ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs text-emerald-400 font-medium">Verified Host</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-slate-500" />
                          <span className="text-xs text-slate-400">Unverified</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-mono font-medium">⭐ {u.rating.toFixed(1)}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(u)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u._id)}
                        className="p-2 hover:bg-red-950/20 rounded-lg text-red-400 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

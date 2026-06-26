import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MessageSquare, Send, CheckCircle2, Clock, Play, HelpCircle } from 'lucide-react';

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Ticket Reply Modal State
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchTickets = async () => {
    try {
      const url = statusFilter ? `/admin/support/tickets?status=${statusFilter}` : '/admin/support/tickets';
      const response = await axios.get(url);
      if (response.data.success) {
        setTickets(response.data.data);
      }
    } catch (err) {
      setError('Error loading support tickets queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSubmittingReply(true);
    try {
      const response = await axios.post(`/admin/support/tickets/${activeTicket.ticketId}/reply`, {
        message: replyMessage,
        status: newStatus || undefined,
      });

      if (response.data.success) {
        const updatedTicket = response.data.data;
        
        // Update local list
        setTickets(tickets.map(t => t.ticketId === activeTicket.ticketId ? { ...t, ...updatedTicket } : t));
        
        // Refresh details modal with new message list
        // Note: populate is used on main fetch, so we might want to manually merge or re-fetch
        setActiveTicket(null);
        setReplyMessage('');
        setNewStatus('');
        fetchTickets();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error sending reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const startReply = (ticket) => {
    setActiveTicket(ticket);
    setNewStatus(ticket.status);
    setReplyMessage('');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Open</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">In Progress</span>;
      case 'resolved':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolved</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">Closed</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <span className="text-red-400 font-bold">High</span>;
      case 'low':
        return <span className="text-slate-400 font-medium">Low</span>;
      default:
        return <span className="text-amber-400 font-semibold">Medium</span>;
    }
  };

  const formatCategory = (cat) => {
    switch (cat) {
      case 'payment_issue': return '💰 Payment Issue';
      case 'booking_issue': return '🚗 Booking Issue';
      case 'kyc_issue': return '🆔 KYC Verification';
      default: return '❓ General';
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.ticketId.toLowerCase().includes(search.toLowerCase()) || 
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    (t.userId && t.userId.name && t.userId.name.toLowerCase().includes(search.toLowerCase()))
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
        <h3 className="text-xl font-bold">Support Tickets Queue</h3>
        
        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input rounded-xl px-4 py-2 text-sm bg-slate-900 border-slate-700 text-white"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, subject, or creator..."
              className="w-full glass-input rounded-xl py-2 pl-9 pr-4 text-sm"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/25 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Grid of tickets */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-700/60 rounded-2xl text-slate-400">
            <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-lg">No tickets found</p>
            <p className="text-sm">There are no support tickets matching your search query.</p>
          </div>
        ) : (
          filteredTickets.map(t => (
            <div
              key={t._id}
              className="border border-slate-800/80 bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 hover:border-slate-700 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-indigo-400 font-bold">{t.ticketId}</span>
                  {getStatusBadge(t.status)}
                  <span className="text-xs text-slate-500">Priority: {getPriorityBadge(t.priority)}</span>
                  <span className="text-xs text-slate-500">|</span>
                  <span className="text-xs text-slate-400 font-semibold">{formatCategory(t.category)}</span>
                </div>
                <h4 className="text-base font-bold text-white">{t.subject}</h4>
                <p className="text-sm text-slate-400 line-clamp-2">{t.description}</p>
                <div className="text-xs text-slate-500">
                  Opened by: <span className="text-slate-300 font-medium">{t.userId?.name || 'Unknown User'}</span> ({t.userId?.email || 'N/A'}) on {new Date(t.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                <button
                  onClick={() => startReply(t)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-2 transition duration-200"
                >
                  <MessageSquare className="h-4 w-4" />
                  View & Reply
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ticket Details & Reply Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl animate-scale-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-mono text-xs text-indigo-400 font-bold block mb-1">{activeTicket.ticketId}</span>
                <h3 className="text-lg font-bold text-white">Support Inquiry Chat</h3>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body: Ticket Details & History */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-bold text-slate-300">Original Inquiry Detail</h4>
                  <span className="text-xs text-slate-500">{new Date(activeTicket.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-xs text-indigo-400 font-semibold mb-2">
                  Subject: {activeTicket.subject}
                </div>
                <p className="text-sm text-slate-400">{activeTicket.description}</p>
              </div>

              {/* Message history */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversation Log</h4>
                
                {activeTicket.messages.map((msg, idx) => {
                  const isUser = msg.senderId === activeTicket.userId?._id;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`p-3 rounded-2xl max-w-xl text-sm ${
                          isUser
                            ? 'bg-slate-800 text-slate-200 rounded-tl-none'
                            : 'bg-indigo-600 text-white rounded-tr-none'
                        }`}
                      >
                        <div className="text-[10px] opacity-75 font-semibold mb-1">
                          {isUser ? activeTicket.userId?.name || 'Customer' : 'Support Agent'}
                        </div>
                        <p>{msg.message}</p>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer: Action / Reply input */}
            <form onSubmit={handleSendReply} className="p-6 border-t border-slate-800 bg-slate-950/80 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Set Ticket Status:</span>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="glass-input rounded-lg px-2 py-1 text-xs bg-slate-900 border-slate-700 text-white"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder={
                    ['resolved', 'closed'].includes(activeTicket.status)
                      ? "Re-open ticket by typing a reply..."
                      : "Type your reply message..."
                  }
                  className="flex-1 glass-input rounded-xl px-4 py-2.5 text-sm"
                  disabled={submittingReply}
                  required
                />
                <button
                  type="submit"
                  disabled={submittingReply || !replyMessage.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition duration-200"
                >
                  {submittingReply ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

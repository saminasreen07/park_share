"use client";

import React, { useState } from "react";
import { Check, X, ShieldAlert, Eye, FileText, Download } from "lucide-react";
import toast from "react-hot-toast";

interface KYCSubmission {
  id: string;
  name: string;
  role: "driver" | "owner";
  docType: "license" | "aadhaar" | "pan";
  docNumber: string;
  docUrl: string;
  submittedAt: string;
}

export default function AdminKYCPage() {
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([
    {
      id: "kyc-1",
      name: "Raman Mallik",
      role: "driver",
      docType: "license",
      docNumber: "DL-14202409384",
      docUrl: "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=500",
      submittedAt: "2026-06-25 15:45",
    },
    {
      id: "kyc-2",
      name: "Harish Rawat",
      role: "owner",
      docType: "aadhaar",
      docNumber: "5023 9481 0394",
      docUrl: "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=500",
      submittedAt: "2026-06-25 11:20",
    },
    {
      id: "kyc-3",
      name: "Preeti Sinha",
      role: "owner",
      docType: "pan",
      docNumber: "APKPR9921Z",
      docUrl: "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=500",
      submittedAt: "2026-06-24 09:15",
    },
  ]);

  const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const handleApprove = (id: string, name: string) => {
    toast.success(`KYC documents for ${name} verified and approved!`);
    setSubmissions(submissions.filter((s) => s.id !== id));
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      toast.error("Please enter a reason for rejection");
      return;
    }
    
    toast.success(`KYC submission rejected. Feedback sent to user.`);
    setSubmissions(submissions.filter((s) => s.id !== rejectId));
    setRejectId(null);
    setFeedback("");
  };

  return (
    <main className="space-y-6 text-slate-800 dark:text-white text-left">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">KYC Verification Queues</h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
          Perform side-by-side checks on identification document uploads for driver and host certification approvals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions list */}
        <div className="lg:col-span-2 space-y-4">
          {submissions.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
              <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <h3 className="font-bold text-base">KYC queue is empty</h3>
              <p className="text-xs text-slate-500">All registered profiles are up to date.</p>
            </div>
          ) : (
            submissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white dark:bg-[#131B2E] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-amber-500/30 transition shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{sub.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-400">
                      {sub.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span className="uppercase">{sub.docType}:</span>
                    <span className="font-mono">{sub.docNumber}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">Submitted: {sub.submittedAt}</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => setActiveDocUrl(sub.docUrl)}
                    className="py-1.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-bold flex items-center gap-1 text-slate-600 dark:text-slate-300"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Doc
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setRejectId(sub.id)}
                      className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-rose-500/10 text-rose-500 rounded-xl transition"
                      title="Decline KYC"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleApprove(sub.id, sub.name)}
                      className="py-1.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Live Preview Panel */}
        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 h-max">
          <h3 className="font-bold text-base">Document Preview</h3>
          
          {activeDocUrl ? (
            <div className="space-y-4">
              <div className="h-52 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner relative group">
                <img src={activeDocUrl} alt="KYC Document Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleInvoiceDownload("DOC")}
                  className="absolute bottom-3 right-3 p-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg transition"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center font-semibold uppercase tracking-wider">
                Hold Ctrl + Scroll to zoom document layout
              </p>
            </div>
          ) : (
            <div className="h-52 bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-xs">
              Select &quot;View Doc&quot; to load visual previews
            </div>
          )}
        </div>
      </div>

      {/* Reject Overlay Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="font-bold text-sm uppercase tracking-wider">Reject KYC Submission</span>
              <button onClick={() => setRejectId(null)} className="p-1 hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Feedback / Reason for rejection
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Document scans are blurry/unreadable. Please re-upload clear photos."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-amber-400 text-white text-xs font-semibold resize-none"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectId(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-[2] btn-primary bg-rose-500 hover:bg-rose-600 py-2.5 text-xs font-bold text-white">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

// Helper downloader mock
const handleInvoiceDownload = (name: string) => {
  toast.success(`Downloading local PDF document copy...`);
};

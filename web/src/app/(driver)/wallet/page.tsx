"use client";

import React, { useState } from "react";
import { Wallet, Landmark, TrendingUp, TrendingDown, ArrowUpRight, Plus, Check } from "lucide-react";
import toast from "react-hot-toast";

interface Transaction {
  id: string;
  type: "payment" | "refund" | "topup";
  amount: number;
  date: string;
  spaceName: string;
  status: "success" | "pending" | "failed";
}

export default function WalletPage() {
  const [balance, setBalance] = useState(250);
  const [addOpen, setAddOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "TXN-1",
      type: "payment",
      amount: 80,
      date: "2026-06-25 14:00",
      spaceName: "Premium Covered Slot Near Metro",
      status: "success",
    },
    {
      id: "TXN-2",
      type: "topup",
      amount: 200,
      date: "2026-06-24 10:30",
      spaceName: "Added Money to Wallet",
      status: "success",
    },
    {
      id: "TXN-3",
      type: "refund",
      amount: 60,
      date: "2026-06-20 18:15",
      spaceName: "Refund for Sector 45 Booking",
      status: "success",
    },
  ]);

  const handleAddMoney = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(addAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setBalance(balance + amountNum);
    setTransactions([
      {
        id: `TXN-${Date.now()}`,
        type: "topup",
        amount: amountNum,
        date: new Date().toISOString().replace("T", " ").slice(0, 16),
        spaceName: "Added Money to Wallet",
        status: "success",
      },
      ...transactions,
    ]);
    
    setAddOpen(false);
    setAddAmount("");
    toast.success(`₹${amountNum} added successfully to your wallet!`);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-800 dark:text-white flex-1 flex flex-col justify-center">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Driver Wallet</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Review balance credits, load deposits, and track booking refund entries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Wallet Balance Card */}
        <div className="md:col-span-2 bg-gradient-to-tr from-primary to-orange-500 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden flex flex-col justify-between h-48">
          <div className="absolute top-[-30%] right-[-10%] w-[50%] h-[100%] rounded-full bg-white/10 blur-xl pointer-events-none" />
          
          <div className="flex justify-between items-center z-10">
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">Available Credits</span>
            <Wallet className="w-6 h-6 opacity-80 animate-pulse" />
          </div>

          <div className="z-10 mt-2">
            <span className="text-5xl font-extrabold tracking-tight">₹{balance}</span>
            <span className="text-xs font-semibold block opacity-85 mt-1">INR (Indian Rupee)</span>
          </div>

          {/* Action triggers */}
          <div className="flex gap-3 mt-4 z-10">
            <button
              onClick={() => setAddOpen(true)}
              className="py-2.5 px-5 bg-white text-primary font-extrabold rounded-xl text-xs hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-1 shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add Money
            </button>
            <span className="text-[10px] text-white/80 flex items-center gap-1 font-semibold">
              <Check className="w-3.5 h-3.5" /> Direct Payout Ready
            </span>
          </div>
        </div>

        {/* Small stats card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-48 shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Topup Volume</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">₹200</span>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Loaded during past 30 days</p>
            </div>
          </div>
          
          <hr className="border-slate-100 dark:border-slate-850" />
          
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
            <span>Withdrawals Blocked</span>
            <span>(Driver Tier)</span>
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Transaction History</h3>
        
        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/20 uppercase tracking-wider">
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">Item Details</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition">
                    <td className="p-4 font-bold text-slate-400">{txn.id}</td>
                    <td className="p-4 text-slate-800 dark:text-slate-200 font-bold">{txn.spaceName}</td>
                    <td className="p-4 text-slate-500">{txn.date}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          txn.type === "topup"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : txn.type === "refund"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}
                      >
                        {txn.type}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-extrabold ${txn.type === "payment" ? "text-rose-500" : "text-emerald-500"}`}>
                      {txn.type === "payment" ? "-" : "+"}₹{txn.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Money Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="font-bold text-sm uppercase tracking-wider">Top Up Wallet Credits</span>
              <button onClick={() => setAddOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddMoney} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400 font-extrabold text-sm">₹</span>
                  <input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="500"
                    className="w-full pl-8 pr-4 py-3 bg-slate-800/80 border border-slate-700/50 rounded-xl outline-none focus:border-primary text-white font-extrabold text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] btn-primary py-3 font-bold text-sm"
                >
                  Confirm Payout Load
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

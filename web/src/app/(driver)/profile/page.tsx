"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { apiClient } from "@/lib/api-client";
import { User, Car, ShieldCheck, Plus, Trash2, Mail, Phone, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface Vehicle {
  id: string;
  model: string;
  plateNumber: string;
  type: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, switchRole } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: "veh-1", model: "Tata Nexon EV (White)", plateNumber: "DL 3C AB 1234", type: "ev" },
    { id: "veh-2", model: "Honda City (Black)", plateNumber: "DL 2C MN 5678", type: "sedan" },
  ]);

  // Form states
  const [newModel, setNewModel] = useState("");
  const [newNo, setNewNo] = useState("");
  const [newType, setNewType] = useState("car");
  const [showAddForm, setShowAddForm] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModel || !newNo) {
      toast.error("Please fill in model and registration plate number");
      return;
    }
    
    setVehicles([
      ...vehicles,
      {
        id: `veh-${Date.now()}`,
        model: newModel,
        plateNumber: newNo.toUpperCase(),
        type: newType,
      },
    ]);

    setNewModel("");
    setNewNo("");
    setShowAddForm(false);
    toast.success("Vehicle added successfully!");
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles(vehicles.filter((v) => v.id !== vehicleId));
    toast.success("Vehicle removed");
  };

  const handlePortalSwitch = async () => {
    setSwitching(true);
    try {
      const success = await switchRole("owner");
      if (success) {
        toast.success("Switched to Host Portal!");
        router.push("/owner/dashboard");
      } else {
        toast.error("Failed to switch role");
      }
    } catch (err) {
      toast.error("Error switching role");
    } finally {
      setSwitching(false);
    }
  };

  if (!user) return null;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-800 dark:text-white flex-1 flex flex-col justify-center">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Driver Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Update identification profile parameters and manage your vehicles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column: Profile Details & Role switcher */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary relative">
              <User className="w-10 h-10" />
              <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border border-white dark:border-slate-900 rounded-full flex items-center justify-center text-[9px] font-bold text-white" title="KYC Verified">
                ✓
              </span>
            </div>
            
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">{user.name}</h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded block w-max mx-auto mt-1">
                {user.role} role
              </span>
            </div>

            <div className="w-full space-y-2.5 text-left border-t border-slate-100 dark:border-slate-800/80 pt-4 pb-2">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <Mail className="w-4 h-4 text-primary" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <Phone className="w-4 h-4 text-primary" />
                <span>{user.phone}</span>
              </div>
            </div>

            <button
              onClick={() => router.push("/profile/edit")}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 font-bold text-xs"
            >
              <User className="w-4 h-4 text-white" />
              Edit Profile Details
            </button>

            <button
              onClick={handlePortalSwitch}
              className="w-full btn-outline py-2.5 flex items-center justify-center gap-2 font-bold text-xs"
              disabled={switching}
            >
              <RefreshCw className={`w-4 h-4 ${switching ? "animate-spin" : ""}`} />
              Switch to Host Portal
            </button>
          </div>

          {/* KYC Status banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 dark:text-white">KYC Level 1 Verified</span>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Your Aadhaar and driving license verification has been confirmed by system moderators. You can book all types of slots.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Vehicle list */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">My Registered Vehicles</h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="py-1.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Vehicle
              </button>
            </div>

            {/* Add vehicle form */}
            {showAddForm && (
              <form onSubmit={handleAddVehicle} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-4 animate-slide-down">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                      Vehicle Model (Make/Variant)
                    </label>
                    <input
                      type="text"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="Tata Nexon EV (White)"
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-primary text-xs font-semibold text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                      Registration Plate Number
                    </label>
                    <input
                      type="text"
                      value={newNo}
                      onChange={(e) => setNewNo(e.target.value)}
                      placeholder="DL 3C AB 1234"
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-primary text-xs font-semibold text-foreground"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Classification:</span>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="bg-transparent text-xs font-bold text-primary outline-none"
                    >
                      <option value="car">Car</option>
                      <option value="suv">SUV</option>
                      <option value="bike">Bike</option>
                      <option value="ev">EV</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="py-1.5 px-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-1.5 px-4 bg-primary text-white font-bold rounded-lg text-xs transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* List */}
            <div className="space-y-3.5">
              {vehicles.map((veh) => (
                <div
                  key={veh.id}
                  className="p-4 bg-slate-50 dark:bg-[#131B2E]/50 rounded-xl border border-slate-200/50 dark:border-slate-800 flex justify-between items-center group hover:border-primary/30 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white">{veh.model}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                        Plate: {veh.plateNumber} • Class: {veh.type}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteVehicle(veh.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                    title="Remove Vehicle"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

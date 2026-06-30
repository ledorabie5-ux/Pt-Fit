import React, { useState } from "react";
import { UserDoc } from "../types";
import { UserPlus, AlertTriangle } from "lucide-react";

interface AddMemberTabProps {
  onSearchPhone: (phone: string) => Promise<UserDoc[]>;
  onAssignAndActivate: (traineeId: string, durationLabel: string, daysCount: number) => Promise<void>;
}

export default function AddMemberTab({
  onSearchPhone,
  onAssignAndActivate
}: AddMemberTabProps) {
  const [phoneQuery, setPhoneQuery] = useState("");
  const [results, setResults] = useState<UserDoc[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Activation duration config
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDays, setCustomDays] = useState(30);
  const [customUnit, setCustomUnit] = useState<"Days" | "Months">("Days");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneQuery.trim()) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await onSearchPhone(phoneQuery.trim());
      setResults(res);
    } catch (err) {
      console.error(err);
      alert("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleActivate = async (traineeId: string, label: string, days: number) => {
    await onAssignAndActivate(traineeId, label, days);
    setPhoneQuery("");
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg space-y-6 animate-in fade-in duration-200">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <UserPlus className="text-emerald-400 h-5 w-5" /> Add Member
        </h3>
        <p className="text-xs text-neutral-400 mt-1">Search for any registered user by their phone number to link them as your client and activate their membership.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 max-w-md">
        <input
          type="text"
          placeholder="e.g. +12345678 or phone number"
          value={phoneQuery}
          onChange={(e) => setPhoneQuery(e.target.value)}
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          type="submit"
          disabled={searching}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-neutral-950 font-sans font-bold text-xs px-5 py-2 rounded-lg transition-colors shadow-md cursor-pointer whitespace-nowrap"
        >
          {searching ? "Searching..." : "Search Phone"}
        </button>
      </form>

      {searching && (
        <div className="flex items-center gap-2 py-4 text-xs text-neutral-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
          Searching for user...
        </div>
      )}

      {!searching && hasSearched && results.length === 0 && (
        <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 text-xs text-neutral-400 max-w-md">
          No user account found with phone number "<span className="text-white font-semibold">{phoneQuery}</span>". Please ensure they have registered an account first.
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-neutral-950 rounded-lg p-5 border border-neutral-800 divide-y divide-neutral-800 max-w-2xl space-y-4">
          {results.map(trainee => (
            <div key={trainee.uid} className="pt-4 first:pt-0 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-white">{trainee.name}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{trainee.email} • {trainee.phone || "No phone listed"}</p>
                  <p className="text-[9px] text-neutral-500 font-mono mt-1">User ID: {trainee.uid}</p>
                </div>
                <span className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-400 px-2.5 py-1 rounded">
                  Status: {trainee.status?.toUpperCase() || "PENDING"}
                </span>
              </div>

              {trainee.status !== "approved" ? (
                <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-red-400 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p>Account must be approved by gym administrator before you can assign subscriptions.</p>
                </div>
              ) : (
                <div className="bg-neutral-900/60 p-4 rounded-lg border border-neutral-800/80 space-y-4">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">Assign & Activate Subscription</h4>
                  
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={!isCustomDuration} 
                        onChange={() => setIsCustomDuration(false)} 
                        className="accent-emerald-500"
                      />
                      Predefined Packages
                    </label>
                    <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={isCustomDuration} 
                        onChange={() => setIsCustomDuration(true)} 
                        className="accent-emerald-500"
                      />
                      Custom Duration
                    </label>
                  </div>

                  {!isCustomDuration ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "1 Month", days: 30 },
                        { label: "3 Months", days: 90 },
                        { label: "1 Year", days: 365 }
                      ].map(plan => (
                        <button
                          key={plan.label}
                          onClick={() => handleActivate(trainee.uid, plan.label, plan.days)}
                          className="bg-emerald-950/40 hover:bg-emerald-600 text-emerald-400 hover:text-neutral-950 border border-emerald-800/30 font-bold font-mono text-xs py-2.5 rounded-lg transition-all cursor-pointer"
                        >
                          Activate {plan.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={customDays}
                          onChange={(e) => setCustomDays(Number(e.target.value))}
                          className="w-24 bg-neutral-950 border border-neutral-850 rounded-lg px-3 py-2 text-xs text-white"
                        />
                        <select
                          value={customUnit}
                          onChange={(e) => setCustomUnit(e.target.value as any)}
                          className="bg-neutral-950 border border-neutral-850 rounded-lg px-3 py-2 text-xs text-white"
                        >
                          <option value="Days">Days</option>
                          <option value="Months">Months</option>
                        </select>
                        <button
                          onClick={() => {
                            const totalDays = customUnit === "Months" ? customDays * 30 : customDays;
                            const label = `${customDays} ${customUnit}`;
                            handleActivate(trainee.uid, label, totalDays);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-sans font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                        >
                          Activate Subscription
                        </button>
                      </div>
                      <p className="text-[11px] text-neutral-400 italic">
                        The client subscription will instantly be activated starting today for {customDays} {customUnit.toLowerCase()} (expires {new Date(Date.now() + (customUnit === "Months" ? customDays * 30 : customDays) * 24 * 60 * 60 * 1000).toLocaleDateString()}).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

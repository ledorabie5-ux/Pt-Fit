import React, { useState } from "react";
import { UserDoc } from "../types";
import { CalendarDays, Search, User, ShieldAlert, Check } from "lucide-react";

interface SubscriptionManagementTabProps {
  myTrainees: UserDoc[];
  selectedTrainee: UserDoc | null;
  setSelectedTrainee: (t: UserDoc | null) => void;
  onExtendSubscription: (trainee: UserDoc, days: number, durationLabel: string) => Promise<void>;
  onFreezeSubscription: (trainee: UserDoc) => Promise<void>;
  onResumeSubscription: (trainee: UserDoc) => Promise<void>;
  getDaysRemaining: (expiryDateStr?: string) => number;
}

export default function SubscriptionManagementTab({
  myTrainees,
  selectedTrainee,
  setSelectedTrainee,
  onExtendSubscription,
  onFreezeSubscription,
  onResumeSubscription,
  getDaysRemaining
}: SubscriptionManagementTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isExtendCustom, setIsExtendCustom] = useState(false);
  const [extendCustomDays, setExtendCustomDays] = useState(30);

  const filtered = myTrainees.filter(t => 
    !searchQuery || 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.phone && t.phone.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
      {/* Left Roster with filter */}
      <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarDays className="text-emerald-400 h-4 w-4" /> Subscription Roster
          </h3>
          <p className="text-[10px] text-neutral-400 mt-0.5">Select a client below to manage subscription status.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by phone or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8.5 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-neutral-500 italic px-1">No matching clients found.</p>
          ) : (
            filtered.map(t => {
              const isSelected = selectedTrainee?.uid === t.uid;
              const daysLeft = getDaysRemaining(t.subscriptionExpiry);
              return (
                <button
                  key={t.uid}
                  onClick={() => setSelectedTrainee(t)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-950/20 border-emerald-500 shadow-md"
                      : "bg-neutral-950/60 border-neutral-800 hover:bg-neutral-900/40"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[9px] text-neutral-400 font-mono mt-0.5">{t.phone || "No phone listed"}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border font-mono ${
                      t.subscriptionStatus === "active"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-800/45"
                        : t.subscriptionStatus === "frozen"
                        ? "bg-amber-950 text-amber-400 border-amber-800/45"
                        : "bg-red-950 text-red-400 border-red-800/45"
                    }`}>
                      {t.subscriptionStatus === "active" ? `${daysLeft} Days` : t.subscriptionStatus?.toUpperCase() || "EXPIRED"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right control panel */}
      <div className="lg:col-span-8">
        {!selectedTrainee ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-16 text-center space-y-4 shadow-lg flex flex-col items-center justify-center min-h-[400px]">
            <div className="h-14 w-14 bg-amber-950/40 rounded-full flex items-center justify-center border border-amber-800/30 text-amber-400">
              <CalendarDays className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Subscription Management Control</h3>
              <p className="text-xs text-neutral-400 mt-2 max-w-sm mx-auto leading-relaxed">
                Select a client on the left to check remaining days, extend subscriptions, freeze memberships, or resume existing frozen ones.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white">Manage Membership: {selectedTrainee.name}</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Control billing cycles and subscription schedules.</p>
            </div>

            {/* Current details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs">
              <div>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider mb-0.5">Subscription Status</p>
                <p className="text-xs font-bold text-white capitalize">{selectedTrainee.subscriptionStatus || "None / Expired"}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider mb-0.5">Remaining Days</p>
                <p className="text-xs font-bold text-emerald-400 font-mono">{getDaysRemaining(selectedTrainee.subscriptionExpiry)} Days</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider mb-0.5">Expiry Date</p>
                <p className="text-xs font-bold text-white font-mono">{selectedTrainee.subscriptionExpiry ? new Date(selectedTrainee.subscriptionExpiry).toLocaleDateString() : "N/A"}</p>
              </div>
            </div>

            {/* Extend section */}
            <div className="p-5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Extend Membership</h4>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={!isExtendCustom} 
                    onChange={() => setIsExtendCustom(false)} 
                    className="accent-emerald-500"
                  />
                  Predefined Packages
                </label>
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={isExtendCustom} 
                    onChange={() => setIsExtendCustom(true)} 
                    className="accent-emerald-500"
                  />
                  Custom Duration Extension
                </label>
              </div>

              {!isExtendCustom ? (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "1 Month", days: 30 },
                    { label: "3 Months", days: 90 },
                    { label: "1 Year", days: 365 }
                  ].map(plan => (
                    <button
                      key={plan.label}
                      onClick={() => onExtendSubscription(selectedTrainee, plan.days, plan.label)}
                      className="bg-emerald-950/40 hover:bg-emerald-600 text-emerald-400 hover:text-neutral-950 border border-emerald-800/30 font-bold font-mono text-xs py-2 rounded-lg transition-all cursor-pointer"
                    >
                      + {plan.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="1"
                    value={extendCustomDays}
                    onChange={(e) => setExtendCustomDays(Number(e.target.value))}
                    className="w-24 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                  <span className="text-xs text-neutral-400">Days</span>
                  <button
                    onClick={() => onExtendSubscription(selectedTrainee, extendCustomDays, `${extendCustomDays} Days`)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-sans font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Apply Extension
                  </button>
                </div>
              )}
            </div>

            {/* Freeze/Resume controllers */}
            <div className="p-5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Status Controllers</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTrainee.subscriptionStatus === "active" ? (
                  <button
                    onClick={() => onFreezeSubscription(selectedTrainee)}
                    className="bg-amber-950/40 hover:bg-amber-600 text-amber-400 hover:text-neutral-950 border border-amber-800/30 font-bold text-xs px-5 py-2.5 rounded-lg transition-all cursor-pointer"
                  >
                    ❄️ Freeze Membership
                  </button>
                ) : selectedTrainee.subscriptionStatus === "frozen" ? (
                  <button
                    onClick={() => onResumeSubscription(selectedTrainee)}
                    className="bg-emerald-950/40 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-800/30 font-bold text-xs px-5 py-2.5 rounded-lg transition-all cursor-pointer"
                  >
                    ▶️ Resume Frozen Membership
                  </button>
                ) : (
                  <p className="text-xs text-neutral-500 italic">Membership must be active to freeze, or frozen to resume.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

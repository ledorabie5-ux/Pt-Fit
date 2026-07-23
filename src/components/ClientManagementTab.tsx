import React, { useState, useEffect } from "react";
import { UserDoc, WorkoutTemplate, NutritionTemplate, WorkoutDay, DietMeal, ProgressLog } from "../types";
import ChatWindow from "./ChatWindow";
import ExerciseLibrarySelector from "./ExerciseLibrarySelector";

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  
  if (cleanUrl.includes("youtube.com/embed/")) {
    return cleanUrl;
  }
  
  const shortsMatch = cleanUrl.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  }

  const watchMatch = cleanUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.+&v=)([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }
  
  const shortMatch = cleanUrl.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  return null;
}

function getVimeoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  if (cleanUrl.includes("player.vimeo.com")) {
    return cleanUrl;
  }
  const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/)([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  return null;
}
import { 
  User, Search, RefreshCw, Dumbbell, Apple, ClipboardList, 
  LineChart, MessageSquare, Plus, Trash2, Video, Save, FolderOpen, Upload, X, Activity
} from "lucide-react";

interface ClientManagementTabProps {
  myTrainees: UserDoc[];
  selectedTrainee: UserDoc | null;
  setSelectedTrainee: (t: UserDoc | null) => void;
  workoutTemplates: WorkoutTemplate[];
  nutritionTemplates: NutritionTemplate[];
  currentUserId: string;
  currentUserName: string;
  onApplyWorkoutTemplate: (templateId: string) => Promise<void>;
  onApplyNutritionTemplate: (templateId: string) => Promise<void>;
  getDaysRemaining: (expiryDateStr?: string) => number;
  isExpiringSoon: (t: UserDoc) => boolean;
  loadMyTrainees: () => Promise<void>;
  
  // Program Schedule
  workoutDays: WorkoutDay[];
  setWorkoutDays: (days: WorkoutDay[]) => void;
  dietMeals: DietMeal[];
  setDietMeals: (meals: DietMeal[]) => void;
  activeDayId: string;
  setActiveDayId: (id: string) => void;
  newExercise: any;
  setNewExercise: (ex: any) => void;
  handleAddExercise: (dayId: string) => void;
  handleDeleteExercise: (dayId: string, idx: number) => void;
  handleOpenAddDayModal: () => void;
  handleDeleteDay: (dayId: string) => void;
  newMeal: any;
  setNewMeal: (meal: any) => void;
  handleAddMeal: () => void;
  handleDeleteMeal: (mealId: string) => void;
  handleSaveProgram: () => Promise<void>;
  loadingProgram: boolean;

  // Progress
  progressLogs: ProgressLog[];
  loadingProgress: boolean;

  // Save Biometrics / Remarks
  onSaveNotesAndMeasurements: (fields: {
    coachNotes: string;
    measurementsChest: string;
    measurementsWaist: string;
    measurementsHips: string;
    measurementsBiceps: string;
    measurementsThighs: string;
    otherCoachingInfo: string;
  }) => Promise<void>;
}

export default function ClientManagementTab({
  myTrainees,
  selectedTrainee,
  setSelectedTrainee,
  workoutTemplates,
  nutritionTemplates,
  currentUserId,
  currentUserName,
  onApplyWorkoutTemplate,
  onApplyNutritionTemplate,
  getDaysRemaining,
  isExpiringSoon,
  loadMyTrainees,
  workoutDays,
  setWorkoutDays,
  dietMeals,
  activeDayId,
  setActiveDayId,
  newExercise,
  setNewExercise,
  handleAddExercise,
  handleDeleteExercise,
  handleOpenAddDayModal,
  handleDeleteDay,
  newMeal,
  setNewMeal,
  handleAddMeal,
  handleDeleteMeal,
  handleSaveProgram,
  loadingProgram,
  progressLogs,
  loadingProgress,
  onSaveNotesAndMeasurements
}: ClientManagementTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"workout" | "diet" | "notes-measurements" | "progress" | "chat">("workout");
  const [exerciseSourceMode, setExerciseSourceMode] = useState<"library" | "custom">("library");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoName, setActiveVideoName] = useState<string>("");

  // Local state for notes & measurements
  const [notes, setNotes] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [biceps, setBiceps] = useState("");
  const [thighs, setThighs] = useState("");
  const [otherInfo, setOtherInfo] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Sync state with selected trainee
  useEffect(() => {
    if (selectedTrainee) {
      setNotes(selectedTrainee.coachNotes || "");
      setChest(selectedTrainee.measurementsChest || "");
      setWaist(selectedTrainee.measurementsWaist || "");
      setHips(selectedTrainee.measurementsHips || "");
      setBiceps(selectedTrainee.measurementsBiceps || "");
      setThighs(selectedTrainee.measurementsThighs || "");
      setOtherInfo(selectedTrainee.otherCoachingInfo || "");
    } else {
      setNotes("");
      setChest("");
      setWaist("");
      setHips("");
      setBiceps("");
      setThighs("");
      setOtherInfo("");
    }
  }, [selectedTrainee]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await onSaveNotesAndMeasurements({
        coachNotes: notes,
        measurementsChest: chest,
        measurementsWaist: waist,
        measurementsHips: hips,
        measurementsBiceps: biceps,
        measurementsThighs: thighs,
        otherCoachingInfo: otherInfo
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  };

  const filtered = myTrainees.filter(t => 
    !searchQuery || 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.phone && t.phone.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeDay = workoutDays.find(d => d.id === activeDayId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
      {/* Left Roster Side List */}
      <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="border-b border-neutral-800 pb-3 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="text-emerald-400 h-4 w-4" /> Client Search & Roster
          </h3>
          <button onClick={loadMyTrainees} className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by phone or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8.5 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-neutral-500 italic px-1">No clients found.</p>
          ) : (
            filtered.map(t => {
              const isSelected = selectedTrainee?.uid === t.uid;
              const expiring = isExpiringSoon(t);
              return (
                <button
                  key={t.uid}
                  onClick={() => setSelectedTrainee(t)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-950/20 border-emerald-500 shadow-md"
                      : "bg-neutral-950/60 border-neutral-800/80 hover:bg-neutral-900/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {t.photoUrl ? (
                      <img src={t.photoUrl} alt={t.name} referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover border border-emerald-500/50 shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-emerald-950 border border-emerald-800/50 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {t.name[0]}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        {t.name}
                        {expiring && (
                          <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                      </p>
                      <p className="text-[9px] text-neutral-400 font-mono">{t.phone || "No phone listed"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border font-mono ${
                      t.subscriptionStatus === "active"
                        ? expiring 
                          ? "bg-red-950 text-red-400 border-red-800/40" 
                          : "bg-emerald-950 text-emerald-400 border-emerald-800/40"
                        : t.subscriptionStatus === "frozen"
                        ? "bg-amber-950 text-amber-400 border-amber-800/40"
                        : "bg-neutral-900 text-neutral-500 border-neutral-800"
                    }`}>
                      {t.subscriptionStatus?.toUpperCase() || "EXPIRED"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right active profile */}
      <div className="lg:col-span-8">
        {!selectedTrainee ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-16 text-center space-y-4 shadow-lg flex flex-col items-center justify-center min-h-[500px]">
            <div className="h-16 w-16 bg-emerald-950/50 rounded-full flex items-center justify-center border border-emerald-800/30 text-emerald-400">
              <ClipboardList className="h-8 w-8" />
            </div>
            <div className="max-w-sm">
              <h3 className="text-md font-bold text-white">Client Management Profile</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Select a client from your roster on the left to start editing workout programs, meals, notes, body measurements, progress logs, and chat support.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl space-y-6 animate-in fade-in duration-200">
            {/* Header info bar */}
            <div className="bg-neutral-950 px-6 py-4 border-b border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                {selectedTrainee.photoUrl ? (
                  <img src={selectedTrainee.photoUrl} alt={selectedTrainee.name} referrerPolicy="no-referrer" className="h-11 w-11 rounded-full object-cover border border-emerald-500/50 shrink-0" />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-emerald-950 border border-emerald-800/50 text-emerald-400 flex items-center justify-center font-bold text-md shrink-0">
                    {selectedTrainee.name[0]}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedTrainee.name}</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">{selectedTrainee.email} • {selectedTrainee.phone}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2.5 py-1 rounded-full font-bold border ${
                  selectedTrainee.subscriptionStatus === "active"
                    ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                    : selectedTrainee.subscriptionStatus === "frozen"
                    ? "bg-amber-950 text-amber-400 border-amber-800"
                    : "bg-neutral-900 text-neutral-500 border-neutral-800"
                }`}>
                  Sub: {selectedTrainee.subscriptionStatus?.toUpperCase() || "EXPIRED"}
                </span>
                {selectedTrainee.subscriptionExpiry && (
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Expires: {new Date(selectedTrainee.subscriptionExpiry).toLocaleDateString()} ({getDaysRemaining(selectedTrainee.subscriptionExpiry)} days left)
                  </span>
                )}
              </div>
            </div>

            {/* Trainee Fitness Profile & Metrics Overview Banner */}
            <div className="px-6 py-3 bg-neutral-950/80 border-b border-neutral-850">
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-bold">
                <Activity className="h-3.5 w-3.5" />
                <span>Trainee Fitness Profile & Biometrics</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
                <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block font-mono">Fitness Goal</span>
                  <span className="text-white font-bold text-xs truncate block mt-0.5">{selectedTrainee.fitnessGoal || "Not set"}</span>
                </div>
                <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block font-mono">Height / Weight</span>
                  <span className="text-white font-bold text-xs block mt-0.5">
                    {selectedTrainee.height ? `${selectedTrainee.height} cm` : "-"} / {selectedTrainee.weight ? `${selectedTrainee.weight} kg` : "-"}
                    {selectedTrainee.height && selectedTrainee.weight && (
                      <span className="text-[10px] text-emerald-400 font-mono block font-normal">
                        BMI: {(selectedTrainee.weight / Math.pow(selectedTrainee.height / 100, 2)).toFixed(1)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block font-mono">Age / Gender</span>
                  <span className="text-white font-bold text-xs block mt-0.5">
                    {selectedTrainee.age ? `${selectedTrainee.age} yrs` : "-"} • {selectedTrainee.gender || "-"}
                  </span>
                </div>
                <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block font-mono">Experience</span>
                  <span className="text-white font-bold text-xs block mt-0.5">{selectedTrainee.trainingExperience || "Beginner"}</span>
                </div>
                <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block font-mono">Activity Level</span>
                  <span className="text-white font-bold text-xs block mt-0.5 truncate">{selectedTrainee.activityLevel || "Moderately Active"}</span>
                </div>
              </div>
            </div>

            {/* Profile Sub Tabs */}
            <div className="px-6 border-b border-neutral-800">
              <div className="flex space-x-6 overflow-x-auto pb-px">
                {[
                  { id: "workout", name: "Workout Plan", icon: Dumbbell },
                  { id: "diet", name: "Nutrition Plan", icon: Apple },
                  { id: "notes-measurements", name: "Notes & Measurements", icon: ClipboardList },
                  { id: "progress", name: "Progress History", icon: LineChart },
                  { id: "chat", name: "Chat Support", icon: MessageSquare }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isCurrent = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        isCurrent
                          ? "border-emerald-500 text-white"
                          : "border-transparent text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-tab 1: Workout Plan */}
            {activeTab === "workout" && (
              <div className="p-6 space-y-6">
                <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">⚡ Apply Reusable Workout Template</h4>
                    <span className="text-[9px] text-neutral-500 font-sans">Single-click apply</span>
                  </div>
                  {workoutTemplates.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">No workout templates. Create one in the "Templates" tab first.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {workoutTemplates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => onApplyWorkoutTemplate(t.id)}
                          className="bg-emerald-950/30 hover:bg-emerald-600 hover:text-neutral-950 text-emerald-400 text-[10px] px-3 py-1.5 rounded-lg border border-emerald-800/30 font-bold transition-all cursor-pointer"
                        >
                          + {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-neutral-200">Workout Plan Days & Exercises</h4>
                    <button
                      onClick={handleOpenAddDayModal}
                      className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold font-sans text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      + Add Workout Day
                    </button>
                  </div>

                  {workoutDays.length === 0 ? (
                    <div className="text-center py-10 bg-neutral-950/45 rounded-lg border border-neutral-800/30 text-xs text-neutral-500">
                      No workout days assigned. Use the template assigner or click "Add Workout Day" to create schedules.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <div className="md:col-span-4 space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                        {workoutDays.map(day => (
                          <div
                            key={day.id}
                            className={`p-3 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                              activeDayId === day.id
                                ? "bg-neutral-950 border-emerald-500 text-white"
                                : "bg-neutral-950/40 border-neutral-850 text-neutral-400 hover:bg-neutral-900/40"
                            }`}
                            onClick={() => setActiveDayId(day.id)}
                          >
                            <span className="text-xs font-bold truncate max-w-[110px]">{day.dayName}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDay(day.id);
                              }}
                              className="text-neutral-500 hover:text-red-400 p-0.5 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="md:col-span-8 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800 space-y-4">
                        {activeDay ? (
                          <div className="space-y-4">
                            <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-neutral-850 pb-2">
                              Schedule: {activeDay.dayName}
                            </h5>

                            <div className="divide-y divide-neutral-900 space-y-2.5">
                              {activeDay.exercises.length === 0 ? (
                                <p className="text-xs text-neutral-500 italic py-4">No exercises added to this schedule.</p>
                              ) : (
                                activeDay.exercises.map((ex, idx) => (
                                  <div key={idx} className="pt-2 first:pt-0 flex justify-between items-start text-xs">
                                    <div>
                                      <p className="font-bold text-white">{ex.name}</p>
                                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Sets: {ex.sets} • Reps: {ex.reps}</p>
                                      {ex.notes && <p className="text-[10px] text-neutral-500 italic mt-0.5">Note: {ex.notes}</p>}
                                      {ex.videoUrl && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveVideoUrl(ex.videoUrl);
                                            setActiveVideoName(ex.name);
                                          }}
                                          className="text-[9px] text-emerald-400 hover:text-white hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                                        >
                                          <Video className="h-2.5 w-2.5" /> Watch Video
                                        </button>
                                      )}
                                    </div>
                                    <button onClick={() => handleDeleteExercise(activeDay.id, idx)} className="text-neutral-500 hover:text-red-400 p-0.5 cursor-pointer">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Add exercise inside schedule day */}
                            <div className="border-t border-neutral-800 pt-4 space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2">
                                <p className="text-xs font-bold text-neutral-300 uppercase tracking-widest font-mono">Add Exercise Item</p>
                                <div className="flex bg-neutral-950 p-0.5 rounded border border-neutral-850 gap-0.5 self-start">
                                  <button
                                    type="button"
                                    onClick={() => setExerciseSourceMode("library")}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all cursor-pointer flex items-center gap-1 ${
                                      exerciseSourceMode === "library"
                                        ? "bg-emerald-600 text-neutral-950"
                                        : "text-neutral-400 hover:text-white"
                                    }`}
                                  >
                                    <FolderOpen className="h-3 w-3" /> Website Library
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setExerciseSourceMode("custom")}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all cursor-pointer flex items-center gap-1 ${
                                      exerciseSourceMode === "custom"
                                        ? "bg-emerald-600 text-neutral-950"
                                        : "text-neutral-400 hover:text-white"
                                    }`}
                                  >
                                    <Upload className="h-3 w-3" /> Custom / Upload Private
                                  </button>
                                </div>
                              </div>

                              {/* Common parameters: Sets & Reps & Notes */}
                              <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-850 space-y-3">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase font-mono">Set & Rep Targets</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-850 rounded px-2.5 py-1">
                                    <span className="text-[10px] text-neutral-400 font-mono">Sets:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={newExercise.sets}
                                      onChange={(e) => setNewExercise({ ...newExercise, sets: parseInt(e.target.value) || 3 })}
                                      className="w-full bg-transparent border-none text-xs text-white text-center focus:outline-none"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Reps (e.g. 10-12, Failure)"
                                    value={newExercise.reps}
                                    onChange={(e) => setNewExercise({ ...newExercise, reps: e.target.value })}
                                    className="bg-neutral-950 border border-neutral-850 rounded px-3 py-1 text-xs text-white placeholder-neutral-500"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Tempo/Notes (e.g. 3010 tempo)"
                                    value={newExercise.notes}
                                    onChange={(e) => setNewExercise({ ...newExercise, notes: e.target.value })}
                                    className="bg-neutral-950 border border-neutral-850 rounded px-3 py-1 text-xs text-white placeholder-neutral-500"
                                  />
                                </div>
                              </div>

                              {exerciseSourceMode === "library" ? (
                                <div className="space-y-3">
                                  <ExerciseLibrarySelector
                                    selectedName={newExercise.name}
                                    selectedVideoUrl={newExercise.videoUrl}
                                    onSelect={(name, videoUrl) => {
                                      setNewExercise({
                                        ...newExercise,
                                        name: name,
                                        videoUrl: videoUrl
                                      });
                                    }}
                                    onAddDirectly={(name, videoUrl) => {
                                      const item = {
                                        name: name,
                                        sets: newExercise.sets,
                                        reps: newExercise.reps || "10-12",
                                        notes: newExercise.notes || undefined,
                                        videoUrl: videoUrl
                                      };
                                      setWorkoutDays(workoutDays.map(day => {
                                        if (day.id === activeDay.id) {
                                          return {
                                            ...day,
                                            exercises: [...day.exercises, item]
                                          };
                                        }
                                        return day;
                                      }));
                                      alert(`Added "${name}" to ${activeDay.dayName}!`);
                                    }}
                                  />

                                  {newExercise.name && (
                                    <div className="bg-neutral-950 p-2.5 rounded border border-emerald-900/40 flex justify-between items-center text-xs animate-in slide-in-from-bottom-2 duration-200">
                                      <div>
                                        <p className="text-neutral-400 text-[10px]">Currently Selected Library Exercise:</p>
                                        <p className="text-white font-bold">{newExercise.name}</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAddExercise(activeDay.id)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold px-3 py-1 rounded transition-all cursor-pointer text-[11px]"
                                      >
                                        + Confirm & Add
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                                  <p className="text-[10px] font-bold text-neutral-400 uppercase font-mono">Custom Exercise Details</p>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-neutral-500 font-mono">Exercise Name</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. Incline Bench Press"
                                        value={newExercise.name}
                                        onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-neutral-500 font-mono">Video Demo Link (optional)</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. https://youtube.com/..."
                                        value={newExercise.videoUrl}
                                        onChange={(e) => setNewExercise({ ...newExercise, videoUrl: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white"
                                      />
                                    </div>
                                  </div>

                                  <div className="border-t border-neutral-900 pt-3 space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                                        <Upload className="h-3.5 w-3.5 text-emerald-500" /> Upload Private Video File:
                                      </span>
                                      {newExercise.videoUrl?.startsWith("blob:") && (
                                        <span className="text-[10px] text-emerald-400 font-bold font-mono">✓ Video Loaded</span>
                                      )}
                                    </div>
                                    <input
                                      type="file"
                                      accept="video/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const objectUrl = URL.createObjectURL(file);
                                          setNewExercise({
                                            ...newExercise,
                                            videoUrl: objectUrl,
                                            name: newExercise.name || file.name.split(".")[0]
                                          });
                                          alert(`Private video "${file.name}" loaded successfully in preview!`);
                                        }
                                      }}
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-400 file:bg-neutral-850 file:border-none file:text-xs file:text-white file:px-2 file:py-1 file:rounded file:cursor-pointer hover:file:bg-neutral-700"
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleAddExercise(activeDay.id)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs py-2 rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                                  >
                                    + Add Custom Exercise
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-500 italic py-6 text-center">Select a workout day on the left list to edit exercises.</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-neutral-800 flex justify-end">
                    <button
                      onClick={handleSaveProgram}
                      disabled={loadingProgram}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-neutral-950 font-bold font-sans text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Save className="h-4 w-4" /> {loadingProgram ? "Saving..." : "Save Workout Program"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Nutrition Plan */}
            {activeTab === "diet" && (
              <div className="p-6 space-y-6">
                <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">⚡ Apply Reusable Nutrition Template</h4>
                    <span className="text-[9px] text-neutral-500 font-sans">Single-click apply</span>
                  </div>
                  {nutritionTemplates.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">No nutrition templates. Create one in the "Templates" tab first.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {nutritionTemplates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => onApplyNutritionTemplate(t.id)}
                          className="bg-emerald-950/30 hover:bg-emerald-600 hover:text-neutral-950 text-emerald-400 text-[10px] px-3 py-1.5 rounded-lg border border-emerald-800/30 font-bold transition-all cursor-pointer"
                        >
                          + {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-neutral-200">Daily Diet Meals Configuration</h4>

                  {dietMeals.length === 0 ? (
                    <div className="text-center py-10 bg-neutral-950/40 rounded-lg border border-neutral-800/30 text-xs text-neutral-500">
                      No diet meals configured. Setup meal plans or apply a template above!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dietMeals.map(meal => (
                        <div key={meal.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-1 text-xs">
                            <p className="font-bold text-emerald-400 font-mono uppercase tracking-wider">{meal.mealName}</p>
                            <p className="text-white leading-relaxed whitespace-pre-wrap">{meal.foodItems}</p>
                            {meal.calories && (
                              <span className="inline-block bg-neutral-900 px-2 py-0.5 border border-neutral-800 rounded text-[9px] font-mono text-neutral-400 mt-1">
                                Calories: {meal.calories} kcal
                              </span>
                            )}
                          </div>
                          <button onClick={() => handleDeleteMeal(meal.id)} className="text-neutral-500 hover:text-red-400 p-1 shrink-0 cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add custom meal item block */}
                  <div className="p-4 bg-neutral-950/50 rounded-xl border border-neutral-800 space-y-3">
                    <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest font-mono">Add Meal Schedule Item</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Meal Name (e.g. Lunch)"
                        value={newMeal.mealName}
                        onChange={(e) => setNewMeal({ ...newMeal, mealName: e.target.value })}
                        className="bg-neutral-950 border border-neutral-850 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Food list & weights (e.g. 150g salmon, broccoli)"
                        value={newMeal.foodItems}
                        onChange={(e) => setNewMeal({ ...newMeal, foodItems: e.target.value })}
                        className="bg-neutral-950 border border-neutral-850 rounded sm:col-span-2 px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400">Calories (kcal):</span>
                        <input
                          type="text"
                          placeholder="e.g. 500"
                          value={newMeal.calories}
                          onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                          className="w-20 bg-neutral-950 border border-neutral-850 rounded px-2 py-1 text-center text-white"
                        />
                      </div>
                      <button
                        onClick={handleAddMeal}
                        className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-3 py-1.5 rounded transition-all cursor-pointer"
                      >
                        + Add Meal
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-800 flex justify-end">
                    <button
                      onClick={handleSaveProgram}
                      disabled={loadingProgram}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-neutral-950 font-bold font-sans text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Save className="h-4 w-4" /> {loadingProgram ? "Saving..." : "Save Nutrition Plan"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 3: Notes & Measurements */}
            {activeTab === "notes-measurements" && (
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Measurements, Biometrics & Coaching Notes</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5 font-sans">Save vital metrics and text notes directly onto the trainee's record.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-neutral-950 p-4 rounded-xl border border-neutral-850 text-xs">
                  <div>
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase tracking-widest mb-1">Chest (cm)</label>
                    <input
                      type="text"
                      placeholder="e.g. 102"
                      value={chest}
                      onChange={(e) => setChest(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-white text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase tracking-widest mb-1">Waist (cm)</label>
                    <input
                      type="text"
                      placeholder="e.g. 84"
                      value={waist}
                      onChange={(e) => setWaist(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-white text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase tracking-widest mb-1">Hips (cm)</label>
                    <input
                      type="text"
                      placeholder="e.g. 98"
                      value={hips}
                      onChange={(e) => setHips(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-white text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase tracking-widest mb-1">Biceps (cm)</label>
                    <input
                      type="text"
                      placeholder="e.g. 36"
                      value={biceps}
                      onChange={(e) => setBiceps(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-white text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 font-mono uppercase tracking-widest mb-1">Thighs (cm)</label>
                    <input
                      type="text"
                      placeholder="e.g. 56"
                      value={thighs}
                      onChange={(e) => setThighs(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-white text-center"
                    />
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="block font-bold text-neutral-200">Coach Program Notes</label>
                    <textarea
                      placeholder="Record strength developments, custom cardio routines, or special notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-bold text-neutral-200">Other Coaching Information</label>
                    <textarea
                      placeholder="Medical history, supplement regimes, schedule details, dietary restrictions..."
                      value={otherInfo}
                      onChange={(e) => setOtherInfo(e.target.value)}
                      rows={4}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-800 flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold font-sans text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Save className="h-4 w-4" /> {savingNotes ? "Saving..." : "Save Notes & Measurements"}
                  </button>
                </div>
              </div>
            )}

            {/* Sub-tab 4: Progress logs */}
            {activeTab === "progress" && (
              <div className="p-6 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Trainee Workout Logs & Performance Progress</h4>
                
                {loadingProgress ? (
                  <div className="py-10 flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                  </div>
                ) : progressLogs.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-8 text-center bg-neutral-950/30 rounded-lg border border-neutral-800/40">
                    No logs completed by this trainee yet.
                  </p>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {progressLogs.map(log => (
                      <div key={log.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
                        <div className="flex justify-between items-center border-b border-neutral-900 pb-2 text-xs">
                          <span className="font-bold text-emerald-400">{log.workoutDayName}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">{new Date(log.completedAt).toLocaleDateString()}</span>
                        </div>
                        {log.notes && (
                          <p className="text-xs text-white italic">"{log.notes}"</p>
                        )}
                        {log.feedback && (
                          <div className="flex gap-1 items-start text-[11px] text-neutral-400">
                            <span>Trainee Feedback:</span>
                            <span className="text-neutral-200 capitalize font-medium">{log.feedback}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 5: Chat support (Modern bubbled format) */}
            {activeTab === "chat" && (
              <div className="p-0 border-t border-neutral-800">
                <ChatWindow 
                  currentUserId={currentUserId}
                  recipientId={selectedTrainee.uid}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Demonstration lightbox popup */}
      {activeVideoUrl && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 max-w-3xl w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Demo: {activeVideoName}</h4>
              <button
                type="button"
                onClick={() => {
                  setActiveVideoUrl(null);
                  setActiveVideoName("");
                }}
                className="text-neutral-400 hover:text-white bg-neutral-850 p-1.5 rounded-full cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="aspect-video bg-neutral-950 rounded-lg overflow-hidden flex items-center justify-center">
              {(() => {
                const ytEmbed = getYouTubeEmbedUrl(activeVideoUrl);
                const vimeoEmbed = getVimeoEmbedUrl(activeVideoUrl);
                const embedUrl = ytEmbed || vimeoEmbed;

                if (embedUrl) {
                  return (
                    <iframe
                      src={embedUrl}
                      title="Demo"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  );
                }

                return (
                  <video
                    src={activeVideoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

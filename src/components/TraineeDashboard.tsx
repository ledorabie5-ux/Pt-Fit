import React, { useState, useEffect } from "react";
import { UserDoc, WorkoutDay, DietMeal, Exercise, Program, ProgressLog } from "../types";
import { getProgram, logProgress, getTraineeProgress, subscribeToProgram, updateUserDoc } from "../services/dbService";
import ChatWindow from "./ChatWindow";
import { 
  Dumbbell, Apple, LineChart, MessageSquare, Calendar, Clock, 
  Video, CheckCircle2, AlertTriangle, Check, User, X
} from "lucide-react";
import { Language, getTranslation } from "../utils/translations";

interface TraineeDashboardProps {
  currentUser: UserDoc;
  lang: Language;
  onUserUpdate?: (user: UserDoc) => void;
}

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

export default function TraineeDashboard({ currentUser, lang, onUserUpdate }: TraineeDashboardProps) {
  const [activeTab, setActiveTab] = useState<"workouts" | "diet" | "history" | "chat" | "subscription" | "info">("workouts");

  // Plan data
  const [program, setProgram] = useState<Program | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(true);
  const [selectedDayId, setSelectedDayId] = useState("");

  // Personal Information States
  const [weight, setWeight] = useState<string>(currentUser.weight?.toString() || "");
  const [height, setHeight] = useState<string>(currentUser.height?.toString() || "");
  const [fitnessGoal, setFitnessGoal] = useState<string>(currentUser.fitnessGoal || "Gain Muscle");
  const [age, setAge] = useState<string>(currentUser.age?.toString() || "");
  const [gender, setGender] = useState<string>(currentUser.gender || "Male");
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  // Progress tracking logs
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Workout completion modal states
  const [completingDay, setCompletingDay] = useState<WorkoutDay | null>(null);
  const [completionDuration, setCompletionDuration] = useState("45 mins");
  const [completionNotes, setCompletionNotes] = useState("");

  // Video playback modal state
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  async function loadProgressLogs() {
    setLoadingLogs(true);
    try {
      const logs = await getTraineeProgress(currentUser.uid);
      setProgressLogs(logs);
    } catch (err) {
      console.error("Error loading progress logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    setLoadingProgram(true);
    const unsubscribe = subscribeToProgram(currentUser.uid, (p) => {
      setProgram(p);
      setLoadingProgram(false);
    });

    loadProgressLogs();

    return () => unsubscribe();
  }, [currentUser.uid]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoSuccess(false);
    setInfoError(null);

    try {
      const updatedDoc: UserDoc = {
        ...currentUser,
        weight: weight ? parseFloat(weight) : undefined,
        height: height ? parseFloat(height) : undefined,
        fitnessGoal: fitnessGoal,
        age: age ? parseInt(age) : undefined,
        gender: gender,
      };

      await updateUserDoc(updatedDoc);
      
      if (onUserUpdate) {
        onUserUpdate(updatedDoc);
      }

      setInfoSuccess(true);
      setTimeout(() => setInfoSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error saving trainee info:", err);
      setInfoError(err.message || "Could not save information");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleMarkCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingDay) return;

    try {
      await logProgress({
        traineeId: currentUser.uid,
        workoutDayId: completingDay.id,
        workoutDayName: completingDay.dayName,
        completedAt: new Date().toISOString(),
        duration: completionDuration,
        notes: completionNotes
      });

      alert(`${getTranslation(lang, "logSuccess")}!`);
      setCompletingDay(null);
      setCompletionNotes("");
      loadProgressLogs(); // refresh logs list
    } catch (err) {
      console.error(err);
      alert(getTranslation(lang, "errorOccurred"));
    }
  };

  const isSubscribed = currentUser.subscriptionStatus === "active";
  const hasCoach = !!currentUser.coachId;

  const workoutDays = program?.workoutDays || [];
  const dietMeals = program?.dietMeals || [];
  const activeDay = workoutDays.find(d => d.id === selectedDayId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
      {/* LEFT NAVIGATION LINKS */}
      <div className="lg:col-span-3 space-y-4">
        {/* Welcome Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg space-y-3.5">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="h-10 w-10 bg-emerald-950 border border-emerald-800/50 rounded-full flex items-center justify-center text-emerald-400 font-bold">
              {currentUser.name[0]}
            </div>
            <div>
              <h4 className="text-xs text-neutral-400 font-mono">{getTranslation(lang, "trainee")}</h4>
              <h3 className="text-sm font-bold text-white mt-0.5">{currentUser.name}</h3>
            </div>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">{getTranslation(lang, "subStatus")}:</span>
              <span className={`font-bold uppercase ${isSubscribed ? "text-emerald-400" : "text-neutral-500"}`}>
                {isSubscribed ? getTranslation(lang, "active") : getTranslation(lang, "expired")}
              </span>
            </div>
            {isSubscribed && currentUser.subscriptionExpiry && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-neutral-500 font-mono">{getTranslation(lang, "subExpiry")}:</span>
                <span className="text-white font-mono">{new Date(currentUser.subscriptionExpiry).toLocaleDateString()}</span>
              </div>
            )}
            {currentUser.coachName && (
              <div className="flex justify-between items-center text-[11px] border-t border-neutral-900 pt-2 mt-2">
                <span className="text-neutral-500">{getTranslation(lang, "coach")}:</span>
                <span className="text-emerald-400 font-bold">{currentUser.coachName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Menu List */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 shadow-lg flex flex-col gap-1">
          {(
            [
              { id: "workouts", label: getTranslation(lang, "traineeWorkoutsTab"), icon: Dumbbell },
              { id: "diet", label: getTranslation(lang, "traineeDietTab"), icon: Apple },
              { id: "history", label: getTranslation(lang, "traineeHistoryTab"), icon: LineChart },
              { id: "chat", label: getTranslation(lang, "traineeChatTab"), icon: MessageSquare },
              { id: "subscription", label: getTranslation(lang, "traineeSubTab"), icon: Calendar },
              { id: "info", label: lang === "ar" ? "معلوماتي الشخصية" : "My Information", icon: User }
            ] as const
          ).map(tab => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-emerald-600 text-neutral-950 font-sans shadow-lg shadow-emerald-500/10"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/40"
                }`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT WORKSPACE PANELS */}
      <div className="lg:col-span-9">
        {/* If account not approved */}
        {currentUser.status !== "approved" && (
          <div className="bg-neutral-900 border border-amber-800/30 rounded-xl p-8 text-center space-y-4 shadow-lg flex flex-col items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 animate-bounce" />
            <h3 className="text-md font-bold text-white">Registration Pending Approval</h3>
            <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
              Your registration as a Trainee is currently pending administrator verification. You will be notified once an administrator approves your account and grants you system dashboard access.
            </p>
          </div>
        )}

        {/* If approved, but subscription expired/none */}
        {currentUser.status === "approved" && !isSubscribed && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-10 text-center space-y-5 shadow-lg flex flex-col items-center justify-center">
            <div className="h-14 w-14 bg-emerald-950 border border-emerald-800/40 text-emerald-400 rounded-full flex items-center justify-center animate-pulse">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-md font-bold text-white">{getTranslation(lang, "noSubscription")}</h3>
              <p className="text-xs text-neutral-400 max-w-md mt-2 leading-relaxed">
                {getTranslation(lang, "subscriptionDesc")}
              </p>
            </div>
            <div className="bg-neutral-950 rounded-lg p-3.5 border border-neutral-800 max-w-sm w-full font-mono text-xs">
              <span className="text-neutral-500 block">{getTranslation(lang, "phone")}:</span>
              <span className="text-emerald-400 font-bold text-sm mt-1 block">{currentUser.phone || "No phone registered. Go to profile."}</span>
            </div>
          </div>
        )}

        {/* Full Active Hub */}
        {currentUser.status === "approved" && isSubscribed && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl min-h-[500px]">
            {loadingProgram ? (
              <div className="py-24 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <div className="p-6">
                {/* MY WORKOUTS TAB */}
                {activeTab === "workouts" && (
                  <div className="space-y-6">
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-widest">{getTranslation(lang, "traineeWorkoutsTab").toUpperCase()}</h4>
                        <h3 className="text-md font-bold text-white mt-0.5">Assigned Fitness Program</h3>
                      </div>
                      {currentUser.coachName && (
                        <span className="text-xs bg-emerald-950 text-emerald-400 px-3 py-1 rounded-full border border-emerald-800/40">
                          Designed by Coach {currentUser.coachName}
                        </span>
                      )}
                    </div>

                    {workoutDays.length === 0 ? (
                      <div className="py-16 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-xs">
                        {getTranslation(lang, "noActiveProgram")}. {getTranslation(lang, "contactCoachToAssign")}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {workoutDays.map((day, dIdx) => {
                          const isOpen = selectedDayId === day.id;
                          return (
                            <div
                              key={day.id}
                              className={`bg-neutral-950 border rounded-xl overflow-hidden transition-all duration-200 ${
                                isOpen ? "border-emerald-500 shadow-lg shadow-emerald-950/10" : "border-neutral-800 hover:border-neutral-700"
                              }`}
                            >
                              {/* Accordion Header - Only Shows Workout Day Title */}
                              <button
                                type="button"
                                onClick={() => setSelectedDayId(isOpen ? "" : day.id)}
                                className="w-full text-left rtl:text-right px-5 py-4 flex items-center justify-between bg-neutral-950 hover:bg-neutral-900/50 transition-colors cursor-pointer"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-emerald-400">Day {dIdx + 1}</span>
                                    <h4 className="text-sm font-bold text-white">{day.dayName}</h4>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded border transition-all ${
                                    isOpen 
                                      ? "bg-emerald-950/80 text-emerald-400 border-emerald-800" 
                                      : "bg-neutral-900 text-neutral-500 border-neutral-800"
                                  }`}>
                                    {isOpen ? (lang === "ar" ? "إخفاء التمارين" : "Hide Exercises") : (lang === "ar" ? "عرض التمارين" : "View Exercises")}
                                  </span>
                                </div>
                              </button>

                              {/* Exercises and Videos - Revealed Only When Clicked */}
                              {isOpen && (
                                <div className="border-t border-neutral-900 p-5 bg-neutral-900/10 space-y-4 animate-in fade-in duration-200">
                                  <div className="flex justify-between items-center pb-2.5 border-b border-neutral-900/60">
                                    <span className="text-xs font-medium text-neutral-400">
                                      {lang === "ar" ? "التمارين ومقاطع الفيديو التوضيحية" : "Exercises & Demonstration Videos"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setCompletingDay(day)}
                                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold font-sans text-xs px-3.5 py-1.5 rounded-lg transition-colors shadow-lg shadow-emerald-500/10 cursor-pointer"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" /> {getTranslation(lang, "markCompleted")}
                                    </button>
                                  </div>

                                  {day.exercises.length === 0 ? (
                                    <p className="text-xs text-neutral-500 text-center py-6">No exercises defined for this day split.</p>
                                  ) : (
                                    <div className="space-y-3.5">
                                      {day.exercises.map((ex, idx) => (
                                        <div key={idx} className="bg-neutral-900/40 rounded-lg p-3 border border-neutral-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                          <div className="space-y-1">
                                            <span className="text-xs font-bold text-white block">{ex.name}</span>
                                            <div className="flex gap-4 text-[10px] text-neutral-400 font-mono">
                                              <span>{getTranslation(lang, "sets")}: {ex.sets}</span>
                                              <span>{getTranslation(lang, "reps")}: {ex.reps}</span>
                                            </div>
                                            {ex.notes && (
                                              <div className="bg-neutral-950 text-[10px] text-neutral-400 p-2 border border-neutral-900 rounded mt-1 leading-relaxed max-w-md">
                                                <span className="font-mono text-neutral-500 block">{getTranslation(lang, "exerciseNotes")}:</span>
                                                {ex.notes}
                                              </div>
                                            )}
                                          </div>
                                          {ex.videoUrl && (
                                            <button
                                              type="button"
                                              onClick={() => setActiveVideoUrl(ex.videoUrl)}
                                              className="self-start md:self-auto flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-white bg-emerald-950 hover:bg-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-800/50 transition-all font-mono cursor-pointer"
                                            >
                                              <Video className="h-3.5 w-3.5" /> {getTranslation(lang, "watchVideo")}
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* MY DIET PLAN TAB */}
                {activeTab === "diet" && (
                  <div className="space-y-5">
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                      <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-widest">{getTranslation(lang, "traineeDietTab").toUpperCase()}</h4>
                      <h3 className="text-md font-bold text-white mt-0.5">Personalized Meal Nutrition Plans</h3>
                    </div>

                    {dietMeals.length === 0 ? (
                      <div className="text-center py-16 border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-xs">
                        {getTranslation(lang, "noDietPlan")}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dietMeals.map(meal => (
                          <div key={meal.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start border-b border-neutral-900 pb-2">
                                <h5 className="text-xs font-bold text-white">{meal.mealName}</h5>
                                {meal.calories && (
                                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/30 px-2 py-0.5 rounded">
                                    {meal.calories}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-300 font-mono whitespace-pre-line leading-relaxed pt-1">
                                {meal.foodItems}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* WORKOUT LOG HISTORY TAB */}
                {activeTab === "history" && (
                  <div className="space-y-4">
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                      <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-widest">{getTranslation(lang, "traineeHistoryTab").toUpperCase()}</h4>
                      <h3 className="text-md font-bold text-white mt-0.5">{getTranslation(lang, "progressHistoryTitle")}</h3>
                    </div>

                    {loadingLogs ? (
                      <div className="py-10 flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                      </div>
                    ) : progressLogs.length === 0 ? (
                      <div className="text-center py-16 border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-xs">
                        {getTranslation(lang, "noLoggedWorkouts")}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {progressLogs.map(log => (
                          <div key={log.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-bold text-white">{log.workoutDayName}</h5>
                                <span className="text-[9px] font-mono font-bold bg-emerald-950 border border-emerald-800/30 text-emerald-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Check className="h-2.5 w-2.5" /> DONE
                                </span>
                              </div>
                              {log.notes && (
                                <p className="text-xs text-neutral-400 italic">
                                  "{log.notes}"
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-mono">
                              {log.duration && (
                                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {log.duration}</span>
                              )}
                              <span>{new Date(log.completedAt).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* DIRECT MESSAGE CHAT WITH COACH TAB */}
                {activeTab === "chat" && (
                  <div className="space-y-4">
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                      <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-widest">Coaching Channel</h4>
                      <h3 className="text-md font-bold text-white mt-0.5">Direct Chat with Coach</h3>
                    </div>

                    {hasCoach ? (
                      <ChatWindow currentUserId={currentUser.uid} recipientId={currentUser.coachId!} />
                    ) : (
                      <div className="text-center py-16 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-500 text-xs">
                        No coach has been assigned to you yet. Subscription activation is needed.
                      </div>
                    )}
                  </div>
                )}

                {/* SUBSCRIPTION GENERAL CARD */}
                {activeTab === "subscription" && (
                  <div className="max-w-md bg-neutral-950 border border-neutral-800 rounded-xl p-6 space-y-5">
                    <div>
                      <h3 className="text-sm font-bold text-white">{getTranslation(lang, "subStatus")}</h3>
                      <p className="text-xs text-neutral-500 mt-1">Details on your physical training subscription package.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs py-2 border-b border-neutral-900">
                        <span className="text-neutral-400">Current Coach:</span>
                        <span className="text-white font-bold">{currentUser.coachName || "None Assigned"}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs py-2 border-b border-neutral-900">
                        <span className="text-neutral-400">Subscription Status:</span>
                        <span className="text-emerald-400 font-black">{getTranslation(lang, "active").toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs py-2 border-b border-neutral-900">
                        <span className="text-neutral-400">Active Tier:</span>
                        <span className="text-white font-mono">{currentUser.subscriptionDuration || "Custom Plan"}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs py-2">
                        <span className="text-neutral-400">Expiration Date:</span>
                        <span className="text-white font-mono">
                          {currentUser.subscriptionExpiry ? new Date(currentUser.subscriptionExpiry).toLocaleString() : "Permanent"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* MY PERSONAL INFORMATION TAB */}
                {activeTab === "info" && (
                  <div className="max-w-2xl bg-neutral-950 border border-neutral-800 rounded-xl p-6 space-y-6">
                    <div>
                      <h3 className="text-md font-bold text-white flex items-center gap-2">
                        <User className="h-5 w-5 text-emerald-400" />
                        {lang === "ar" ? "بياناتي الشخصية" : "My Personal Information"}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">
                        {lang === "ar" 
                          ? "حافظ على تحديث معلوماتك لمساعدة مدربك في تصميم خطط تدريب وغذاء دقيقة." 
                          : "Keep your information updated to help your coach design precise training and diet plans."}
                      </p>
                    </div>

                    {infoSuccess && (
                      <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl p-3 text-xs flex items-center gap-2 font-medium">
                        <Check className="h-4 w-4" />
                        <span>{lang === "ar" ? "تم حفظ التغييرات بنجاح!" : "Changes saved successfully!"}</span>
                      </div>
                    )}

                    {infoError && (
                      <div className="bg-red-950/40 border border-red-800/40 text-red-400 rounded-xl p-3 text-xs">
                        {infoError}
                      </div>
                    )}

                    <form onSubmit={handleSaveInfo} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Weight */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-neutral-400 font-medium">
                            {lang === "ar" ? "الوزن (كجم)" : "Weight (kg)"}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            placeholder="e.g. 75"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>

                        {/* Height */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-neutral-400 font-medium">
                            {lang === "ar" ? "الطول (سم)" : "Height (cm)"}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            placeholder="e.g. 178"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>

                        {/* Age */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-neutral-400 font-medium">
                            {lang === "ar" ? "العمر" : "Age"}
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 25"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>

                        {/* Gender */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-neutral-400 font-medium">
                            {lang === "ar" ? "الجنس" : "Gender"}
                          </label>
                          <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                          >
                            <option value="Male">{lang === "ar" ? "ذكر" : "Male"}</option>
                            <option value="Female">{lang === "ar" ? "أنثى" : "Female"}</option>
                            <option value="Other">{lang === "ar" ? "آخر" : "Other"}</option>
                          </select>
                        </div>
                      </div>

                      {/* Fitness Goal */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-400 font-medium">
                          {lang === "ar" ? "الهدف الرياضي" : "Fitness Goal"}
                        </label>
                        <select
                          value={fitnessGoal}
                          onChange={(e) => setFitnessGoal(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                        >
                          <option value="Bulking">{lang === "ar" ? "تضخيم (Bulking)" : "Bulking"}</option>
                          <option value="Cutting">{lang === "ar" ? "تنشيف (Cutting)" : "Cutting"}</option>
                          <option value="Maintain Weight">{lang === "ar" ? "المحافظة على الوزن (Maintain Weight)" : "Maintain Weight"}</option>
                          <option value="Gain Muscle">{lang === "ar" ? "كسب عضلات (Gain Muscle)" : "Gain Muscle"}</option>
                          <option value="Lose Fat">{lang === "ar" ? "خسارة دهون (Lose Fat)" : "Lose Fat"}</option>
                        </select>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={savingInfo}
                          className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 text-neutral-950 font-sans font-bold text-xs px-6 py-2.5 rounded-lg transition-all active:scale-95 cursor-pointer shadow"
                        >
                          {savingInfo 
                            ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") 
                            : (lang === "ar" ? "حفظ التغييرات" : "Save Changes")}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Completion log popup modal */}
      {completingDay && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <form onSubmit={handleMarkCompleteSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400 h-5 w-5" /> {getTranslation(lang, "logCompletionTitle")}
              </h4>
              <p className="text-[11px] text-neutral-400 mt-1">Log details of your completion for "{completingDay.dayName}".</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 font-mono">{getTranslation(lang, "workoutDuration")}:</label>
                <input
                  type="text"
                  placeholder="e.g. 45 mins, 1 hour"
                  value={completionDuration}
                  onChange={(e) => setCompletionDuration(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 font-mono">Training Notes / Feelings / Weights used:</label>
                <textarea
                  placeholder={getTranslation(lang, "addNotesPlaceholder")}
                  value={completionNotes}
                  rows={3}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCompletingDay(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors border border-neutral-700/50 cursor-pointer"
              >
                {getTranslation(lang, "cancel")}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors font-sans shadow-lg shadow-emerald-400/20 cursor-pointer"
              >
                Publish Workout Log
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Video Demonstration lightbox popup */}
      {activeVideoUrl && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 max-w-3xl w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Exercise Demonstration Video</h4>
              <button
                type="button"
                onClick={() => setActiveVideoUrl(null)}
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

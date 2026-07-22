import React, { useState, useEffect } from "react";
import { UserDoc, WorkoutDay, DietMeal, Exercise, Program, ProgressLog, WorkoutTemplate, NutritionTemplate } from "../types";
import { 
  searchTraineeByPhone, updateSubscription, getProgram, 
  updateProgram, getTraineeProgress, getTraineesForCoach, createNotification,
  freezeSubscription, resumeSubscription, changeSubscriptionDuration,
  renewTraineeSubscription, createUserDoc, updateUserDoc, getUser,
  getWorkoutTemplates, saveWorkoutTemplate, deleteWorkoutTemplate,
  getNutritionTemplates, saveNutritionTemplate, deleteNutritionTemplate
} from "../services/dbService";
import AddMemberTab from "./AddMemberTab";
import ClientManagementTab from "./ClientManagementTab";
import SubscriptionManagementTab from "./SubscriptionManagementTab";
import TemplatesTab from "./TemplatesTab";
import CoachProfileSettingsTab from "./CoachProfileSettingsTab";
import { 
  Dumbbell, Apple, LineChart, MessageSquare, User, Plus, Trash2, Save,
  UserPlus, RefreshCw, Layers, CalendarDays, ClipboardList, Settings
} from "lucide-react";
import { Language, getTranslation } from "../utils/translations";

interface CoachDashboardProps {
  currentUserId: string;
  currentUserName: string;
  currentUser?: UserDoc;
  lang?: Language;
  onUserUpdate?: (updatedUser: UserDoc) => void;
}

export default function CoachDashboard({ currentUserId, currentUserName, currentUser, lang = "en", onUserUpdate }: CoachDashboardProps) {
  // Navigation: 5 Main Sections for Coach
  const [activeSection, setActiveSection] = useState<"add-member" | "client-management" | "subscription-management" | "templates" | "profile-settings">("client-management");

  // Coach User Profile State
  const [coachProfile, setCoachProfile] = useState<UserDoc | null>(currentUser || null);

  useEffect(() => {
    if (currentUser) {
      setCoachProfile(currentUser);
    } else if (currentUserId) {
      getUser(currentUserId).then(u => {
        if (u) setCoachProfile(u);
      });
    }
  }, [currentUser, currentUserId]);

  const handleCoachProfileUpdate = (updated: UserDoc) => {
    setCoachProfile(updated);
    if (onUserUpdate) {
      onUserUpdate(updated);
    }
  };

  // Roster state
  const [myTrainees, setMyTrainees] = useState<UserDoc[]>([]);
  const [loadingTrainees, setLoadingTrainees] = useState(true);
  const [selectedTrainee, setSelectedTrainee] = useState<UserDoc | null>(null);

  // Program state for selected trainee
  const [program, setProgram] = useState<Program | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [dietMeals, setDietMeals] = useState<DietMeal[]>([]);

  // Selected workout day inside program
  const [activeDayId, setActiveDayId] = useState<string>("");
  const [newExercise, setNewExercise] = useState({
    name: "",
    sets: 3,
    reps: "10-12",
    notes: "",
    videoUrl: ""
  });

  // Add Workout Day Modal States
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [selectedWeekDay, setSelectedWeekDay] = useState("Saturday");
  const [customDayName, setCustomDayName] = useState("");
  const [dayFocus, setDayFocus] = useState("");

  // Add Meal State
  const [newMeal, setNewMeal] = useState({
    mealName: "",
    foodItems: "",
    calories: ""
  });

  // Reusable Templates States
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [nutritionTemplates, setNutritionTemplates] = useState<NutritionTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Progress Tracker States
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Unused state for search results (just declared to satisfy interface)
  const [searchResults, setSearchResults] = useState<UserDoc[]>([]);

  // Load templates from database
  async function loadTemplates() {
    setLoadingTemplates(true);
    try {
      const wt = await getWorkoutTemplates(currentUserId);
      const nt = await getNutritionTemplates(currentUserId);
      setWorkoutTemplates(wt);
      setNutritionTemplates(nt);
    } catch (err) {
      console.error("Error loading templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  }

  // Load all trainees assigned to this coach
  async function loadMyTrainees() {
    setLoadingTrainees(true);
    try {
      const mine = await getTraineesForCoach(currentUserId);
      setMyTrainees(mine);
    } catch (err) {
      console.error("Error loading trainees:", err);
    } finally {
      setLoadingTrainees(false);
    }
  }

  useEffect(() => {
    loadMyTrainees();
    loadTemplates();
  }, [currentUserId]);

  // Load selected trainee's program and progress history logs
  useEffect(() => {
    if (!selectedTrainee) return;
    
    async function loadTraineeData() {
      setLoadingProgram(true);
      setLoadingProgress(true);
      try {
        const p = await getProgram(selectedTrainee!.uid);
        if (p) {
          setProgram(p);
          setWorkoutDays(p.workoutDays || []);
          setDietMeals(p.dietMeals || []);
          if (p.workoutDays && p.workoutDays.length > 0) {
            setActiveDayId(p.workoutDays[0].id);
          } else {
            setActiveDayId("");
          }
        } else {
          setProgram(null);
          setWorkoutDays([]);
          setDietMeals([]);
          setActiveDayId("");
        }

        const logs = await getTraineeProgress(selectedTrainee!.uid);
        setProgressLogs(logs);
      } catch (err) {
        console.error("Error loading trainee details:", err);
      } finally {
        setLoadingProgram(false);
        setLoadingProgress(false);
      }
    }

    loadTraineeData();
  }, [selectedTrainee]);

  // Utility calculations
  const getDaysRemaining = (expiryDateStr?: string) => {
    if (!expiryDateStr) return 0;
    const exp = new Date(expiryDateStr);
    const today = new Date();
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const isExpiringSoon = (trainee: UserDoc) => {
    if (trainee.subscriptionStatus !== "active") return false;
    const days = getDaysRemaining(trainee.subscriptionExpiry);
    return days > 0 && days <= 5;
  };

  // Helper: Activation / Duration Management
  const handleAssignAndActivateCustom = async (traineeId: string, durationLabel: string, daysCount: number) => {
    try {
      const now = new Date();
      const expiryDate = new Date(now.getTime() + daysCount * 24 * 60 * 60 * 1000);

      const existingTrainee = searchResults.find(t => t.uid === traineeId);
      const updatedTrainee: UserDoc = {
        role: "trainee",
        status: "approved",
        createdAt: now.toISOString(),
        ...existingTrainee,
        uid: traineeId,
        coachId: currentUserId,
        subscriptionStatus: "active",
        subscriptionStart: now.toISOString(),
        subscriptionExpiry: expiryDate.toISOString(),
        subscriptionDuration: durationLabel as any,
        name: existingTrainee?.name || "Client",
        email: existingTrainee?.email || "",
        phone: existingTrainee?.phone || ""
      };

      await updateUserDoc(updatedTrainee);
      await createNotification(
        traineeId,
        "Subscription Activated",
        `Your coach ${currentUserName} has activated your ${durationLabel} subscription!`
      );

      alert(`Successfully approved, assigned, and activated ${durationLabel} subscription!`);
      loadMyTrainees();
    } catch (err) {
      console.error(err);
      alert("Error activating member subscription.");
    }
  };

  // Helper: Extend subscription
  const handleExtendSubscription = async (trainee: UserDoc, days: number, durationLabel: string) => {
    try {
      const currentExpiry = trainee.subscriptionExpiry ? new Date(trainee.subscriptionExpiry) : new Date();
      const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      const updatedTrainee: UserDoc = {
        ...trainee,
        subscriptionStatus: "active",
        subscriptionExpiry: newExpiry.toISOString(),
        subscriptionDuration: durationLabel as any,
        frozenAt: undefined
      };

      await updateUserDoc(updatedTrainee);
      await createNotification(
        trainee.uid,
        "Subscription Extended",
        `Your subscription has been extended by ${days} days!`
      );

      alert(`Extended subscription for ${trainee.name} by ${days} days (${durationLabel}).`);
      setSelectedTrainee(updatedTrainee);
      setMyTrainees(prev => prev.map(t => t.uid === trainee.uid ? updatedTrainee : t));
    } catch (err) {
      console.error(err);
      alert("Error extending subscription.");
    }
  };

  // Helper: Freeze subscription
  const handleFreezeSpecific = async (trainee: UserDoc) => {
    try {
      await freezeSubscription(trainee.uid);
      const updated: UserDoc = {
        ...trainee,
        subscriptionStatus: "frozen",
        frozenAt: new Date().toISOString()
      };
      setSelectedTrainee(updated);
      setMyTrainees(prev => prev.map(t => t.uid === trainee.uid ? updated : t));
      alert("Membership successfully frozen.");
    } catch (err) {
      console.error(err);
      alert("Error freezing membership.");
    }
  };

  // Helper: Resume subscription
  const handleResumeSpecific = async (trainee: UserDoc) => {
    if (!trainee.subscriptionExpiry || !trainee.frozenAt) {
      alert("Cannot resume subscription without original expiry and frozen timestamps.");
      return;
    }
    try {
      await resumeSubscription(trainee.uid, trainee.subscriptionExpiry, trainee.frozenAt);
      
      const now = new Date();
      const expiryDate = new Date(trainee.subscriptionExpiry);
      const frozenAtDate = new Date(trainee.frozenAt);
      const remainingMs = expiryDate.getTime() - frozenAtDate.getTime();
      const newExpiry = new Date(now.getTime() + remainingMs);

      const updated: UserDoc = {
        ...trainee,
        subscriptionStatus: "active",
        subscriptionExpiry: newExpiry.toISOString(),
        frozenAt: undefined
      };
      setSelectedTrainee(updated);
      setMyTrainees(prev => prev.map(t => t.uid === trainee.uid ? updated : t));
      alert("Membership successfully resumed.");
    } catch (err) {
      console.error(err);
      alert("Error resuming membership.");
    }
  };

  // Helper: Apply workout templates
  const handleApplyWorkoutTemplate = async (templateId: string) => {
    if (!selectedTrainee) return;
    const template = workoutTemplates.find(t => t.id === templateId);
    if (!template) return;
    if (!confirm(`Apply "${template.name}" workout template? This will override current workouts.`)) return;

    try {
      setWorkoutDays(template.workoutDays);
      if (template.workoutDays.length > 0) {
        setActiveDayId(template.workoutDays[0].id);
      } else {
        setActiveDayId("");
      }

      const updatedProgram: Program = {
        id: selectedTrainee.uid,
        traineeId: selectedTrainee.uid,
        coachId: currentUserId,
        workoutDays: template.workoutDays,
        dietMeals: dietMeals,
        updatedAt: new Date().toISOString()
      };
      await updateProgram(updatedProgram, currentUserName);
      setProgram(updatedProgram);
      alert("Workout template applied!");
    } catch (err) {
      console.error(err);
      alert("Error applying workout template.");
    }
  };

  // Helper: Apply nutrition template
  const handleApplyNutritionTemplate = async (templateId: string) => {
    if (!selectedTrainee) return;
    const template = nutritionTemplates.find(t => t.id === templateId);
    if (!template) return;
    if (!confirm(`Apply "${template.name}" nutrition template? This will override current meal plans.`)) return;

    try {
      setDietMeals(template.dietMeals);
      const updatedProgram: Program = {
        id: selectedTrainee.uid,
        traineeId: selectedTrainee.uid,
        coachId: currentUserId,
        workoutDays: workoutDays,
        dietMeals: template.dietMeals,
        updatedAt: new Date().toISOString()
      };
      await updateProgram(updatedProgram, currentUserName);
      setProgram(updatedProgram);
      alert("Nutrition template applied!");
    } catch (err) {
      console.error(err);
      alert("Error applying nutrition template.");
    }
  };

  // Workout Program Scheduling Builders
  const handleOpenAddDayModal = () => {
    setSelectedWeekDay("Saturday");
    setCustomDayName("");
    setDayFocus("");
    setIsAddDayModalOpen(true);
  };

  const handleConfirmAddDay = () => {
    const dayName = selectedWeekDay === "Custom" ? customDayName.trim() : selectedWeekDay;
    if (!dayName) {
      alert("Please select or enter a day name.");
      return;
    }
    const dayId = "day_" + Date.now();
    const newDay: WorkoutDay = {
      id: dayId,
      dayName: dayName,
      focus: dayFocus.trim() || undefined,
      exercises: []
    };
    const updated = [...workoutDays, newDay];
    setWorkoutDays(updated);
    setActiveDayId(dayId);
    setIsAddDayModalOpen(false);
  };

  const handleDeleteDay = (dayId: string) => {
    if (!confirm("Are you sure you want to delete this workout day?")) return;
    const updated = workoutDays.filter(d => d.id !== dayId);
    setWorkoutDays(updated);
    if (activeDayId === dayId) {
      if (updated.length > 0) {
        setActiveDayId(updated[0].id);
      } else {
        setActiveDayId("");
      }
    }
  };

  const handleAddExercise = (dayId: string) => {
    if (!newExercise.name.trim()) {
      alert("Please enter an exercise name.");
      return;
    }
    const item: Exercise = {
      name: newExercise.name.trim(),
      sets: newExercise.sets,
      reps: newExercise.reps.trim() || "10-12",
      notes: newExercise.notes.trim() || undefined,
      videoUrl: newExercise.videoUrl.trim() || undefined
    };
    setWorkoutDays(workoutDays.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          exercises: [...day.exercises, item]
        };
      }
      return day;
    }));
    // Reset exercise form
    setNewExercise({
      name: "",
      sets: 3,
      reps: "10-12",
      notes: "",
      videoUrl: ""
    });
  };

  const handleDeleteExercise = (dayId: string, idx: number) => {
    setWorkoutDays(workoutDays.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          exercises: day.exercises.filter((_, i) => i !== idx)
        };
      }
      return day;
    }));
  };

  // Diet Meal Plan Builders
  const handleAddMeal = () => {
    if (!newMeal.mealName.trim() || !newMeal.foodItems.trim()) {
      alert("Please enter both meal title and food details.");
      return;
    }
    const item: DietMeal = {
      id: "meal_" + Date.now(),
      mealName: newMeal.mealName.trim(),
      foodItems: newMeal.foodItems.trim(),
      calories: newMeal.calories.trim() || undefined
    };
    setDietMeals([...dietMeals, item]);
    setNewMeal({
      mealName: "",
      foodItems: "",
      calories: ""
    });
  };

  const handleDeleteMeal = (mealId: string) => {
    setDietMeals(dietMeals.filter(m => m.id !== mealId));
  };

  // Save Workout & Diet programs to database
  const handleSaveProgram = async () => {
    if (!selectedTrainee) return;
    setLoadingProgram(true);
    try {
      const updatedProgram: Program = {
        id: selectedTrainee.uid,
        traineeId: selectedTrainee.uid,
        coachId: currentUserId,
        workoutDays: workoutDays,
        dietMeals: dietMeals,
        updatedAt: new Date().toISOString()
      };
      await updateProgram(updatedProgram, currentUserName);
      setProgram(updatedProgram);
      alert("Trainee program schedule saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving program.");
    } finally {
      setLoadingProgram(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Mode Toggle Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4">
        <div>
          <h2 className="text-sm font-bold text-white font-sans uppercase tracking-wider">
            {lang === "ar" ? "لوحة تحكم وتوجيه المدرب" : "Coach Administration Control Panel"}
          </h2>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {lang === "ar"
              ? "إدارة حسابات المتدربين، تعيين جداول البرامج التدريبية، تخصيص أنظمة التغذية، وإدارة القوالب."
              : "Manage trainee accounts, assign workout program schedules, assign custom diet routines, and manage templates."}
          </p>
        </div>
        <div className="flex flex-wrap bg-neutral-950 p-1 rounded-lg border border-neutral-800 w-full md:w-auto gap-1">
          <button
            onClick={() => {
              setActiveSection("add-member");
              setSelectedTrainee(null);
            }}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeSection === "add-member"
                ? "bg-emerald-600 text-neutral-950 shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" /> {lang === "ar" ? "إضافة مشترك" : "Add Member"}
          </button>
          <button
            onClick={() => setActiveSection("client-management")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeSection === "client-management"
                ? "bg-emerald-600 text-neutral-950 shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" /> {lang === "ar" ? "إدارة المشتركين" : "Client Management"}
          </button>
          <button
            onClick={() => {
              setActiveSection("subscription-management");
              setSelectedTrainee(null);
            }}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeSection === "subscription-management"
                ? "bg-emerald-600 text-neutral-950 shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" /> {lang === "ar" ? "إدارة الاشتراكات" : "Subscription Management"}
          </button>
          <button
            onClick={() => {
              setActiveSection("templates");
              setSelectedTrainee(null);
            }}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeSection === "templates"
                ? "bg-emerald-600 text-neutral-950 shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> {lang === "ar" ? "القوالب الجاهزة" : "Templates"}
          </button>
          <button
            onClick={() => {
              setActiveSection("profile-settings");
              setSelectedTrainee(null);
            }}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeSection === "profile-settings"
                ? "bg-emerald-600 text-neutral-950 shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Settings className="h-3.5 w-3.5" /> {lang === "ar" ? "إعدادات الملف الشخصي" : "Profile Settings"}
          </button>
        </div>
      </div>

      {activeSection === "add-member" && (
        <AddMemberTab 
          lang={lang}
          onSearchPhone={async (phone) => {
            const list = await searchTraineeByPhone(phone);
            setSearchResults(list);
            return list;
          }}
          onAssignAndActivate={async (traineeId, label, days) => {
            await handleAssignAndActivateCustom(traineeId, label, days);
          }}
        />
      )}

      {activeSection === "client-management" && (
        <ClientManagementTab
          lang={lang}
          myTrainees={myTrainees}
          selectedTrainee={selectedTrainee}
          setSelectedTrainee={setSelectedTrainee}
          workoutTemplates={workoutTemplates}
          nutritionTemplates={nutritionTemplates}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onApplyWorkoutTemplate={handleApplyWorkoutTemplate}
          onApplyNutritionTemplate={handleApplyNutritionTemplate}
          getDaysRemaining={getDaysRemaining}
          isExpiringSoon={isExpiringSoon}
          loadMyTrainees={loadMyTrainees}
          workoutDays={workoutDays}
          setWorkoutDays={setWorkoutDays}
          dietMeals={dietMeals}
          setDietMeals={setDietMeals}
          activeDayId={activeDayId}
          setActiveDayId={setActiveDayId}
          newExercise={newExercise}
          setNewExercise={setNewExercise}
          handleAddExercise={handleAddExercise}
          handleDeleteExercise={handleDeleteExercise}
          handleOpenAddDayModal={handleOpenAddDayModal}
          handleDeleteDay={handleDeleteDay}
          newMeal={newMeal}
          setNewMeal={setNewMeal}
          handleAddMeal={handleAddMeal}
          handleDeleteMeal={handleDeleteMeal}
          handleSaveProgram={handleSaveProgram}
          loadingProgram={loadingProgram}
          progressLogs={progressLogs}
          loadingProgress={loadingProgress}
          onSaveNotesAndMeasurements={async (fields) => {
            if (!selectedTrainee) return;
            const updatedTrainee: UserDoc = {
              ...selectedTrainee,
              ...fields
            };
            await updateUserDoc(updatedTrainee);
            setSelectedTrainee(updatedTrainee);
            setMyTrainees(prev => prev.map(t => t.uid === selectedTrainee.uid ? updatedTrainee : t));
            alert(lang === "ar" ? "تم حفظ الملاحظات والقياسات بنجاح!" : "Notes and measurements saved successfully!");
          }}
        />
      )}

      {activeSection === "subscription-management" && (
        <SubscriptionManagementTab
          lang={lang}
          myTrainees={myTrainees}
          selectedTrainee={selectedTrainee}
          setSelectedTrainee={setSelectedTrainee}
          onExtendSubscription={async (trainee, days, label) => {
            await handleExtendSubscription(trainee, days, label);
          }}
          onFreezeSubscription={async (trainee) => {
            await handleFreezeSpecific(trainee);
          }}
          onResumeSubscription={async (trainee) => {
            await handleResumeSpecific(trainee);
          }}
          getDaysRemaining={getDaysRemaining}
        />
      )}

      {activeSection === "templates" && (
        <TemplatesTab
          lang={lang}
          currentUserId={currentUserId}
          workoutTemplates={workoutTemplates}
          nutritionTemplates={nutritionTemplates}
          loadingTemplates={loadingTemplates}
          onCreateWorkoutTemplate={async (name, days) => {
            const template: Omit<WorkoutTemplate, "id"> = {
              name,
              coachId: currentUserId,
              workoutDays: days,
              createdAt: new Date().toISOString()
            };
            await saveWorkoutTemplate(template);
            alert(lang === "ar" ? `تم حفظ قالب التمرين "${name}"!` : `Workout template "${name}" saved!`);
            loadTemplates();
          }}
          onDeleteWorkoutTemplate={async (id) => {
            if (!confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا القالب؟" : "Delete this workout template?")) return;
            await deleteWorkoutTemplate(id);
            loadTemplates();
          }}
          onCreateNutritionTemplate={async (name, meals) => {
            const template: Omit<NutritionTemplate, "id"> = {
              name,
              coachId: currentUserId,
              dietMeals: meals,
              createdAt: new Date().toISOString()
            };
            await saveNutritionTemplate(template);
            alert(lang === "ar" ? `تم حفظ قالب التغذية "${name}"!` : `Nutrition template "${name}" saved!`);
            loadTemplates();
          }}
          onDeleteNutritionTemplate={async (id) => {
            if (!confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا القالب؟" : "Delete this nutrition template?")) return;
            await deleteNutritionTemplate(id);
            loadTemplates();
          }}
        />
      )}

      {activeSection === "profile-settings" && coachProfile && (
        <CoachProfileSettingsTab
          currentUser={coachProfile}
          lang={lang}
          onUserUpdate={handleCoachProfileUpdate}
        />
      )}

      {/* ADD WORKOUT DAY MODAL (PERSISTS IN WORKSPACE) */}
      {isAddDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 text-xs text-left rtl:text-right">
            <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Dumbbell className="text-emerald-400 h-4.5 w-4.5" />
                {lang === "ar" ? "إضافة يوم تدريبي" : "Add Workout Day"}
              </h3>
              <button 
                onClick={() => setIsAddDayModalOpen(false)}
                className="text-neutral-400 hover:text-white font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-neutral-400 font-mono">
                  {lang === "ar" ? "اختر اليوم من الأسبوع" : "Select Weekday"}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { key: "Saturday", label: lang === "ar" ? "السبت" : "Saturday" },
                    { key: "Sunday", label: lang === "ar" ? "الأحد" : "Sunday" },
                    { key: "Monday", label: lang === "ar" ? "الإثنين" : "Monday" },
                    { key: "Tuesday", label: lang === "ar" ? "الثلاثاء" : "Tuesday" },
                    { key: "Wednesday", label: lang === "ar" ? "الأربعاء" : "Wednesday" },
                    { key: "Thursday", label: lang === "ar" ? "الخميس" : "Thursday" },
                    { key: "Friday", label: lang === "ar" ? "الجمعة" : "Friday" },
                    { key: "Custom", label: lang === "ar" ? "مخصص" : "Custom" }
                  ].map(day => (
                    <button
                      type="button"
                      key={day.key}
                      onClick={() => setSelectedWeekDay(day.key)}
                      className={`py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                        selectedWeekDay === day.key
                          ? "bg-emerald-950 text-emerald-400 border-emerald-500"
                          : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedWeekDay === "Custom" && (
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono">
                    {lang === "ar" ? "عنوان اليوم المخصص" : "Custom Day Title"}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === "ar" ? "مثال: أرجل وكارديو، الجزء العلوي أ" : "e.g. Legs & Cardio, Upper Body A"}
                    value={customDayName}
                    onChange={(e) => setCustomDayName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-neutral-400 font-mono">
                  {lang === "ar" ? "التركيز والهدف من اليوم (عضلات اليوم)" : "Day Training Focus Target"}
                </label>
                <input
                  type="text"
                  placeholder={lang === "ar" ? "مثال: صدر وترايسبس، تمارين الأرجل، كارديو" : "e.g. Chest & Triceps, Leg Day, Cardio"}
                  value={dayFocus}
                  onChange={(e) => setDayFocus(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsAddDayModalOpen(false)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg text-xs font-bold border border-neutral-800 transition-colors cursor-pointer"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleConfirmAddDay}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === "ar" ? "إضافة اليوم" : "Add Workout Day"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

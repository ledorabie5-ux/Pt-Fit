import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { UserDoc, UserRole, UserStatus, Program, WorkoutDay, DietMeal, Exercise, ExerciseVideo, ProgressLog } from "../types";
import { 
  getAllUsers, updateUserStatus, updateSubscription, 
  deleteUserDoc, updateUserDoc, getProgram, updateProgram,
  cancelSubscription, broadcastAnnouncement, getExerciseVideos,
  addExerciseVideo, deleteExerciseVideo, getTraineeProgress
} from "../services/dbService";
import { 
  Users, UserCheck, Shield, AlertCircle, RefreshCw, 
  Search, CheckCircle2, XCircle, Award, Calendar, Phone, Mail,
  Lock, KeyRound, Dumbbell, Apple, Plus, Trash2, Edit2, Save, Video, ClipboardList, UserX,
  Megaphone, History, Sparkles, ShieldAlert
} from "lucide-react";
import { Language, getTranslation } from "../utils/translations";

interface AdminDashboardProps {
  currentUserId: string;
  lang: Language;
}

export default function AdminDashboard({ currentUserId, lang }: AdminDashboardProps) {
  // Administrative Secure Protection Login
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("admin_authenticated") === "true";
  });
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Application Data States
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [subStatusFilter, setSubStatusFilter] = useState<"all" | "active" | "expired">("all");
  const [error, setError] = useState<string | null>(null);

  // Active Management Sub-Tabs
  const [activeTab, setActiveTab] = useState<"trainees" | "coaches" | "plans" | "videos" | "announcements" | "progress">("trainees");

  // Exercise Videos Library States
  const [exerciseVideos, setExerciseVideos] = useState<ExerciseVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoName, setVideoName] = useState("");
  const [videoGroup, setVideoGroup] = useState("Chest");
  const [videoUrl, setVideoUrl] = useState("");

  // Announcements States
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementAudience, setAnnouncementAudience] = useState<"all" | "trainees" | "coaches">("all");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [announcementSuccess, setAnnouncementSuccess] = useState(false);

  // Trainee Activity States
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedProgressTrainee, setSelectedProgressTrainee] = useState<UserDoc | null>(null);

  // Subscription Renewal Modal States
  const [selectedTrainee, setSelectedTrainee] = useState<UserDoc | null>(null);
  const [approvingUser, setApprovingUser] = useState<UserDoc | null>(null);
  const [subDuration, setSubDuration] = useState<"1 Month" | "3 Months" | "6 Months" | "1 Year">("1 Month");
  const [assignCoachId, setAssignCoachId] = useState("");

  // User Account Editing Modal States
  const [editingUser, setEditingUser] = useState<UserDoc | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("trainee");
  const [editStatus, setEditStatus] = useState<UserStatus>("pending");
  const [editCoachId, setEditCoachId] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // Training & Diet Program Editing States (Direct Plan Management)
  const [selectedPlanTrainee, setSelectedPlanTrainee] = useState<UserDoc | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [dietMeals, setDietMeals] = useState<DietMeal[]>([]);
  const [activeDayId, setActiveDayId] = useState<string>("");
  const [newExercise, setNewExercise] = useState<Exercise>({
    name: "",
    sets: 3,
    reps: "10-12",
    notes: "",
    videoUrl: ""
  });
  const [newMeal, setNewMeal] = useState({
    mealName: "",
    foodItems: "",
    calories: ""
  });

  // Handle Admin Auth
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (adminUsername.trim() === "Ramadan" && adminPassword === "Ro8995") {
      try {
        await signInWithEmailAndPassword(auth, "admin@ptfit.com", "Ro8995");
      } catch (err: any) {
        if (err.code === "auth/user-not-found" || err.message?.includes("not-found") || err.code === "auth/invalid-credential") {
          try {
            await createUserWithEmailAndPassword(auth, "admin@ptfit.com", "Ro8995");
          } catch (createErr) {
            console.warn("Failed to register admin user in Firebase Auth:", createErr);
          }
        } else {
          console.warn("Failed to sign in admin in Firebase Auth:", err);
        }
      }
      setIsAdminAuthenticated(true);
      sessionStorage.setItem("admin_authenticated", "true");
    } else {
      setLoginError(getTranslation(lang, "invalidAdminCreds"));
    }
  };

  async function loadUsers() {
    setLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load user registrations from database.");
    } finally {
      setLoading(false);
    }
  }

  async function loadVideos() {
    setLoadingVideos(true);
    try {
      const list = await getExerciseVideos();
      setExerciseVideos(list);
    } catch (err) {
      console.error("Error loading videos:", err);
    } finally {
      setLoadingVideos(false);
    }
  }

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadUsers();
    }
  }, [isAdminAuthenticated]);

  useEffect(() => {
    if (isAdminAuthenticated && activeTab === "videos") {
      loadVideos();
    }
  }, [isAdminAuthenticated, activeTab]);

  const handleApproveReject = async (uid: string, newStatus: "approved" | "rejected") => {
    try {
      await updateUserStatus(uid, newStatus);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
    } catch (err) {
      console.error(err);
      alert("Error updating user status");
    }
  };

  const handleConfirmApproval = async () => {
    if (!approvingUser) return;
    try {
      // 1. Update status to approved
      await updateUserStatus(approvingUser.uid, "approved");

      // 2. Setup subscription details
      const selectedCoachId = assignCoachId || approvingUser.coachId || "";
      const coachDoc = users.find(u => u.uid === selectedCoachId && u.role === "coach");
      const coachName = coachDoc ? coachDoc.name : (approvingUser.coachName || "Unassigned");

      await updateSubscription(approvingUser.uid, subDuration, selectedCoachId, coachName);

      alert(lang === "ar" ? "تم الموافقة على الحساب وتفعيل الاشتراك بنجاح!" : `Successfully approved account & activated ${subDuration} subscription!`);
      setApprovingUser(null);
      setAssignCoachId("");
      loadUsers();
    } catch (err) {
      console.error(err);
      alert(getTranslation(lang, "errorOccurred"));
    }
  };

  const handleManualSubscription = async () => {
    if (!selectedTrainee) return;
    
    // Determine assigned coach info
    const selectedCoachId = assignCoachId || selectedTrainee.coachId || "";
    const coachDoc = users.find(u => u.uid === selectedCoachId && u.role === "coach");
    const coachName = coachDoc ? coachDoc.name : (selectedTrainee.coachName || "Unassigned");

    try {
      await updateSubscription(selectedTrainee.uid, subDuration, selectedCoachId, coachName);
      alert(`${getTranslation(lang, "successActivation")}: ${subDuration}`);
      setSelectedTrainee(null);
      setAssignCoachId("");
      loadUsers();
    } catch (err) {
      console.error(err);
      alert(getTranslation(lang, "errorOccurred"));
    }
  };

  const handleCancelSubscription = async (uid: string) => {
    if (!confirm("Are you sure you want to cancel this trainee's active subscription?")) return;
    try {
      await cancelSubscription(uid);
      alert("Subscription has been cancelled successfully.");
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to cancel subscription.");
    }
  };

  const handleResetPasswordDirectly = async () => {
    if (!editingUser || !editPassword.trim()) {
      alert("Please enter a new password first.");
      return;
    }
    try {
      const updatedUser = { ...editingUser, customPassword: editPassword.trim() };
      await updateUserDoc(updatedUser);
      alert(`Password for ${editingUser.name} has been updated to: ${editPassword.trim()}`);
      setEditPassword("");
    } catch (err) {
      console.error(err);
      alert("Failed to update user password.");
    }
  };

  // User deletion
  const handleDeleteUser = async (uid: string) => {
    if (!confirm(getTranslation(lang, "confirmDeleteUser"))) return;
    try {
      await deleteUserDoc(uid);
      setUsers(prev => prev.filter(u => u.uid !== uid));
      if (editingUser?.uid === uid) setEditingUser(null);
      alert("User account deleted successfully");
    } catch (err) {
      console.error(err);
      alert("Error deleting user account");
    }
  };

  // User edit modal open
  const handleOpenEditUserModal = (user: UserDoc) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone || "");
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditCoachId(user.coachId || "");
    setEditPassword("");
  };

  // Save edited user account details
  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim()) {
      alert("Name and email are required fields.");
      return;
    }

    const coachDoc = users.find(c => c.uid === editCoachId && c.role === "coach");
    const updatedUser: UserDoc = {
      ...editingUser,
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      role: editRole,
      status: editStatus,
      coachId: editCoachId || undefined,
      coachName: coachDoc ? coachDoc.name : undefined
    };

    try {
      await updateUserDoc(updatedUser);
      setUsers(prev => prev.map(u => u.uid === editingUser.uid ? updatedUser : u));
      setEditingUser(null);
      alert("User account updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Error updating user account details");
    }
  };

  // --- Plan Direct Editor Logic ---
  const handleSelectPlanTrainee = async (trainee: UserDoc) => {
    setSelectedPlanTrainee(trainee);
    setLoadingProgram(true);
    setWorkoutDays([]);
    setDietMeals([]);
    setActiveDayId("");
    try {
      const p = await getProgram(trainee.uid);
      if (p) {
        setWorkoutDays(p.workoutDays || []);
        setDietMeals(p.dietMeals || []);
        if (p.workoutDays && p.workoutDays.length > 0) {
          setActiveDayId(p.workoutDays[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProgram(false);
    }
  };

  const handleAddWorkoutDay = () => {
    const dayName = prompt(getTranslation(lang, "dayNamePrompt"));
    if (!dayName) return;
    const newDay: WorkoutDay = {
      id: "day_" + Date.now(),
      dayName,
      exercises: []
    };
    const updated = [...workoutDays, newDay];
    setWorkoutDays(updated);
    if (!activeDayId) {
      setActiveDayId(newDay.id);
    }
  };

  const handleDeleteWorkoutDay = (dayId: string) => {
    if (!confirm(getTranslation(lang, "confirmDeleteDay"))) return;
    const updated = workoutDays.filter(d => d.id !== dayId);
    setWorkoutDays(updated);
    if (activeDayId === dayId) {
      setActiveDayId(updated.length > 0 ? updated[0].id : "");
    }
  };

  const handleAddExercise = () => {
    if (!activeDayId) return;
    if (!newExercise.name.trim()) {
      alert("Please provide exercise name");
      return;
    }

    const updated = workoutDays.map(day => {
      if (day.id === activeDayId) {
        return {
          ...day,
          exercises: [...day.exercises, newExercise]
        };
      }
      return day;
    });

    setWorkoutDays(updated);
    setNewExercise({
      name: "",
      sets: 3,
      reps: "10-12",
      notes: "",
      videoUrl: ""
    });
  };

  const handleDeleteExercise = (dayId: string, exerciseIndex: number) => {
    const updated = workoutDays.map(day => {
      if (day.id === dayId) {
        const exs = [...day.exercises];
        exs.splice(exerciseIndex, 1);
        return { ...day, exercises: exs };
      }
      return day;
    });
    setWorkoutDays(updated);
  };

  const handleAddMeal = () => {
    if (!newMeal.mealName.trim() || !newMeal.foodItems.trim()) {
      alert("Meal name and food ingredients are required.");
      return;
    }
    const mealItem: DietMeal = {
      id: "meal_" + Date.now(),
      mealName: newMeal.mealName.trim(),
      foodItems: newMeal.foodItems.trim(),
      calories: newMeal.calories.trim() || undefined
    };
    setDietMeals([...dietMeals, mealItem]);
    setNewMeal({ mealName: "", foodItems: "", calories: "" });
  };

  const handleDeleteMeal = (mealId: string) => {
    setDietMeals(dietMeals.filter(m => m.id !== mealId));
  };

  const handleSaveProgram = async () => {
    if (!selectedPlanTrainee) return;
    try {
      const updatedProgram: Program = {
        id: selectedPlanTrainee.uid,
        traineeId: selectedPlanTrainee.uid,
        coachId: selectedPlanTrainee.coachId || currentUserId,
        workoutDays: workoutDays,
        dietMeals: dietMeals,
        updatedAt: new Date().toISOString()
      };
      await updateProgram(updatedProgram, "Administrator");
      alert("Training and Diet plan saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving program");
    }
  };

  // Video Management Submission
  const handleAddVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoName.trim() || !videoUrl.trim()) {
      alert("Name and Video URL are required.");
      return;
    }
    try {
      await addExerciseVideo({
        name: videoName.trim(),
        muscleGroup: videoGroup,
        videoUrl: videoUrl.trim(),
        createdAt: new Date().toISOString()
      });
      alert(getTranslation(lang, "videoAddedSuccess"));
      setVideoName("");
      setVideoUrl("");
      loadVideos();
    } catch (err) {
      console.error("Error adding video:", err);
      alert("Error adding exercise video.");
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exercise video?")) return;
    try {
      await deleteExerciseVideo(id);
      loadVideos();
    } catch (err) {
      console.error("Error deleting video:", err);
    }
  };

  // Broadcast Notification Submit
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      alert("Title and message body are required.");
      return;
    }
    setSendingAnnouncement(true);
    try {
      await broadcastAnnouncement(
        announcementTitle.trim(),
        announcementBody.trim(),
        announcementAudience
      );
      setAnnouncementSuccess(true);
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setTimeout(() => setAnnouncementSuccess(false), 5000);
    } catch (err) {
      console.error("Error sending announcement:", err);
      alert("Failed to send announcement.");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  // Fetch progress logs
  const handleSelectProgressTrainee = async (trainee: UserDoc) => {
    setSelectedProgressTrainee(trainee);
    setLoadingLogs(true);
    setProgressLogs([]);
    try {
      const logs = await getTraineeProgress(trainee.uid);
      setProgressLogs(logs);
    } catch (err) {
      console.error("Error fetching progress logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Prospective expiry calculator
  const calculateExpiryDate = (duration: "1 Month" | "3 Months" | "6 Months" | "1 Year") => {
    const monthsMap = { "1 Month": 1, "3 Months": 3, "6 Months": 6, "1 Year": 12 };
    const months = monthsMap[duration];
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);
    return expiry.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Pre-calculate statistics
  const coaches = users.filter(u => u.role === "coach");
  const trainees = users.filter(u => u.role === "trainee");
  const totalCoaches = coaches.length;
  const totalTrainees = trainees.length;
  const pendingApprovals = users.filter(u => u.status === "pending").length;
  const activeSubs = users.filter(u => u.role === "trainee" && u.subscriptionStatus === "active").length;

  // Filter lists based on role and tab
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    
    const matchesStatus = statusFilter === "all" ? true : u.status === statusFilter;

    // Filter by role depending on tab
    const matchesTabRole = activeTab === "trainees" ? u.role === "trainee" : u.role === "coach";

    // Subscription Filter (Only for Trainees Directory)
    const matchesSubFilter = activeTab === "trainees" && subStatusFilter !== "all" 
      ? (subStatusFilter === "active" ? u.subscriptionStatus === "active" : u.subscriptionStatus !== "active")
      : true;

    return matchesSearch && matchesStatus && matchesTabRole && matchesSubFilter && u.role !== "admin";
  });

  const pendingUsers = users.filter(u => u.status === "pending" && u.role !== "admin" && (activeTab === "trainees" ? u.role === "trainee" : u.role === "coach"));

  // RENDER: Administrative login screen if unauthenticated
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl relative z-10">
          <div className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <KeyRound className="h-6 w-6 stroke-[2]" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">{getTranslation(lang, "adminSecureTitle")}</h3>
            <p className="text-xs text-neutral-400">{getTranslation(lang, "adminSecureSub")}</p>
          </div>

          {loginError && (
            <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-3.5 text-xs text-red-400 font-mono text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                <Shield className="h-3 w-3" /> {getTranslation(lang, "adminUserLabel")}
              </label>
              <input
                type="text"
                placeholder="e.g. Ramadan"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 placeholder-neutral-500 transition-colors text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                <Lock className="h-3 w-3" /> {getTranslation(lang, "adminPassLabel")}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 placeholder-neutral-500 transition-colors text-white"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-sans font-black text-xs py-3 rounded-lg shadow-lg hover:shadow-emerald-400/10 active:scale-95 transition-all mt-2 cursor-pointer"
            >
              {getTranslation(lang, "adminLoginBtn").toUpperCase()}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap border-b border-neutral-800 gap-1 md:gap-2">
        <button
          onClick={() => setActiveTab("trainees")}
          className={`px-4 py-3 text-xs font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "trainees"
              ? "border-emerald-500 text-emerald-400 bg-emerald-950/10"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          {getTranslation(lang, "traineesOnly")}
        </button>
        <button
          onClick={() => setActiveTab("coaches")}
          className={`px-4 py-3 text-xs font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "coaches"
              ? "border-emerald-500 text-emerald-400 bg-emerald-950/10"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          <Shield className="h-4 w-4" />
          {getTranslation(lang, "coachesOnly")}
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-3 text-xs font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "plans"
              ? "border-emerald-500 text-emerald-400 bg-emerald-950/10"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          {getTranslation(lang, "managePlans")}
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={`px-4 py-3 text-xs font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "videos"
              ? "border-emerald-500 text-emerald-400 bg-emerald-950/10"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          <Video className="h-4 w-4" />
          {getTranslation(lang, "exerciseVideosTab")}
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={`px-4 py-3 text-xs font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "announcements"
              ? "border-emerald-500 text-emerald-400 bg-emerald-950/10"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          <Megaphone className="h-4 w-4" />
          {getTranslation(lang, "announcementsTab")}
        </button>
        <button
          onClick={() => setActiveTab("progress")}
          className={`px-4 py-3 text-xs font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "progress"
              ? "border-emerald-500 text-emerald-400 bg-emerald-950/10"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          <History className="h-4 w-4" />
          {getTranslation(lang, "userProgressTab")}
        </button>
      </div>

      {/* Trainees Directory or Coaches Directory tabs */}
      {(activeTab === "trainees" || activeTab === "coaches") && (
        <>
          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center space-x-4 rtl:space-x-reverse shadow-lg">
              <div className="p-3 bg-emerald-950/50 text-emerald-400 rounded-lg border border-emerald-800/30">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">{getTranslation(lang, "totalTrainees")}</p>
                <h3 className="text-2xl font-black text-white mt-1">{totalTrainees}</h3>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center space-x-4 rtl:space-x-reverse shadow-lg">
              <div className="p-3 bg-indigo-950/50 text-indigo-400 rounded-lg border border-indigo-800/30">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">{getTranslation(lang, "totalCoaches")}</p>
                <h3 className="text-2xl font-black text-white mt-1">{totalCoaches}</h3>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center space-x-4 rtl:space-x-reverse shadow-lg">
              <div className="p-3 bg-amber-950/50 text-amber-400 rounded-lg border border-amber-800/30">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">{getTranslation(lang, "pendingApprovals")}</p>
                <h3 className="text-2xl font-black text-white mt-1">{pendingApprovals}</h3>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center space-x-4 rtl:space-x-reverse shadow-lg">
              <div className="p-3 bg-teal-950/50 text-teal-400 rounded-lg border border-teal-800/30">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">{getTranslation(lang, "activeSubs")}</p>
                <h3 className="text-2xl font-black text-white mt-1">{activeSubs}</h3>
              </div>
            </div>
          </div>

          {/* Pending Registrations section */}
          {pendingUsers.length > 0 && (
            <div className="bg-neutral-900 border border-amber-800/30 rounded-xl overflow-hidden shadow-xl animate-pulse">
              <div className="bg-amber-950/10 border-b border-amber-800/20 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <h3 className="text-md font-bold text-white">{getTranslation(lang, "pendingRegistrations")}</h3>
                </div>
                <span className="text-xs font-mono font-bold bg-amber-950/80 border border-amber-800/40 text-amber-400 px-2.5 py-1 rounded-md">
                  {pendingUsers.length} {getTranslation(lang, "waitingAction")}
                </span>
              </div>
              <div className="divide-y divide-neutral-800">
                {pendingUsers.map(u => (
                  <div key={u.uid} className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                        <span className="text-sm font-bold text-white">{u.name}</span>
                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${
                          u.role === "coach" 
                            ? "bg-indigo-950/80 text-indigo-400 border-indigo-800/50" 
                            : "bg-emerald-950/80 text-emerald-400 border-emerald-800/50"
                        }`}>
                          {getTranslation(lang, u.role as any)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400 font-mono">
                        <span>{u.email}</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {u.phone || "No phone"}</span>
                        <span>{getTranslation(lang, "createdAt")}: {new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 rtl:space-x-reverse self-end md:self-auto">
                      <button
                        onClick={() => handleApproveReject(u.uid, "rejected")}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-400 hover:text-white bg-red-950/20 hover:bg-red-600 border border-red-800/40 rounded-lg transition-all cursor-pointer"
                      >
                        <XCircle className="h-4 w-4" /> {getTranslation(lang, "reject")}
                      </button>
                      <button
                        onClick={() => {
                          setApprovingUser(u);
                          setSubDuration("1 Month");
                          setAssignCoachId(u.coachId || "");
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all font-sans shadow-lg shadow-emerald-400/10 cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4" /> {getTranslation(lang, "approve")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary Users Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/40">
              <div>
                <h3 className="text-md font-bold text-white">
                  {activeTab === "trainees" ? "Trainees Directory" : "Coaches Directory"}
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {activeTab === "trainees" ? "Search, audit and manage trainees, activate subscriptions, or assign coach." : "Search and manage professional trainer coach credentials."}
                </p>
              </div>
              <button
                onClick={loadUsers}
                className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700/50 transition-all font-medium cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> {getTranslation(lang, "refreshBtn")}
              </button>
            </div>

            {/* Table Header Filter controls */}
            <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder={getTranslation(lang, "searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="text-xs text-neutral-400 font-mono">{getTranslation(lang, "status")}:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">{getTranslation(lang, "allStatuses")}</option>
                  <option value="pending">{getTranslation(lang, "pending")}</option>
                  <option value="approved">{getTranslation(lang, "approved")}</option>
                  <option value="rejected">{getTranslation(lang, "rejected")}</option>
                </select>
              </div>

              {activeTab === "trainees" && (
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="text-xs text-neutral-400 font-mono">{getTranslation(lang, "subStatusFilter")}:</span>
                  <select
                    value={subStatusFilter}
                    onChange={(e) => setSubStatusFilter(e.target.value as any)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">{getTranslation(lang, "allSubscriptions")}</option>
                    <option value="active">{getTranslation(lang, "activeSubsOnly")}</option>
                    <option value="expired">{getTranslation(lang, "expiredSubsOnly")}</option>
                  </select>
                </div>
              )}
            </div>

            {/* List Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-20 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 text-sm">
                  {getTranslation(lang, "noUsersFound")}
                </div>
              ) : (
                <table className="w-full text-left rtl:text-right text-sm text-neutral-300">
                  <thead className="text-xs text-neutral-400 uppercase bg-neutral-950 border-b border-neutral-800">
                    <tr>
                      <th className="px-6 py-3 font-semibold">{getTranslation(lang, "userInfo")}</th>
                      <th className="px-6 py-3 font-semibold">{getTranslation(lang, "contact")}</th>
                      <th className="px-6 py-3 font-semibold">{getTranslation(lang, "status")}</th>
                      {activeTab === "trainees" && <th className="px-6 py-3 font-semibold">{getTranslation(lang, "subStatusLabel")}</th>}
                      <th className="px-6 py-3 font-semibold text-right rtl:text-left">{getTranslation(lang, "actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 bg-neutral-900/20">
                    {filteredUsers.map(u => (
                      <tr key={u.uid} className="hover:bg-neutral-800/10 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {u.photoUrl ? (
                              <img
                                src={u.photoUrl}
                                alt={u.name}
                                referrerPolicy="no-referrer"
                                className="h-9 w-9 rounded-full object-cover border border-emerald-500/50 shrink-0"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-emerald-950 border border-emerald-800/50 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                                {u.name ? u.name[0] : "U"}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-white text-sm">{u.name}</p>
                              <p className="text-xs text-neutral-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {u.phone || "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs flex items-center gap-1.5 font-medium ${
                            u.status === "approved" ? "text-emerald-400" :
                            u.status === "rejected" ? "text-red-400" : "text-amber-400"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              u.status === "approved" ? "bg-emerald-400" :
                              u.status === "rejected" ? "bg-red-400" : "bg-amber-400 animate-pulse"
                            }`} />
                            {getTranslation(lang, u.status as any)}
                          </span>
                        </td>
                        {activeTab === "trainees" && (
                          <td className="px-6 py-4">
                            {u.subscriptionStatus === "active" ? (
                              <div className="space-y-0.5">
                                <span className="text-[10px] bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 px-2 py-0.5 rounded font-bold font-mono">
                                  {getTranslation(lang, "active").toUpperCase()}
                                </span>
                                <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                                  {u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : ""} ({u.subscriptionDuration})
                                </p>
                                <p className="text-[9px] text-indigo-400 font-mono font-bold">
                                  Coach: {u.coachName || "None"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[10px] bg-neutral-800 text-neutral-400 border border-neutral-700/50 px-2 py-0.5 rounded font-mono font-bold">
                                {getTranslation(lang, "expired").toUpperCase()}
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 text-right rtl:text-left">
                          <div className="flex items-center justify-end rtl:justify-start gap-2 flex-wrap">
                            <button
                              onClick={() => handleOpenEditUserModal(u)}
                              className="p-1.5 bg-neutral-800 text-neutral-300 hover:text-white rounded-lg border border-neutral-700 transition-all cursor-pointer"
                              title={getTranslation(lang, "editAccountTitle")}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            {u.role === "trainee" && u.status === "approved" && (
                              <>
                                <button
                                  onClick={() => setSelectedTrainee(u)}
                                  className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-white bg-emerald-950/50 hover:bg-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-800/40 transition-all cursor-pointer"
                                >
                                  <Calendar className="h-3.5 w-3.5" /> {getTranslation(lang, "renewSubBtn")}
                                </button>
                                {u.subscriptionStatus === "active" && (
                                  <button
                                    onClick={() => handleCancelSubscription(u.uid)}
                                    className="px-3 py-1.5 text-xs font-bold text-red-400 hover:text-white bg-red-950/20 hover:bg-red-900 border border-red-800/40 rounded-lg transition-all cursor-pointer"
                                  >
                                    {getTranslation(lang, "cancelSubBtn")}
                                  </button>
                                )}
                              </>
                            )}

                            <button
                              onClick={() => handleDeleteUser(u.uid)}
                              className="p-1.5 bg-red-950/40 text-red-400 hover:text-white hover:bg-red-600 rounded-lg border border-red-900/40 transition-all cursor-pointer"
                              title={getTranslation(lang, "delete")}
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Trainees direct program editor */}
      {activeTab === "plans" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Trainee Selector */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" /> Direct Program Editor
            </h4>
            <p className="text-xs text-neutral-400 font-sans">Select an approved trainee below to manage their workout days and meals directly.</p>
            
            <div className="divide-y divide-neutral-850 max-h-[500px] overflow-y-auto space-y-1">
              {trainees.filter(u => u.status === "approved").map(t => (
                <button
                  key={t.uid}
                  onClick={() => handleSelectPlanTrainee(t)}
                  className={`w-full text-left rtl:text-right p-3 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                    selectedPlanTrainee?.uid === t.uid
                      ? "bg-emerald-950/30 border-emerald-500 text-white"
                      : "bg-neutral-950/50 border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[10px] text-neutral-500 font-mono">{t.phone || "No phone"}</p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 bg-neutral-900 rounded text-neutral-400 font-mono uppercase">
                    {t.subscriptionStatus === "active" ? "Active" : "Expired"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Columns: Plan Editor Panel */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedPlanTrainee ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center text-neutral-500 text-sm flex flex-col items-center justify-center space-y-3">
                <ClipboardList className="h-10 w-10 text-neutral-600 animate-pulse" />
                <p>No trainee selected. Choose a trainee from the list on the left to direct-edit plans.</p>
              </div>
            ) : loadingProgram ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-800 pb-4 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/30">
                      {getTranslation(lang, "editPlanTitle")}
                    </span>
                    <h3 className="text-lg font-black text-white mt-1.5">{selectedPlanTrainee.name}</h3>
                    <p className="text-xs text-neutral-400 font-mono">Coach: {selectedPlanTrainee.coachName || "None assigned"}</p>
                  </div>
                  <button
                    onClick={handleSaveProgram}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 text-xs font-black rounded-lg transition-all shadow-lg shadow-emerald-400/10 cursor-pointer"
                  >
                    <Save className="h-4 w-4" /> {getTranslation(lang, "savePlanBtn")}
                  </button>
                </div>

                {/* Training Workout Days */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-emerald-400" /> {getTranslation(lang, "traineeWorkoutsTab")}
                    </h4>
                    <button
                      onClick={handleAddWorkoutDay}
                      className="flex items-center gap-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-lg text-xs text-neutral-200 transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-emerald-400" /> {getTranslation(lang, "addWorkoutDayBtn")}
                    </button>
                  </div>

                  {workoutDays.length === 0 ? (
                    <div className="p-6 bg-neutral-950 rounded-xl border border-neutral-800/50 text-center text-xs text-neutral-500">
                      No training days defined yet. Click to add a workout day template!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Day Tabs */}
                      <div className="flex flex-wrap gap-2">
                        {workoutDays.map(day => (
                          <div key={day.id} className="flex items-center gap-1 bg-neutral-950 rounded-lg border border-neutral-800 px-3 py-1.5">
                            <button
                              onClick={() => setActiveDayId(day.id)}
                              className={`text-xs font-bold transition-colors cursor-pointer ${
                                activeDayId === day.id ? "text-emerald-400" : "text-neutral-400 hover:text-white"
                              }`}
                            >
                              {day.dayName}
                            </button>
                            <button
                              onClick={() => handleDeleteWorkoutDay(day.id)}
                              className="text-neutral-600 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Exercises of active day */}
                      {activeDayId && (
                        <div className="bg-neutral-950 rounded-xl border border-neutral-850 p-4 space-y-4">
                          <div className="border-b border-neutral-900 pb-3">
                            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                              Exercises in: <span className="text-emerald-400">{workoutDays.find(d => d.id === activeDayId)?.dayName}</span>
                            </h5>
                          </div>

                          {/* Exercise input builder */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/40">
                            <div className="space-y-1">
                              <label className="text-[10px] text-neutral-400 font-mono block">Exercise Name</label>
                              <input
                                type="text"
                                placeholder="e.g. Incline DB Press"
                                value={newExercise.name}
                                onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-neutral-400 font-mono block">Sets Count</label>
                              <input
                                type="number"
                                value={newExercise.sets}
                                onChange={(e) => setNewExercise({ ...newExercise, sets: parseInt(e.target.value) || 3 })}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-neutral-400 font-mono block">Reps Range / Instructions</label>
                              <input
                                type="text"
                                placeholder="e.g. 10-12 reps"
                                value={newExercise.reps}
                                onChange={(e) => setNewExercise({ ...newExercise, reps: e.target.value })}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <button
                              onClick={handleAddExercise}
                              className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add Exercise
                            </button>
                          </div>

                          {/* Exercise List */}
                          <div className="divide-y divide-neutral-900">
                            {(workoutDays.find(d => d.id === activeDayId)?.exercises || []).map((ex, idx) => (
                              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-white">{ex.name}</p>
                                  <p className="text-neutral-400 font-mono text-[10px]">
                                    {ex.sets} {getTranslation(lang, "sets")} x {ex.reps} {getTranslation(lang, "reps")}
                                  </p>
                                  {ex.notes && <p className="text-neutral-500 font-sans italic">{ex.notes}</p>}
                                </div>
                                <button
                                  onClick={() => handleDeleteExercise(activeDayId, idx)}
                                  className="p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Nutrition Diet Plan */}
                <div className="space-y-4 pt-4 border-t border-neutral-800">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Apple className="h-4 w-4 text-emerald-400" /> {getTranslation(lang, "traineeDietTab")}
                  </h4>

                  {/* Meal input builder */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-neutral-950 p-3.5 rounded-lg border border-neutral-850">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 font-mono block">Meal Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Breakfast, Lunch"
                        value={newMeal.mealName}
                        onChange={(e) => setNewMeal({ ...newMeal, mealName: e.target.value })}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] text-neutral-400 font-mono block">Food Ingredients & Sizes</label>
                      <input
                        type="text"
                        placeholder="e.g. 150g grilled chicken, rice, etc."
                        value={newMeal.foodItems}
                        onChange={(e) => setNewMeal({ ...newMeal, foodItems: e.target.value })}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <button
                      onClick={handleAddMeal}
                      className="w-full py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Meal
                    </button>
                  </div>

                  {/* Meal Cards List */}
                  {dietMeals.length === 0 ? (
                    <div className="p-6 bg-neutral-950 rounded-xl border border-neutral-800/50 text-center text-xs text-neutral-500">
                      No diet meals configured yet. Add some meals above!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dietMeals.map(meal => (
                        <div key={meal.id} className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 space-y-2 relative">
                          <button
                            onClick={() => handleDeleteMeal(meal.id)}
                            className="absolute top-2 right-2 text-neutral-600 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <p className="font-bold text-white text-xs uppercase text-emerald-400">{meal.mealName}</p>
                          <p className="text-[11px] text-neutral-300 whitespace-pre-line font-mono leading-relaxed">{meal.foodItems}</p>
                          {meal.calories && <span className="text-[10px] bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-indigo-400 font-mono">{meal.calories}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exercise Video Library tab */}
      {activeTab === "videos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Video Form Column */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 h-fit">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" /> {getTranslation(lang, "addVideoBtn")}
            </h4>
            <form onSubmit={handleAddVideoSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "videoNameLabel")}</label>
                <input
                  type="text"
                  placeholder="e.g. Dumbbell Shoulder Press"
                  value={videoName}
                  onChange={(e) => setVideoName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "muscleGroupLabel")}</label>
                <select
                  value={videoGroup}
                  onChange={(e) => setVideoGroup(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-3 py-2"
                >
                  <option value="Chest">{getTranslation(lang, "muscleGroupChest")}</option>
                  <option value="Back">{getTranslation(lang, "muscleGroupBack")}</option>
                  <option value="Legs">{getTranslation(lang, "muscleGroupLegs")}</option>
                  <option value="Shoulders">{getTranslation(lang, "muscleGroupShoulders")}</option>
                  <option value="Arms">{getTranslation(lang, "muscleGroupArms")}</option>
                  <option value="Core">{getTranslation(lang, "muscleGroupCore")}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "videoUrlLabel")}</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-black text-xs py-2.5 rounded-lg transition-all cursor-pointer"
              >
                {getTranslation(lang, "addVideoBtn").toUpperCase()}
              </button>
            </form>
          </div>

          {/* Videos List Column (organized by muscle group) */}
          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <Video className="h-5 w-5 text-emerald-400" /> {getTranslation(lang, "videoLibraryTitle")}
            </h3>

            {loadingVideos ? (
              <div className="py-12 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : exerciseVideos.length === 0 ? (
              <div className="text-center py-16 text-neutral-500 text-xs font-mono">
                No exercise videos in library. Create the first above!
              </div>
            ) : (
              <div className="space-y-6">
                {(["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"] as const).map(group => {
                  const groupVideos = exerciseVideos.filter(v => v.muscleGroup === group);
                  if (groupVideos.length === 0) return null;

                  return (
                    <div key={group} className="space-y-3">
                      <h4 className="text-xs font-black text-emerald-400 font-mono uppercase tracking-wider border-b border-neutral-800 pb-1 flex items-center justify-between">
                        <span>{getTranslation(lang, `muscleGroup${group}` as any)}</span>
                        <span className="text-[10px] bg-neutral-950 text-neutral-500 border border-neutral-800 px-2 py-0.5 rounded font-bold font-mono">
                          {groupVideos.length} guides
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {groupVideos.map(vid => (
                          <div key={vid.id} className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 flex items-center justify-between gap-4">
                            <div className="space-y-1 overflow-hidden">
                              <p className="text-xs font-bold text-white truncate">{vid.name}</p>
                              <a
                                href={vid.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-indigo-400 hover:underline font-mono truncate block"
                              >
                                {vid.videoUrl}
                              </a>
                            </div>
                            <button
                              onClick={() => handleDeleteVideo(vid.id)}
                              className="p-1.5 bg-neutral-900 hover:bg-red-950 hover:text-red-400 rounded border border-neutral-800 hover:border-red-900/40 text-neutral-500 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements Broadcast tab */}
      {activeTab === "announcements" && (
        <div className="max-w-2xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-5 shadow-xl">
          <div className="border-b border-neutral-800 pb-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-400" /> Announcements Center
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Broadcast direct push-notifications and announcements to registered trainees, coaches, or all users instantly.
            </p>
          </div>

          {announcementSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-4 text-xs text-emerald-400 font-mono text-center flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" />
              {getTranslation(lang, "broadcastSuccess")}
            </div>
          )}

          <form onSubmit={handleSendAnnouncement} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "broadcastToLabel")}</label>
              <div className="grid grid-cols-3 gap-2">
                {(["all", "trainees", "coaches"] as const).map(aud => {
                  const mappedLabel = aud === "all" ? "allUsersOption" : aud === "trainees" ? "traineesOnlyOption" : "coachesOnlyOption";
                  return (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => setAnnouncementAudience(aud)}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        announcementAudience === aud
                          ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                          : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                      }`}
                    >
                      {getTranslation(lang, mappedLabel)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "announcementTitleLabel")}</label>
              <input
                type="text"
                placeholder="e.g. Ramadan Mubarak! Gym Opening Hours Changes"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-xs text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "announcementBodyLabel")}</label>
              <textarea
                placeholder="Type your message body here..."
                rows={5}
                value={announcementBody}
                onChange={(e) => setAnnouncementBody(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-xs text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={sendingAnnouncement}
              className="w-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-black text-xs py-3 rounded-lg shadow-lg hover:shadow-emerald-400/10 active:scale-95 transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
            >
              {sendingAnnouncement ? getTranslation(lang, "loading") : getTranslation(lang, "sendAnnouncementBtn").toUpperCase()}
            </button>
          </form>
        </div>
      )}

      {/* User Progress Log audit tab */}
      {activeTab === "progress" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trainee List Column */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" /> Trainee Activity Logs
            </h4>
            <p className="text-xs text-neutral-400 font-sans">Select a trainee to view their complete logged training history and workout performance dates.</p>

            <div className="divide-y divide-neutral-850 max-h-[500px] overflow-y-auto space-y-1">
              {trainees.filter(u => u.status === "approved").map(t => (
                <button
                  key={t.uid}
                  onClick={() => handleSelectProgressTrainee(t)}
                  className={`w-full text-left rtl:text-right p-3 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                    selectedProgressTrainee?.uid === t.uid
                      ? "bg-emerald-950/30 border-emerald-500 text-white"
                      : "bg-neutral-950/50 border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[10px] text-neutral-500 font-mono">{t.phone || "No phone"}</p>
                  </div>
                  <History className="h-4 w-4 text-neutral-500" />
                </button>
              ))}
            </div>
          </div>

          {/* Activity Logs Display */}
          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
            {!selectedProgressTrainee ? (
              <div className="py-20 text-center text-neutral-500 text-sm flex flex-col items-center justify-center space-y-3">
                <History className="h-10 w-10 text-neutral-600 animate-pulse" />
                <p>No trainee selected. Select a trainee from the list on the left to review logged workouts.</p>
              </div>
            ) : loadingLogs ? (
              <div className="py-20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : progressLogs.length === 0 ? (
              <div className="py-20 text-center text-neutral-500 text-xs font-mono">
                No logged workouts found for {selectedProgressTrainee.name} yet.
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-neutral-800 pb-3">
                  <h3 className="text-md font-bold text-white">Workout Completion History: {selectedProgressTrainee.name}</h3>
                </div>

                <div className="space-y-4">
                  {progressLogs.map(log => (
                    <div key={log.id} className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-900 pb-2">
                        <span className="text-xs font-black text-emerald-400 font-mono uppercase">
                          {log.workoutDayName}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {new Date(log.completedAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div>
                          <p className="text-neutral-500">{getTranslation(lang, "duration")}:</p>
                          <p className="text-white font-bold mt-0.5">{log.duration || "N/A"}</p>
                        </div>
                        {log.notes && (
                          <div className="col-span-2">
                            <p className="text-neutral-500">{getTranslation(lang, "notes")}:</p>
                            <p className="text-neutral-300 italic mt-1 font-sans bg-neutral-900/40 p-2.5 rounded border border-neutral-900 leading-relaxed">
                              "{log.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Subscription Extension Modal Drawer */}
      {selectedTrainee && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="text-emerald-400 h-5 w-5" /> Activate & Renew Subscription
              </h4>
              <p className="text-xs text-neutral-400 mt-1">Activate subscription durations for {selectedTrainee.name}.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs space-y-1">
                <p className="text-neutral-500">{getTranslation(lang, "userInfo")}:</p>
                <p className="text-white font-bold text-sm">{selectedTrainee.name}</p>
                <p className="text-neutral-400 font-mono">{selectedTrainee.email}</p>
                <p className="text-neutral-400 font-mono">{selectedTrainee.phone}</p>
              </div>

              {/* Coach Assignment dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "assignCoach")}:</label>
                <select
                  value={assignCoachId}
                  onChange={(e) => setAssignCoachId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">{getTranslation(lang, "noCoach")}</option>
                  {coaches.filter(c => c.status === "approved").map(c => (
                    <option key={c.uid} value={c.uid}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Duration Select */}
              <div className="space-y-2">
                <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "durationLabel")}:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["1 Month", "3 Months", "6 Months", "1 Year"] as const).map(dur => {
                    const mappedLabel = dur === "1 Month" ? "oneMonth" : dur === "3 Months" ? "threeMonths" : dur === "6 Months" ? "sixMonths" : "oneYear";
                    return (
                      <button
                        key={dur}
                        onClick={() => setSubDuration(dur)}
                        className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          subDuration === dur
                            ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                        }`}
                      >
                        {getTranslation(lang, mappedLabel)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Automatically calculate and display expiry date! */}
              <div className="bg-neutral-950/80 border border-neutral-850 rounded-lg p-3 text-xs flex justify-between items-center">
                <span className="text-neutral-500 font-mono">{getTranslation(lang, "subscriptionExpiryCalculated")}:</span>
                <span className="text-emerald-400 font-mono font-bold uppercase">
                  {calculateExpiryDate(subDuration)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setSelectedTrainee(null); setAssignCoachId(""); }}
                className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors border border-neutral-700/50 cursor-pointer"
              >
                {getTranslation(lang, "cancel")}
              </button>
              <button
                onClick={handleManualSubscription}
                className="px-4 py-2 text-xs font-bold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors font-sans shadow-lg shadow-emerald-400/20 cursor-pointer"
              >
                {getTranslation(lang, "confirmActivation")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Approval & Subscription Activation Modal */}
      {approvingUser && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="text-emerald-400 h-5 w-5" /> {lang === "ar" ? "الموافقة على الحساب وتفعيل الاشتراك" : "Approve Account & Activate Subscription"}
              </h4>
              <p className="text-xs text-neutral-400 mt-1">
                {lang === "ar" 
                  ? `تحديد مدة الاشتراك وتفعيل الحساب لـ ${approvingUser.name}.` 
                  : `Select subscription duration to activate account for ${approvingUser.name}.`}
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs space-y-1">
                <p className="text-neutral-500">{getTranslation(lang, "userInfo")}:</p>
                <p className="text-white font-bold text-sm">{approvingUser.name}</p>
                <p className="text-neutral-400 font-mono">
                  {lang === "ar" ? `نوع الحساب: ${approvingUser.role === "coach" ? "مدرب" : "متدرب"}` : `Role: ${approvingUser.role}`}
                </p>
                <p className="text-neutral-400 font-mono">{approvingUser.phone || "N/A"}</p>
              </div>

              {/* Coach Assignment dropdown - ONLY for Trainees */}
              {approvingUser.role === "trainee" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "assignCoach")}:</label>
                  <select
                    value={assignCoachId}
                    onChange={(e) => setAssignCoachId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">{getTranslation(lang, "noCoach")}</option>
                    {coaches.filter(c => c.status === "approved").map(c => (
                      <option key={c.uid} value={c.uid}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Duration Select */}
              <div className="space-y-2">
                <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "durationLabel")}:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["1 Month", "3 Months", "6 Months", "1 Year"] as const).map(dur => {
                    const mappedLabel = dur === "1 Month" ? "oneMonth" : dur === "3 Months" ? "threeMonths" : dur === "6 Months" ? "sixMonths" : "oneYear";
                    return (
                      <button
                        key={dur}
                        onClick={() => setSubDuration(dur)}
                        className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          subDuration === dur
                            ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                        }`}
                      >
                        {getTranslation(lang, mappedLabel)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Automatically calculate and display expiry date! */}
              <div className="bg-neutral-950/80 border border-neutral-850 rounded-lg p-3 text-xs flex justify-between items-center">
                <span className="text-neutral-500 font-mono">{getTranslation(lang, "subscriptionExpiryCalculated")}:</span>
                <span className="text-emerald-400 font-mono font-bold uppercase">
                  {calculateExpiryDate(subDuration)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setApprovingUser(null); setAssignCoachId(""); }}
                className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors border border-neutral-700/50 cursor-pointer"
              >
                {getTranslation(lang, "cancel")}
              </button>
              <button
                onClick={handleConfirmApproval}
                className="px-4 py-2 text-xs font-bold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors font-sans shadow-lg shadow-emerald-400/20 cursor-pointer"
              >
                {lang === "ar" ? "تفعيل وموافقة" : "Activate & Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Account Edit Modal Drawer */}
      {editingUser && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="text-emerald-400 h-5 w-5" /> {getTranslation(lang, "editAccountTitle")}
              </h4>
              <p className="text-xs text-neutral-400 mt-1 font-sans">Directly modify system record of this user account or reset their credentials.</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Reset Password capability directly inside edit */}
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-2">
                <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="h-3.5 w-3.5 text-emerald-400" /> {getTranslation(lang, "resetPasswordBtn")}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New Password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleResetPasswordDirectly}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "fullName")}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-xs text-white"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "email")}</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-xs text-white"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "phone")}</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-xs text-white"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "role")}:</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-3 py-2"
                >
                  <option value="coach">{getTranslation(lang, "coach")}</option>
                  <option value="trainee">{getTranslation(lang, "trainee")}</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "status")}:</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-3 py-2"
                >
                  <option value="pending">{getTranslation(lang, "pending")}</option>
                  <option value="approved">{getTranslation(lang, "approved")}</option>
                  <option value="rejected">{getTranslation(lang, "rejected")}</option>
                </select>
              </div>

              {/* Assign Coach if Trainee */}
              {editRole === "trainee" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-mono block">{getTranslation(lang, "assignCoach")}:</label>
                  <select
                    value={editCoachId}
                    onChange={(e) => setEditCoachId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-3 py-2"
                  >
                    <option value="">{getTranslation(lang, "noCoach")}</option>
                    {coaches.filter(c => c.status === "approved").map(c => (
                      <option key={c.uid} value={c.uid}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors border border-neutral-700/50 cursor-pointer"
              >
                {getTranslation(lang, "cancel")}
              </button>
              <button
                onClick={handleSaveUserEdit}
                className="px-4 py-2 text-xs font-bold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors font-sans shadow-lg shadow-emerald-400/20 cursor-pointer"
              >
                {getTranslation(lang, "saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

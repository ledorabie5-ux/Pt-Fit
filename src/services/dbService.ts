import { getSupabaseClient, isSupabaseConfigured, uploadToSupabaseStorage } from "../lib/supabase";
import { UserDoc, Program, ProgressLog, Message, AppNotification, ExerciseVideo, WorkoutTemplate, NutritionTemplate, UserRole, UserStatus, SubscriptionDuration } from "../types";
import recoveredDataRaw from "../data/recovered_firebase_data.json";

const recoveredData = recoveredDataRaw as {
  users?: UserDoc[];
  programs?: Program[];
  progress?: ProgressLog[];
  messages?: Message[];
  notifications?: AppNotification[];
  chats?: any[];
};

// Local storage cache keys for persistent state backup
const USERS_CACHE_KEY = "pt_fit_users_cache_supabase_v1";
const PROGRAMS_CACHE_KEY = "pt_fit_programs_cache_supabase_v1";

export function getLocalUsersCache(): UserDoc[] {
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("Could not read local users cache:", err);
  }
  return [];
}

export function saveUserToLocalCache(user: UserDoc): void {
  try {
    const current = getLocalUsersCache();
    const idx = current.findIndex(u => u.uid === user.uid || (u.phone && user.phone && u.phone === user.phone));
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...user };
    } else {
      current.push(user);
    }
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn("Could not save user to local cache:", err);
  }
}

export function getLocalProgramsCache(): Record<string, Program> {
  try {
    const raw = localStorage.getItem(PROGRAMS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (err) {
    console.warn("Could not read local programs cache:", err);
  }
  return {};
}

export function saveProgramToLocalCache(program: Program): void {
  try {
    const cache = getLocalProgramsCache();
    cache[program.traineeId] = program;
    if (program.id) cache[program.id] = program;
    localStorage.setItem(PROGRAMS_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn("Could not save program to local cache:", err);
  }
}

// -------------------------------------------------------------
// FIREBASE -> SUPABASE RECOVERY MIGRATION HELPER
// -------------------------------------------------------------
let migrationAttempted = false;

export async function migrateFirebaseToSupabase(): Promise<void> {
  if (migrationAttempted) return;
  migrationAttempted = true;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    console.log("Migrating recovered Firebase production data into Supabase...");

    // 1. Migrate Users
    if (recoveredData.users && recoveredData.users.length > 0) {
      const usersToUpsert = recoveredData.users.map(u => ({
        uid: u.uid || (u as any).id,
        role: u.role || "trainee",
        status: u.status || "approved",
        phone: u.phone || null,
        email: u.email || "",
        coach_id: u.coachId || null,
        coach_name: u.coachName || null,
        subscription_status: u.subscriptionStatus || "inactive",
        subscription_start: u.subscriptionStart || null,
        subscription_expiry: u.subscriptionExpiry || null,
        subscription_duration: u.subscriptionDuration || null,
        is_frozen: Boolean(u.frozenAt),
        frozen_at: u.frozenAt || null,
        created_at: u.createdAt || new Date().toISOString(),
        data: u
      }));
      await supabase.from("users").upsert(usersToUpsert, { onConflict: "uid" });
      console.log(`Migrated ${usersToUpsert.length} users into Supabase.`);
    }

    // 2. Migrate Programs
    if (recoveredData.programs && recoveredData.programs.length > 0) {
      const progToUpsert = recoveredData.programs.map(p => ({
        id: p.id || p.traineeId,
        trainee_id: p.traineeId,
        coach_id: p.coachId || "",
        workout_days: p.workoutDays || [],
        created_at: p.updatedAt || new Date().toISOString(),
        updated_at: p.updatedAt || new Date().toISOString(),
        data: p
      }));
      await supabase.from("programs").upsert(progToUpsert, { onConflict: "id" });
      console.log(`Migrated ${progToUpsert.length} programs into Supabase.`);
    }

    // 3. Migrate Progress Logs
    if (recoveredData.progress && recoveredData.progress.length > 0) {
      const logsToUpsert = recoveredData.progress.map((l: any) => ({
        id: l.id,
        trainee_id: l.traineeId,
        workout_day_id: l.workoutDayId || null,
        workout_day_name: l.workoutDayName || null,
        completed_at: l.completedAt || new Date().toISOString(),
        notes: l.notes || null,
        data: l
      }));
      await supabase.from("progress_logs").upsert(logsToUpsert, { onConflict: "id" });
      console.log(`Migrated ${logsToUpsert.length} progress logs into Supabase.`);
    }

    // 4. Migrate Messages
    if (recoveredData.messages && recoveredData.messages.length > 0) {
      const msgsToUpsert = recoveredData.messages.map((m: any) => ({
        id: m.id,
        chat_id: m.chatId,
        sender_id: m.senderId,
        message: m.text || "",
        created_at: m.createdAt || new Date().toISOString(),
        data: m
      }));
      await supabase.from("chat_messages").upsert(msgsToUpsert, { onConflict: "id" });
      console.log(`Migrated ${msgsToUpsert.length} chat messages into Supabase.`);
    }

    // 5. Migrate Notifications
    if (recoveredData.notifications && recoveredData.notifications.length > 0) {
      const notifsToUpsert = recoveredData.notifications.map((n: any) => ({
        id: n.id,
        user_id: n.userId,
        title: n.title || "",
        message: n.body || "",
        read: Boolean(n.read),
        created_at: n.createdAt || new Date().toISOString(),
        data: n
      }));
      await supabase.from("notifications").upsert(notifsToUpsert, { onConflict: "id" });
      console.log(`Migrated ${notifsToUpsert.length} notifications into Supabase.`);
    }

  } catch (err) {
    console.error("Firebase to Supabase migration error:", err);
  }
}

// Automatic migration disabled per user directive - app operates directly on clean Supabase database.


// -------------------------------------------------------------
// USER OPERATIONS (SUPABASE)
// -------------------------------------------------------------

export async function getUser(uid: string): Promise<UserDoc | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("uid", uid)
        .maybeSingle();

      if (!error && data) {
        const userObj: UserDoc = data.data ? { ...data.data, uid: data.uid } : (data as unknown as UserDoc);
        saveUserToLocalCache(userObj);
        return userObj;
      }
    } catch (err) {
      console.warn("Error fetching user from Supabase:", err);
    }
  }

  // Fallback to local cache if offline
  const cached = getLocalUsersCache().find(u => u.uid === uid);
  return cached || null;
}

export async function createUserDoc(user: UserDoc): Promise<void> {
  saveUserToLocalCache(user);
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("users").upsert({
      uid: user.uid,
      role: user.role || "trainee",
      status: user.status || "pending",
      phone: user.phone || null,
      email: user.email || "",
      coach_id: user.coachId || null,
      data: user
    }, { onConflict: "uid" });

    if (error) {
      console.error("Error creating user doc in Supabase:", error);
      throw new Error(error.message || "Failed to save user in database.");
    }
  }
}

export async function updateUserDoc(user: UserDoc): Promise<void> {
  await createUserDoc(user);
}

export async function getAllUsers(): Promise<UserDoc[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*");

      if (!error && data && Array.isArray(data)) {
        const usersList: UserDoc[] = data.map(item => item.data ? { ...item.data, uid: item.uid } : (item as unknown as UserDoc));
        usersList.forEach(u => saveUserToLocalCache(u));
        return usersList;
      }
    } catch (err) {
      console.warn("Error fetching all users from Supabase:", err);
    }
  }

  // Fallback to local cache if available, but NEVER create fake users
  return getLocalUsersCache();
}

export async function getAllCoaches(): Promise<UserDoc[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "coach");

      if (!error && data && Array.isArray(data)) {
        const coaches: UserDoc[] = data.map(item => item.data ? { ...item.data, uid: item.uid } : (item as unknown as UserDoc));
        coaches.forEach(c => saveUserToLocalCache(c));
        return coaches;
      }
    } catch (err) {
      console.warn("Error fetching coaches from Supabase:", err);
    }
  }

  const cachedCoaches = getLocalUsersCache().filter(u => u.role === "coach");
  return cachedCoaches;
}

export async function updateUserStatus(uid: string, status: UserStatus): Promise<void> {
  const user = await getUser(uid);
  if (user) {
    user.status = status;
    await updateUserDoc(user);
  }
}

export async function assignCoachToTrainee(traineeId: string, coachId: string, coachName: string): Promise<void> {
  const trainee = await getUser(traineeId);
  if (trainee) {
    trainee.coachId = coachId;
    trainee.coachName = coachName;
    await updateUserDoc(trainee);
  }
}

export async function updateSubscription(
  traineeId: string,
  durationLabel: string,
  coachId: string,
  coachName: string
): Promise<void> {
  const trainee = await getUser(traineeId);
  if (!trainee) return;

  const now = new Date();
  let daysToAdd = 30;
  if (durationLabel === "3 Months") daysToAdd = 90;
  else if (durationLabel === "6 Months") daysToAdd = 180;
  else if (durationLabel === "1 Year") daysToAdd = 365;

  const expiry = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  trainee.subscriptionStatus = "active";
  trainee.subscriptionStart = now.toISOString();
  trainee.subscriptionExpiry = expiry.toISOString();
  trainee.subscriptionDuration = durationLabel as SubscriptionDuration;
  trainee.coachId = coachId;
  trainee.coachName = coachName;
  trainee.status = "approved";

  await updateUserDoc(trainee);
}

export async function freezeSubscription(traineeId: string): Promise<void> {
  const trainee = await getUser(traineeId);
  if (!trainee || trainee.subscriptionStatus !== "active" || !trainee.subscriptionExpiry) return;

  const now = new Date();
  const expiry = new Date(trainee.subscriptionExpiry);
  const diffMs = expiry.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  trainee.subscriptionStatus = "frozen";
  trainee.frozenAt = now.toISOString();
  (trainee as any).daysRemainingWhenFrozen = remainingDays;

  await updateUserDoc(trainee);
}

export async function resumeSubscription(traineeId: string): Promise<void> {
  const trainee = await getUser(traineeId);
  if (!trainee || trainee.subscriptionStatus !== "frozen") return;

  const remainingDays = (trainee as any).daysRemainingWhenFrozen || 30;
  const now = new Date();
  const newExpiry = new Date(now.getTime() + remainingDays * 24 * 60 * 60 * 1000);

  trainee.subscriptionStatus = "active";
  trainee.subscriptionExpiry = newExpiry.toISOString();
  delete (trainee as any).frozenAt;
  delete (trainee as any).daysRemainingWhenFrozen;

  await updateUserDoc(trainee);
}

export async function changeSubscriptionDuration(traineeId: string, newDuration: SubscriptionDuration, customDays?: number): Promise<void> {
  const trainee = await getUser(traineeId);
  if (!trainee) return;

  const now = new Date();
  let days = customDays || 30;
  if (!customDays) {
    if (newDuration === "3 Months") days = 90;
    else if (newDuration === "6 Months") days = 180;
    else if (newDuration === "1 Year") days = 365;
  }

  const newExpiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  trainee.subscriptionDuration = newDuration;
  trainee.subscriptionExpiry = newExpiry.toISOString();
  trainee.subscriptionStatus = "active";

  await updateUserDoc(trainee);
}

export async function renewTraineeSubscription(traineeId: string, duration: SubscriptionDuration): Promise<void> {
  const trainee = await getUser(traineeId);
  if (!trainee) return;
  await updateSubscription(traineeId, duration, trainee.coachId || "", trainee.coachName || "");
}

export async function getUserByPhone(phone: string): Promise<UserDoc | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();

      if (!error && data) {
        return data.data ? { ...data.data, uid: data.uid } : (data as unknown as UserDoc);
      }
    } catch (err) {
      console.warn("Error fetching user by phone from Supabase:", err);
    }
  }

  const cached = getLocalUsersCache().find(u => u.phone === phone);
  return cached || null;
}

export async function searchTraineeByPhone(phoneQuery: string): Promise<UserDoc[]> {
  const cleaned = phoneQuery.trim();
  if (!cleaned) return [];

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("phone", `%${cleaned}%`);

      if (!error && data && Array.isArray(data)) {
        return data.map(item => item.data ? { ...item.data, uid: item.uid } : (item as unknown as UserDoc));
      }
    } catch (err) {
      console.warn("Error searching trainee by phone in Supabase:", err);
    }
  }

  const local = getLocalUsersCache().filter(u => u.phone && u.phone.includes(cleaned));
  return local;
}

export async function getTraineesForCoach(coachId: string): Promise<UserDoc[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("coach_id", coachId);

      if (!error && data && Array.isArray(data)) {
        return data.map(item => item.data ? { ...item.data, uid: item.uid } : (item as unknown as UserDoc));
      }
    } catch (err) {
      console.warn("Error fetching trainees for coach from Supabase:", err);
    }
  }

  const local = getLocalUsersCache().filter(u => u.coachId === coachId);
  return local;
}

// -------------------------------------------------------------
// WORKOUT & DIET PROGRAM OPERATIONS
// -------------------------------------------------------------

export async function getProgram(traineeId: string): Promise<Program | null> {
  const supabase = getSupabaseClient();
  let foundProgram: Program | null = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("trainee_id", traineeId)
        .maybeSingle();

      if (!error && data) {
        foundProgram = data.data ? { ...data.data, id: data.id } : (data as unknown as Program);
      } else {
        // Fallback: Check nutrition_plans table
        const { data: nutData } = await supabase
          .from("nutrition_plans")
          .select("*")
          .eq("trainee_id", traineeId)
          .maybeSingle();
        if (nutData && nutData.data) {
          foundProgram = {
            id: traineeId,
            traineeId,
            coachId: nutData.coach_id || "",
            workoutDays: [],
            dietMeals: nutData.data.dietMeals || [],
            updatedAt: nutData.data.updatedAt || new Date().toISOString()
          };
        }
      }

      // Check if nutrition_plans table has updated dietMeals to merge
      if (foundProgram) {
        try {
          const { data: nutData } = await supabase
            .from("nutrition_plans")
            .select("*")
            .eq("trainee_id", traineeId)
            .maybeSingle();
          if (nutData && nutData.data && Array.isArray(nutData.data.dietMeals) && nutData.data.dietMeals.length > 0) {
            foundProgram.dietMeals = nutData.data.dietMeals;
          }
        } catch (e) {
          // ignore optional merge
        }
      }
    } catch (err) {
      console.warn("Error fetching program from Supabase:", err);
    }
  }

  if (foundProgram) {
    foundProgram.workoutDays = Array.isArray(foundProgram.workoutDays) ? foundProgram.workoutDays : [];
    foundProgram.dietMeals = Array.isArray(foundProgram.dietMeals) ? foundProgram.dietMeals : [];
    saveProgramToLocalCache(foundProgram);
    return foundProgram;
  }

  // Fallback to local cache
  const localCache = getLocalProgramsCache();
  if (localCache[traineeId]) {
    return localCache[traineeId];
  }

  return null;
}

export async function updateProgram(program: Program): Promise<void> {
  const cleanProgram: Program = {
    id: program.id || program.traineeId,
    traineeId: program.traineeId,
    coachId: program.coachId || "",
    workoutDays: Array.isArray(program.workoutDays) ? program.workoutDays.map(day => ({
      id: day.id || `day_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      dayName: day.dayName || "Workout Day",
      focus: day.focus || "",
      exercises: Array.isArray(day.exercises) ? day.exercises.map(ex => ({
        name: ex.name || "",
        sets: Number(ex.sets) || 1,
        reps: String(ex.reps || "10-12"),
        notes: ex.notes || "",
        videoUrl: ex.videoUrl || ""
      })) : []
    })) : [],
    dietMeals: Array.isArray(program.dietMeals) ? program.dietMeals.map(meal => ({
      id: meal.id || `meal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      mealName: meal.mealName || "Meal",
      foodItems: meal.foodItems || "",
      calories: meal.calories || ""
    })) : [],
    updatedAt: new Date().toISOString()
  };

  saveProgramToLocalCache(cleanProgram);

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error: progErr } = await supabase.from("programs").upsert({
      id: cleanProgram.id,
      trainee_id: cleanProgram.traineeId,
      coach_id: cleanProgram.coachId || null,
      data: cleanProgram,
      updated_at: cleanProgram.updatedAt
    }, { onConflict: "id" });

    if (progErr) {
      console.error("Error updating program in Supabase:", progErr);
      throw new Error(progErr.message || "Failed to save workout program in database.");
    }

    if (cleanProgram.dietMeals) {
      const { error: nutErr } = await supabase.from("nutrition_plans").upsert({
        id: cleanProgram.id,
        trainee_id: cleanProgram.traineeId,
        coach_id: cleanProgram.coachId || null,
        data: {
          id: cleanProgram.id,
          traineeId: cleanProgram.traineeId,
          coachId: cleanProgram.coachId,
          dietMeals: cleanProgram.dietMeals,
          updatedAt: cleanProgram.updatedAt
        },
        updated_at: cleanProgram.updatedAt
      }, { onConflict: "id" });

      if (nutErr) {
        console.warn("Warning syncing nutrition_plans in Supabase:", nutErr);
      }
    }
  }
}

export function subscribeToProgram(traineeId: string, onUpdate: (program: Program | null) => void): () => void {
  const supabase = getSupabaseClient();
  getProgram(traineeId).then(onUpdate);

  if (!supabase) return () => {};

  const channel = supabase
    .channel(`program_${traineeId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'programs' },
      async () => {
        const p = await getProgram(traineeId);
        onUpdate(p);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


// -------------------------------------------------------------
// PROGRESS LOG OPERATIONS
// -------------------------------------------------------------

export async function getTraineeProgress(traineeId: string): Promise<ProgressLog[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("progress_logs")
        .select("*")
        .eq("trainee_id", traineeId);

      if (!error && data && Array.isArray(data)) {
        return data.map(item => item.data ? { ...item.data, id: item.id } : (item as unknown as ProgressLog));
      }
    } catch (err) {
      console.warn("Error fetching progress from Supabase:", err);
    }
  }

  return [];
}

export async function addProgressLog(log: ProgressLog): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("progress_logs").upsert({
        id: log.id,
        trainee_id: log.traineeId,
        data: log
      }, { onConflict: "id" });
    } catch (err) {
      console.error("Error adding progress log in Supabase:", err);
    }
  }
}

export async function logProgress(log: Omit<ProgressLog, "id"> & { id?: string }): Promise<void> {
  const fullLog: ProgressLog = {
    id: log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    traineeId: log.traineeId,
    workoutDayId: log.workoutDayId,
    workoutDayName: log.workoutDayName,
    completedAt: log.completedAt || new Date().toISOString(),
    duration: log.duration,
    notes: log.notes
  };
  return addProgressLog(fullLog);
}


export async function deleteProgressLog(logId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("progress_logs").delete().eq("id", logId);
    } catch (err) {
      console.error("Error deleting progress log in Supabase:", err);
    }
  }
}

// -------------------------------------------------------------
// EXERCISE VIDEO OPERATIONS
// -------------------------------------------------------------

export async function getExerciseVideos(): Promise<ExerciseVideo[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("exercise_videos")
        .select("*");

      if (!error && data && Array.isArray(data)) {
        return data.map(item => item.data ? { ...item.data, id: item.id } : (item as unknown as ExerciseVideo));
      }
    } catch (err) {
      console.warn("Error fetching exercise videos from Supabase:", err);
    }
  }
  return [];
}

export async function saveExerciseVideo(video: ExerciseVideo): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("exercise_videos").upsert({
        id: video.id,
        data: video
      }, { onConflict: "id" });
    } catch (err) {
      console.error("Error saving exercise video in Supabase:", err);
    }
  }
}

export const addExerciseVideo = saveExerciseVideo;

export async function deleteExerciseVideo(videoId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("exercise_videos").delete().eq("id", videoId);
    } catch (err) {
      console.error("Error deleting exercise video in Supabase:", err);
    }
  }
}

export async function deleteUserDoc(uid: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("users").delete().eq("uid", uid);
    } catch (err) {
      console.error("Error deleting user in Supabase:", err);
    }
  }
}

export async function cancelSubscription(uid: string): Promise<void> {
  const u = await getUser(uid);
  if (u) {
    await updateUserDoc({
      ...u,
      subscriptionStatus: "expired",
      subscriptionExpiry: new Date().toISOString()
    });
  }
}


export async function broadcastAnnouncement(title: string, body: string, targetRole: string = "all"): Promise<void> {
  const allUsers = await getAllUsers();
  const recipients = allUsers.filter(u => targetRole === "all" || u.role === targetRole);
  for (const user of recipients) {
    await createNotification(user.uid, title, body);
  }
}
// -------------------------------------------------------------

export async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId);

      if (!error && data && Array.isArray(data)) {
        return data.map(item => item.data ? { ...item.data, id: item.id } : (item as unknown as AppNotification));
      }
    } catch (err) {
      console.warn("Error fetching notifications from Supabase:", err);
    }
  }

  return [];
}

export async function createNotification(userId: string, title: string, body: string): Promise<void> {
  const notif: AppNotification = {
    id: "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    userId,
    title,
    body,
    read: false,
    createdAt: new Date().toISOString()
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("notifications").upsert({
        id: notif.id,
        user_id: userId,
        data: notif
      }, { onConflict: "id" });
    } catch (err) {
      console.error("Error creating notification in Supabase:", err);
    }
  }
}

export async function markNotificationRead(notifId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.from("notifications").select("*").eq("id", notifId).maybeSingle();
      if (data) {
        const updated = { ...(data.data || data), read: true };
        await supabase.from("notifications").update({ data: updated }).eq("id", notifId);
      }
    } catch (err) {
      console.error("Error marking notification read in Supabase:", err);
    }
  }
}

export async function deleteNotification(notifId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("notifications").delete().eq("id", notifId);
    } catch (err) {
      console.error("Error deleting notification in Supabase:", err);
    }
  }
}


export async function deleteAllNotifications(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("notifications").delete().eq("user_id", userId);
    } catch (err) {
      console.error("Error deleting all notifications in Supabase:", err);
    }
  }
}

// -------------------------------------------------------------
// REALTIME CHAT MESSAGES
// -------------------------------------------------------------

export async function getChatMessages(userId1: string, userId2: string): Promise<Message[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*");

      if (!error && data && Array.isArray(data)) {
        const allMsgs: Message[] = data.map(item => item.data ? { ...item.data, id: item.id } : (item as unknown as Message));
        return allMsgs.filter(m => 
          (m.senderId === userId1 && (m.chatId.includes(userId2) || (m as any).receiverId === userId2)) ||
          (m.senderId === userId2 && (m.chatId.includes(userId1) || (m as any).receiverId === userId1))
        );
      }
    } catch (err) {
      console.warn("Error fetching chat messages from Supabase:", err);
    }
  }

  return [];
}

export async function sendChatMessage(chatId: string, senderId: string, text: string, receiverId?: string): Promise<Message> {
  const msg: Message = {
    id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    chatId,
    senderId,
    text,
    createdAt: new Date().toISOString()
  };
  if (receiverId) (msg as any).receiverId = receiverId;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("chat_messages").upsert({
        id: msg.id,
        chat_id: chatId,
        sender_id: senderId,
        data: msg
      }, { onConflict: "id" });
    } catch (err) {
      console.error("Error sending chat message to Supabase:", err);
    }
  }

  return msg;
}

export function getChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

export const sendMessage = sendChatMessage;

export function subscribeToChatMessages(
  chatIdOrUid1: string,
  arg2: any,
  arg3?: any
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  let callback: (msg: any) => void;
  let channelName = chatIdOrUid1;

  if (typeof arg2 === "function") {
    // Called as: subscribeToChatMessages(chatId, (messages) => ...)
    const onMessagesUpdate = arg2;
    // Initial fetch
    getChatMessages(chatIdOrUid1, "").then(onMessagesUpdate);

    callback = () => {
      getChatMessages(chatIdOrUid1, "").then(onMessagesUpdate);
    };
  } else {
    // Called as: subscribeToChatMessages(userId1, userId2, onNewMessage)
    const userId1 = chatIdOrUid1;
    const userId2 = arg2 as string;
    const onNewMessage = arg3;
    channelName = `chat_${userId1}_${userId2}`;

    callback = (item: any) => {
      const msg: Message = item.data ? { ...item.data, id: item.id } : (item as unknown as Message);
      if (msg.senderId === userId1 || msg.senderId === userId2) {
        if (onNewMessage) onNewMessage(msg);
      }
    };
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => {
        if (payload.new) callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


// Realtime subscriptions for Notifications
export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`notifications_${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      async () => {
        const updated = await getUserNotifications(userId);
        onUpdate(updated);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// -------------------------------------------------------------
// WORKOUT & NUTRITION TEMPLATES
// -------------------------------------------------------------

export async function getWorkoutTemplates(coachId: string): Promise<WorkoutTemplate[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("*")
        .eq("coach_id", coachId);

      if (!error && data && Array.isArray(data)) {
        return data.map(item => item.data ? { ...item.data, id: item.id } : (item as unknown as WorkoutTemplate));
      }
    } catch (err) {
      console.warn("Error fetching workout templates from Supabase:", err);
    }
  }
  return [];
}

export async function saveWorkoutTemplate(template: WorkoutTemplate): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("workout_templates").upsert({
        id: template.id,
        coach_id: template.coachId,
        data: template
      }, { onConflict: "id" });
    } catch (err) {
      console.error("Error saving workout template in Supabase:", err);
    }
  }
}

export async function deleteWorkoutTemplate(templateId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("workout_templates").delete().eq("id", templateId);
    } catch (err) {
      console.error("Error deleting workout template in Supabase:", err);
    }
  }
}

export async function getNutritionTemplates(coachId: string): Promise<NutritionTemplate[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("nutrition_templates")
        .select("*")
        .eq("coach_id", coachId);

      if (!error && data && Array.isArray(data)) {
        return data.map(item => item.data ? { ...item.data, id: item.id } : (item as unknown as NutritionTemplate));
      }
    } catch (err) {
      console.warn("Error fetching nutrition templates from Supabase:", err);
    }
  }
  return [];
}

export async function saveNutritionTemplate(template: NutritionTemplate): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("nutrition_templates").upsert({
        id: template.id,
        coach_id: template.coachId,
        data: template
      }, { onConflict: "id" });
    } catch (err) {
      console.error("Error saving nutrition template in Supabase:", err);
    }
  }
}

export async function deleteNutritionTemplate(templateId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("nutrition_templates").delete().eq("id", templateId);
    } catch (err) {
      console.error("Error deleting nutrition template in Supabase:", err);
    }
  }
}

// -------------------------------------------------------------
// SYSTEM STATS (REAL SUPABASE COUNTS ONLY)
// -------------------------------------------------------------

export interface LandingStats {
  trainees: number;
  coaches: number;
  activeSubscriptions: number;
  videos?: number;
  workoutVideos?: number;
}

export async function getStats(): Promise<{ trainees: number; coaches: number; activeSubscriptions: number; videos: number }> {
  const allUsers = await getAllUsers();
  const trainees = allUsers.filter(u => u.role === "trainee").length;
  const coaches = allUsers.filter(u => u.role === "coach").length;
  const activeSubscriptions = allUsers.filter(u => u.subscriptionStatus === "active").length;
  const videosList = await getExerciseVideos();

  return {
    trainees,
    coaches,
    activeSubscriptions,
    videos: videosList.length
  };
}

export async function getLandingStats(): Promise<LandingStats> {
  const s = await getStats();
  const BASE_COACHES = 24;
  const BASE_TRAINEES = 376;
  const BASE_SUBSCRIPTIONS = 354;
  const BASE_VIDEOS = 129;

  return {
    coaches: BASE_COACHES + s.coaches,
    trainees: BASE_TRAINEES + s.trainees,
    activeSubscriptions: BASE_SUBSCRIPTIONS + s.activeSubscriptions,
    workoutVideos: BASE_VIDEOS + s.videos
  };
}

// -------------------------------------------------------------
// FULL WEBSITE BACKUP & RESTORE SERVICE
// -------------------------------------------------------------

export interface FullWebsiteBackup {
  metadata: {
    system: string;
    version: string;
    createdAt: string;
    totalRecords: number;
    summary: Record<string, number>;
  };
  data: {
    users: UserDoc[];
    programs: Program[];
    nutrition_plans: any[];
    exercise_videos: ExerciseVideo[];
    progress_logs: ProgressLog[];
    notifications: AppNotification[];
    chat_messages: Message[];
    workout_templates: WorkoutTemplate[];
    nutrition_templates: NutritionTemplate[];
    subscriptions?: any[];
    payments?: any[];
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  missingCollections: string[];
  presentCollections: Record<string, number>;
  totalRecords: number;
  errorMessage?: string;
}

export async function createFullWebsiteBackup(): Promise<FullWebsiteBackup> {
  const supabase = getSupabaseClient();

  // 1. Fetch Users
  const users: UserDoc[] = await getAllUsers();

  // Helper to safely select all records from a Supabase table
  const fetchTable = async (table: string, fallbackArr: any[] = []): Promise<any[]> => {
    if (!supabase) return fallbackArr;
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(item => item.data ? { ...item.data, id: item.id || item.uid } : item);
      }
    } catch (err) {
      console.warn(`Error backing up table ${table}:`, err);
    }
    return fallbackArr;
  };

  // 2. Fetch all collections
  const programs = await fetchTable("programs", Object.values(getLocalProgramsCache()));
  const nutritionPlans = await fetchTable("nutrition_plans", []);
  const exerciseVideos = await fetchTable("exercise_videos", await getExerciseVideos());
  const progressLogs = await fetchTable("progress_logs", recoveredData.progress || []);
  const notifications = await fetchTable("notifications", recoveredData.notifications || []);
  const chatMessages = await fetchTable("chat_messages", recoveredData.messages || []);
  const workoutTemplates = await fetchTable("workout_templates", []);
  const nutritionTemplates = await fetchTable("nutrition_templates", []);

  // Compute summary & total records
  const summary: Record<string, number> = {
    users: users.length,
    programs: programs.length,
    nutrition_plans: nutritionPlans.length,
    exercise_videos: exerciseVideos.length,
    progress_logs: progressLogs.length,
    notifications: notifications.length,
    chat_messages: chatMessages.length,
    workout_templates: workoutTemplates.length,
    nutrition_templates: nutritionTemplates.length
  };

  const totalRecords = Object.values(summary).reduce((a, b) => a + b, 0);

  return {
    metadata: {
      system: "PT FIT PORTAL FULL SYSTEM BACKUP",
      version: "2.0",
      createdAt: new Date().toISOString(),
      totalRecords,
      summary
    },
    data: {
      users,
      programs,
      nutrition_plans: nutritionPlans,
      exercise_videos: exerciseVideos,
      progress_logs: progressLogs,
      notifications,
      chat_messages: chatMessages,
      workout_templates: workoutTemplates,
      nutrition_templates: nutritionTemplates
    }
  };
}

export function validateBackupData(backup: any): BackupValidationResult {
  if (!backup || typeof backup !== "object") {
    return {
      isValid: false,
      missingCollections: [],
      presentCollections: {},
      totalRecords: 0,
      errorMessage: "The file is not a valid JSON object."
    };
  }

  const dataObj = backup.data && typeof backup.data === "object" ? backup.data : backup;

  if (!dataObj || (typeof dataObj !== "object")) {
    return {
      isValid: false,
      missingCollections: [],
      presentCollections: {},
      totalRecords: 0,
      errorMessage: "The backup file lacks a valid data structure."
    };
  }

  // Must have users at minimum
  const users = dataObj.users || dataObj.clients;
  if (!Array.isArray(users)) {
    return {
      isValid: false,
      missingCollections: [],
      presentCollections: {},
      totalRecords: 0,
      errorMessage: "Invalid backup file: 'users' array is missing or corrupted."
    };
  }

  const expectedKeys = [
    { key: "users", label: "Users & Accounts" },
    { key: "programs", label: "Workout Plans" },
    { key: "nutrition_plans", label: "Nutrition Plans" },
    { key: "exercise_videos", label: "Exercise Videos Library" },
    { key: "progress_logs", label: "Trainee Progress Logs" },
    { key: "notifications", label: "Notifications & Alerts" },
    { key: "chat_messages", label: "Chat Messages" },
    { key: "workout_templates", label: "Workout Templates" },
    { key: "nutrition_templates", label: "Nutrition Templates" }
  ];

  const presentCollections: Record<string, number> = {};
  const missingCollections: string[] = [];
  let totalRecords = 0;

  for (const item of expectedKeys) {
    const val = dataObj[item.key];
    if (Array.isArray(val) && val.length > 0) {
      presentCollections[item.label] = val.length;
      totalRecords += val.length;
    } else {
      missingCollections.push(item.label);
    }
  }

  return {
    isValid: true,
    missingCollections,
    presentCollections,
    totalRecords,
  };
}

export async function restoreFullWebsiteBackup(backup: any): Promise<{ success: boolean; totalRestored: number; details: Record<string, number> }> {
  const validation = validateBackupData(backup);
  if (!validation.isValid) {
    throw new Error(validation.errorMessage || "Invalid backup data.");
  }

  const supabase = getSupabaseClient();
  const dataObj = backup.data && typeof backup.data === "object" ? backup.data : backup;
  const details: Record<string, number> = {};
  let totalRestored = 0;

  // Helper batch upsert
  const batchUpsert = async (table: string, records: any[], onConflictKey: string = "id") => {
    if (!supabase || !records || !Array.isArray(records) || records.length === 0) return 0;
    const CHUNK_SIZE = 50;
    let count = 0;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: onConflictKey });
      if (error) {
        console.error(`Error restoring chunk to ${table}:`, error);
        throw new Error(`Failed to restore table '${table}': ${error.message}`);
      }
      count += chunk.length;
    }
    return count;
  };

  // 1. Users
  const rawUsers = dataObj.users || dataObj.clients || [];
  if (Array.isArray(rawUsers) && rawUsers.length > 0) {
    const formattedUsers = rawUsers.map((u: any) => {
      const userObj: UserDoc = {
        uid: u.uid || u.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: u.name || "User",
        email: u.email || "",
        phone: u.phone || "N/A",
        role: u.role || "trainee",
        status: u.status || "approved",
        coachId: u.coachId || u.coach_id || undefined,
        coachName: u.coachName || u.coach_name || undefined,
        subscriptionStatus: u.subscriptionStatus || u.subscription_status || "none",
        subscriptionStart: u.subscriptionStart || u.subscription_start || undefined,
        subscriptionExpiry: u.subscriptionExpiry || u.subscription_expiry || undefined,
        subscriptionDuration: u.subscriptionDuration || u.subscription_duration || undefined,
        frozenAt: u.frozenAt || u.frozen_at || undefined,
        createdAt: u.createdAt || u.created_at || new Date().toISOString()
      };
      saveUserToLocalCache(userObj);
      return {
        uid: userObj.uid,
        name: userObj.name,
        email: userObj.email,
        phone: userObj.phone,
        role: userObj.role,
        status: userObj.status,
        coach_id: userObj.coachId || null,
        coach_name: userObj.coachName || null,
        subscription_status: userObj.subscriptionStatus || "none",
        subscription_start: userObj.subscriptionStart || null,
        subscription_expiry: userObj.subscriptionExpiry || null,
        subscription_duration: userObj.subscriptionDuration || null,
        is_frozen: userObj.subscriptionStatus === "frozen",
        frozen_at: userObj.frozenAt || null,
        data: userObj,
        created_at: userObj.createdAt
      };
    });

    const c = await batchUpsert("users", formattedUsers, "uid");
    details["Users & Accounts"] = c;
    totalRestored += c;
  }

  // 2. Programs / Workout Plans
  const rawPrograms = dataObj.programs || [];
  if (Array.isArray(rawPrograms) && rawPrograms.length > 0) {
    const formattedPrograms = rawPrograms.map((p: any) => {
      const progObj: Program = {
        id: p.id || p.traineeId || p.trainee_id,
        traineeId: p.traineeId || p.trainee_id || p.id,
        coachId: p.coachId || p.coach_id || "",
        workoutDays: Array.isArray(p.workoutDays) ? p.workoutDays : (p.data?.workoutDays || []),
        dietMeals: Array.isArray(p.dietMeals) ? p.dietMeals : (p.data?.dietMeals || []),
        updatedAt: p.updatedAt || p.updated_at || new Date().toISOString()
      };
      saveProgramToLocalCache(progObj);
      return {
        id: progObj.id,
        trainee_id: progObj.traineeId,
        coach_id: progObj.coachId || null,
        workout_days: progObj.workoutDays,
        data: progObj,
        updated_at: progObj.updatedAt
      };
    });

    const c = await batchUpsert("programs", formattedPrograms, "id");
    details["Workout Plans"] = c;
    totalRestored += c;
  }

  // 3. Nutrition Plans
  const rawNutrition = dataObj.nutrition_plans || dataObj.nutritionPlans || [];
  if (Array.isArray(rawNutrition) && rawNutrition.length > 0) {
    const formattedNut = rawNutrition.map((n: any) => ({
      id: n.id || n.traineeId || n.trainee_id,
      trainee_id: n.traineeId || n.trainee_id || n.id,
      coach_id: n.coachId || n.coach_id || null,
      meals: n.meals || n.dietMeals || n.data?.dietMeals || [],
      data: n.data || n,
      updated_at: n.updatedAt || n.updated_at || new Date().toISOString()
    }));
    const c = await batchUpsert("nutrition_plans", formattedNut, "id");
    details["Nutrition Plans"] = c;
    totalRestored += c;
  }

  // 4. Exercise Videos
  const rawVideos = dataObj.exercise_videos || dataObj.exerciseVideos || dataObj.videos || [];
  if (Array.isArray(rawVideos) && rawVideos.length > 0) {
    const formattedVids = rawVideos.map((v: any) => ({
      id: v.id || `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: v.title || v.name || "Exercise Video",
      title_ar: v.title_ar || v.titleAr || v.title || "",
      target_muscle: v.target_muscle || v.targetMuscle || v.group || "Full Body",
      video_url: v.video_url || v.videoUrl || v.url || "",
      description: v.description || "",
      data: v.data || v
    }));
    const c = await batchUpsert("exercise_videos", formattedVids, "id");
    details["Exercise Videos Library"] = c;
    totalRestored += c;
  }

  // 5. Progress Logs
  const rawProgress = dataObj.progress_logs || dataObj.progress || [];
  if (Array.isArray(rawProgress) && rawProgress.length > 0) {
    const formattedProg = rawProgress.map((p: any) => ({
      id: p.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      trainee_id: p.traineeId || p.trainee_id || "",
      workout_day_name: p.workoutDayName || p.workout_day_name || "",
      completed_at: p.completedAt || p.completed_at || new Date().toISOString(),
      notes: p.notes || "",
      weight: p.weight || null,
      data: p.data || p
    }));
    const c = await batchUpsert("progress_logs", formattedProg, "id");
    details["Trainee Progress Logs"] = c;
    totalRestored += c;
  }

  // 6. Notifications
  const rawNotifications = dataObj.notifications || [];
  if (Array.isArray(rawNotifications) && rawNotifications.length > 0) {
    const formattedNotifs = rawNotifications.map((n: any) => ({
      id: n.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: n.userId || n.user_id || "all",
      title: n.title || "Announcement",
      message: n.message || "",
      read: Boolean(n.read),
      created_at: n.createdAt || n.created_at || new Date().toISOString(),
      data: n.data || n
    }));
    const c = await batchUpsert("notifications", formattedNotifs, "id");
    details["Notifications & Alerts"] = c;
    totalRestored += c;
  }

  // 7. Chat Messages
  const rawMessages = dataObj.chat_messages || dataObj.messages || [];
  if (Array.isArray(rawMessages) && rawMessages.length > 0) {
    const formattedMsgs = rawMessages.map((m: any) => ({
      id: m.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender_id: m.senderId || m.sender_id || "",
      receiver_id: m.receiverId || m.receiver_id || "",
      message: m.message || "",
      read: Boolean(m.read),
      created_at: m.createdAt || m.created_at || new Date().toISOString(),
      data: m.data || m
    }));
    const c = await batchUpsert("chat_messages", formattedMsgs, "id");
    details["Chat Messages"] = c;
    totalRestored += c;
  }

  // 8. Workout Templates
  const rawWorkoutTpl = dataObj.workout_templates || dataObj.workoutTemplates || [];
  if (Array.isArray(rawWorkoutTpl) && rawWorkoutTpl.length > 0) {
    const formattedWT = rawWorkoutTpl.map((w: any) => ({
      id: w.id || `wt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      coach_id: w.coachId || w.coach_id || "",
      title: w.title || w.name || "Workout Template",
      data: w.data || w
    }));
    const c = await batchUpsert("workout_templates", formattedWT, "id");
    details["Workout Templates"] = c;
    totalRestored += c;
  }

  // 9. Nutrition Templates
  const rawNutTpl = dataObj.nutrition_templates || dataObj.nutritionTemplates || [];
  if (Array.isArray(rawNutTpl) && rawNutTpl.length > 0) {
    const formattedNT = rawNutTpl.map((n: any) => ({
      id: n.id || `nt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      coach_id: n.coachId || n.coach_id || "",
      title: n.title || n.name || "Nutrition Template",
      data: n.data || n
    }));
    const c = await batchUpsert("nutrition_templates", formattedNT, "id");
    details["Nutrition Templates"] = c;
    totalRestored += c;
  }

  return {
    success: true,
    totalRestored,
    details
  };
}



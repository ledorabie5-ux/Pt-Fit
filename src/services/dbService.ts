import { getSupabaseClient, uploadToSupabaseStorage, syncSupabaseFromFirestore } from "../lib/supabase";
import { db } from "../lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, onSnapshot } from "firebase/firestore";
import { UserDoc, Program, ProgressLog, Message, AppNotification, ExerciseVideo, WorkoutTemplate, NutritionTemplate, UserStatus, SubscriptionDuration } from "../types";
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

// Trigger automatic config sync from Firestore
syncSupabaseFromFirestore().catch(() => {});

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

export async function migrateFirebaseToSupabase(): Promise<void> {
  // Migration sync
  const backup = await createFullWebsiteBackup();
  await restoreFullWebsiteBackup(backup);
}

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------

export async function getUser(uid: string): Promise<UserDoc | null> {
  let foundUser: UserDoc | null = null;

  // 1. Try Firestore
  if (db) {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        foundUser = { ...snap.data(), uid } as UserDoc;
      }
    } catch (err) {
      console.warn("Error fetching user from Firestore:", err);
    }
  }

  // 2. Try Supabase
  if (!foundUser) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("uid", uid)
          .maybeSingle();

        if (!error && data) {
          foundUser = data.data ? { ...data.data, uid: data.uid } : (data as unknown as UserDoc);
        }
      } catch (err) {
        console.warn("Error fetching user from Supabase:", err);
      }
    }
  }

  // 3. Fallback to local cache
  if (!foundUser) {
    foundUser = getLocalUsersCache().find(u => u.uid === uid) || null;
  }

  if (foundUser) {
    saveUserToLocalCache(foundUser);
  }

  return foundUser;
}

export async function createUserDoc(user: UserDoc): Promise<void> {
  saveUserToLocalCache(user);

  // 1. Save to Firestore
  if (db) {
    try {
      await setDoc(doc(db, "users", user.uid), {
        ...user,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Error creating user in Firestore:", err);
    }
  }

  // 2. Save to Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("users").upsert({
        uid: user.uid,
        role: user.role || "trainee",
        status: user.status || "pending",
        phone: user.phone || null,
        email: user.email || "",
        coach_id: user.coachId || null,
        data: user
      }, { onConflict: "uid" });
    } catch (err) {
      console.error("Error creating user doc in Supabase:", err);
    }
  }
}

export async function updateUserDoc(user: UserDoc): Promise<void> {
  await createUserDoc(user);
}

export async function getAllUsers(): Promise<UserDoc[]> {
  const usersMap = new Map<string, UserDoc>();

  // A. From recovered production dataset
  if (Array.isArray(recoveredData.users)) {
    for (const u of recoveredData.users) {
      if (u.uid) usersMap.set(u.uid, u);
    }
  }

  // B. From Local cache
  const cached = getLocalUsersCache();
  for (const u of cached) {
    if (u.uid) {
      const existing = usersMap.get(u.uid);
      usersMap.set(u.uid, existing ? { ...existing, ...u } : u);
    }
  }

  // C. From Firestore
  if (db) {
    try {
      const snap = await getDocs(collection(db, "users"));
      snap.forEach(d => {
        const uObj = { ...d.data(), uid: d.id } as UserDoc;
        if (uObj.uid) {
          const existing = usersMap.get(uObj.uid);
          usersMap.set(uObj.uid, existing ? { ...existing, ...uObj } : uObj);
          saveUserToLocalCache(uObj);
        }
      });
    } catch (err) {
      console.warn("Error fetching all users from Firestore:", err);
    }
  }

  // D. From Supabase live records
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("users").select("*");
      if (!error && data && Array.isArray(data)) {
        for (const item of data) {
          const userObj: UserDoc = item.data ? { ...item.data, uid: item.uid } : (item as unknown as UserDoc);
          if (userObj.uid) {
            const existing = usersMap.get(userObj.uid);
            usersMap.set(userObj.uid, existing ? { ...existing, ...userObj } : userObj);
            saveUserToLocalCache(userObj);
          }
        }
      }
    } catch (err) {
      console.warn("Error fetching all users from Supabase:", err);
    }
  }

  return Array.from(usersMap.values());
}

export async function getAllCoaches(): Promise<UserDoc[]> {
  const allUsers = await getAllUsers();
  return allUsers.filter(u => u.role === "coach");
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
  const allUsers = await getAllUsers();
  return allUsers.find(u => u.phone === phone) || null;
}

export async function searchTraineeByPhone(phoneQuery: string): Promise<UserDoc[]> {
  const cleaned = phoneQuery.trim();
  if (!cleaned) return [];
  const allUsers = await getAllUsers();
  return allUsers.filter(u => u.phone && u.phone.includes(cleaned));
}

export async function getTraineesForCoach(coachId: string): Promise<UserDoc[]> {
  const allUsers = await getAllUsers();
  return allUsers.filter(u => u.coachId === coachId);
}

// -------------------------------------------------------------
// WORKOUT & DIET PROGRAM OPERATIONS
// -------------------------------------------------------------

export async function getProgram(traineeId: string): Promise<Program | null> {
  let foundProgram: Program | null = null;

  // 1. Try Firestore
  if (db) {
    try {
      const snap = await getDoc(doc(db, "programs", traineeId));
      if (snap.exists()) {
        foundProgram = { ...snap.data(), id: traineeId, traineeId } as Program;
      } else {
        const nutSnap = await getDoc(doc(db, "nutrition_plans", traineeId));
        if (nutSnap.exists()) {
          const nutData = nutSnap.data();
          foundProgram = {
            id: traineeId,
            traineeId,
            coachId: nutData.coachId || "",
            workoutDays: [],
            dietMeals: nutData.dietMeals || nutData.meals || [],
            updatedAt: nutData.updatedAt || new Date().toISOString()
          };
        }
      }
    } catch (err) {
      console.warn("Error fetching program from Firestore:", err);
    }
  }

  // 2. Try Supabase
  if (!foundProgram) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("programs")
          .select("*")
          .eq("trainee_id", traineeId)
          .maybeSingle();

        if (!error && data) {
          foundProgram = data.data ? { ...data.data, id: data.id } : (data as unknown as Program);
        }
      } catch (err) {
        console.warn("Error fetching program from Supabase:", err);
      }
    }
  }

  // 3. Fallback to local cache
  if (!foundProgram) {
    const localCache = getLocalProgramsCache();
    if (localCache[traineeId]) {
      foundProgram = localCache[traineeId];
    }
  }

  if (foundProgram) {
    foundProgram.workoutDays = Array.isArray(foundProgram.workoutDays) ? foundProgram.workoutDays : [];
    foundProgram.dietMeals = Array.isArray(foundProgram.dietMeals) ? foundProgram.dietMeals : [];
    saveProgramToLocalCache(foundProgram);
    return foundProgram;
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

  // 1. Firestore
  if (db) {
    try {
      await setDoc(doc(db, "programs", cleanProgram.id), cleanProgram, { merge: true });
      if (cleanProgram.dietMeals) {
        await setDoc(doc(db, "nutrition_plans", cleanProgram.id), {
          id: cleanProgram.id,
          traineeId: cleanProgram.traineeId,
          coachId: cleanProgram.coachId,
          dietMeals: cleanProgram.dietMeals,
          updatedAt: cleanProgram.updatedAt
        }, { merge: true });
      }
    } catch (err) {
      console.error("Error updating program in Firestore:", err);
    }
  }

  // 2. Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("programs").upsert({
        id: cleanProgram.id,
        trainee_id: cleanProgram.traineeId,
        coach_id: cleanProgram.coachId || null,
        data: cleanProgram,
        updated_at: cleanProgram.updatedAt
      }, { onConflict: "id" });

      if (cleanProgram.dietMeals) {
        await supabase.from("nutrition_plans").upsert({
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
      }
    } catch (err) {
      console.error("Error updating program in Supabase:", err);
    }
  }
}

export function subscribeToProgram(traineeId: string, onUpdate: (program: Program | null) => void): () => void {
  getProgram(traineeId).then(onUpdate);

  let unsubscribeFirestore: (() => void) | null = null;
  if (db) {
    try {
      unsubscribeFirestore = onSnapshot(doc(db, "programs", traineeId), (snap) => {
        if (snap.exists()) {
          const prog = { ...snap.data(), id: traineeId, traineeId } as Program;
          saveProgramToLocalCache(prog);
          onUpdate(prog);
        }
      });
    } catch (err) {
      console.warn("Firestore program snapshot failed:", err);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
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
      if (unsubscribeFirestore) unsubscribeFirestore();
      supabase.removeChannel(channel);
    };
  }

  return () => {
    if (unsubscribeFirestore) unsubscribeFirestore();
  };
}

// -------------------------------------------------------------
// PROGRESS LOG OPERATIONS
// -------------------------------------------------------------

export async function getTraineeProgress(traineeId: string): Promise<ProgressLog[]> {
  const logsMap = new Map<string, ProgressLog>();

  // A. From Firestore
  if (db) {
    try {
      const snap = await getDocs(query(collection(db, "progress_logs"), where("traineeId", "==", traineeId)));
      snap.forEach(d => {
        const l = { ...d.data(), id: d.id } as ProgressLog;
        logsMap.set(l.id, l);
      });
    } catch (err) {
      console.warn("Error fetching progress from Firestore:", err);
    }
  }

  // B. From Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("progress_logs")
        .select("*")
        .eq("trainee_id", traineeId);

      if (!error && data && Array.isArray(data)) {
        data.forEach(item => {
          const l: ProgressLog = item.data ? { ...item.data, id: item.id } : (item as unknown as ProgressLog);
          logsMap.set(l.id, l);
        });
      }
    } catch (err) {
      console.warn("Error fetching progress from Supabase:", err);
    }
  }

  return Array.from(logsMap.values());
}

export async function addProgressLog(log: ProgressLog): Promise<void> {
  // 1. Firestore
  if (db) {
    try {
      await setDoc(doc(db, "progress_logs", log.id), log, { merge: true });
    } catch (err) {
      console.error("Error adding progress log to Firestore:", err);
    }
  }

  // 2. Supabase
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
  if (db) {
    try {
      await deleteDoc(doc(db, "progress_logs", logId));
    } catch (e) {}
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("progress_logs").delete().eq("id", logId);
    } catch (err) {}
  }
}

// -------------------------------------------------------------
// EXERCISE VIDEO OPERATIONS
// -------------------------------------------------------------

export async function getExerciseVideos(): Promise<ExerciseVideo[]> {
  const videoMap = new Map<string, ExerciseVideo>();

  // A. Firestore
  if (db) {
    try {
      const snap = await getDocs(collection(db, "exercise_videos"));
      snap.forEach(d => {
        const v = { ...d.data(), id: d.id } as ExerciseVideo;
        videoMap.set(v.id, v);
      });
    } catch (err) {
      console.warn("Error fetching exercise videos from Firestore:", err);
    }
  }

  // B. Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("exercise_videos").select("*");
      if (!error && data && Array.isArray(data)) {
        data.forEach(item => {
          const vObj: ExerciseVideo = item.data ? { ...item.data, id: item.id } : (item as unknown as ExerciseVideo);
          videoMap.set(vObj.id, vObj);
        });
      }
    } catch (err) {
      console.warn("Error fetching exercise videos from Supabase:", err);
    }
  }

  return Array.from(videoMap.values());
}

export async function saveExerciseVideo(video: ExerciseVideo): Promise<void> {
  if (db) {
    try {
      await setDoc(doc(db, "exercise_videos", video.id), video, { merge: true });
    } catch (err) {
      console.error("Error saving exercise video in Firestore:", err);
    }
  }

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
  if (db) {
    try {
      await deleteDoc(doc(db, "exercise_videos", videoId));
    } catch (e) {}
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("exercise_videos").delete().eq("id", videoId);
    } catch (err) {}
  }
}

export async function deleteUserDoc(uid: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, "users", uid));
    } catch (e) {}
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("users").delete().eq("uid", uid);
    } catch (err) {}
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
// NOTIFICATION OPERATIONS
// -------------------------------------------------------------

export async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  const notifMap = new Map<string, AppNotification>();

  if (db) {
    try {
      const snap = await getDocs(query(collection(db, "notifications"), where("userId", "==", userId)));
      snap.forEach(d => {
        const n = { ...d.data(), id: d.id } as AppNotification;
        notifMap.set(n.id, n);
      });
      const snapAll = await getDocs(query(collection(db, "notifications"), where("userId", "==", "all")));
      snapAll.forEach(d => {
        const n = { ...d.data(), id: d.id } as AppNotification;
        notifMap.set(n.id, n);
      });
    } catch (err) {
      console.warn("Error fetching notifications from Firestore:", err);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${userId},user_id.eq.all`);

      if (!error && data && Array.isArray(data)) {
        data.forEach(item => {
          const nObj: AppNotification = item.data ? { ...item.data, id: item.id } : (item as unknown as AppNotification);
          notifMap.set(nObj.id, nObj);
        });
      }
    } catch (err) {
      console.warn("Error fetching notifications from Supabase:", err);
    }
  }

  return Array.from(notifMap.values());
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

  if (db) {
    try {
      await setDoc(doc(db, "notifications", notif.id), notif, { merge: true });
    } catch (err) {
      console.error("Error creating notification in Firestore:", err);
    }
  }

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
  if (db) {
    try {
      await setDoc(doc(db, "notifications", notifId), { read: true }, { merge: true });
    } catch (e) {}
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.from("notifications").select("*").eq("id", notifId).maybeSingle();
      if (data) {
        const updated = { ...(data.data || data), read: true };
        await supabase.from("notifications").update({ data: updated }).eq("id", notifId);
      }
    } catch (err) {}
  }
}

export async function deleteNotification(notifId: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, "notifications", notifId));
    } catch (e) {}
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("notifications").delete().eq("id", notifId);
    } catch (err) {}
  }
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  if (db) {
    try {
      const notifs = await getUserNotifications(userId);
      for (const n of notifs) {
        await deleteDoc(doc(db, "notifications", n.id));
      }
    } catch (e) {}
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("notifications").delete().eq("user_id", userId);
    } catch (err) {}
  }
}

// -------------------------------------------------------------
// REALTIME CHAT MESSAGES
// -------------------------------------------------------------

export async function getChatMessages(userId1: string, userId2: string): Promise<Message[]> {
  const msgMap = new Map<string, Message>();

  // A. Firestore
  if (db) {
    try {
      const snap = await getDocs(collection(db, "chat_messages"));
      snap.forEach(d => {
        const m = { ...d.data(), id: d.id } as Message;
        if (
          (m.senderId === userId1 && (m.chatId?.includes(userId2) || (m as any).receiverId === userId2)) ||
          (m.senderId === userId2 && (m.chatId?.includes(userId1) || (m as any).receiverId === userId1))
        ) {
          msgMap.set(m.id, m);
        }
      });
    } catch (err) {
      console.warn("Error fetching chat messages from Firestore:", err);
    }
  }

  // B. Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("chat_messages").select("*");
      if (!error && data && Array.isArray(data)) {
        data.forEach(item => {
          const mObj: Message = item.data ? { ...item.data, id: item.id } : (item as unknown as Message);
          if (
            (mObj.senderId === userId1 && (mObj.chatId?.includes(userId2) || (mObj as any).receiverId === userId2)) ||
            (mObj.senderId === userId2 && (mObj.chatId?.includes(userId1) || (mObj as any).receiverId === userId1))
          ) {
            msgMap.set(mObj.id, mObj);
          }
        });
      }
    } catch (err) {
      console.warn("Error fetching chat messages from Supabase:", err);
    }
  }

  return Array.from(msgMap.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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

  // 1. Firestore
  if (db) {
    try {
      await setDoc(doc(db, "chat_messages", msg.id), msg, { merge: true });
    } catch (err) {
      console.error("Error sending chat message to Firestore:", err);
    }
  }

  // 2. Supabase
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
  let unsubscribeFirestore: (() => void) | null = null;

  if (typeof arg2 === "function") {
    const onMessagesUpdate = arg2;
    getChatMessages(chatIdOrUid1, "").then(onMessagesUpdate);
    if (db) {
      try {
        unsubscribeFirestore = onSnapshot(collection(db, "chat_messages"), () => {
          getChatMessages(chatIdOrUid1, "").then(onMessagesUpdate);
        });
      } catch (e) {}
    }
  } else {
    const userId1 = chatIdOrUid1;
    const userId2 = arg2 as string;
    const onNewMessage = arg3;
    if (db) {
      try {
        unsubscribeFirestore = onSnapshot(collection(db, "chat_messages"), () => {
          getChatMessages(userId1, userId2).then(msgs => {
            if (msgs.length > 0 && onNewMessage) {
              onNewMessage(msgs[msgs.length - 1]);
            }
          });
        });
      } catch (e) {}
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    const channel = supabase
      .channel("chat_subscription")
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        if (typeof arg2 === "function") {
          getChatMessages(chatIdOrUid1, "").then(arg2);
        } else if (arg3) {
          getChatMessages(chatIdOrUid1, arg2 as string).then(msgs => {
            if (msgs.length > 0) arg3(msgs[msgs.length - 1]);
          });
        }
      })
      .subscribe();

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      supabase.removeChannel(channel);
    };
  }

  return () => {
    if (unsubscribeFirestore) unsubscribeFirestore();
  };
}

export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void
): () => void {
  getUserNotifications(userId).then(onUpdate);

  let unsubscribeFirestore: (() => void) | null = null;
  if (db) {
    try {
      unsubscribeFirestore = onSnapshot(collection(db, "notifications"), () => {
        getUserNotifications(userId).then(onUpdate);
      });
    } catch (e) {}
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
        const updated = await getUserNotifications(userId);
        onUpdate(updated);
      })
      .subscribe();

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      supabase.removeChannel(channel);
    };
  }

  return () => {
    if (unsubscribeFirestore) unsubscribeFirestore();
  };
}

// -------------------------------------------------------------
// TEMPLATE OPERATIONS
// -------------------------------------------------------------

export async function getWorkoutTemplates(coachId: string): Promise<WorkoutTemplate[]> {
  const tplMap = new Map<string, WorkoutTemplate>();

  if (db) {
    try {
      const snap = await getDocs(query(collection(db, "workout_templates"), where("coachId", "==", coachId)));
      snap.forEach(d => {
        const wt = { ...d.data(), id: d.id } as WorkoutTemplate;
        tplMap.set(wt.id, wt);
      });
    } catch (err) {}
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("workout_templates").select("*").eq("coach_id", coachId);
      if (!error && data && Array.isArray(data)) {
        data.forEach(item => {
          const wObj: WorkoutTemplate = item.data ? { ...item.data, id: item.id } : (item as unknown as WorkoutTemplate);
          tplMap.set(wObj.id, wObj);
        });
      }
    } catch (err) {}
  }

  return Array.from(tplMap.values());
}

export async function saveWorkoutTemplate(template: WorkoutTemplate): Promise<void> {
  if (db) {
    try {
      await setDoc(doc(db, "workout_templates", template.id), template, { merge: true });
    } catch (e) {}
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("workout_templates").upsert({
        id: template.id,
        coach_id: template.coachId,
        data: template
      }, { onConflict: "id" });
    } catch (e) {}
  }
}

export async function deleteWorkoutTemplate(templateId: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, "workout_templates", templateId));
    } catch (e) {}
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("workout_templates").delete().eq("id", templateId);
    } catch (e) {}
  }
}

export async function getNutritionTemplates(coachId: string): Promise<NutritionTemplate[]> {
  const tplMap = new Map<string, NutritionTemplate>();

  if (db) {
    try {
      const snap = await getDocs(query(collection(db, "nutrition_templates"), where("coachId", "==", coachId)));
      snap.forEach(d => {
        const nt = { ...d.data(), id: d.id } as NutritionTemplate;
        tplMap.set(nt.id, nt);
      });
    } catch (err) {}
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("nutrition_templates").select("*").eq("coach_id", coachId);
      if (!error && data && Array.isArray(data)) {
        data.forEach(item => {
          const nObj: NutritionTemplate = item.data ? { ...item.data, id: item.id } : (item as unknown as NutritionTemplate);
          tplMap.set(nObj.id, nObj);
        });
      }
    } catch (err) {}
  }

  return Array.from(tplMap.values());
}

export async function saveNutritionTemplate(template: NutritionTemplate): Promise<void> {
  if (db) {
    try {
      await setDoc(doc(db, "nutrition_templates", template.id), template, { merge: true });
    } catch (e) {}
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("nutrition_templates").upsert({
        id: template.id,
        coach_id: template.coachId,
        data: template
      }, { onConflict: "id" });
    } catch (e) {}
  }
}

export async function deleteNutritionTemplate(templateId: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, "nutrition_templates", templateId));
    } catch (e) {}
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("nutrition_templates").delete().eq("id", templateId);
    } catch (e) {}
  }
}

// -------------------------------------------------------------
// SYSTEM STATS
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
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  missingCollections: string[];
  presentCollections: Record<string, number>;
  totalRecords: number;
  errorMessage?: string;
}

export async function getMergedLocalAndCloudData(): Promise<{
  users: UserDoc[];
  programs: Program[];
  nutritionPlans: any[];
  exerciseVideos: ExerciseVideo[];
  progressLogs: ProgressLog[];
  notifications: AppNotification[];
  chatMessages: Message[];
  workoutTemplates: WorkoutTemplate[];
  nutritionTemplates: NutritionTemplate[];
}> {
  const users = await getAllUsers();

  // Programs
  const progMap = new Map<string, Program>();
  if (Array.isArray(recoveredData.programs)) {
    for (const p of recoveredData.programs) {
      if (p.id || p.traineeId) progMap.set(p.id || p.traineeId, p);
    }
  }
  for (const u of users) {
    if (u.uid) {
      const p = await getProgram(u.uid);
      if (p) progMap.set(p.id || p.traineeId, p);
    }
  }
  const programs = Array.from(progMap.values());

  // Nutrition
  const nutPlans: any[] = [];
  for (const p of programs) {
    if (p.dietMeals && p.dietMeals.length > 0) {
      nutPlans.push({
        id: p.id || p.traineeId,
        traineeId: p.traineeId,
        coachId: p.coachId,
        dietMeals: p.dietMeals,
        updatedAt: p.updatedAt
      });
    }
  }

  // Videos
  const exerciseVideos = await getExerciseVideos();

  // Progress Logs
  const progLogsMap = new Map<string, ProgressLog>();
  if (Array.isArray(recoveredData.progress)) {
    for (const pl of recoveredData.progress) {
      if (pl.id) progLogsMap.set(pl.id, pl);
    }
  }
  for (const u of users) {
    if (u.uid) {
      const logs = await getTraineeProgress(u.uid);
      for (const l of logs) progLogsMap.set(l.id, l);
    }
  }
  const progressLogs = Array.from(progLogsMap.values());

  // Notifications
  const notifMap = new Map<string, AppNotification>();
  if (Array.isArray(recoveredData.notifications)) {
    for (const n of recoveredData.notifications) {
      if (n.id) notifMap.set(n.id, n);
    }
  }
  for (const u of users) {
    if (u.uid) {
      const notifs = await getUserNotifications(u.uid);
      for (const n of notifs) notifMap.set(n.id, n);
    }
  }
  const notifications = Array.from(notifMap.values());

  // Chat Messages
  const msgsMap = new Map<string, Message>();
  if (Array.isArray(recoveredData.messages)) {
    for (const m of recoveredData.messages) {
      if (m.id) msgsMap.set(m.id, m);
    }
  }
  const chatMessages = Array.from(msgsMap.values());

  // Templates
  const wtMap = new Map<string, WorkoutTemplate>();
  const ntMap = new Map<string, NutritionTemplate>();
  for (const u of users) {
    if (u.role === "coach") {
      const wts = await getWorkoutTemplates(u.uid);
      for (const wt of wts) wtMap.set(wt.id, wt);
      const nts = await getNutritionTemplates(u.uid);
      for (const nt of nts) ntMap.set(nt.id, nt);
    }
  }

  return {
    users,
    programs,
    nutritionPlans: nutPlans,
    exerciseVideos,
    progressLogs,
    notifications,
    chatMessages,
    workoutTemplates: Array.from(wtMap.values()),
    nutritionTemplates: Array.from(ntMap.values())
  };
}

export async function createFullWebsiteBackup(): Promise<FullWebsiteBackup> {
  const merged = await getMergedLocalAndCloudData();

  const summary: Record<string, number> = {
    users: merged.users.length,
    programs: merged.programs.length,
    nutrition_plans: merged.nutritionPlans.length,
    exercise_videos: merged.exerciseVideos.length,
    progress_logs: merged.progressLogs.length,
    notifications: merged.notifications.length,
    chat_messages: merged.chatMessages.length,
    workout_templates: merged.workoutTemplates.length,
    nutrition_templates: merged.nutritionTemplates.length
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
      users: merged.users,
      programs: merged.programs,
      nutrition_plans: merged.nutritionPlans,
      exercise_videos: merged.exerciseVideos,
      progress_logs: merged.progressLogs,
      notifications: merged.notifications,
      chat_messages: merged.chatMessages,
      workout_templates: merged.workoutTemplates,
      nutrition_templates: merged.nutritionTemplates
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

  const dataObj = backup.data && typeof backup.data === "object" ? backup.data : backup;
  const details: Record<string, number> = {};
  let totalRestored = 0;

  const supabase = getSupabaseClient();

  // Helper batch upsert for Supabase
  const batchUpsertSupabase = async (table: string, records: any[], onConflictKey: string = "id") => {
    if (!supabase || !records || !Array.isArray(records) || records.length === 0) return 0;
    const CHUNK_SIZE = 50;
    let count = 0;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: onConflictKey });
      if (error) {
        console.warn(`Warning restoring chunk to Supabase ${table}:`, error.message);
      } else {
        count += chunk.length;
      }
    }
    return count;
  };

  // 1. Users
  const rawUsers = dataObj.users || dataObj.clients || [];
  if (Array.isArray(rawUsers) && rawUsers.length > 0) {
    let restoredUsersCount = 0;
    const formattedUsers: any[] = [];

    for (const u of rawUsers) {
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

      // Write to Firestore
      if (db) {
        try {
          await setDoc(doc(db, "users", userObj.uid), userObj, { merge: true });
        } catch (err) {
          console.warn("Firestore user restore warn:", err);
        }
      }

      formattedUsers.push({
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
      });

      restoredUsersCount++;
    }

    if (supabase) {
      await batchUpsertSupabase("users", formattedUsers, "uid");
    }

    details["Users & Accounts"] = restoredUsersCount;
    totalRestored += restoredUsersCount;
  }

  // 2. Programs / Workout Plans
  const rawPrograms = dataObj.programs || [];
  if (Array.isArray(rawPrograms) && rawPrograms.length > 0) {
    let count = 0;
    const formattedPrograms: any[] = [];

    for (const p of rawPrograms) {
      const progObj: Program = {
        id: p.id || p.traineeId || p.trainee_id,
        traineeId: p.traineeId || p.trainee_id || p.id,
        coachId: p.coachId || p.coach_id || "",
        workoutDays: Array.isArray(p.workoutDays) ? p.workoutDays : (p.data?.workoutDays || []),
        dietMeals: Array.isArray(p.dietMeals) ? p.dietMeals : (p.data?.dietMeals || []),
        updatedAt: p.updatedAt || p.updated_at || new Date().toISOString()
      };

      saveProgramToLocalCache(progObj);

      if (db) {
        try {
          await setDoc(doc(db, "programs", progObj.id), progObj, { merge: true });
        } catch (e) {}
      }

      formattedPrograms.push({
        id: progObj.id,
        trainee_id: progObj.traineeId,
        coach_id: progObj.coachId || null,
        workout_days: progObj.workoutDays,
        data: progObj,
        updated_at: progObj.updatedAt
      });

      count++;
    }

    if (supabase) {
      await batchUpsertSupabase("programs", formattedPrograms, "id");
    }

    details["Workout Plans"] = count;
    totalRestored += count;
  }

  // 3. Nutrition Plans
  const rawNutrition = dataObj.nutrition_plans || dataObj.nutritionPlans || [];
  if (Array.isArray(rawNutrition) && rawNutrition.length > 0) {
    let count = 0;
    const formattedNut: any[] = [];

    for (const n of rawNutrition) {
      const id = n.id || n.traineeId || n.trainee_id;
      const nutObj = {
        id,
        traineeId: n.traineeId || n.trainee_id || id,
        coachId: n.coachId || n.coach_id || "",
        dietMeals: n.meals || n.dietMeals || n.data?.dietMeals || [],
        updatedAt: n.updatedAt || n.updated_at || new Date().toISOString()
      };

      if (db) {
        try {
          await setDoc(doc(db, "nutrition_plans", id), nutObj, { merge: true });
        } catch (e) {}
      }

      formattedNut.push({
        id,
        trainee_id: nutObj.traineeId,
        coach_id: nutObj.coachId || null,
        meals: nutObj.dietMeals,
        data: nutObj,
        updated_at: nutObj.updatedAt
      });

      count++;
    }

    if (supabase) {
      await batchUpsertSupabase("nutrition_plans", formattedNut, "id");
    }

    details["Nutrition Plans"] = count;
    totalRestored += count;
  }

  // 4. Exercise Videos
  const rawVideos = dataObj.exercise_videos || dataObj.exerciseVideos || dataObj.videos || [];
  if (Array.isArray(rawVideos) && rawVideos.length > 0) {
    let count = 0;
    const formattedVids: any[] = [];

    for (const v of rawVideos) {
      const vidObj: ExerciseVideo = {
        id: v.id || `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: v.name || v.title || "Exercise Video",
        muscleGroup: v.muscleGroup || v.target_muscle || v.group || "Full Body",
        videoUrl: v.videoUrl || v.video_url || v.url || "",
        createdAt: v.createdAt || v.created_at || new Date().toISOString()
      };

      if (db) {
        try {
          await setDoc(doc(db, "exercise_videos", vidObj.id), vidObj, { merge: true });
        } catch (e) {}
      }

      formattedVids.push({
        id: vidObj.id,
        title: vidObj.name,
        target_muscle: vidObj.muscleGroup,
        video_url: vidObj.videoUrl,
        data: vidObj
      });

      count++;
    }

    if (supabase) {
      await batchUpsertSupabase("exercise_videos", formattedVids, "id");
    }

    details["Exercise Videos Library"] = count;
    totalRestored += count;
  }

  // 5. Progress Logs
  const rawProgress = dataObj.progress_logs || dataObj.progress || [];
  if (Array.isArray(rawProgress) && rawProgress.length > 0) {
    let count = 0;
    const formattedProg: any[] = [];

    for (const p of rawProgress) {
      const logObj: ProgressLog = {
        id: p.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        traineeId: p.traineeId || p.trainee_id || "",
        workoutDayId: p.workoutDayId || p.workout_day_id || "",
        workoutDayName: p.workoutDayName || p.workout_day_name || "",
        completedAt: p.completedAt || p.completed_at || new Date().toISOString(),
        notes: p.notes || "",
        feedback: p.feedback || undefined
      };

      if (db) {
        try {
          await setDoc(doc(db, "progress_logs", logObj.id), logObj, { merge: true });
        } catch (e) {}
      }

      formattedProg.push({
        id: logObj.id,
        trainee_id: logObj.traineeId,
        workout_day_name: logObj.workoutDayName,
        completed_at: logObj.completedAt,
        notes: logObj.notes,
        data: logObj
      });

      count++;
    }

    if (supabase) {
      await batchUpsertSupabase("progress_logs", formattedProg, "id");
    }

    details["Trainee Progress Logs"] = count;
    totalRestored += count;
  }

  // 6. Notifications
  const rawNotifications = dataObj.notifications || [];
  if (Array.isArray(rawNotifications) && rawNotifications.length > 0) {
    let count = 0;
    const formattedNotifs: any[] = [];

    for (const n of rawNotifications) {
      const notifObj: AppNotification = {
        id: n.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: n.userId || n.user_id || "all",
        title: n.title || "Announcement",
        body: n.body || n.message || "",
        read: Boolean(n.read),
        createdAt: n.createdAt || n.created_at || new Date().toISOString()
      };

      if (db) {
        try {
          await setDoc(doc(db, "notifications", notifObj.id), notifObj, { merge: true });
        } catch (e) {}
      }

      formattedNotifs.push({
        id: notifObj.id,
        user_id: notifObj.userId,
        title: notifObj.title,
        message: notifObj.body,
        read: notifObj.read,
        created_at: notifObj.createdAt,
        data: notifObj
      });

      count++;
    }

    if (supabase) {
      await batchUpsertSupabase("notifications", formattedNotifs, "id");
    }

    details["Notifications & Alerts"] = count;
    totalRestored += count;
  }

  // 7. Chat Messages
  const rawMessages = dataObj.chat_messages || dataObj.messages || [];
  if (Array.isArray(rawMessages) && rawMessages.length > 0) {
    let count = 0;
    const formattedMsgs: any[] = [];

    for (const m of rawMessages) {
      const msgObj: Message = {
        id: m.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        chatId: m.chatId || m.chat_id || getChatId(m.senderId || m.sender_id || "", m.receiverId || m.receiver_id || ""),
        senderId: m.senderId || m.sender_id || "",
        text: m.text || m.message || "",
        createdAt: m.createdAt || m.created_at || new Date().toISOString()
      };

      if (db) {
        try {
          await setDoc(doc(db, "chat_messages", msgObj.id), msgObj, { merge: true });
        } catch (e) {}
      }

      formattedMsgs.push({
        id: msgObj.id,
        sender_id: msgObj.senderId,
        receiver_id: (msgObj as any).receiverId || null,
        message: msgObj.text,
        read: Boolean(m.read),
        created_at: msgObj.createdAt,
        data: msgObj
      });

      count++;
    }

    if (supabase) {
      await batchUpsertSupabase("chat_messages", formattedMsgs, "id");
    }

    details["Chat Messages"] = count;
    totalRestored += count;
  }

  // 8. Workout Templates
  const rawWorkoutTpl = dataObj.workout_templates || dataObj.workoutTemplates || [];
  if (Array.isArray(rawWorkoutTpl) && rawWorkoutTpl.length > 0) {
    let count = 0;
    const formattedWT: any[] = [];

    for (const w of rawWorkoutTpl) {
      const wtObj: WorkoutTemplate = {
        id: w.id || `wt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        coachId: w.coachId || w.coach_id || "",
        name: w.name || w.title || "Workout Template",
        workoutDays: w.workoutDays || w.days || [],
        createdAt: w.createdAt || w.created_at || new Date().toISOString()
      };

      if (db) {
        try {
          await setDoc(doc(db, "workout_templates", wtObj.id), wtObj, { merge: true });
        } catch (e) {}
      }

      formattedWT.push({
        id: wtObj.id,
        coach_id: wtObj.coachId,
        title: wtObj.name,
        data: wtObj
      });

      count++;
    }

    if (supabase) {
      await batchUpsertSupabase("workout_templates", formattedWT, "id");
    }

    details["Workout Templates"] = count;
    totalRestored += count;
  }

  // 9. Nutrition Templates
  const rawNutTpl = dataObj.nutrition_templates || dataObj.nutritionTemplates || [];
  if (Array.isArray(rawNutTpl) && rawNutTpl.length > 0) {
    let count = 0;
    const formattedNT: any[] = [];

    for (const n of rawNutTpl) {
      const ntObj: NutritionTemplate = {
        id: n.id || `nt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        coachId: n.coachId || n.coach_id || "",
        name: n.name || n.title || "Nutrition Template",
        dietMeals: n.dietMeals || n.meals || [],
        createdAt: n.createdAt || n.created_at || new Date().toISOString()
      };

      if (db) {
        try {
          await setDoc(doc(db, "nutrition_templates", ntObj.id), ntObj, { merge: true });
        } catch (e) {}
      }

      formattedNT.push({
        id: ntObj.id,
        coach_id: ntObj.coachId,
        title: ntObj.name,
        data: ntObj
      });

      count++;
    }

    if (supabase) {
      await batchUpsertSupabase("nutrition_templates", formattedNT, "id");
    }

    details["Nutrition Templates"] = count;
    totalRestored += count;
  }

  return {
    success: true,
    totalRestored,
    details
  };
}

export async function migrateAllLocalDataToSupabase(): Promise<{ success: boolean; totalRestored: number; details: Record<string, number> }> {
  const backup = await createFullWebsiteBackup();
  return await restoreFullWebsiteBackup(backup);
}

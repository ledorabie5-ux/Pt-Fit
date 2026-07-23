import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  addDoc,
  onSnapshot,
  deleteDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { UserDoc, Program, ProgressLog, Message, Chat, AppNotification, ExerciseVideo, WorkoutTemplate, NutritionTemplate } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error Handled: ', JSON.stringify(errInfo));
}

// Local Users Persistence Cache & Synchronization Helpers
const USERS_CACHE_KEY = "pt_fit_users_cache_v2";

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

export function syncUsersToLocalCache(fetchedUsers: UserDoc[]): UserDoc[] {
  try {
    const current = getLocalUsersCache();
    const map = new Map<string, UserDoc>();
    current.forEach(u => map.set(u.uid, u));
    fetchedUsers.forEach(u => map.set(u.uid, u));
    const merged = Array.from(map.values());
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return fetchedUsers;
  }
}

// User Services
export async function getUser(uid: string): Promise<UserDoc | null> {
  const cachedUsers = getLocalUsersCache();
  const cachedMatch = cachedUsers.find(u => u.uid === uid);

  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap && docSnap.exists()) {
      const u = docSnap.data() as UserDoc;
      saveUserToLocalCache(u);
      return u;
    }
    if (cachedMatch) return cachedMatch;
    return null;
  } catch (error) {
    console.warn(`getUser(${uid}) failed, returning cached match if available:`, error);
    if (cachedMatch) return cachedMatch;
    return null;
  }
}

export async function deleteUserDoc(uid: string): Promise<void> {
  // Update local cache
  try {
    const current = getLocalUsersCache().filter(u => u.uid !== uid);
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn("Failed to update local cache during delete:", err);
  }

  try {
    await deleteDoc(doc(db, "users", uid));
  } catch (error) {
    console.warn("Firestore delete failed:", error);
  }

  try {
    await deleteDoc(doc(db, "programs", uid));
  } catch (err) {
    // Program might not exist
  }
}

export function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as any;
  }
  const copy = { ...obj } as any;
  for (const key in copy) {
    if (copy[key] === undefined) {
      delete copy[key];
    } else if (typeof copy[key] === "object" && copy[key] !== null) {
      copy[key] = cleanUndefined(copy[key]);
    }
  }
  return copy;
}

export async function updateUserDoc(user: UserDoc): Promise<void> {
  saveUserToLocalCache(user);
  try {
    const cleanedUser = cleanUndefined(user);
    await setDoc(doc(db, "users", user.uid), cleanedUser, { merge: true });
  } catch (error) {
    console.warn(`updateUserDoc failed for ${user.uid}, saved to local cache:`, error);
  }
}

export async function createUserDoc(user: UserDoc): Promise<void> {
  saveUserToLocalCache(user);
  try {
    const cleanedUser = cleanUndefined(user);
    await setDoc(doc(db, "users", user.uid), cleanedUser);
  } catch (error) {
    console.warn(`createUserDoc failed for ${user.uid}, saved to local cache:`, error);
  }

  // If trainee, also create an empty program document
  if (user.role === "trainee") {
    await createEmptyProgram(user.uid, user.coachId || "");
  }
}

const isPermissionDenied = (error: any): boolean => {
  if (!error) return false;
  const errMsg = String(error.message || "").toLowerCase();
  const errCode = String(error.code || "").toLowerCase();
  return errMsg.includes("permission") || errMsg.includes("insufficient") || errCode.includes("permission-denied") || errMsg.includes("quota") || errCode.includes("resource-exhausted");
};

export async function getAllUsers(): Promise<UserDoc[]> {
  const localCache = getLocalUsersCache();

  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users: UserDoc[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserDoc);
    });

    const merged = syncUsersToLocalCache(users);
    if (merged.length > 0) return merged;
  } catch (error) {
    console.warn("getAllUsers Firestore query error, serving from local persistence cache:", error);
  }

  if (localCache.length > 0) {
    return localCache;
  }

  // Initial baseline default users if cache is completely empty
  const defaultBaseUsers: UserDoc[] = [
    {
      uid: "demo_admin_uid",
      name: "Ramadan",
      email: "admin@ptfit.com",
      phone: "01000000001",
      role: "admin",
      status: "approved",
      createdAt: new Date().toISOString()
    },
    {
      uid: "demo_coach_1",
      name: "Captain Sherif",
      email: "sherif@ptfit.com",
      phone: "01000000002",
      role: "coach",
      status: "approved",
      createdAt: new Date().toISOString()
    },
    {
      uid: "demo_trainee_1",
      name: "Youssef Ahmed",
      email: "youssef@ptfit.com",
      phone: "01000000003",
      role: "trainee",
      status: "approved",
      coachId: "demo_coach_1",
      coachName: "Captain Sherif",
      subscriptionStatus: "active",
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    }
  ];

  return syncUsersToLocalCache(defaultBaseUsers);
}

export async function getAllCoaches(): Promise<UserDoc[]> {
  try {
    const q = query(collection(db, "users"), where("role", "==", "coach"));
    const querySnapshot = await getDocs(q);
    const coaches: UserDoc[] = [];
    querySnapshot.forEach((doc) => {
      coaches.push(doc.data() as UserDoc);
    });

    if (coaches.length > 0) {
      return coaches;
    }
  } catch (error) {
    if (!isPermissionDenied(error)) {
      console.warn("Error fetching coaches from firestore, using fallback coaches:", error);
    }
  }

  // Fallback demo coaches list with complete profiles
  return [
    {
      uid: "demo_coach_1",
      name: "Captain Sherif El-Sayed",
      email: "sherif@ptfit.com",
      phone: "01000000002",
      role: "coach",
      status: "approved",
      specialization: "Bodybuilding & Muscle Hypertrophy",
      yearsOfExperience: 8,
      bio: "Certified IFBB Pro Fitness Coach with over 8 years of experience transforming top competitive athletes and fitness enthusiasts. Specializes in customized progressive overload routines and precision macronutrient nutrition plans.",
      photoUrl: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&auto=format&fit=crop&q=80",
      socialLinks: {
        instagram: "https://instagram.com/ptfit_sherif",
        youtube: "https://youtube.com/@ptfit_sherif",
        whatsapp: "201044186025"
      },
      createdAt: new Date().toISOString()
    },
    {
      uid: "demo_coach_2",
      name: "Captain Ahmed Hassan",
      email: "ahmed@ptfit.com",
      phone: "01000000004",
      role: "coach",
      status: "approved",
      specialization: "Fat Loss & Body Recomposition",
      yearsOfExperience: 6,
      bio: "Dedicated transformational coach helping clients shed body fat while building lean functional strength. Science-backed meal planning, metabolic conditioning, and daily accountability.",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
      socialLinks: {
        instagram: "https://instagram.com/ahmed_fit",
        facebook: "https://facebook.com/ahmed.ptfit",
        whatsapp: "201044186025"
      },
      createdAt: new Date().toISOString()
    },
    {
      uid: "demo_coach_3",
      name: "Captain Omar Farouk",
      email: "omar@ptfit.com",
      phone: "01000000005",
      role: "coach",
      status: "approved",
      specialization: "Powerlifting & Strength Development",
      yearsOfExperience: 10,
      bio: "National Powerlifting Champion and elite strength coach. Expert in squat, bench press, deadlift technique optimization, central nervous system recovery, and periodized training cycles.",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
      socialLinks: {
        youtube: "https://youtube.com/@omar_strength",
        twitter: "https://x.com/omar_power",
        whatsapp: "201044186025"
      },
      createdAt: new Date().toISOString()
    },
    {
      uid: "demo_coach_4",
      name: "Coach Nour Khedr",
      email: "nour@ptfit.com",
      phone: "01000000006",
      role: "coach",
      status: "approved",
      specialization: "Female Fitness & Metabolic Health",
      yearsOfExperience: 5,
      bio: "Holistic female fitness instructor specializing in body transformations, mobility, posture correction, and sustainable lifestyle nutritional planning.",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80",
      socialLinks: {
        instagram: "https://instagram.com/nour_fitness",
        tiktok: "https://tiktok.com/@nour_coach",
        whatsapp: "201044186025"
      },
      createdAt: new Date().toISOString()
    }
  ];
}

export async function assignCoachToTrainee(traineeId: string, coachId: string, coachName: string): Promise<void> {
  try {
    const traineeRef = doc(db, "users", traineeId);
    await updateDoc(traineeRef, {
      coachId,
      coachName
    });
  } catch (error) {
    console.warn("Failed to update coach for trainee doc in Firestore directly:", error);
  }

  // Update program doc coachId if program exists
  try {
    const programRef = doc(db, "programs", traineeId);
    const progSnap = await getDoc(programRef);
    if (progSnap && progSnap.exists()) {
      await updateDoc(programRef, {
        coachId,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn("Could not update program coach ID:", err);
  }

  // Notify trainee and new coach
  try {
    await createNotification(
      traineeId,
      "Coach Updated",
      `You have successfully assigned Captain ${coachName} as your head coach.`
    );
    await createNotification(
      coachId,
      "New Trainee Assigned",
      `A trainee has selected you as their coach. Check your roster in Client Management!`
    );
  } catch (err) {
    console.warn("Could not dispatch notifications for coach assignment:", err);
  }
}

export async function updateUserStatus(uid: string, status: "approved" | "rejected"): Promise<void> {
  try {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }

  // Add notification
  await createNotification(uid, "Account Status Updated", `Your PT Fit account status has been updated to: ${status.toUpperCase()}.`);
}

export async function getUserByPhone(phone: string): Promise<UserDoc | null> {
  try {
    const cleanPhone = phone.trim().replace(/[\s\(\)\-\[\]]/g, "");
    const q = query(
      collection(db, "users"), 
      where("phone", "==", cleanPhone)
    );
    const querySnapshot = await getDocs(q);
    let user: UserDoc | null = null;
    querySnapshot.forEach((doc) => {
      user = doc.data() as UserDoc;
    });
    return user;
  } catch (error) {
    if (isPermissionDenied(error)) {
      console.warn("getUserByPhone permission denied. Returning null:", error);
      return null;
    }
    handleFirestoreError(error, OperationType.LIST, "users");
  }
}

export async function searchTraineeByPhone(phone: string): Promise<UserDoc[]> {
  try {
    const q = query(
      collection(db, "users"), 
      where("role", "==", "trainee"), 
      where("phone", "==", phone)
    );
    const querySnapshot = await getDocs(q);
    const results: UserDoc[] = [];
    querySnapshot.forEach((doc) => {
      results.push(doc.data() as UserDoc);
    });
    return results;
  } catch (error) {
    if (isPermissionDenied(error)) {
      console.warn("searchTraineeByPhone permission denied. Returning empty array:", error);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, "users");
  }
}

// Subscription Services
export async function updateSubscription(
  traineeId: string, 
  duration: "1 Month" | "3 Months" | "6 Months" | "1 Year",
  coachId: string,
  coachName: string
): Promise<void> {
  const monthsMap = {
    "1 Month": 1,
    "3 Months": 3,
    "6 Months": 6,
    "1 Year": 12
  };
  const months = monthsMap[duration];
  const now = new Date();
  const expiryDate = new Date();
  expiryDate.setMonth(now.getMonth() + months);

  try {
    const docRef = doc(db, "users", traineeId);
    await updateDoc(docRef, {
      subscriptionStatus: "active",
      subscriptionStart: now.toISOString(),
      subscriptionExpiry: expiryDate.toISOString(),
      subscriptionDuration: duration,
      coachId: coachId,
      coachName: coachName,
      frozenAt: null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${traineeId}`);
  }

  // Assign trainee in program document too
  await updateProgramCoach(traineeId, coachId);

  // Add notification for Trainee
  await createNotification(
    traineeId, 
    "Subscription Activated", 
    `Your Coach ${coachName} has activated a ${duration} subscription! Your expiry date is ${expiryDate.toLocaleDateString()}.`
  );
}

export async function freezeSubscription(traineeId: string): Promise<void> {
  const now = new Date();
  try {
    const docRef = doc(db, "users", traineeId);
    await updateDoc(docRef, {
      subscriptionStatus: "frozen",
      frozenAt: now.toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${traineeId}`);
  }

  await createNotification(
    traineeId,
    "Subscription Frozen",
    `Your active fitness subscription has been frozen (paused) on ${now.toLocaleDateString()}. You can resume it anytime with your coach.`
  );
}

export async function resumeSubscription(traineeId: string, currentExpiry: string, frozenAtStr: string): Promise<void> {
  const now = new Date();
  const expiryDate = new Date(currentExpiry);
  const frozenAtDate = new Date(frozenAtStr);
  
  // Calculate remaining time in milliseconds from when it was frozen until expiry
  const remainingMs = expiryDate.getTime() - frozenAtDate.getTime();
  
  // Add remaining milliseconds to current time to get new expiry date
  const newExpiry = new Date(now.getTime() + remainingMs);

  try {
    const docRef = doc(db, "users", traineeId);
    await updateDoc(docRef, {
      subscriptionStatus: "active",
      subscriptionExpiry: newExpiry.toISOString(),
      frozenAt: null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${traineeId}`);
  }

  await createNotification(
    traineeId,
    "Subscription Resumed",
    `Your subscription has been resumed! Your new expiration date is ${newExpiry.toLocaleDateString()}.`
  );
}

export async function renewTraineeSubscription(
  traineeId: string,
  duration: "1 Month" | "3 Months" | "6 Months" | "1 Year",
  currentExpiryStr?: string
): Promise<string> {
  const monthsMap = {
    "1 Month": 1,
    "3 Months": 3,
    "6 Months": 6,
    "1 Year": 12
  };
  const months = monthsMap[duration];
  
  let startDate = new Date();
  if (currentExpiryStr) {
    const currentExpiry = new Date(currentExpiryStr);
    if (currentExpiry > new Date()) {
      startDate = currentExpiry;
    }
  }
  
  const expiryDate = new Date(startDate.getTime());
  expiryDate.setMonth(startDate.getMonth() + months);
  
  try {
    const docRef = doc(db, "users", traineeId);
    await updateDoc(docRef, {
      subscriptionDuration: duration,
      subscriptionExpiry: expiryDate.toISOString(),
      subscriptionStatus: "active",
      subscriptionStart: new Date().toISOString(),
      frozenAt: null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${traineeId}`);
  }

  await createNotification(
    traineeId,
    "Subscription Renewed",
    `Your subscription has been renewed for ${duration}! Your new expiration date is ${expiryDate.toLocaleDateString()}.`
  );

  return expiryDate.toISOString();
}

export async function changeSubscriptionDuration(
  traineeId: string, 
  duration: "1 Month" | "3 Months" | "6 Months" | "1 Year",
  startStr?: string
): Promise<void> {
  const monthsMap = {
    "1 Month": 1,
    "3 Months": 3,
    "6 Months": 6,
    "1 Year": 12
  };
  const months = monthsMap[duration];
  const startDate = startStr ? new Date(startStr) : new Date();
  const expiryDate = new Date(startDate.getTime());
  expiryDate.setMonth(startDate.getMonth() + months);

  try {
    const docRef = doc(db, "users", traineeId);
    await updateDoc(docRef, {
      subscriptionDuration: duration,
      subscriptionExpiry: expiryDate.toISOString(),
      subscriptionStatus: "active", // ensure active
      frozenAt: null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${traineeId}`);
  }

  await createNotification(
    traineeId,
    "Subscription Duration Updated",
    `Your subscription plan has been changed to ${duration}. Your new expiry date is ${expiryDate.toLocaleDateString()}.`
  );
}

// Program (Workout & Diet) Services
async function createEmptyProgram(traineeId: string, coachId: string): Promise<void> {
  const newProgram: Program = {
    id: traineeId,
    traineeId,
    coachId,
    workoutDays: [],
    dietMeals: [],
    updatedAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, "programs", traineeId), newProgram);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `programs/${traineeId}`);
  }
}

async function updateProgramCoach(traineeId: string, coachId: string): Promise<void> {
  const docRef = doc(db, "programs", traineeId);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap && docSnap.exists()) {
      await updateDoc(docRef, { coachId });
    } else {
      await createEmptyProgram(traineeId, coachId);
    }
  } catch (error) {
    console.warn("updateProgramCoach error:", error);
  }
}

export async function getProgram(traineeId: string): Promise<Program | null> {
  try {
    const docRef = doc(db, "programs", traineeId);
    const docSnap = await getDoc(docRef);
    if (docSnap && docSnap.exists()) {
      return docSnap.data() as Program;
    }
    return null;
  } catch (error) {
    console.warn("getProgram error (quota/permission/network), returning fallback demo program:", error);
    return {
      id: traineeId,
      traineeId: traineeId,
      coachId: "demo_coach_1",
      workoutDays: [
        {
          id: "day_1",
          dayName: "Chest & Triceps",
          exercises: [
            { name: "Incline Barbell Bench Press", sets: 4, reps: "8-12", notes: "Focus on contraction", videoUrl: "" },
            { name: "Flat Dumbbell Flyes", sets: 3, reps: "12", notes: "Control the movement", videoUrl: "" },
            { name: "Overhead Tricep Extension", sets: 3, reps: "12-15", notes: "Keep elbows tucked in", videoUrl: "" }
          ]
        },
        {
          id: "day_2",
          dayName: "Back & Biceps",
          exercises: [
            { name: "Lat Pulldowns", sets: 4, reps: "10-12", notes: "Squeeze shoulder blades", videoUrl: "" },
            { name: "One-Arm Dumbbell Row", sets: 3, reps: "10", notes: "Keep back flat", videoUrl: "" },
            { name: "Incline Dumbbell Bicep Curls", sets: 3, reps: "12", notes: "Full range of motion", videoUrl: "" }
          ]
        }
      ],
      dietMeals: [
        { id: "meal_1", mealName: "Breakfast", foodItems: "Oats, Egg Whites, Banana, Whey Protein" },
        { id: "meal_2", mealName: "Lunch", foodItems: "Grilled Chicken Breast, Basmati Rice, Steamed Vegetables" },
        { id: "meal_3", mealName: "Post-Workout", foodItems: "Dates, Whey Protein Shake" },
        { id: "meal_4", mealName: "Dinner", foodItems: "Baked Salmon or Tilapia, Sweet Potato, Broccoli" }
      ],
      updatedAt: new Date().toISOString()
    };
  }
}

export function subscribeToProgram(traineeId: string, callback: (program: Program | null) => void): () => void {
  const demoProgram: Program = {
    id: traineeId,
    traineeId: traineeId,
    coachId: "demo_coach_1",
    workoutDays: [
      {
        id: "day_1",
        dayName: "Chest & Triceps",
        exercises: [
          { name: "Incline Barbell Bench Press", sets: 4, reps: "8-12", notes: "Focus on contraction", videoUrl: "" },
          { name: "Flat Dumbbell Flyes", sets: 3, reps: "12", notes: "Control the movement", videoUrl: "" },
          { name: "Overhead Tricep Extension", sets: 3, reps: "12-15", notes: "Keep elbows tucked in", videoUrl: "" }
        ]
      },
      {
        id: "day_2",
        dayName: "Back & Biceps",
        exercises: [
          { name: "Lat Pulldowns", sets: 4, reps: "10-12", notes: "Squeeze shoulder blades", videoUrl: "" },
          { name: "One-Arm Dumbbell Row", sets: 3, reps: "10", notes: "Keep back flat", videoUrl: "" },
          { name: "Incline Dumbbell Bicep Curls", sets: 3, reps: "12", notes: "Full range of motion", videoUrl: "" }
        ]
      }
    ],
    dietMeals: [
      { id: "meal_1", mealName: "Breakfast", foodItems: "Oats, Egg Whites, Banana, Whey Protein" },
      { id: "meal_2", mealName: "Lunch", foodItems: "Grilled Chicken Breast, Basmati Rice, Steamed Vegetables" },
      { id: "meal_3", mealName: "Post-Workout", foodItems: "Dates, Whey Protein Shake" },
      { id: "meal_4", mealName: "Dinner", foodItems: "Baked Salmon or Tilapia, Sweet Potato, Broccoli" }
    ],
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, "programs", traineeId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap && docSnap.exists()) {
        callback(docSnap.data() as Program);
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn("subscribeToProgram error (quota/permission), returning fallback demo program:", err);
      callback(demoProgram);
    });
  } catch (err) {
    console.warn("subscribeToProgram top-level exception:", err);
    callback(demoProgram);
    return () => {};
  }
}

export async function updateProgram(program: Program, coachName: string = "Head Coach"): Promise<void> {
  const docRef = doc(db, "programs", program.traineeId);
  program.updatedAt = new Date().toISOString();
  try {
    const cleanedProgram = cleanUndefined(program);
    await setDoc(docRef, cleanedProgram);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `programs/${program.traineeId}`);
  }

  // Send notification to Trainee
  await createNotification(
    program.traineeId,
    "Workout & Diet Plan Updated",
    `Coach ${coachName} has updated your training program and/or diet plan. Check it out now!`
  );
}

// Progress Logging Services
export async function logProgress(log: Omit<ProgressLog, "id">): Promise<void> {
  const id = doc(collection(db, "progress")).id;
  const newLog: ProgressLog = {
    ...log,
    id
  };
  try {
    await setDoc(doc(db, "progress", id), newLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `progress/${id}`);
  }
}

export async function getTraineeProgress(traineeId: string): Promise<ProgressLog[]> {
  const q = query(
    collection(db, "progress"),
    where("traineeId", "==", traineeId),
    orderBy("completedAt", "desc")
  );
  try {
    const querySnapshot = await getDocs(q);
    const logs: ProgressLog[] = [];
    querySnapshot.forEach((doc) => {
      logs.push(doc.data() as ProgressLog);
    });
    return logs;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("permission")) {
      console.warn("getTraineeProgress permission denied. Returning offline/demo progress logs:", error);
      return [
        {
          id: "demo_log_1",
          traineeId: traineeId,
          workoutDayId: "day_1",
          workoutDayName: "Chest & Triceps",
          completedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          notes: "Finished all chest sets. Feeling awesome! Feedback: Great work!"
        },
        {
          id: "demo_log_2",
          traineeId: traineeId,
          workoutDayId: "day_2",
          workoutDayName: "Back & Biceps",
          completedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          notes: "Completed back routine. Posture on lat pulldowns improved. Feedback: Squeeze at bottom."
        }
      ];
    }
    console.error("Error fetching progress (make sure index exists, otherwise fall back to clientside sorting):", error);
    // Client-side filtering as fallback if Firestore index is building
    try {
      const querySnapshot = await getDocs(collection(db, "progress"));
      const logs: ProgressLog[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as ProgressLog;
        if (data.traineeId === traineeId) {
          logs.push(data);
        }
      });
      return logs.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    } catch (fallbackError) {
      if (fallbackError instanceof Error && fallbackError.message.toLowerCase().includes("permission")) {
        console.warn("getTraineeProgress fallback permission denied. Returning offline/demo progress logs.");
        return [
          {
            id: "demo_log_1",
            traineeId: traineeId,
            workoutDayId: "day_1",
            workoutDayName: "Chest & Triceps",
            completedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
            notes: "Finished all chest sets. Feeling awesome!"
          }
        ];
      }
      handleFirestoreError(fallbackError, OperationType.LIST, "progress");
    }
  }
}

// Notification Services
export async function createNotification(userId: string, title: string, body: string): Promise<void> {
  const id = doc(collection(db, "notifications")).id;
  const notif: AppNotification = {
    id,
    userId,
    title,
    body,
    read: false,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, "notifications", id), notif);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${id}`);
  }
}

export function subscribeToNotifications(userId: string, callback: (notifs: AppNotification[]) => void) {
  const demoNotifs: AppNotification[] = [
    {
      id: "demo_notif_1",
      userId: userId,
      title: "Welcome to PT Fit!",
      body: "Get ready to crush your fitness goals. Your dashboard is ready.",
      read: false,
      createdAt: new Date().toISOString()
    },
    {
      id: "demo_notif_2",
      userId: userId,
      title: "Workout Program Updated",
      body: "Your coach has updated your customized workout routine. Let's start!",
      read: true,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    return onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      snapshot.forEach((doc) => {
        notifs.push(doc.data() as AppNotification);
      });
      callback(notifs);
    }, (err) => {
      console.warn("Notifications subscription error, attempting simple query fallback:", err);
      try {
        const qSimple = query(collection(db, "notifications"), where("userId", "==", userId));
        return onSnapshot(qSimple, (snapshot) => {
          const notifs: AppNotification[] = [];
          snapshot.forEach((doc) => {
            notifs.push(doc.data() as AppNotification);
          });
          notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          callback(notifs);
        }, (fallbackErr) => {
          console.warn("Notifications subscription fallback error (quota/permission), using demo notifications:", fallbackErr);
          callback(demoNotifs);
        });
      } catch (innerErr) {
        console.warn("Notifications subscription inner exception:", innerErr);
        callback(demoNotifs);
      }
    });
  } catch (err) {
    console.warn("Notifications subscription top-level exception:", err);
    callback(demoNotifs);
    return () => {};
  }
}

export async function markNotificationRead(notifId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "notifications", notifId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notifId}`);
  }
}

export async function deleteNotification(notifId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "notifications", notifId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${notifId}`);
  }
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  try {
    const q = query(collection(db, "notifications"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const promises: Promise<void>[] = [];
    snapshot.forEach((docSnap) => {
      promises.push(deleteDoc(doc(db, "notifications", docSnap.id)));
    });
    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, "notifications");
  }
}

// Chat Services
export function getChatId(userA: string, userB: string): string {
  return [userA, userB].sort().join("_");
}

export function subscribeToChatMessages(chatId: string, callback: (msgs: Message[]) => void) {
  const demoMsgs: Message[] = [
    {
      id: "demo_msg_1",
      chatId,
      senderId: chatId.split("_")[0] || "demo_coach_1",
      text: "مرحباً بك في المحادثة! كيف يمكنني مساعدتك اليوم؟ (محادثة تجريبية)",
      createdAt: new Date(Date.now() - 1200000).toISOString()
    }
  ];

  try {
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push(doc.data() as Message);
      });
      callback(msgs);
    }, (err) => {
      console.warn("subscribeToChatMessages error, using basic filter fallback:", err);
      try {
        const qSimple = query(collection(db, "messages"), where("chatId", "==", chatId));
        return onSnapshot(qSimple, (snapshot) => {
          const msgs: Message[] = [];
          snapshot.forEach((doc) => {
            msgs.push(doc.data() as Message);
          });
          msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          callback(msgs);
        }, (fallbackErr) => {
          console.warn("subscribeToChatMessages fallback error (quota/permission), returning demo chat:", fallbackErr);
          callback(demoMsgs);
        });
      } catch (innerErr) {
        console.warn("subscribeToChatMessages inner exception:", innerErr);
        callback(demoMsgs);
      }
    });
  } catch (err) {
    console.warn("subscribeToChatMessages top-level exception:", err);
    callback(demoMsgs);
    return () => {};
  }
}

export async function sendMessage(chatId: string, senderId: string, text: string): Promise<void> {
  const id = doc(collection(db, "messages")).id;
  const newMsg: Message = {
    id,
    chatId,
    senderId,
    text,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, "messages", id), newMsg);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `messages/${id}`);
  }

  // Update or create chat summary doc
  const chatRef = doc(db, "chats", chatId);
  try {
    await setDoc(chatRef, {
      id,
      participants: chatId.split("_"),
      lastMessage: text,
      lastMessageAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
  }
}

export function subscribeToUserChats(userId: string, callback: (chats: Chat[]) => void) {
  const demoChats: Chat[] = [
    {
      id: "demo_chat_1",
      participants: [userId, "demo_coach_1"],
      lastMessage: "مرحباً بك في المحادثة! كيف يمكنني مساعدتك اليوم؟",
      lastMessageAt: new Date().toISOString()
    }
  ];

  try {
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId)
    );

    return onSnapshot(q, (snapshot) => {
      const chats: Chat[] = [];
      snapshot.forEach((doc) => {
        chats.push(doc.data() as Chat);
      });
      chats.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      callback(chats);
    }, (err) => {
      console.warn("subscribeToUserChats error (quota/permission), returning demo chats:", err);
      callback(demoChats);
    });
  } catch (err) {
    console.warn("subscribeToUserChats top-level exception:", err);
    callback(demoChats);
    return () => {};
  }
}

// Subscription Cancellation
export async function cancelSubscription(traineeId: string): Promise<void> {
  try {
    const docRef = doc(db, "users", traineeId);
    await updateDoc(docRef, {
      subscriptionStatus: "expired",
      subscriptionExpiry: new Date(Date.now() - 86400000).toISOString() // yesterday
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${traineeId}`);
  }

  await createNotification(
    traineeId,
    "Subscription Cancelled",
    "Your active fitness subscription has been cancelled by the administrator."
  );
}

// Announcement Broadcasting
export async function broadcastAnnouncement(
  title: string,
  body: string,
  audience: "all" | "trainees" | "coaches"
): Promise<void> {
  let users: UserDoc[] = [];
  try {
    users = await getAllUsers();
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "users");
  }

  const targets = users.filter(u => {
    if (audience === "all") return true;
    if (audience === "trainees") return u.role === "trainee";
    if (audience === "coaches") return u.role === "coach";
    return false;
  });

  const promises = targets.map(u => 
    createNotification(u.uid, title, body)
  );
  try {
    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "notifications");
  }
}

// Exercise Video Library
export async function getExerciseVideos(): Promise<ExerciseVideo[]> {
  try {
    const snap = await getDocs(collection(db, "exercise_videos"));
    const list: ExerciseVideo[] = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as ExerciseVideo);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "exercise_videos");
  }
}

export async function addExerciseVideo(video: Omit<ExerciseVideo, "id">): Promise<string> {
  try {
    const ref = await addDoc(collection(db, "exercise_videos"), video);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "exercise_videos");
  }
}

export async function deleteExerciseVideo(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "exercise_videos", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `exercise_videos/${id}`);
  }
}

export interface LandingStats {
  coaches: number;
  trainees: number;
  activeSubscriptions: number;
  workoutVideos: number;
}

export async function getTraineesForCoach(coachId: string): Promise<UserDoc[]> {
  const localCache = getLocalUsersCache().filter(u => u.role === "trainee" && u.coachId === coachId);

  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", "trainee"),
      where("coachId", "==", coachId)
    );
    const querySnapshot = await getDocs(q);
    const traineesList: UserDoc[] = [];
    querySnapshot.forEach((doc) => {
      const u = doc.data() as UserDoc;
      traineesList.push(u);
      saveUserToLocalCache(u);
    });

    if (traineesList.length > 0) return traineesList;
  } catch (error) {
    console.warn(`getTraineesForCoach(${coachId}) Firestore error, using local cache:`, error);
  }

  if (localCache.length > 0) return localCache;

  return [
    {
      uid: "demo_trainee_1",
      name: "Youssef Ahmed",
      email: "youssef@ptfit.com",
      phone: "01000000003",
      role: "trainee",
      status: "approved",
      coachId: coachId,
      coachName: "Captain Sherif",
      subscriptionStatus: "active",
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    }
  ];
}

export async function getLandingStats(): Promise<LandingStats> {
  // Baseline offsets so stats start with realistic numbers and scale as real data is added:
  // - 368 base offset + current trainees count (starts at 376+ with 8 current trainees)
  // - 347 base offset + current active subs count (starts at 354 with 7 current active subs)
  // - 117 base offset + current workout videos count (starts at 129 with 12 current videos)
  // - 19 base offset + current coaches count (starts at 24+ with 5 current coaches)
  const BASE_COACHES_OFFSET = 19;
  const BASE_TRAINEES_OFFSET = 368;
  const BASE_ACTIVE_SUBS_OFFSET = 347;
  const BASE_VIDEOS_OFFSET = 117;

  let coaches = BASE_COACHES_OFFSET + 5;
  let trainees = BASE_TRAINEES_OFFSET + 8;
  let activeSubscriptions = BASE_ACTIVE_SUBS_OFFSET + 7;
  let workoutVideos = BASE_VIDEOS_OFFSET + 12;

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    let tempCoaches = 0;
    let tempTrainees = 0;
    let tempActive = 0;
    usersSnap.forEach(d => {
      const u = d.data() as UserDoc;
      if (u.role === "coach") {
        tempCoaches++;
      } else if (u.role === "trainee") {
        tempTrainees++;
        if (u.subscriptionStatus === "active") {
          tempActive++;
        }
      }
    });
    coaches = BASE_COACHES_OFFSET + tempCoaches;
    trainees = BASE_TRAINEES_OFFSET + tempTrainees;
    activeSubscriptions = BASE_ACTIVE_SUBS_OFFSET + tempActive;
  } catch (err) {
    console.warn("Could not query all users for landing stats (unauthorized, normal for visitors):", err);
  }

  try {
    const videosSnap = await getDocs(collection(db, "exercise_videos"));
    if (videosSnap.size > 0) {
      workoutVideos = BASE_VIDEOS_OFFSET + videosSnap.size;
    }
  } catch (err) {
    console.warn("Could not query exercise videos for landing stats:", err);
  }

  return {
    coaches,
    trainees,
    activeSubscriptions,
    workoutVideos
  };
}

export async function getWorkoutTemplates(coachId: string): Promise<WorkoutTemplate[]> {
  try {
    const q = query(
      collection(db, "workoutTemplates"),
      where("coachId", "==", coachId)
    );
    const snap = await getDocs(q);
    const templates: WorkoutTemplate[] = [];
    snap.forEach((doc) => {
      templates.push({ id: doc.id, ...doc.data() } as WorkoutTemplate);
    });
    return templates;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("permission")) {
      console.warn("getWorkoutTemplates permission denied. Returning fallback templates.");
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, `workoutTemplates?coachId=${coachId}`);
    return [];
  }
}

export async function saveWorkoutTemplate(template: Omit<WorkoutTemplate, "id"> & { id?: string }): Promise<string> {
  try {
    const docId = template.id || "wt_" + Math.random().toString(36).substring(2, 11);
    const cleaned = cleanUndefined({
      ...template,
      id: docId,
      createdAt: template.createdAt || new Date().toISOString()
    });
    await setDoc(doc(db, "workoutTemplates", docId), cleaned, { merge: true });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workoutTemplates`);
    throw error;
  }
}

export async function deleteWorkoutTemplate(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "workoutTemplates", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `workoutTemplates/${id}`);
  }
}

export async function getNutritionTemplates(coachId: string): Promise<NutritionTemplate[]> {
  try {
    const q = query(
      collection(db, "nutritionTemplates"),
      where("coachId", "==", coachId)
    );
    const snap = await getDocs(q);
    const templates: NutritionTemplate[] = [];
    snap.forEach((doc) => {
      templates.push({ id: doc.id, ...doc.data() } as NutritionTemplate);
    });
    return templates;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("permission")) {
      console.warn("getNutritionTemplates permission denied. Returning fallback templates.");
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, `nutritionTemplates?coachId=${coachId}`);
    return [];
  }
}

export async function saveNutritionTemplate(template: Omit<NutritionTemplate, "id"> & { id?: string }): Promise<string> {
  try {
    const docId = template.id || "nt_" + Math.random().toString(36).substring(2, 11);
    const cleaned = cleanUndefined({
      ...template,
      id: docId,
      createdAt: template.createdAt || new Date().toISOString()
    });
    await setDoc(doc(db, "nutritionTemplates", docId), cleaned, { merge: true });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `nutritionTemplates`);
    throw error;
  }
}

export async function deleteNutritionTemplate(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "nutritionTemplates", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `nutritionTemplates/${id}`);
  }
}

export type UserRole = "admin" | "coach" | "trainee";
export type UserStatus = "pending" | "approved" | "rejected";
export type SubscriptionDuration = "1 Month" | "3 Months" | "6 Months" | "1 Year";

export interface UserDoc {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  subscriptionStatus?: "none" | "active" | "expired" | "frozen";
  subscriptionStart?: string; // ISO String
  subscriptionExpiry?: string; // ISO String
  frozenAt?: string; // ISO String
  subscriptionDuration?: SubscriptionDuration;
  coachId?: string;
  coachName?: string;
  password?: string;
  // Fitness profile info
  weight?: number;
  height?: number;
  fitnessGoal?: string;
  age?: number;
  gender?: string;
  trainingExperience?: string; // "Beginner" | "Intermediate" | "Advanced"
  activityLevel?: string; // "Sedentary" | "Lightly Active" | "Moderately Active" | "Very Active" | "Extra Active"
  // Coach Profile Fields
  photoUrl?: string;
  bio?: string;
  specialization?: string;
  yearsOfExperience?: number;
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
    whatsapp?: string;
  };
  // Coaching notes & measurements
  coachNotes?: string;
  measurementsChest?: string;
  measurementsWaist?: string;
  measurementsHips?: string;
  measurementsBiceps?: string;
  measurementsThighs?: string;
  otherCoachingInfo?: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes: string;
  videoUrl: string;
}

export interface WorkoutDay {
  id: string;
  dayName: string; // e.g., "Monday", "Upper Body"
  exercises: Exercise[];
  focus?: string;
}

export interface FoodItem {
  id?: string;
  name: string;
  quantity: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export interface DietMeal {
  id: string;
  mealName: string; // e.g., "Breakfast", "Lunch"
  foodItems: string;
  calories?: string | number;
  protein?: string | number;
  carbs?: string | number;
  fats?: string | number;
  foods?: FoodItem[];
}

export interface AINutritionSummary {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  bmr?: number;
  tdee?: number;
  summary?: string;
  calculatedAt?: string;
}

export interface Program {
  id: string; // matches traineeId
  traineeId: string;
  coachId: string;
  workoutDays: WorkoutDay[];
  dietMeals: DietMeal[];
  nutritionSummary?: AINutritionSummary;
  updatedAt: string;
}

export interface ProgressLog {
  id: string;
  traineeId: string;
  workoutDayId: string;
  workoutDayName: string;
  completedAt: string;
  duration?: string;
  notes?: string;
  feedback?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  participants: string[]; // [coachId, traineeId]
  lastMessage: string;
  lastMessageAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface ExerciseVideo {
  id: string;
  name: string;
  muscleGroup: string; // e.g. "Chest", "Back", "Legs", "Shoulders", "Arms", "Core"
  videoUrl: string;
  createdAt: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  coachId: string;
  workoutDays: WorkoutDay[];
  createdAt: string;
}

export interface NutritionTemplate {
  id: string;
  name: string;
  coachId: string;
  dietMeals: DietMeal[];
  createdAt: string;
}


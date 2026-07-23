import React, { useState } from "react";
import { 
  NutritionProfileInput, 
  MealPlanResult, 
  MealPlanMeal, 
  FoodItemMeal, 
  calculateMifflinStJeor, 
  generateAINutritionPlan, 
  recalculateFoodItem, 
  recalculateMeal, 
  calculateDailyTotals, 
  getFoodSubstitutes 
} from "../services/aiNutritionService";
import { NUTRITION_DATABASE, FoodItemData, calculateMacrosForGrams } from "../services/nutritionDatabase";
import { 
  Sparkles, Flame, Dumbbell, Activity, Apple, RefreshCw, 
  Check, AlertCircle, Scale, Plus, Trash2, ArrowRightLeft, 
  Save, ChefHat, HeartPulse, DollarSign, Globe, ShieldAlert
} from "lucide-react";
import { Language } from "../utils/translations";

interface AINutritionGeneratorProps {
  initialWeight?: number;
  initialHeight?: number;
  initialAge?: number;
  initialGender?: "male" | "female";
  initialGoal?: string;
  lang?: Language;
  onSavePlanToProgram?: (dietMeals: { id: string; mealName: string; foodItems: string; calories?: string }[]) => Promise<void>;
  isSaving?: boolean;
}

export default function AINutritionGenerator({
  initialWeight = 75,
  initialHeight = 175,
  initialAge = 28,
  initialGender = "male",
  initialGoal = "muscle_gain",
  lang = "ar",
  onSavePlanToProgram,
  isSaving = false
}: AINutritionGeneratorProps) {
  const isAr = lang === "ar";

  // --- INPUT FORM STATE ---
  const [profile, setProfile] = useState<NutritionProfileInput>({
    age: initialAge,
    gender: initialGender,
    heightCm: initialHeight,
    weightKg: initialWeight,
    bodyFatPercent: undefined,
    activityLevel: "moderate",
    goal: (initialGoal === "Fat Loss" ? "fat_loss" : initialGoal === "Maintenance" ? "maintenance" : "muscle_gain"),
    mealsPerDay: 4,
    budget: "moderate",
    cuisinePreference: "Egyptian",
    allergies: [],
    medicalRestrictions: [],
    customNotes: ""
  });

  // --- UI GENERATION STATE ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlanResult | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- FOOD REPLACEMENT MODAL STATE ---
  const [replacementModal, setReplacementModal] = useState<{
    mealIndex: number;
    foodIndex: number;
    targetFood: FoodItemMeal;
  } | null>(null);

  // --- ADD CUSTOM FOOD MODAL STATE ---
  const [addFoodMealIndex, setAddFoodMealIndex] = useState<number | null>(null);
  const [selectedDbFoodId, setSelectedDbFoodId] = useState<string>(NUTRITION_DATABASE[0].id);
  const [addFoodGrams, setAddFoodGrams] = useState<number>(150);

  // Live Mifflin-St Jeor Preview
  const liveStats = calculateMifflinStJeor(profile);

  // Handle Form Inputs
  const handleInputChange = (field: keyof NutritionProfileInput, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleArray = (field: "allergies" | "medicalRestrictions", item: string) => {
    setProfile(prev => {
      const current = prev[field];
      const exists = current.includes(item);
      return {
        ...prev,
        [field]: exists ? current.filter(x => x !== item) : [...current, item]
      };
    });
  };

  // Generate Plan Action
  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setSaveSuccess(false);
    try {
      const result = await generateAINutritionPlan(profile);
      setMealPlan(result);
    } catch (err) {
      console.error("Failed to generate plan:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- INSTANT EDITING HANDLERS ---
  const handleQuantityChange = (mealIdx: number, foodIdx: number, newGrams: number) => {
    if (!mealPlan) return;
    const safeGrams = Math.max(10, newGrams);

    const updatedMeals = [...mealPlan.meals];
    const targetMeal = { ...updatedMeals[mealIdx] };
    const targetFoods = [...targetMeal.foods];

    targetFoods[foodIdx] = recalculateFoodItem(targetFoods[foodIdx], safeGrams);
    targetMeal.foods = targetFoods;

    updatedMeals[mealIdx] = recalculateMeal(targetMeal);
    const newDailyTotals = calculateDailyTotals(updatedMeals);

    setMealPlan({
      ...mealPlan,
      meals: updatedMeals,
      dailyTotals: newDailyTotals
    });
  };

  const handleDeleteFood = (mealIdx: number, foodIdx: number) => {
    if (!mealPlan) return;
    const updatedMeals = [...mealPlan.meals];
    const targetMeal = { ...updatedMeals[mealIdx] };

    targetMeal.foods = targetMeal.foods.filter((_, idx) => idx !== foodIdx);
    updatedMeals[mealIdx] = recalculateMeal(targetMeal);
    const newDailyTotals = calculateDailyTotals(updatedMeals);

    setMealPlan({
      ...mealPlan,
      meals: updatedMeals,
      dailyTotals: newDailyTotals
    });
  };

  const handleReplaceFood = (replacementDbFood: FoodItemData) => {
    if (!mealPlan || !replacementModal) return;
    const { mealIndex, foodIndex, targetFood } = replacementModal;

    const grams = targetFood.quantityGrams;
    const macros = calculateMacrosForGrams(replacementDbFood, grams);

    const newFoodItem: FoodItemMeal = {
      id: replacementDbFood.id,
      nameEn: replacementDbFood.nameEn,
      nameAr: replacementDbFood.nameAr,
      quantityGrams: grams,
      calories: macros.calories,
      proteinGrams: macros.protein,
      carbsGrams: macros.carbs,
      fatGrams: macros.fat
    };

    const updatedMeals = [...mealPlan.meals];
    const targetMeal = { ...updatedMeals[mealIndex] };
    const targetFoods = [...targetMeal.foods];

    targetFoods[foodIndex] = newFoodItem;
    targetMeal.foods = targetFoods;

    updatedMeals[mealIndex] = recalculateMeal(targetMeal);
    const newDailyTotals = calculateDailyTotals(updatedMeals);

    setMealPlan({
      ...mealPlan,
      meals: updatedMeals,
      dailyTotals: newDailyTotals
    });

    setReplacementModal(null);
  };

  const handleAddFoodToMeal = () => {
    if (!mealPlan || addFoodMealIndex === null) return;
    const dbFood = NUTRITION_DATABASE.find(x => x.id === selectedDbFoodId) || NUTRITION_DATABASE[0];
    const macros = calculateMacrosForGrams(dbFood, addFoodGrams);

    const newFood: FoodItemMeal = {
      id: `${dbFood.id}_${Date.now()}`,
      nameEn: dbFood.nameEn,
      nameAr: dbFood.nameAr,
      quantityGrams: addFoodGrams,
      calories: macros.calories,
      proteinGrams: macros.protein,
      carbsGrams: macros.carbs,
      fatGrams: macros.fat
    };

    const updatedMeals = [...mealPlan.meals];
    const targetMeal = { ...updatedMeals[addFoodMealIndex] };
    targetMeal.foods = [...targetMeal.foods, newFood];

    updatedMeals[addFoodMealIndex] = recalculateMeal(targetMeal);
    const newDailyTotals = calculateDailyTotals(updatedMeals);

    setMealPlan({
      ...mealPlan,
      meals: updatedMeals,
      dailyTotals: newDailyTotals
    });

    setAddFoodMealIndex(null);
  };

  // Convert Meal Plan to standard PT Fit DietMeals array for saving
  const handleSaveToProgram = async () => {
    if (!mealPlan || !onSavePlanToProgram) return;

    const dietMealsPayload = mealPlan.meals.map(m => {
      const itemsList = m.foods
        .map(f => `• ${isAr ? f.nameAr : f.nameEn}: ${f.quantityGrams}g (${f.calories} kcal | P:${f.proteinGrams}g, C:${f.carbsGrams}g, F:${f.fatGrams}g)`)
        .join("\n");

      return {
        id: m.id || `meal_${Date.now()}_${m.mealNumber}`,
        mealName: isAr ? m.mealNameAr : m.mealNameEn,
        foodItems: itemsList,
        calories: `${m.totalCalories} kcal (P: ${m.totalProtein}g, C: ${m.totalCarbs}g, F: ${m.totalFat}g)`
      };
    });

    try {
      await onSavePlanToProgram(dietMealsPayload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to save nutrition plan to program:", err);
    }
  };

  return (
    <div className="w-full space-y-8 text-slate-800 dark:text-slate-100">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-100 border border-white/20">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>{isAr ? "نظام أخصائي التغذية الرياضية الذكي" : "AI Sports Nutrition System"}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isAr ? "مولد الأنظمة الغذائية الاحترافية بالمكافئات" : "Professional Sports Nutrition & Meal Generator"}
            </h2>
            <p className="text-emerald-100 text-sm sm:text-base max-w-2xl leading-relaxed">
              {isAr 
                ? "حساب دقيق للمتابعة الرياضية باستخدام معادلة Mifflin-St Jeor وتوزيع السعرات الحرارية والماكروز على وجبات اليوم مع إمكانية التعديل والاستبدال الفوري للأطعمة المصرية والعالمية."
                : "Scientific meal planning based on Mifflin-St Jeor TDEE calculations, customizable macros, and instant food replacement for Egyptian & international diets."}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center min-w-[200px]">
            <div className="text-xs font-medium text-emerald-200 uppercase tracking-wider">{isAr ? "الهدف اليومي المستهدف" : "Target Daily TDEE"}</div>
            <div className="text-3xl font-black text-amber-300 my-1">{liveStats.targetCalories} <span className="text-sm font-semibold text-white">kcal</span></div>
            <div className="flex justify-center items-center gap-3 text-xs text-emerald-100 mt-2 border-t border-white/10 pt-2">
              <span>P: {liveStats.targetProtein}g</span>
              <span>C: {liveStats.targetCarbs}g</span>
              <span>F: {liveStats.targetFat}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* INPUT FORM & LIVE PREVIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INPUT FORM (2 COLUMNS) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{isAr ? "1. البيانات الجسدية والنشاط الرياضي" : "1. Physical Profile & Activity"}</h3>
              <p className="text-xs text-slate-500">{isAr ? "أدخل البيانات الدقيقة لحساب الاحتياج الحقيقي" : "Enter accurate stats for scientific Mifflin-St Jeor calculations"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Age */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "العمر (سنة)" : "Age (years)"}</label>
              <input 
                type="number" 
                value={profile.age} 
                onChange={e => handleInputChange("age", parseInt(e.target.value) || 20)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "النوع" : "Gender"}</label>
              <select 
                value={profile.gender}
                onChange={e => handleInputChange("gender", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="male">{isAr ? "ذكر" : "Male"}</option>
                <option value="female">{isAr ? "أنثى" : "Female"}</option>
              </select>
            </div>

            {/* Height */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "الطول (سم)" : "Height (cm)"}</label>
              <input 
                type="number" 
                value={profile.heightCm} 
                onChange={e => handleInputChange("heightCm", parseInt(e.target.value) || 170)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "الوزن (كجم)" : "Weight (kg)"}</label>
              <input 
                type="number" 
                value={profile.weightKg} 
                onChange={e => handleInputChange("weightKg", parseFloat(e.target.value) || 70)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Goal */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "الهدف الرياضي" : "Fitness Goal"}</label>
              <select 
                value={profile.goal}
                onChange={e => handleInputChange("goal", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="muscle_gain">{isAr ? "زيادة كتلة عضلية (Muscle Gain)" : "Muscle Gain"}</option>
                <option value="fat_loss">{isAr ? "خسارة دهون وتنشيف (Fat Loss)" : "Fat Loss"}</option>
                <option value="maintenance">{isAr ? "محافظة على الوزن (Maintenance)" : "Maintenance"}</option>
              </select>
            </div>

            {/* Activity Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "مستوى النشاط" : "Activity Level"}</label>
              <select 
                value={profile.activityLevel}
                onChange={e => handleInputChange("activityLevel", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="sedentary">{isAr ? "خامل (مكتب بدون تمرين)" : "Sedentary (No Exercise)"}</option>
                <option value="light">{isAr ? "نشاط خفيف (تمرين 1-3 أيام)" : "Lightly Active (1-3 days/wk)"}</option>
                <option value="moderate">{isAr ? "نشاط متوسط (تمرين 3-5 أيام)" : "Moderately Active (3-5 days/wk)"}</option>
                <option value="active">{isAr ? "نشاط عالٍ (تمرين 6-7 أيام)" : "Very Active (6-7 days/wk)"}</option>
                <option value="extra_active">{isAr ? "نشاط شاق جدًا (رياضي محترف)" : "Extra Active (Athlete)"}</option>
              </select>
            </div>

            {/* Meals Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "عدد الوجبات اليومية" : "Meals Per Day"}</label>
              <select 
                value={profile.mealsPerDay}
                onChange={e => handleInputChange("mealsPerDay", parseInt(e.target.value) || 4)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={3}>3 {isAr ? "وجبات رئيسية" : "Meals"}</option>
                <option value={4}>4 {isAr ? "وجبات (شامل السناك)" : "Meals (incl. snack)"}</option>
                <option value={5}>5 {isAr ? "وجبات مقسمة" : "Meals"}</option>
                <option value={6}>6 {isAr ? "وجبات رياضية" : "Meals"}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 pt-2">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/50 text-amber-600 rounded-xl">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{isAr ? "2. التفضيلات المطبخية والقيود الصحية" : "2. Dietary & Culinary Preferences"}</h3>
              <p className="text-xs text-slate-500">{isAr ? "تخصيص المطبخ والميزانية والحساسية" : "Cuisine style, budget, and medical conditions"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cuisine Preference */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "نوع المطبخ المفضل" : "Cuisine Preference"}</label>
              <select 
                value={profile.cuisinePreference}
                onChange={e => handleInputChange("cuisinePreference", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Egyptian">{isAr ? "مطبخ مصري (جبنة قريش، فول، بلطي، ملوخية)" : "Egyptian Local Foods"}</option>
                <option value="Arabic">{isAr ? "مطبخ عربي شرقي (طحينة، حمص، تمر)" : "Arabic Middle Eastern Foods"}</option>
                <option value="International">{isAr ? "مطبخ عالمي (أرز بسمتي، سلمون، شوفان)" : "International Fitness Foods"}</option>
                <option value="Mixed">{isAr ? "تشكيلة متنوعة (Mixed)" : "Mixed Options"}</option>
              </select>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "الميزانية المتاحة" : "Budget Level"}</label>
              <select 
                value={profile.budget}
                onChange={e => handleInputChange("budget", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="low">{isAr ? "اقتصادية (Low - أطعمة محلية متاحة)" : "Budget-friendly (Economic)"}</option>
                <option value="moderate">{isAr ? "متوسطة (Moderate)" : "Moderate Budget"}</option>
                <option value="high">{isAr ? "مرتفعة (High/Premium - بروتين آيزوليت وسلمون)" : "Premium / High Budget"}</option>
              </select>
            </div>
          </div>

          {/* Allergies & Restrictions */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">{isAr ? "الحساسية والقيود الصحية (حدد ما ينطبق)" : "Allergies & Medical Restrictions"}</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "Lactose", label: isAr ? "حساسية اللاكتوز (Lactose)" : "Lactose Intolerant" },
                { id: "Nuts", label: isAr ? "حساسية المكسرات (Nuts)" : "Nut Allergy" },
                { id: "Gluten", label: isAr ? "حساسية الجلوتين (Gluten)" : "Gluten Sensitivity" },
                { id: "Eggs", label: isAr ? "حساسية البيض (Eggs)" : "Egg Allergy" },
                { id: "Diabetes", label: isAr ? "مرض السكري (Diabetes)" : "Diabetes Friendly" },
                { id: "Hypertension", label: isAr ? "ضغط الدم (Hypertension)" : "Low Sodium / Hypertension" },
              ].map(tag => {
                const isSelected = profile.allergies.includes(tag.id) || profile.medicalRestrictions.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleArray("allergies", tag.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected 
                        ? "bg-emerald-600 text-white shadow-sm" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-base rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{isAr ? "جاري توليد النظام الغذائي الرياضي الذكي..." : "Generating Sports Nutrition Plan..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>{isAr ? "توليد نظام التغذية الرياضي بالذكاء الاصطناعي" : "Generate Professional AI Nutrition Plan"}</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* SCIENTIFIC METRICS SUMMARY PANEL (1 COLUMN) */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">{isAr ? "الحسابات العلمية المباشرة" : "Scientific Caloric Breakdown"}</h3>
                <p className="text-xs text-slate-400">{isAr ? "معادلة Mifflin-St Jeor" : "Mifflin-St Jeor Formula"}</p>
              </div>
            </div>

            {/* BMR & TDEE CARDS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 text-center">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{isAr ? "الأيض الأساسي BMR" : "Base BMR"}</div>
                <div className="text-xl font-black text-emerald-400">{liveStats.bmr}</div>
                <div className="text-[10px] text-slate-400 mt-1">{isAr ? "سعرة للحفاظ على الحياة" : "kcal / day baseline"}</div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 text-center">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{isAr ? "الحرق اليومي TDEE" : "Total TDEE"}</div>
                <div className="text-xl font-black text-cyan-400">{liveStats.tdee}</div>
                <div className="text-[10px] text-slate-400 mt-1">{isAr ? "سعرة مع النشاط" : "kcal with activity"}</div>
              </div>
            </div>

            {/* MACROS TARGET BREAKDOWN */}
            <div className="space-y-3 bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-bold text-slate-300 border-b border-slate-700/50 pb-2">
                {isAr ? "توزيع الماكروز المستهدفة" : "Daily Macro Targets Allocation"}
              </div>

              {/* Protein */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Dumbbell className="w-3.5 h-3.5" />
                    {isAr ? "البروتين اليومي" : "Protein Target"}
                  </span>
                  <span className="text-white font-bold">{liveStats.targetProtein}g <span className="text-slate-400 text-[10px]">({liveStats.targetProtein * 4} kcal)</span></span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: "35%" }}></div>
                </div>
              </div>

              {/* Carbs */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-amber-400 flex items-center gap-1">
                    <Apple className="w-3.5 h-3.5" />
                    {isAr ? "الكربوهيدرات" : "Carbohydrates"}
                  </span>
                  <span className="text-white font-bold">{liveStats.targetCarbs}g <span className="text-slate-400 text-[10px]">({liveStats.targetCarbs * 4} kcal)</span></span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: "45%" }}></div>
                </div>
              </div>

              {/* Fat */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-rose-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    {isAr ? "الدهون الصحية" : "Healthy Fats"}
                  </span>
                  <span className="text-white font-bold">{liveStats.targetFat}g <span className="text-slate-400 text-[10px]">({liveStats.targetFat * 9} kcal)</span></span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: "20%" }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <p className="leading-relaxed">
              {isAr 
                ? "قاعدة بيانات معتمدة موثوقة: لا يتم استخدام قيم عشوائية. جميع العناصر محسوبة بالجرام الصافي."
                : "Verified nutrition database: No hallucinated values. All macros calibrated to net weight in grams."}
            </p>
          </div>
        </div>

      </div>

      {/* GENERATED MEAL PLAN DISPLAY */}
      {mealPlan && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-8 animate-fadeIn">
          
          {/* PLAN HEADER & ACTIONS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold mb-2">
                <Check className="w-3.5 h-3.5" />
                <span>{isAr ? "تم توليد النظام الغذائي الرياضي بنجاح" : "Sports Nutrition Plan Ready"}</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {isAr ? "جدول الوجبات اليومي والمكافئات المتاحة" : "Daily Meal Schedule & Macro Equivalents"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isAr ? "يمكنك تعديل أي كمية أو استبدال أي صنف بطعام مكافئ فوراً دون إخلال ببيانات الماكروز" : "Adjust quantities or swap foods with equivalent macro substitutes instantly"}
              </p>
            </div>

            {onSavePlanToProgram && (
              <button
                type="button"
                onClick={handleSaveToProgram}
                disabled={isSaving}
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>{isAr ? "تم حفظ النظام بالبرنامج التدريبي!" : "Saved to Program!"}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isAr ? "اعتماد وحفظ بالبرنامج التدريبي للرابط" : "Save Plan to Trainee Program"}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* NUTRITIONIST NOTES */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900 dark:text-emerald-200 space-y-1">
              <span className="font-bold block">{isAr ? "توصيات أخصائي التغذية الرياضية:" : "Sports Nutritionist Recommendation:"}</span>
              <p className="leading-relaxed">{isAr ? mealPlan.nutritionistNotesAr : mealPlan.nutritionistNotesEn}</p>
            </div>
          </div>

          {/* TOTALS SUMMARY STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-center p-2">
              <span className="text-xs font-semibold text-slate-500 block mb-1">{isAr ? "إجمالي السعرات الحرارية" : "Total Calories"}</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{mealPlan.dailyTotals.totalCalories} <span className="text-xs text-slate-400">kcal</span></span>
            </div>

            <div className="text-center p-2 border-r border-l border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-500 block mb-1">{isAr ? "إجمالي البروتين" : "Total Protein"}</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{mealPlan.dailyTotals.totalProtein}g</span>
            </div>

            <div className="text-center p-2 border-r border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-500 block mb-1">{isAr ? "إجمالي الكربوهيدرات" : "Total Carbs"}</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{mealPlan.dailyTotals.totalCarbs}g</span>
            </div>

            <div className="text-center p-2">
              <span className="text-xs font-semibold text-slate-500 block mb-1">{isAr ? "إجمالي الدهون" : "Total Fat"}</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{mealPlan.dailyTotals.totalFat}g</span>
            </div>
          </div>

          {/* MEALS LIST CARDS */}
          <div className="space-y-6">
            {mealPlan.meals.map((meal, mealIdx) => (
              <div 
                key={meal.id || mealIdx} 
                className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 hover:border-emerald-500/30 transition-all"
              >
                {/* MEAL HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-600/20">
                      {meal.mealNumber}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                        {isAr ? meal.mealNameAr : meal.mealNameEn}
                      </h4>
                      <span className="text-xs text-slate-500">
                        {meal.foods.length} {isAr ? "أصناف غذائية" : "food items"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                    <span className="text-amber-500">{meal.totalCalories} kcal</span>
                    <span>•</span>
                    <span className="text-emerald-600">P: {meal.totalProtein}g</span>
                    <span>•</span>
                    <span className="text-amber-600">C: {meal.totalCarbs}g</span>
                    <span>•</span>
                    <span className="text-rose-600">F: {meal.totalFat}g</span>
                  </div>
                </div>

                {/* FOODS TABLE */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-2 px-3 text-right">{isAr ? "الصنف الغذائي" : "Food Item"}</th>
                        <th className="py-2 px-3 text-center">{isAr ? "الكمية (جرام)" : "Quantity (g)"}</th>
                        <th className="py-2 px-3 text-center">{isAr ? "السعرات" : "Calories"}</th>
                        <th className="py-2 px-3 text-center">{isAr ? "بروتين" : "Protein"}</th>
                        <th className="py-2 px-3 text-center">{isAr ? "كارب" : "Carbs"}</th>
                        <th className="py-2 px-3 text-center">{isAr ? "دهون" : "Fat"}</th>
                        <th className="py-2 px-3 text-center">{isAr ? "إجراءات" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                      {meal.foods.map((food, foodIdx) => (
                        <tr key={food.id || foodIdx} className="hover:bg-white/60 dark:hover:bg-slate-800/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                            {isAr ? food.nameAr : food.nameEn}
                          </td>

                          {/* QUANTITY ADJUSTMENT */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(mealIdx, foodIdx, food.quantityGrams - 10)}
                                className="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded font-bold text-slate-700 dark:text-slate-200"
                              >
                                -
                              </button>
                              <input 
                                type="number"
                                value={food.quantityGrams}
                                onChange={e => handleQuantityChange(mealIdx, foodIdx, parseInt(e.target.value) || 0)}
                                className="w-14 text-center font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(mealIdx, foodIdx, food.quantityGrams + 10)}
                                className="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded font-bold text-slate-700 dark:text-slate-200"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center font-bold text-amber-600 dark:text-amber-400">
                            {food.calories} kcal
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                            {food.proteinGrams}g
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                            {food.carbsGrams}g
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-rose-600 dark:text-rose-400">
                            {food.fatGrams}g
                          </td>

                          {/* ACTIONS */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setReplacementModal({ mealIndex: mealIdx, foodIndex: foodIdx, targetFood: food })}
                                className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                                title={isAr ? "استبدال بصنف مكافئ" : "Replace with Macro Substitute"}
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>{isAr ? "استبدال" : "Swap"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteFood(mealIdx, foodIdx)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                                title={isAr ? "حذف الصنف" : "Delete Item"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ADD FOOD BUTTON FOR THIS MEAL */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAddFoodMealIndex(mealIdx)}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAr ? "إضافة صنف طعام لهذه الوجبة" : "Add Food Item"}</span>
                  </button>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* FOOD REPLACEMENT MODAL */}
      {replacementModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold">
                <ArrowRightLeft className="w-5 h-5" />
                <span>{isAr ? "مكافئات الأطعمة والمابدلات المقترحة" : "Food Macro Substitutes"}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setReplacementModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs space-y-1">
              <span className="text-slate-500 font-semibold">{isAr ? "الصنف المراد استبداله:" : "Replacing Food:"}</span>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {isAr ? replacementModal.targetFood.nameAr : replacementModal.targetFood.nameEn} ({replacementModal.targetFood.quantityGrams}g)
              </div>
              <div className="text-emerald-600 dark:text-emerald-400">
                {replacementModal.targetFood.calories} kcal | P: {replacementModal.targetFood.proteinGrams}g | C: {replacementModal.targetFood.carbsGrams}g | F: {replacementModal.targetFood.fatGrams}g
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {isAr ? "اختر أحد البدائل المعتمدة بالمكافأة الحسابية:" : "Select an Equivalent Macro Substitute:"}
              </span>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {getFoodSubstitutes(replacementModal.targetFood.id).map(sub => {
                  const subMacros = calculateMacrosForGrams(sub, replacementModal.targetFood.quantityGrams);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleReplaceFood(sub)}
                      className="w-full text-right p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {isAr ? sub.nameAr : sub.nameEn}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {sub.category} • {sub.cuisine}
                        </div>
                      </div>

                      <div className="text-left text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <div>{subMacros.calories} kcal</div>
                        <div className="text-[10px] text-slate-400 font-normal">P:{subMacros.protein}g | C:{subMacros.carbs}g | F:{subMacros.fat}g</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setReplacementModal(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD FOOD ITEM MODAL */}
      {addFoodMealIndex !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {isAr ? "إضافة صنف طعام من قاعدة البيانات" : "Add Food Item from Database"}
              </h4>
              <button type="button" onClick={() => setAddFoodMealIndex(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "اختر الصنف الغذائي" : "Select Food Item"}</label>
                <select
                  value={selectedDbFoodId}
                  onChange={e => setSelectedDbFoodId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  {NUTRITION_DATABASE.map(item => (
                    <option key={item.id} value={item.id}>
                      {isAr ? item.nameAr : item.nameEn} ({item.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "الكمية بالجرام" : "Quantity in Grams"}</label>
                <input
                  type="number"
                  value={addFoodGrams}
                  onChange={e => setAddFoodGrams(parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddFoodMealIndex(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleAddFoodToMeal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow"
              >
                {isAr ? "إضافة للوجبة" : "Add to Meal"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

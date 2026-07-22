import React, { useState, useEffect } from "react";
import { UserDoc, DietMeal, FoodItem, AINutritionSummary } from "../types";
import { Sparkles, Calculator, Utensils, Plus, Trash2, Save, X, RefreshCw, CheckCircle2, ChevronRight, Edit3, AlertCircle, Database } from "lucide-react";
import { Language } from "../utils/translations";
import { FOOD_DATABASE, FoodDatabaseItem } from "../constants/foodDatabase";

interface AINutritionModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: UserDoc | null;
  lang: Language;
  onSaveNutritionPlan: (dietMeals: DietMeal[], summary: AINutritionSummary) => Promise<void>;
  existingSummary?: AINutritionSummary;
  existingMeals?: DietMeal[];
}

export default function AINutritionModal({
  isOpen,
  onClose,
  client,
  lang,
  onSaveNutritionPlan,
  existingSummary,
  existingMeals
}: AINutritionModalProps) {
  // Biometrics State
  const [height, setHeight] = useState<string>("175");
  const [weight, setWeight] = useState<string>("75");
  const [age, setAge] = useState<string>("25");
  const [gender, setGender] = useState<string>("Male");
  const [goal, setGoal] = useState<string>("Bulking");
  const [activityLevel, setActivityLevel] = useState<string>("Moderately Active");
  const [dietaryPreferences, setDietaryPreferences] = useState<string>("");

  // AI Generation & Editor States
  const [loading, setLoading] = useState<boolean>(false);
  const [regeneratingMealIndex, setRegeneratingMealIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Generated Plan Data State
  const [dailyCalories, setDailyCalories] = useState<number>(2500);
  const [proteinGrams, setProteinGrams] = useState<number>(160);
  const [carbsGrams, setCarbsGrams] = useState<number>(280);
  const [fatsGrams, setFatsGrams] = useState<number>(70);
  const [bmr, setBmr] = useState<number | undefined>(undefined);
  const [tdee, setTdee] = useState<number | undefined>(undefined);
  const [summaryNote, setSummaryNote] = useState<string>("");

  const [meals, setMeals] = useState<DietMeal[]>([]);
  const [isEditingSummary, setIsEditingSummary] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<"biometrics" | "plan">("biometrics");

  // Sync state when modal opens or client changes
  useEffect(() => {
    if (client) {
      if (client.height) setHeight(client.height.toString());
      if (client.weight) setWeight(client.weight.toString());
      if (client.age) setAge(client.age.toString());
      if (client.gender) setGender(client.gender);
      if (client.fitnessGoal) setGoal(client.fitnessGoal);
      if (client.activityLevel) setActivityLevel(client.activityLevel);
    }

    if (existingSummary) {
      setDailyCalories(existingSummary.dailyCalories || 2500);
      setProteinGrams(existingSummary.proteinGrams || 160);
      setCarbsGrams(existingSummary.carbsGrams || 280);
      setFatsGrams(existingSummary.fatsGrams || 70);
      setBmr(existingSummary.bmr);
      setTdee(existingSummary.tdee);
      setSummaryNote(existingSummary.summary || "");
    }

    if (existingMeals && existingMeals.length > 0) {
      setMeals(existingMeals);
      setActiveStep("plan");
    } else {
      setActiveStep("biometrics");
    }
  }, [client, existingSummary, existingMeals, isOpen]);

  if (!isOpen) return null;

  const isArabic = lang === "ar";

  const handleGeneratePlan = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const numHeight = parseFloat(height);
    const numWeight = parseFloat(weight);
    const numAge = parseInt(age);

    if (!numHeight || !numWeight || !numAge) {
      setError(isArabic ? "يرجى تقديم بيانات متكاملة للطول والوزن والعمر" : "Please fill in valid height, weight, and age.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/ai/nutrition-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          height: numHeight,
          weight: numWeight,
          age: numAge,
          gender: gender,
          goal: goal,
          activityLevel: activityLevel,
          dietaryPreferences: dietaryPreferences,
          lang: lang
        })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Failed to generate AI nutrition plan");
      }

      const plan = resData.data;
      setDailyCalories(plan.dailyCalories);
      setProteinGrams(plan.proteinGrams);
      setCarbsGrams(plan.carbsGrams);
      setFatsGrams(plan.fatsGrams);
      setBmr(plan.bmr);
      setTdee(plan.tdee);
      setSummaryNote(plan.summary || "");

      // Format meals
      const formattedMeals: DietMeal[] = (plan.meals || []).map((m: any, idx: number) => ({
        id: m.id || `meal_${Date.now()}_${idx}`,
        mealName: m.mealName || `Meal ${idx + 1}`,
        foodItems: m.foodItems || (m.foods || []).map((f: any) => `${f.quantity} ${f.name}`).join("\n"),
        calories: m.calories || 0,
        protein: m.protein || 0,
        carbs: m.carbs || 0,
        fats: m.fats || 0,
        foods: (m.foods || []).map((f: any, fIdx: number) => ({
          id: `food_${Date.now()}_${fIdx}`,
          name: f.name,
          quantity: f.quantity,
          calories: f.calories || 0,
          protein: f.protein || 0,
          carbs: f.carbs || 0,
          fats: f.fats || 0
        }))
      }));

      setMeals(formattedMeals);
      setActiveStep("plan");
      setSuccessMsg(isArabic ? "تم توليد الخطة الغذائية بالذكاء الاصطناعي بنجاح!" : "AI Meal plan generated successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || (isArabic ? "حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي" : "Error connecting to AI service"));
    } finally {
      setLoading(false);
    }
  };

  // Regenerate a single meal instantly via AI
  const handleRegenerateSingleMeal = async (mIdx: number) => {
    const targetMeal = meals[mIdx];
    if (!targetMeal) return;

    setRegeneratingMealIndex(mIdx);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch("/api/ai/single-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealName: targetMeal.mealName,
          targetCalories: Number(targetMeal.calories) || Math.round(dailyCalories / (meals.length || 4)),
          targetProtein: Number(targetMeal.protein) || Math.round(proteinGrams / (meals.length || 4)),
          targetCarbs: Number(targetMeal.carbs) || Math.round(carbsGrams / (meals.length || 4)),
          targetFats: Number(targetMeal.fats) || Math.round(fatsGrams / (meals.length || 4)),
          goal: goal,
          dietaryPreferences: dietaryPreferences,
          lang: lang
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success || !resData.meal) {
        throw new Error(resData.error || "Failed to regenerate single meal");
      }

      const newMeal: DietMeal = resData.meal;
      setMeals(prev => prev.map((m, idx) => idx === mIdx ? newMeal : m));
      setSuccessMsg(isArabic ? `تم إعادة توليد وجبة (${newMeal.mealName}) بنجاح!` : `Regenerated ${newMeal.mealName} successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error("Error regenerating meal:", err);
      setError(err.message || (isArabic ? "فشل إعادة توليد الوجبة" : "Failed to regenerate meal"));
    } finally {
      setRegeneratingMealIndex(null);
    }
  };

  // Select food from built-in Food Database and calculate macros based on portion
  const handleSelectDatabaseItemToFood = (mealIndex: number, foodIndex: number, dbItemId: string) => {
    const dbItem = FOOD_DATABASE.find(f => f.id === dbItemId);
    if (!dbItem) return;

    setMeals(prev => prev.map((meal, idx) => {
      if (idx !== mealIndex) return meal;
      const updatedFoods = [...(meal.foods || [])];
      
      const foodName = isArabic ? dbItem.nameAr : dbItem.nameEn;
      const defaultQtyStr = dbItem.servingGrams ? `${dbItem.servingGrams}g` : dbItem.servingUnitEn;

      updatedFoods[foodIndex] = {
        ...updatedFoods[foodIndex],
        name: foodName,
        quantity: defaultQtyStr,
        calories: dbItem.calories,
        protein: dbItem.protein,
        carbs: dbItem.carbs,
        fats: dbItem.fats
      };

      const updatedMeal = { ...meal, foods: updatedFoods };
      updatedMeal.foodItems = syncMealFoodItemsText(updatedMeal);
      return updatedMeal;
    }));
  };

  // Helper to sync meal summary text from structured foods array
  const syncMealFoodItemsText = (meal: DietMeal): string => {
    if (!meal.foods || meal.foods.length === 0) return meal.foodItems || "";
    return meal.foods
      .map(f => `• ${f.quantity} - ${f.name} (${f.calories || 0} kcal | P: ${f.protein || 0}g, C: ${f.carbs || 0}g, F: ${f.fats || 0}g)`)
      .join("\n");
  };

  // Recalculate Meal Totals from food items
  const handleRecalculateMealFromFoods = (mealIndex: number) => {
    setMeals(prev => prev.map((meal, idx) => {
      if (idx !== mealIndex) return meal;
      if (!meal.foods || meal.foods.length === 0) return meal;

      const totalCals = meal.foods.reduce((acc, f) => acc + (Number(f.calories) || 0), 0);
      const totalP = meal.foods.reduce((acc, f) => acc + (Number(f.protein) || 0), 0);
      const totalC = meal.foods.reduce((acc, f) => acc + (Number(f.carbs) || 0), 0);
      const totalF = meal.foods.reduce((acc, f) => acc + (Number(f.fats) || 0), 0);

      const updatedMeal: DietMeal = {
        ...meal,
        calories: totalCals,
        protein: totalP,
        carbs: totalC,
        fats: totalF,
        foodItems: syncMealFoodItemsText({ ...meal, calories: totalCals, protein: totalP, carbs: totalC, fats: totalF })
      };
      return updatedMeal;
    }));
  };

  // Recalculate Daily Totals from all meals
  const handleRecalculateDailyTotals = () => {
    let totCals = 0;
    let totP = 0;
    let totC = 0;
    let totF = 0;

    meals.forEach(m => {
      totCals += Number(m.calories) || 0;
      totP += Number(m.protein) || 0;
      totC += Number(m.carbs) || 0;
      totF += Number(m.fats) || 0;
    });

    setDailyCalories(Math.round(totCals));
    setProteinGrams(Math.round(totP));
    setCarbsGrams(Math.round(totC));
    setFatsGrams(Math.round(totF));

    setSuccessMsg(isArabic ? "تم إعادة حساب الإجماليات اليومية بنجاح!" : "Daily totals updated from meal plan!");
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  // Meal Editing Handlers
  const handleMealNameChange = (mealIndex: number, newName: string) => {
    setMeals(prev => prev.map((m, idx) => idx === mealIndex ? { ...m, mealName: newName } : m));
  };

  const handleMealMacroChange = (mealIndex: number, field: "calories" | "protein" | "carbs" | "fats", value: string) => {
    setMeals(prev => prev.map((m, idx) => idx === mealIndex ? { ...m, [field]: value } : m));
  };

  const handleMealTextChange = (mealIndex: number, text: string) => {
    setMeals(prev => prev.map((m, idx) => idx === mealIndex ? { ...m, foodItems: text } : m));
  };

  const handleFoodItemChange = (mealIndex: number, foodIndex: number, field: keyof FoodItem, value: any) => {
    setMeals(prev => prev.map((meal, idx) => {
      if (idx !== mealIndex) return meal;
      const updatedFoods = [...(meal.foods || [])];
      updatedFoods[foodIndex] = {
        ...updatedFoods[foodIndex],
        [field]: value
      };

      const updatedMeal = {
        ...meal,
        foods: updatedFoods
      };
      updatedMeal.foodItems = syncMealFoodItemsText(updatedMeal);
      return updatedMeal;
    }));
  };

  const handleAddFoodToMeal = (mealIndex: number) => {
    setMeals(prev => prev.map((meal, idx) => {
      if (idx !== mealIndex) return meal;
      const newFood: FoodItem = {
        id: `food_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: isArabic ? "صنف غذائي جديد" : "New Food Item",
        quantity: isArabic ? "100 جرام" : "100g",
        calories: 150,
        protein: 10,
        carbs: 15,
        fats: 5
      };
      const updatedFoods = [...(meal.foods || []), newFood];
      const updatedMeal = { ...meal, foods: updatedFoods };
      updatedMeal.foodItems = syncMealFoodItemsText(updatedMeal);
      return updatedMeal;
    }));
  };

  const handleDeleteFoodFromMeal = (mealIndex: number, foodIndex: number) => {
    setMeals(prev => prev.map((meal, idx) => {
      if (idx !== mealIndex) return meal;
      const updatedFoods = (meal.foods || []).filter((_, fIdx) => fIdx !== foodIndex);
      const updatedMeal = { ...meal, foods: updatedFoods };
      updatedMeal.foodItems = syncMealFoodItemsText(updatedMeal);
      return updatedMeal;
    }));
  };

  const handleAddMeal = () => {
    const newMeal: DietMeal = {
      id: `meal_${Date.now()}`,
      mealName: isArabic ? `وجبة ${meals.length + 1}` : `Meal ${meals.length + 1}`,
      foodItems: isArabic ? "أضف الأطعمة والكميات..." : "Add food items and quantities...",
      calories: 400,
      protein: 30,
      carbs: 45,
      fats: 10,
      foods: []
    };
    setMeals(prev => [...prev, newMeal]);
  };

  const handleDeleteMeal = (mealIndex: number) => {
    setMeals(prev => prev.filter((_, idx) => idx !== mealIndex));
  };

  // Save Plan to Client Profile
  const handleSaveToClient = async () => {
    setLoading(true);
    setError(null);

    try {
      const nutritionSummary: AINutritionSummary = {
        dailyCalories: Number(dailyCalories) || 2000,
        proteinGrams: Number(proteinGrams) || 150,
        carbsGrams: Number(carbsGrams) || 200,
        fatsGrams: Number(fatsGrams) || 60,
        bmr: bmr,
        tdee: tdee,
        summary: summaryNote,
        calculatedAt: new Date().toISOString()
      };

      await onSaveNutritionPlan(meals, nutritionSummary);

      setSuccessMsg(isArabic ? "تم حفظ الخطة الغذائية في ملف المتدرب بنجاح!" : "Nutrition plan successfully saved to client profile!");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Error saving nutrition plan:", err);
      setError(err.message || (isArabic ? "فشل حفظ الخطة الغذائية" : "Failed to save nutrition plan"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-neutral-950 px-6 py-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-md flex items-center justify-center text-neutral-950 font-bold">
              <Sparkles className="h-5 w-5 text-neutral-950 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {isArabic ? "مساعد التغذية بالذكاء الاصطناعي" : "AI Nutrition Assistant"}
                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                  Gemini 3.6
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {client 
                  ? `${isArabic ? "إنشاء خطة غذائية وتوليد وجبات مخصصة لـ" : "Generating personalized meal plan for"} ${client.name}`
                  : (isArabic ? "حاسبة السعرات والماكروز والخطة المخصصة" : "Personalized Calorie, Macro & Meal Plan Generator")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {meals.length > 0 && (
              <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs font-mono">
                <button
                  onClick={() => setActiveStep("biometrics")}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    activeStep === "biometrics" ? "bg-emerald-600 text-neutral-950 font-bold" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {isArabic ? "البيانات" : "Biometrics"}
                </button>
                <button
                  onClick={() => setActiveStep("plan")}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    activeStep === "plan" ? "bg-emerald-600 text-neutral-950 font-bold" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {isArabic ? "الخطة والوجبات" : "Meal Plan"}
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white bg-neutral-950 hover:bg-neutral-850 rounded-lg border border-neutral-800 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notifications / Alerts */}
        {error && (
          <div className="bg-red-950/80 border-b border-red-800/60 px-6 py-2.5 text-xs text-red-300 flex items-center gap-2 shrink-0 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/80 border-b border-emerald-800/60 px-6 py-2.5 text-xs text-emerald-300 flex items-center gap-2 shrink-0 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scrollable Main Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeStep === "biometrics" ? (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">
                  <Calculator className="h-4 w-4" />
                  <span>{isArabic ? "1. بيانات جسم المتدرب والهدف" : "1. Client Biometrics & Fitness Goals"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-neutral-400 font-mono text-[10px] block">{isArabic ? "الطول (سم)" : "Height (cm)"}</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="175"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400 font-mono text-[10px] block">{isArabic ? "الوزن (كجم)" : "Weight (kg)"}</label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="75"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400 font-mono text-[10px] block">{isArabic ? "العمر (سنة)" : "Age (years)"}</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="25"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400 font-mono text-[10px] block">{isArabic ? "النوع" : "Gender"}</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Male">{isArabic ? "ذكر" : "Male"}</option>
                      <option value="Female">{isArabic ? "أنثى" : "Female"}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400 font-mono text-[10px] block">{isArabic ? "الهدف الأساسي" : "Fitness Goal"}</label>
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none font-bold text-emerald-400"
                    >
                      <option value="Bulking">{isArabic ? "تضخيم وبناء عضلات (Bulking)" : "Bulking (Muscle Gain)"}</option>
                      <option value="Cutting">{isArabic ? "تنشيف وحرق دهون (Cutting)" : "Cutting (Fat Loss)"}</option>
                      <option value="Maintenance">{isArabic ? "المحافظة على الوزن الحالي (Maintenance)" : "Maintenance"}</option>
                      <option value="Recomposition">{isArabic ? "إعادة تشكيل الجسم (Body Recomp)" : "Body Recomposition"}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400 font-mono text-[10px] block">{isArabic ? "مستوى النشاط اليومي" : "Activity Level"}</label>
                    <select
                      value={activityLevel}
                      onChange={(e) => setActivityLevel(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Sedentary">{isArabic ? "خامل (عمل مكتبي وقليل الحركة)" : "Sedentary (Little or no exercise)"}</option>
                      <option value="Lightly Active">{isArabic ? "نشاط خفيف (تمارين 1-3 أيام/أسبوع)" : "Lightly Active (1-3 days/week)"}</option>
                      <option value="Moderately Active">{isArabic ? "نشاط متوسط (تمارين 3-5 أيام/أسبوع)" : "Moderately Active (3-5 days/week)"}</option>
                      <option value="Very Active">{isArabic ? "نشاط عالٍ (تمارين شاقة 6-7 أيام/أسبوع)" : "Very Active (6-7 days/week)"}</option>
                      <option value="Extra Active">{isArabic ? "نشاط شديد جداً (رياضي محترف / عمل بدني شاق)" : "Extra Active (Hard physical work/athlete)"}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 border-t border-neutral-900 pt-3">
                  <label className="text-neutral-400 font-mono text-[10px] block">
                    {isArabic ? "تفضيلات أو قيود غذائية إضافية (اختياري)" : "Dietary Preferences / Restrictions (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={dietaryPreferences}
                    onChange={(e) => setDietaryPreferences(e.target.value)}
                    placeholder={isArabic ? "مثال: عالي البروتين، بدون ألبان، حلال، كيتو..." : "e.g. High protein, lactose-free, halal, low sodium, no seafood"}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Generate Button */}
              <div className="text-center pt-2">
                <button
                  onClick={handleGeneratePlan}
                  disabled={loading}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-neutral-950 font-bold px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2.5 mx-auto cursor-pointer disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>{isArabic ? "جاري حساب السعرات وتوليد الوجبات..." : "Calculating Calories & Generating Meal Plan..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>{isArabic ? "توليد الخطة الغذائية بالذكاء الاصطناعي" : "Generate Complete AI Meal Plan"}</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="text-[10px] text-neutral-500 font-mono mt-2">
                  {isArabic 
                    ? "يتم حساب السعرات والماكروز وفقاً لمعادلة Mifflin-St Jeor العلمية مع توليد وجبات دقيقة بالجرامات"
                    : "Uses Mifflin-St Jeor TDEE formulas & Gemini 3.6 to craft precise food portions and macro balances"}
                </p>
              </div>
            </div>
          ) : (
            /* STEP 2: GENERATED NUTRITION PLAN & COACH EDITOR */
            <div className="space-y-6">
              {/* Daily Macro Targets Summary Banner */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 shadow-inner space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-850 pb-3">
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      {isArabic ? "إجمالي السعرات والماكروز اليومية المستهدفة" : "Target Daily Calories & Macronutrients"}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRecalculateDailyTotals}
                      className="bg-neutral-900 hover:bg-neutral-800 text-emerald-400 text-[11px] font-mono px-3 py-1.5 rounded-lg border border-neutral-800 flex items-center gap-1.5 transition-all cursor-pointer"
                      title={isArabic ? "تحديث الماكروز بناءً على مجموع الوجبات" : "Sum up calories and macros from meals below"}
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>{isArabic ? "إعادة حساب الإجمالي من الوجبات" : "Recalculate Totals From Meals"}</span>
                    </button>

                    <button
                      onClick={() => setIsEditingSummary(!isEditingSummary)}
                      className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[11px] font-mono px-3 py-1.5 rounded-lg border border-neutral-800 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit3 className="h-3 w-3 text-emerald-400" />
                      <span>{isEditingSummary ? (isArabic ? "إغلاق التعديل" : "Done Editing") : (isArabic ? "تعديل الماكروز يدوياً" : "Edit Targets Manually")}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-neutral-900/80 p-3 rounded-xl border border-emerald-900/40 space-y-1">
                    <span className="text-[10px] text-neutral-400 font-mono block uppercase">{isArabic ? "السعرات اليومية" : "Daily Calories"}</span>
                    {isEditingSummary ? (
                      <input
                        type="number"
                        value={dailyCalories}
                        onChange={(e) => setDailyCalories(parseInt(e.target.value) || 0)}
                        className="w-full text-center bg-neutral-950 border border-emerald-500 rounded px-1 text-emerald-400 font-bold text-sm"
                      />
                    ) : (
                      <span className="text-xl font-extrabold text-emerald-400 font-mono block">{dailyCalories} <span className="text-xs font-normal text-neutral-400">kcal</span></span>
                    )}
                  </div>

                  <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800 space-y-1">
                    <span className="text-[10px] text-neutral-400 font-mono block uppercase">{isArabic ? "البروتين" : "Protein"}</span>
                    {isEditingSummary ? (
                      <input
                        type="number"
                        value={proteinGrams}
                        onChange={(e) => setProteinGrams(parseInt(e.target.value) || 0)}
                        className="w-full text-center bg-neutral-950 border border-neutral-700 rounded px-1 text-white font-bold text-sm"
                      />
                    ) : (
                      <span className="text-lg font-bold text-white font-mono block">{proteinGrams}g <span className="text-[10px] text-neutral-500 font-normal">({proteinGrams * 4} kcal)</span></span>
                    )}
                  </div>

                  <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800 space-y-1">
                    <span className="text-[10px] text-neutral-400 font-mono block uppercase">{isArabic ? "الكربوهيدرات" : "Carbohydrates"}</span>
                    {isEditingSummary ? (
                      <input
                        type="number"
                        value={carbsGrams}
                        onChange={(e) => setCarbsGrams(parseInt(e.target.value) || 0)}
                        className="w-full text-center bg-neutral-950 border border-neutral-700 rounded px-1 text-white font-bold text-sm"
                      />
                    ) : (
                      <span className="text-lg font-bold text-white font-mono block">{carbsGrams}g <span className="text-[10px] text-neutral-500 font-normal">({carbsGrams * 4} kcal)</span></span>
                    )}
                  </div>

                  <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800 space-y-1">
                    <span className="text-[10px] text-neutral-400 font-mono block uppercase">{isArabic ? "الدهون الصحية" : "Healthy Fats"}</span>
                    {isEditingSummary ? (
                      <input
                        type="number"
                        value={fatsGrams}
                        onChange={(e) => setFatsGrams(parseInt(e.target.value) || 0)}
                        className="w-full text-center bg-neutral-950 border border-neutral-700 rounded px-1 text-white font-bold text-sm"
                      />
                    ) : (
                      <span className="text-lg font-bold text-white font-mono block">{fatsGrams}g <span className="text-[10px] text-neutral-500 font-normal">({fatsGrams * 9} kcal)</span></span>
                    )}
                  </div>
                </div>

                {summaryNote && (
                  <div className="bg-neutral-900/40 p-3 rounded-lg border border-neutral-850 text-xs text-neutral-400 font-sans leading-relaxed">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block mb-0.5">
                      {isArabic ? "ملاحظة التوزيع والسعرات:" : "TDEE & Strategy Note:"}
                    </span>
                    <p>{summaryNote}</p>
                  </div>
                )}
              </div>

              {/* Coach Control Meals Editor Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-emerald-500" />
                    <span>{isArabic ? "جدول الوجبات والتعديل الشامل" : "Structured Meals & Food Items Control"}</span>
                    <span className="text-[10px] text-neutral-500 font-normal">({meals.length} {isArabic ? "وجبات" : "meals"})</span>
                  </h4>

                  <button
                    onClick={handleAddMeal}
                    className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{isArabic ? "+ إضافة وجبة جديدة" : "+ Add New Meal"}</span>
                  </button>
                </div>

                {meals.length === 0 ? (
                  <div className="text-center py-12 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-500 text-xs">
                    {isArabic ? "لا توجد وجبات في الخطة. انقر فوق 'إضافة وجبة جديدة' أو أعد التوليد." : "No meals generated. Click '+ Add New Meal' or regenerate."}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {meals.map((meal, mIdx) => (
                      <div key={meal.id || mIdx} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3.5 shadow-md">
                        {/* Meal Header & Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-900 pb-2.5">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="h-6 w-6 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40 text-[10px] font-bold font-mono flex items-center justify-center shrink-0">
                              {mIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={meal.mealName}
                              onChange={(e) => handleMealNameChange(mIdx, e.target.value)}
                              className="bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white font-bold focus:border-emerald-500 focus:outline-none flex-1 max-w-xs"
                              placeholder="Meal Name e.g. Breakfast"
                            />
                            
                            {/* Single Meal AI Regenerate Button */}
                            <button
                              onClick={() => handleRegenerateSingleMeal(mIdx)}
                              disabled={regeneratingMealIndex === mIdx}
                              className="bg-emerald-950/70 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/50 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title={isArabic ? "إعادة توليد هذه الوجبة فقط بالذكاء الاصطناعي" : "Regenerate only this meal with AI"}
                            >
                              <Sparkles className={`h-3 w-3 ${regeneratingMealIndex === mIdx ? "animate-spin" : ""}`} />
                              <span>
                                {regeneratingMealIndex === mIdx 
                                  ? (isArabic ? "جاري التوليد..." : "Generating...") 
                                  : (isArabic ? "إعادة توليد الوجبة" : "Regenerate Meal")}
                              </span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-mono">
                            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-[11px] text-neutral-300">
                              <span className="text-neutral-500 text-[10px]">{isArabic ? "سعرات:" : "Cal:"}</span>
                              <input
                                type="number"
                                value={meal.calories || 0}
                                onChange={(e) => handleMealMacroChange(mIdx, "calories", e.target.value)}
                                className="w-14 bg-transparent text-emerald-400 font-bold text-center focus:outline-none"
                              />
                            </div>

                            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-1 text-[10px] text-neutral-400">
                              <span>P:</span>
                              <input
                                type="number"
                                value={meal.protein || 0}
                                onChange={(e) => handleMealMacroChange(mIdx, "protein", e.target.value)}
                                className="w-10 bg-transparent text-white font-bold text-center focus:outline-none"
                              />
                              <span>g</span>
                            </div>

                            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-1 text-[10px] text-neutral-400">
                              <span>C:</span>
                              <input
                                type="number"
                                value={meal.carbs || 0}
                                onChange={(e) => handleMealMacroChange(mIdx, "carbs", e.target.value)}
                                className="w-10 bg-transparent text-white font-bold text-center focus:outline-none"
                              />
                              <span>g</span>
                            </div>

                            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-1 text-[10px] text-neutral-400">
                              <span>F:</span>
                              <input
                                type="number"
                                value={meal.fats || 0}
                                onChange={(e) => handleMealMacroChange(mIdx, "fats", e.target.value)}
                                className="w-10 bg-transparent text-white font-bold text-center focus:outline-none"
                              />
                              <span>g</span>
                            </div>

                            <button
                              onClick={() => handleDeleteMeal(mIdx)}
                              className="text-neutral-500 hover:text-red-400 p-1.5 rounded transition-all cursor-pointer"
                              title="Delete Meal"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Individual Food Items Table / Form */}
                        {meal.foods && meal.foods.length > 0 ? (
                          <div className="space-y-2 bg-neutral-900/60 p-3 rounded-lg border border-neutral-850">
                            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 uppercase border-b border-neutral-800 pb-1.5">
                              <span className="flex items-center gap-1 text-emerald-400">
                                <Database className="h-3 w-3" />
                                <span>{isArabic ? "الأطعمة وقاعدة البيانات الموثوقة" : "Individual Foods & Verified Database Items"}</span>
                              </span>
                              <button
                                onClick={() => handleRecalculateMealFromFoods(mIdx)}
                                className="text-emerald-400 hover:underline text-[9px] flex items-center gap-1 cursor-pointer"
                              >
                                <RefreshCw className="h-2.5 w-2.5" />
                                <span>{isArabic ? "حساب سعرات الوجبة من الأطعمة" : "Sum Foods to Meal Macros"}</span>
                              </button>
                            </div>

                            <div className="space-y-2">
                              {meal.foods.map((food, fIdx) => (
                                <div key={food.id || fIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-neutral-950 p-2 rounded border border-neutral-850 text-xs">
                                  {/* Food Item Name or Food Database Quick Select Dropdown */}
                                  <div className="sm:col-span-4 space-y-1">
                                    <input
                                      type="text"
                                      value={food.name}
                                      onChange={(e) => handleFoodItemChange(mIdx, fIdx, "name", e.target.value)}
                                      placeholder="Food name e.g. Oatmeal"
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-white text-xs"
                                    />
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleSelectDatabaseItemToFood(mIdx, fIdx, e.target.value);
                                          e.target.value = "";
                                        }
                                      }}
                                      className="w-full bg-neutral-900/80 border border-neutral-800 rounded px-1.5 py-0.5 text-[10px] text-neutral-400 font-mono focus:text-white"
                                    >
                                      <option value="">{isArabic ? "اختر من قاعدة الأطعمة الموثوقة..." : "Pick from Verified Food DB..."}</option>
                                      {FOOD_DATABASE.map(f => (
                                        <option key={f.id} value={f.id}>
                                          {isArabic ? f.nameAr : f.nameEn} ({f.calories} kcal)
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="sm:col-span-3">
                                    <label className="text-[9px] text-neutral-500 font-mono block sm:hidden">{isArabic ? "الكمية:" : "Quantity:"}</label>
                                    <input
                                      type="text"
                                      value={food.quantity}
                                      onChange={(e) => handleFoodItemChange(mIdx, fIdx, "quantity", e.target.value)}
                                      placeholder="Quantity e.g. 150g"
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-emerald-400 font-mono text-xs"
                                    />
                                  </div>

                                  <div className="sm:col-span-4 grid grid-cols-4 gap-1 text-[10px] font-mono">
                                    <div>
                                      <span className="text-[8px] text-neutral-500 block text-center sm:hidden">KCAL</span>
                                      <input
                                        type="number"
                                        value={food.calories || 0}
                                        onChange={(e) => handleFoodItemChange(mIdx, fIdx, "calories", parseInt(e.target.value) || 0)}
                                        placeholder="kcal"
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-1 py-1 text-center text-neutral-200"
                                        title="Calories (kcal)"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[8px] text-neutral-500 block text-center sm:hidden">P</span>
                                      <input
                                        type="number"
                                        value={food.protein || 0}
                                        onChange={(e) => handleFoodItemChange(mIdx, fIdx, "protein", parseInt(e.target.value) || 0)}
                                        placeholder="P"
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-1 py-1 text-center text-neutral-200"
                                        title="Protein (g)"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[8px] text-neutral-500 block text-center sm:hidden">C</span>
                                      <input
                                        type="number"
                                        value={food.carbs || 0}
                                        onChange={(e) => handleFoodItemChange(mIdx, fIdx, "carbs", parseInt(e.target.value) || 0)}
                                        placeholder="C"
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-1 py-1 text-center text-neutral-200"
                                        title="Carbs (g)"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[8px] text-neutral-500 block text-center sm:hidden">F</span>
                                      <input
                                        type="number"
                                        value={food.fats || 0}
                                        onChange={(e) => handleFoodItemChange(mIdx, fIdx, "fats", parseInt(e.target.value) || 0)}
                                        placeholder="F"
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-1 py-1 text-center text-neutral-200"
                                        title="Fats (g)"
                                      />
                                    </div>
                                  </div>

                                  <div className="sm:col-span-1 text-right">
                                    <button
                                      onClick={() => handleDeleteFoodFromMeal(mIdx, fIdx)}
                                      className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <button
                              onClick={() => handleAddFoodToMeal(mIdx)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono font-bold flex items-center gap-1 pt-1 cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                              <span>{isArabic ? "+ إضافة صنف غذائي جديد للوجبة" : "+ Add Food Item to Meal"}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={meal.foodItems}
                              onChange={(e) => handleMealTextChange(mIdx, e.target.value)}
                              placeholder={isArabic ? "قائمة الأطعمة والكميات بالجرام..." : "List food items, portion quantities (grams/servings)..."}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none font-mono"
                            />
                            <button
                              onClick={() => handleAddFoodToMeal(mIdx)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                              <span>{isArabic ? "+ تحويل إلى أصناف غذائية مفصلة" : "+ Convert to Structured Food Items"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-neutral-950 px-6 py-4 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 rounded-xl border border-neutral-800 text-xs font-bold transition-all cursor-pointer"
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>

          {activeStep === "plan" && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveStep("biometrics")}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-emerald-400 rounded-xl border border-neutral-800 text-xs font-bold transition-all cursor-pointer"
              >
                {isArabic ? "تعديل القياسات والهدف" : "Edit Biometrics"}
              </button>

              <button
                onClick={handleSaveToClient}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? (isArabic ? "جاري الحفظ..." : "Saving...") : (isArabic ? "حفظ وتعيين في ملف المتدرب" : "Save & Assign to Client Profile")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

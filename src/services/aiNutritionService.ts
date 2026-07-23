import { GoogleGenAI } from "@google/genai";
import { NUTRITION_DATABASE, FoodItemData, findFoodInDatabase, calculateMacrosForGrams } from "./nutritionDatabase";

export interface NutritionProfileInput {
  age: number;
  gender: "male" | "female";
  heightCm: number;
  weightKg: number;
  bodyFatPercent?: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "extra_active";
  goal: "muscle_gain" | "fat_loss" | "maintenance";
  mealsPerDay: number; // 3, 4, 5, or 6
  budget: "low" | "moderate" | "high";
  cuisinePreference: "Egyptian" | "Arabic" | "International" | "Mixed";
  allergies: string[];
  medicalRestrictions: string[];
  customNotes?: string;
}

export interface FoodItemMeal {
  id: string;
  nameEn: string;
  nameAr: string;
  quantityGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notesEn?: string;
  notesAr?: string;
}

export interface MealPlanMeal {
  id: string;
  mealNumber: number;
  mealNameEn: string;
  mealNameAr: string;
  foods: FoodItemMeal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface MealPlanResult {
  clientProfile: {
    bmr: number;
    tdee: number;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
  };
  dailyTotals: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
  meals: MealPlanMeal[];
  nutritionistNotesEn: string;
  nutritionistNotesAr: string;
  warnings?: string[];
  generatedAt: string;
}

// --- SCIENTIFIC CALCULATOR (Mifflin-St Jeor Equation) ---
export function calculateMifflinStJeor(input: NutritionProfileInput) {
  const { weightKg, heightCm, age, gender, activityLevel, goal } = input;

  // 1. Calculate BMR using Mifflin-St Jeor Equation
  // BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + s
  // s = +5 for males, -161 for females
  const genderFactor = gender === "male" ? 5 : -161;
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + genderFactor);

  // 2. Activity Multipliers
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    extra_active: 1.9
  };

  const multiplier = activityMultipliers[activityLevel] || 1.55;
  const tdee = Math.round(bmr * multiplier);

  // 3. Calorie Target by Goal
  let targetCalories = tdee;
  if (goal === "fat_loss") {
    targetCalories = Math.round(tdee - 500); // 500 kcal deficit
  } else if (goal === "muscle_gain") {
    targetCalories = Math.round(tdee + 350); // 350 kcal surplus
  }

  // Ensure safe minimum calories
  const minSafeCalories = gender === "male" ? 1500 : 1200;
  targetCalories = Math.max(targetCalories, minSafeCalories);

  // 4. Exact Macro Targets
  // Protein: 2.0g / kg of body weight
  const targetProtein = Math.round(weightKg * 2.0);
  const proteinCalories = targetProtein * 4;

  // Fat: 25% of target calories
  const fatCalories = targetCalories * 0.25;
  const targetFat = Math.round(fatCalories / 9);

  // Carbs: Remaining calories / 4
  const carbCalories = Math.max(0, targetCalories - (proteinCalories + fatCalories));
  const targetCarbs = Math.round(carbCalories / 4);

  return {
    bmr,
    tdee,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat
  };
}

// --- INSTANT MACRO RECALCULATION UTILITIES ---
export function recalculateFoodItem(food: FoodItemMeal, newGrams: number): FoodItemMeal {
  const oldGrams = food.quantityGrams > 0 ? food.quantityGrams : 100;
  const ratio = newGrams / oldGrams;

  // Try finding in database for exact precision if possible
  const dbMatch = findFoodInDatabase(food.id) || findFoodInDatabase(food.nameEn) || findFoodInDatabase(food.nameAr);
  if (dbMatch) {
    const macros = calculateMacrosForGrams(dbMatch, newGrams);
    return {
      ...food,
      quantityGrams: newGrams,
      calories: macros.calories,
      proteinGrams: macros.protein,
      carbsGrams: macros.carbs,
      fatGrams: macros.fat
    };
  }

  return {
    ...food,
    quantityGrams: newGrams,
    calories: Math.round(food.calories * ratio),
    proteinGrams: Number((food.proteinGrams * ratio).toFixed(1)),
    carbsGrams: Number((food.carbsGrams * ratio).toFixed(1)),
    fatGrams: Number((food.fatGrams * ratio).toFixed(1))
  };
}

export function recalculateMeal(meal: MealPlanMeal): MealPlanMeal {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  const updatedFoods = meal.foods.map(f => {
    totalCalories += f.calories;
    totalProtein += f.proteinGrams;
    totalCarbs += f.carbsGrams;
    totalFat += f.fatGrams;
    return f;
  });

  return {
    ...meal,
    foods: updatedFoods,
    totalCalories: Math.round(totalCalories),
    totalProtein: Number(totalProtein.toFixed(1)),
    totalCarbs: Number(totalCarbs.toFixed(1)),
    totalFat: Number(totalFat.toFixed(1))
  };
}

export function calculateDailyTotals(meals: MealPlanMeal[]) {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  meals.forEach(meal => {
    totalCalories += meal.totalCalories;
    totalProtein += meal.totalProtein;
    totalCarbs += meal.totalCarbs;
    totalFat += meal.totalFat;
  });

  return {
    totalCalories: Math.round(totalCalories),
    totalProtein: Number(totalProtein.toFixed(1)),
    totalCarbs: Number(totalCarbs.toFixed(1)),
    totalFat: Number(totalFat.toFixed(1))
  };
}

export function getFoodSubstitutes(foodIdOrName: string): FoodItemData[] {
  const match = findFoodInDatabase(foodIdOrName);
  if (match && match.substitutes.length > 0) {
    return match.substitutes
      .map(id => NUTRITION_DATABASE.find(item => item.id === id))
      .filter((item): item is FoodItemData => item !== undefined);
  }

  // Fallback: Return foods in the same category
  if (match) {
    return NUTRITION_DATABASE.filter(item => item.category === match.category && item.id !== match.id);
  }

  return NUTRITION_DATABASE.slice(0, 5);
}

// --- LOCAL FAILSAFE GENERATOR ---
export function generateLocalMealPlan(input: NutritionProfileInput): MealPlanResult {
  const profile = calculateMifflinStJeor(input);
  const numMeals = Math.min(6, Math.max(3, input.mealsPerDay || 4));

  const mealCalorieTarget = Math.round(profile.targetCalories / numMeals);
  const mealProteinTarget = Math.round(profile.targetProtein / numMeals);
  const mealCarbsTarget = Math.round(profile.targetCarbs / numMeals);
  const mealFatTarget = Math.round(profile.targetFat / numMeals);

  const mealNames = [
    { en: "Breakfast - الإفطار", ar: "وجبة الإفطار" },
    { en: "Mid-Morning Snack - وجبة خفيفة صباحية", ar: "سناك صباحي" },
    { en: "Lunch - الغداء الرئيسية", ar: "وجبة الغداء الرئيسية" },
    { en: "Pre-Workout - قبل التمرين", ar: "وجبة قبل التمرين" },
    { en: "Post-Workout / Dinner - العشاء", ar: "وجبة العشاء" },
    { en: "Night Snack - سناك قبل النوم", ar: "سناك الليل" }
  ];

  const meals: MealPlanMeal[] = [];

  for (let i = 0; i < numMeals; i++) {
    const mealInfo = mealNames[i] || { en: `Meal ${i + 1}`, ar: `وجبة ${i + 1}` };
    const isBreakfast = i === 0;
    const isLunch = i === 2 || (numMeals <= 4 && i === 1);
    const isDinner = i === numMeals - 1;

    let proteinItem: FoodItemData;
    let carbItem: FoodItemData;
    let fatItem: FoodItemData;
    let vegItem: FoodItemData;

    if (isBreakfast) {
      proteinItem = NUTRITION_DATABASE.find(x => x.id === "egy_gebna_qareesh") || NUTRITION_DATABASE[2];
      carbItem = NUTRITION_DATABASE.find(x => x.id === "egy_aesh_baladi") || NUTRITION_DATABASE[12];
      fatItem = NUTRITION_DATABASE.find(x => x.id === "int_olive_oil_extra_virgin") || NUTRITION_DATABASE[19];
      vegItem = NUTRITION_DATABASE.find(x => x.id === "int_green_salad_mixed") || NUTRITION_DATABASE[24];
    } else if (isLunch) {
      proteinItem = NUTRITION_DATABASE.find(x => x.id === "egy_chicken_breast") || NUTRITION_DATABASE[0];
      carbItem = NUTRITION_DATABASE.find(x => x.id === "int_rice_basmati_cooked") || NUTRITION_DATABASE[13];
      fatItem = NUTRITION_DATABASE.find(x => x.id === "int_olive_oil_extra_virgin") || NUTRITION_DATABASE[19];
      vegItem = NUTRITION_DATABASE.find(x => x.id === "egy_molokhia_cooked") || NUTRITION_DATABASE[23];
    } else if (isDinner) {
      proteinItem = NUTRITION_DATABASE.find(x => x.id === "egy_samak_bulti") || NUTRITION_DATABASE[1];
      carbItem = NUTRITION_DATABASE.find(x => x.id === "int_sweet_potato_baked") || NUTRITION_DATABASE[14];
      fatItem = NUTRITION_DATABASE.find(x => x.id === "int_almonds_raw") || NUTRITION_DATABASE[21];
      vegItem = NUTRITION_DATABASE.find(x => x.id === "int_green_salad_mixed") || NUTRITION_DATABASE[24];
    } else {
      proteinItem = NUTRITION_DATABASE.find(x => x.id === "int_greek_yogurt") || NUTRITION_DATABASE[11];
      carbItem = NUTRITION_DATABASE.find(x => x.id === "int_oats_raw") || NUTRITION_DATABASE[16];
      fatItem = NUTRITION_DATABASE.find(x => x.id === "int_peanut_butter_pure") || NUTRITION_DATABASE[20];
      vegItem = NUTRITION_DATABASE.find(x => x.id === "int_banana_fresh") || NUTRITION_DATABASE[18];
    }

    // Calculate required grams to hit targets
    const pGrams = Math.round((mealProteinTarget / (proteinItem.proteinPer100g || 20)) * 100);
    const cGrams = Math.round((mealCarbsTarget / (carbItem.carbsPer100g || 25)) * 100);
    const fGrams = Math.round((mealFatTarget / (fatItem.fatPer100g || 80)) * 100);

    const pMacros = calculateMacrosForGrams(proteinItem, Math.max(50, pGrams));
    const cMacros = calculateMacrosForGrams(carbItem, Math.max(30, cGrams));
    const fMacros = calculateMacrosForGrams(fatItem, Math.max(5, fGrams));
    const vMacros = calculateMacrosForGrams(vegItem, vegItem.defaultServingGrams);

    const foods: FoodItemMeal[] = [
      {
        id: proteinItem.id,
        nameEn: proteinItem.nameEn,
        nameAr: proteinItem.nameAr,
        quantityGrams: Math.max(50, pGrams),
        calories: pMacros.calories,
        proteinGrams: pMacros.protein,
        carbsGrams: pMacros.carbs,
        fatGrams: pMacros.fat
      },
      {
        id: carbItem.id,
        nameEn: carbItem.nameEn,
        nameAr: carbItem.nameAr,
        quantityGrams: Math.max(30, cGrams),
        calories: cMacros.calories,
        proteinGrams: cMacros.protein,
        carbsGrams: cMacros.carbs,
        fatGrams: cMacros.fat
      },
      {
        id: fatItem.id,
        nameEn: fatItem.nameEn,
        nameAr: fatItem.nameAr,
        quantityGrams: Math.max(5, fGrams),
        calories: fMacros.calories,
        proteinGrams: fMacros.protein,
        carbsGrams: fMacros.carbs,
        fatGrams: fMacros.fat
      },
      {
        id: vegItem.id,
        nameEn: vegItem.nameEn,
        nameAr: vegItem.nameAr,
        quantityGrams: vegItem.defaultServingGrams,
        calories: vMacros.calories,
        proteinGrams: vMacros.protein,
        carbsGrams: vMacros.carbs,
        fatGrams: vMacros.fat
      }
    ];

    const mealTotalCal = foods.reduce((s, x) => s + x.calories, 0);
    const mealTotalP = foods.reduce((s, x) => s + x.proteinGrams, 0);
    const mealTotalC = foods.reduce((s, x) => s + x.carbsGrams, 0);
    const mealTotalF = foods.reduce((s, x) => s + x.fatGrams, 0);

    meals.push({
      id: `meal_${i + 1}`,
      mealNumber: i + 1,
      mealNameEn: mealInfo.en,
      mealNameAr: mealInfo.ar,
      foods,
      totalCalories: mealTotalCal,
      totalProtein: Number(mealTotalP.toFixed(1)),
      totalCarbs: Number(mealTotalC.toFixed(1)),
      totalFat: Number(mealTotalF.toFixed(1))
    });
  }

  const dailyTotals = calculateDailyTotals(meals);

  return {
    clientProfile: profile,
    dailyTotals,
    meals,
    nutritionistNotesEn: `This sports nutrition plan is scientifically engineered based on the Mifflin-St Jeor equation for a ${input.weightKg}kg ${input.gender} targeting ${input.goal.replace("_", " ")}.`,
    nutritionistNotesAr: `تم تصميم هذا النظام الغذائي الرياضي بناءً على معادلة ميفرين-سانت جوير العلمية لحساب السعرات الحرارية والماكروز بدقة طبقاً لهدفك الرياضي.`,
    generatedAt: new Date().toISOString()
  };
}

// --- GEMINI AI NUTRITION PLAN GENERATOR ---
export async function generateAINutritionPlan(input: NutritionProfileInput): Promise<MealPlanResult> {
  const profile = calculateMifflinStJeor(input);

  const apiKey = process.env.GEMINI_API_KEY || (typeof window !== "undefined" && (window as any).VITE_GEMINI_API_KEY);

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not available. Using precision scientific fallback local generator.");
    return generateLocalMealPlan(input);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an elite Sports Nutritionist & IFBB Pro Diet Coach.
Generate a structured, scientifically precise daily meal plan in JSON format.

CLIENT PROFILE & REQUIREMENTS:
- Age: ${input.age} years
- Gender: ${input.gender}
- Height: ${input.heightCm} cm
- Weight: ${input.weightKg} kg
- Body Fat %: ${input.bodyFatPercent ? input.bodyFatPercent + "%" : "Not specified"}
- Activity Level: ${input.activityLevel}
- Goal: ${input.goal}
- Meals Per Day: ${input.mealsPerDay}
- Budget Level: ${input.budget}
- Cuisine Preference: ${input.cuisinePreference} (Include traditional Egyptian items like Gebna Qareesh, Ful Medames, Aesh Baladi, Tilapia, Molokhia, or Arabic/International items appropriately)
- Allergies: ${input.allergies.length > 0 ? input.allergies.join(", ") : "None"}
- Medical Restrictions: ${input.medicalRestrictions.length > 0 ? input.medicalRestrictions.join(", ") : "None"}
${input.customNotes ? `- Custom Notes: ${input.customNotes}` : ""}

TARGET DAILY MACROS (Calculated via Mifflin-St Jeor):
- Target Daily Calories: ${profile.targetCalories} kcal
- Target Daily Protein: ${profile.targetProtein} g
- Target Daily Carbs: ${profile.targetCarbs} g
- Target Daily Fat: ${profile.targetFat} g

CRITICAL INSTRUCTIONS:
1. Every food item MUST have:
   - "nameEn": English food name
   - "nameAr": Arabic food name
   - "quantityGrams": Number (Exact quantity in grams)
   - "calories": Number (Calculated for quantityGrams)
   - "proteinGrams": Number
   - "carbsGrams": Number
   - "fatGrams": Number
2. Do NOT invent fake calories or macros. Use real food composition values per 100g.
3. Distribute the daily calorie and macro target across all ${input.mealsPerDay} meals.
4. Output MUST be valid JSON only, without markdown backticks or commentary outside JSON.

JSON SCHEMA EXPECTED:
{
  "nutritionistNotesEn": "Professional advice in English",
  "nutritionistNotesAr": "نصيحة أخصائي التغذية باللغة العربية",
  "meals": [
    {
      "id": "meal_1",
      "mealNumber": 1,
      "mealNameEn": "Meal Name in English",
      "mealNameAr": "اسم الوجبة بالعربية",
      "foods": [
        {
          "id": "food_id",
          "nameEn": "Grilled Chicken Breast",
          "nameAr": "صدور دجاج مشوية",
          "quantityGrams": 150,
          "calories": 247,
          "proteinGrams": 46.5,
          "carbsGrams": 0,
          "fatGrams": 5.4
        }
      ]
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "";
    const cleanJsonText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(cleanJsonText);

    if (parsed && Array.isArray(parsed.meals) && parsed.meals.length > 0) {
      const processedMeals: MealPlanMeal[] = parsed.meals.map((m: any, idx: number) => {
        const foods: FoodItemMeal[] = (m.foods || []).map((f: any, fIdx: number) => {
          const grams = Number(f.quantityGrams) || 100;
          return {
            id: f.id || `food_${idx}_${fIdx}`,
            nameEn: f.nameEn || "Food Item",
            nameAr: f.nameAr || "صنف غذائي",
            quantityGrams: grams,
            calories: Number(f.calories) || 100,
            proteinGrams: Number(f.proteinGrams) || 0,
            carbsGrams: Number(f.carbsGrams) || 0,
            fatGrams: Number(f.fatGrams) || 0
          };
        });

        const mealTotals = foods.reduce(
          (acc, f) => ({
            calories: acc.calories + f.calories,
            protein: acc.protein + f.proteinGrams,
            carbs: acc.carbs + f.carbsGrams,
            fat: acc.fat + f.fatGrams
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        return {
          id: m.id || `meal_${idx + 1}`,
          mealNumber: m.mealNumber || idx + 1,
          mealNameEn: m.mealNameEn || `Meal ${idx + 1}`,
          mealNameAr: m.mealNameAr || `وجبة ${idx + 1}`,
          foods,
          totalCalories: Math.round(mealTotals.calories),
          totalProtein: Number(mealTotals.protein.toFixed(1)),
          totalCarbs: Number(mealTotals.carbs.toFixed(1)),
          totalFat: Number(mealTotals.fat.toFixed(1))
        };
      });

      const dailyTotals = calculateDailyTotals(processedMeals);

      return {
        clientProfile: profile,
        dailyTotals,
        meals: processedMeals,
        nutritionistNotesEn: parsed.nutritionistNotesEn || "Custom nutrition program.",
        nutritionistNotesAr: parsed.nutritionistNotesAr || "برنامج تغذية مخصص.",
        generatedAt: new Date().toISOString()
      };
    }
  } catch (err) {
    console.error("Gemini AI Nutrition plan generation failed or timed out. Falling back to precision local generator:", err);
  }

  return generateLocalMealPlan(input);
}

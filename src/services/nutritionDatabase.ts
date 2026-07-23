export interface FoodItemData {
  id: string;
  nameEn: string;
  nameAr: string;
  category: "Protein" | "Carbohydrates" | "Fats" | "Vegetables" | "Dairy" | "Composite";
  cuisine: "Egyptian" | "Arabic" | "International";
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  defaultServingGrams: number;
  servingUnitEn: string;
  servingUnitAr: string;
  substitutes: string[]; // List of Food IDs that can replace this item
}

export const NUTRITION_DATABASE: FoodItemData[] = [
  // --- EGYPTIAN & ARABIC PROTEIN SOURCES ---
  {
    id: "egy_chicken_breast",
    nameEn: "Grilled Chicken Breast (صدور دجاج مشوية)",
    nameAr: "صدور دجاج مشوية",
    category: "Protein",
    cuisine: "Egyptian",
    caloriesPer100g: 165,
    proteinPer100g: 31.0,
    carbsPer100g: 0.0,
    fatPer100g: 3.6,
    defaultServingGrams: 150,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["int_turkey_breast", "egy_samak_bulti", "int_tuna_water", "int_beef_lean"]
  },
  {
    id: "egy_samak_bulti",
    nameEn: "Grilled Tilapia Fish (سمك بلطي مشوي)",
    nameAr: "سمك بلطي مشوي",
    category: "Protein",
    cuisine: "Egyptian",
    caloriesPer100g: 128,
    proteinPer100g: 26.0,
    carbsPer100g: 0.0,
    fatPer100g: 2.7,
    defaultServingGrams: 200,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["egy_chicken_breast", "int_salmon_grilled", "int_tuna_water"]
  },
  {
    id: "egy_gebna_qareesh",
    nameEn: "Egyptian Cottage Cheese (جبنة قريش)",
    nameAr: "جبنة قريش مصرية",
    category: "Dairy",
    cuisine: "Egyptian",
    caloriesPer100g: 98,
    proteinPer100g: 11.2,
    carbsPer100g: 3.4,
    fatPer100g: 4.3,
    defaultServingGrams: 150,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["int_greek_yogurt", "egy_eggs_boiled", "int_egg_whites"]
  },
  {
    id: "egy_ful_medames",
    nameEn: "Egyptian Ful Medames (فول مدمس)",
    nameAr: "فول مدمس بزيت الزيتون",
    category: "Composite",
    cuisine: "Egyptian",
    caloriesPer100g: 110,
    proteinPer100g: 7.6,
    carbsPer100g: 19.8,
    fatPer100g: 1.2,
    defaultServingGrams: 200,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["arb_hummus_pulp", "egy_lentil_soup"]
  },
  {
    id: "egy_kebda_iskandarani",
    nameEn: "Alexandrian Beef Liver (كبدة إسكندراني)",
    nameAr: "كبدة بقري إسكندراني",
    category: "Protein",
    cuisine: "Egyptian",
    caloriesPer100g: 175,
    proteinPer100g: 27.0,
    carbsPer100g: 3.8,
    fatPer100g: 5.5,
    defaultServingGrams: 150,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["int_beef_lean", "egy_chicken_breast"]
  },
  {
    id: "egy_eggs_boiled",
    nameEn: "Boiled Whole Eggs (بيض مسلوق)",
    nameAr: "بيض دجاج مسلوق",
    category: "Protein",
    cuisine: "Egyptian",
    caloriesPer100g: 155,
    proteinPer100g: 12.6,
    carbsPer100g: 1.1,
    fatPer100g: 10.6,
    defaultServingGrams: 120,
    servingUnitEn: "large eggs (2-3 pcs)",
    servingUnitAr: "بيضات كبيرة",
    substitutes: ["int_egg_whites", "egy_gebna_qareesh"]
  },

  // --- INTERNATIONAL PROTEIN ---
  {
    id: "int_egg_whites",
    nameEn: "Liquid Egg Whites (بياض بيض)",
    nameAr: "بياض بيض نقي",
    category: "Protein",
    cuisine: "International",
    caloriesPer100g: 52,
    proteinPer100g: 11.0,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    defaultServingGrams: 200,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["egy_gebna_qareesh", "int_whey_protein"]
  },
  {
    id: "int_whey_protein",
    nameEn: "Whey Protein Isolate (واي بروتين آيزوليت)",
    nameAr: "بروتين المصل النقي (واي)",
    category: "Protein",
    cuisine: "International",
    caloriesPer100g: 370,
    proteinPer100g: 82.0,
    carbsPer100g: 4.0,
    fatPer100g: 1.5,
    defaultServingGrams: 30,
    servingUnitEn: "scoop (30g)",
    servingUnitAr: "سكوب (30 جرام)",
    substitutes: ["int_egg_whites", "int_greek_yogurt"]
  },
  {
    id: "int_tuna_water",
    nameEn: "Canned Tuna in Water (تونة صفية في الماء)",
    nameAr: "تونة قطعة واحدة في الماء",
    category: "Protein",
    cuisine: "International",
    caloriesPer100g: 116,
    proteinPer100g: 26.0,
    carbsPer100g: 0.0,
    fatPer100g: 1.0,
    defaultServingGrams: 140,
    servingUnitEn: "can (140g)",
    servingUnitAr: "علبة (140 جرام)",
    substitutes: ["egy_samak_bulti", "egy_chicken_breast"]
  },
  {
    id: "int_beef_lean",
    nameEn: "Lean Minced Beef 90/10 (لحم بقر مفروم قليل الدسم)",
    nameAr: "لحم بقري أحمر مفروم (90% صافي)",
    category: "Protein",
    cuisine: "International",
    caloriesPer100g: 176,
    proteinPer100g: 20.0,
    carbsPer100g: 0.0,
    fatPer100g: 10.0,
    defaultServingGrams: 150,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["egy_chicken_breast", "int_turkey_breast"]
  },
  {
    id: "int_salmon_grilled",
    nameEn: "Grilled Salmon Fillet (سلمون مشوي)",
    nameAr: "فيلييه سلمون نرويجي مشوي",
    category: "Protein",
    cuisine: "International",
    caloriesPer100g: 206,
    proteinPer100g: 22.0,
    carbsPer100g: 0.0,
    fatPer100g: 12.0,
    defaultServingGrams: 150,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["egy_samak_bulti", "int_tuna_water"]
  },
  {
    id: "int_greek_yogurt",
    nameEn: "Plain Low-Fat Greek Yogurt (زبادي يوناني)",
    nameAr: "زبادي يوناني قليل الدسم",
    category: "Dairy",
    cuisine: "International",
    caloriesPer100g: 73,
    proteinPer100g: 10.0,
    carbsPer100g: 3.8,
    fatPer100g: 1.9,
    defaultServingGrams: 170,
    servingUnitEn: "cup (170g)",
    servingUnitAr: "كوب (170 جرام)",
    substitutes: ["egy_gebna_qareesh", "int_egg_whites"]
  },

  // --- CARBOHYDRATE SOURCES ---
  {
    id: "egy_aesh_baladi",
    nameEn: "Egyptian Whole Wheat Baladi Bread (عيش بلدي)",
    nameAr: "رغيف عيش بلدي أسمر مصر",
    category: "Carbohydrates",
    cuisine: "Egyptian",
    caloriesPer100g: 250,
    proteinPer100g: 9.0,
    carbsPer100g: 50.0,
    fatPer100g: 1.2,
    defaultServingGrams: 100,
    servingUnitEn: "1 medium loaf (100g)",
    servingUnitAr: "رغيف متوسط (100 جرام)",
    substitutes: ["int_oats_raw", "int_rice_basmati_cooked", "int_sweet_potato_baked"]
  },
  {
    id: "int_rice_basmati_cooked",
    nameEn: "Cooked Basmati Rice (أرز بسمتي مطبوخ)",
    nameAr: "أرز بسمتي مسلوق بدون زيت",
    category: "Carbohydrates",
    cuisine: "International",
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28.2,
    fatPer100g: 0.3,
    defaultServingGrams: 150,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["int_sweet_potato_baked", "egy_aesh_baladi", "int_oats_raw"]
  },
  {
    id: "int_sweet_potato_baked",
    nameEn: "Baked Sweet Potato (بطاطا حلوة مشوية)",
    nameAr: "بطاطا حلوة مصرية مشوية",
    category: "Carbohydrates",
    cuisine: "Egyptian",
    caloriesPer100g: 90,
    proteinPer100g: 2.0,
    carbsPer100g: 20.7,
    fatPer100g: 0.1,
    defaultServingGrams: 200,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["int_rice_basmati_cooked", "int_potatoes_boiled"]
  },
  {
    id: "int_potatoes_boiled",
    nameEn: "Boiled White Potatoes (بطاطس مسلوقة)",
    nameAr: "بطاطس بيضاء مسلوقة",
    category: "Carbohydrates",
    cuisine: "International",
    caloriesPer100g: 87,
    proteinPer100g: 1.9,
    carbsPer100g: 20.1,
    fatPer100g: 0.1,
    defaultServingGrams: 200,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["int_sweet_potato_baked", "int_rice_basmati_cooked"]
  },
  {
    id: "int_oats_raw",
    nameEn: "Whole Grain Rolled Oats (شوفان كامل الحبة)",
    nameAr: "شوفان كامل الحبة خام",
    category: "Carbohydrates",
    cuisine: "International",
    caloriesPer100g: 389,
    proteinPer100g: 16.9,
    carbsPer100g: 66.3,
    fatPer100g: 6.9,
    defaultServingGrams: 60,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["egy_aesh_baladi", "int_rice_basmati_cooked"]
  },
  {
    id: "arb_dates_siwi",
    nameEn: "Egyptian Siwi Dates (تمر سيوى)",
    nameAr: "تمر سيوى طبيعي",
    category: "Carbohydrates",
    cuisine: "Arabic",
    caloriesPer100g: 282,
    proteinPer100g: 2.5,
    carbsPer100g: 75.0,
    fatPer100g: 0.4,
    defaultServingGrams: 40,
    servingUnitEn: "3 medium dates (40g)",
    servingUnitAr: "3 حبات تمر متوسطة",
    substitutes: ["int_banana_fresh"]
  },
  {
    id: "int_banana_fresh",
    nameEn: "Fresh Banana (موز طازج)",
    nameAr: "موز بلدي طازج",
    category: "Carbohydrates",
    cuisine: "International",
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    defaultServingGrams: 120,
    servingUnitEn: "1 medium banana (120g)",
    servingUnitAr: "ثمرة موز متوسطة",
    substitutes: ["arb_dates_siwi"]
  },

  // --- HEALTHY FATS ---
  {
    id: "int_olive_oil_extra_virgin",
    nameEn: "Extra Virgin Olive Oil (زيت زيتون بكر ممتاز)",
    nameAr: "زيت زيتون بكر ممتاز معصور بارد",
    category: "Fats",
    cuisine: "International",
    caloriesPer100g: 884,
    proteinPer100g: 0.0,
    carbsPer100g: 0.0,
    fatPer100g: 100.0,
    defaultServingGrams: 10,
    servingUnitEn: "1 tbsp (10g)",
    servingUnitAr: "ملعقة طعام كبيرة (10 جرام)",
    substitutes: ["int_peanut_butter_pure", "int_almonds_raw"]
  },
  {
    id: "int_peanut_butter_pure",
    nameEn: "Natural 100% Peanut Butter (زبدة فول سوداني طبيعية)",
    nameAr: "زبدة فول سوداني نقية 100%",
    category: "Fats",
    cuisine: "International",
    caloriesPer100g: 588,
    proteinPer100g: 25.0,
    carbsPer100g: 20.0,
    fatPer100g: 50.0,
    defaultServingGrams: 20,
    servingUnitEn: "1 tbsp (20g)",
    servingUnitAr: "ملعقة كبيرة (20 جرام)",
    substitutes: ["int_almonds_raw", "int_olive_oil_extra_virgin"]
  },
  {
    id: "int_almonds_raw",
    nameEn: "Raw Whole Almonds (لوز نيء)",
    nameAr: "لوز غير محمص وغير مملح",
    category: "Fats",
    cuisine: "International",
    caloriesPer100g: 579,
    proteinPer100g: 21.2,
    carbsPer100g: 21.7,
    fatPer100g: 49.9,
    defaultServingGrams: 25,
    servingUnitEn: "handful (25g)",
    servingUnitAr: "قبضة يد (25 جرام)",
    substitutes: ["int_peanut_butter_pure", "arb_tahini_sesame"]
  },
  {
    id: "arb_tahini_sesame",
    nameEn: "Pure Sesame Tahini (طحينة سمسم خام)",
    nameAr: "طحينة سمسم ناصعة خام",
    category: "Fats",
    cuisine: "Arabic",
    caloriesPer100g: 595,
    proteinPer100g: 17.0,
    carbsPer100g: 21.0,
    fatPer100g: 53.0,
    defaultServingGrams: 15,
    servingUnitEn: "1 tbsp (15g)",
    servingUnitAr: "ملعقة طعام (15 جرام)",
    substitutes: ["int_olive_oil_extra_virgin", "int_peanut_butter_pure"]
  },

  // --- VEGETABLES ---
  {
    id: "egy_molokhia_cooked",
    nameEn: "Egyptian Cooked Molokhia (ملوخية خضراء)",
    nameAr: "ملوخية خضراء بمرقة دجاج خفيفة",
    category: "Vegetables",
    cuisine: "Egyptian",
    caloriesPer100g: 48,
    proteinPer100g: 3.1,
    carbsPer100g: 6.2,
    fatPer100g: 1.5,
    defaultServingGrams: 200,
    servingUnitEn: "bowl (200g)",
    servingUnitAr: "طبق متوسط (200 جرام)",
    substitutes: ["int_spinach_steamed", "int_broccoli_steamed"]
  },
  {
    id: "int_broccoli_steamed",
    nameEn: "Steamed Fresh Broccoli (بروكلي مبخر)",
    nameAr: "بروكلي طازج مسلوق على البخار",
    category: "Vegetables",
    cuisine: "International",
    caloriesPer100g: 35,
    proteinPer100g: 2.4,
    carbsPer100g: 7.2,
    fatPer100g: 0.4,
    defaultServingGrams: 150,
    servingUnitEn: "grams",
    servingUnitAr: "جرام",
    substitutes: ["int_green_salad_mixed", "egy_molokhia_cooked"]
  },
  {
    id: "int_green_salad_mixed",
    nameEn: "Egyptian Mixed Green Salad (سلطة خضراء بلدي)",
    nameAr: "سلطة خضراء (طماطم، خيار، جرجير، بقدونس، ليمون)",
    category: "Vegetables",
    cuisine: "Egyptian",
    caloriesPer100g: 22,
    proteinPer100g: 1.2,
    carbsPer100g: 4.5,
    fatPer100g: 0.2,
    defaultServingGrams: 200,
    servingUnitEn: "large bowl (200g)",
    servingUnitAr: "طبق سلطة كبير (200 جرام)",
    substitutes: ["int_broccoli_steamed"]
  }
];

export function findFoodInDatabase(foodNameOrId: string): FoodItemData | undefined {
  const query = foodNameOrId.toLowerCase().trim();
  return NUTRITION_DATABASE.find(
    item =>
      item.id.toLowerCase() === query ||
      item.nameEn.toLowerCase().includes(query) ||
      item.nameAr.toLowerCase().includes(query)
  );
}

export function calculateMacrosForGrams(food: FoodItemData, grams: number) {
  const ratio = grams / 100;
  return {
    calories: Math.round(food.caloriesPer100g * ratio),
    protein: Number((food.proteinPer100g * ratio).toFixed(1)),
    carbs: Number((food.carbsPer100g * ratio).toFixed(1)),
    fat: Number((food.fatPer100g * ratio).toFixed(1))
  };
}

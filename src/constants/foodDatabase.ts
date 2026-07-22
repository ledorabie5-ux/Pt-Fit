export interface FoodDatabaseItem {
  id: string;
  nameEn: string;
  nameAr: string;
  category: "Protein" | "Carbs" | "Fats" | "Dairy" | "Fruits & Veggies";
  servingUnitEn: string;
  servingUnitAr: string;
  servingGrams: number; // e.g., 100 for 100g, or weight of 1 unit
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export const FOOD_DATABASE: FoodDatabaseItem[] = [
  // PROTEINS
  {
    id: "chicken_breast",
    nameEn: "Chicken Breast (Cooked)",
    nameAr: "صدور دجاج مطبوخة",
    category: "Protein",
    servingUnitEn: "100g",
    servingUnitAr: "100 جم",
    servingGrams: 100,
    calories: 165,
    protein: 31,
    carbs: 0,
    fats: 3.6
  },
  {
    id: "whole_egg",
    nameEn: "Whole Large Egg",
    nameAr: "بيضة كاملة كبيرة",
    category: "Protein",
    servingUnitEn: "1 egg (~50g)",
    servingUnitAr: "بيضة واحدة (~50 جم)",
    servingGrams: 50,
    calories: 72,
    protein: 6.3,
    carbs: 0.4,
    fats: 4.8
  },
  {
    id: "egg_white",
    nameEn: "Egg White",
    nameAr: "بياض بيض",
    category: "Protein",
    servingUnitEn: "1 egg white (~33g)",
    servingUnitAr: "بياض بيضة واحدة (~33 جم)",
    servingGrams: 33,
    calories: 17,
    protein: 3.6,
    carbs: 0.2,
    fats: 0.1
  },
  {
    id: "salmon_fillet",
    nameEn: "Salmon Fillet (Cooked)",
    nameAr: "شريحة سلمون مطبوخة",
    category: "Protein",
    servingUnitEn: "100g",
    servingUnitAr: "100 جم",
    servingGrams: 100,
    calories: 206,
    protein: 22,
    carbs: 0,
    fats: 12
  },
  {
    id: "canned_tuna",
    nameEn: "Canned Tuna in Water",
    nameAr: "تونة علب في الماء",
    category: "Protein",
    servingUnitEn: "100g",
    servingUnitAr: "100 جم",
    servingGrams: 100,
    calories: 116,
    protein: 26,
    carbs: 0,
    fats: 1
  },
  {
    id: "beef_steak",
    nameEn: "Lean Beef Steak",
    nameAr: "لحم بقر صافي مشوي",
    category: "Protein",
    servingUnitEn: "100g",
    servingUnitAr: "100 جم",
    servingGrams: 100,
    calories: 215,
    protein: 26,
    carbs: 0,
    fats: 11
  },
  {
    id: "whey_protein",
    nameEn: "Whey Protein Isolate",
    nameAr: "واي بروتين أيزوليت",
    category: "Protein",
    servingUnitEn: "1 Scoop (30g)",
    servingUnitAr: "سكوب واحد (30 جم)",
    servingGrams: 30,
    calories: 115,
    protein: 25,
    carbs: 1,
    fats: 0.5
  },
  {
    id: "turkey_breast",
    nameEn: "Turkey Breast Slices",
    nameAr: "شرائح صدر رومي",
    category: "Protein",
    servingUnitEn: "100g",
    servingUnitAr: "100 جم",
    servingGrams: 100,
    calories: 135,
    protein: 28,
    carbs: 0.5,
    fats: 2
  },

  // CARBS
  {
    id: "white_rice",
    nameEn: "White Rice (Cooked)",
    nameAr: "أرز أبيض مطبوخ",
    category: "Carbs",
    servingUnitEn: "100g",
    servingUnitAr: "100 جم",
    servingGrams: 100,
    calories: 130,
    protein: 2.7,
    carbs: 28,
    fats: 0.3
  },
  {
    id: "basmati_rice",
    nameEn: "Brown Basmati Rice (Cooked)",
    nameAr: "أرز بني بسمتي مطبوخ",
    category: "Carbs",
    servingUnitEn: "100g",
    servingUnitAr: "100 جم",
    servingGrams: 100,
    calories: 112,
    protein: 2.5,
    carbs: 24,
    fats: 0.8
  },
  {
    id: "rolled_oats",
    nameEn: "Rolled Oats (Dry)",
    nameAr: "شوفان جاف",
    category: "Carbs",
    servingUnitEn: "50g",
    servingUnitAr: "50 جم",
    servingGrams: 50,
    calories: 190,
    protein: 7,
    carbs: 33,
    fats: 3.2
  },
  {
    id: "sweet_potato",
    nameEn: "Baked Sweet Potato",
    nameAr: "بطاطس حلوة مشوية",
    category: "Carbs",
    servingUnitEn: "100g",
    servingUnitAr: "100 جم",
    servingGrams: 100,
    calories: 86,
    protein: 1.6,
    carbs: 20,
    fats: 0.1
  },
  {
    id: "white_potato",
    nameEn: "Boiled White Potato",
    nameAr: "بطاطس مسلوقة",
    category: "Carbs",
    servingUnitEn: "100g",
    servingUnitAr: "100 جم",
    servingGrams: 100,
    calories: 87,
    protein: 1.9,
    carbs: 20,
    fats: 0.1
  },
  {
    id: "whole_wheat_toast",
    nameEn: "Whole Wheat Bread Slice",
    nameAr: "شريحة توست بني شواهد",
    category: "Carbs",
    servingUnitEn: "1 slice (~35g)",
    servingUnitAr: "شريحة توست (~35 جم)",
    servingGrams: 35,
    calories: 80,
    protein: 4,
    carbs: 14,
    fats: 1
  },
  {
    id: "rice_cakes",
    nameEn: "Plain Rice Cakes",
    nameAr: "أقراص كعك الأرز",
    category: "Carbs",
    servingUnitEn: "2 cakes (~18g)",
    servingUnitAr: "قرصان رز (~18 جم)",
    servingGrams: 18,
    calories: 70,
    protein: 1.5,
    carbs: 15,
    fats: 0.5
  },
  {
    id: "banana",
    nameEn: "Medium Banana",
    nameAr: "موزة متوسطة الحجم",
    category: "Carbs",
    servingUnitEn: "1 banana (~118g)",
    servingUnitAr: "ثمرة موز (~118 جم)",
    servingGrams: 118,
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fats: 0.3
  },

  // DAIRY
  {
    id: "greek_yogurt_nonfat",
    nameEn: "Non-fat Plain Greek Yogurt",
    nameAr: "زبادي يوناني خالي الدسم",
    category: "Dairy",
    servingUnitEn: "100g",
    servingUnitAr: "100 جم",
    servingGrams: 100,
    calories: 59,
    protein: 10,
    carbs: 3.6,
    fats: 0.4
  },
  {
    id: "cottage_cheese",
    nameEn: "Low-fat Cottage Cheese",
    nameAr: "جبن قريش / كوتاج خفيف الدسم",
    category: "Dairy",
    servingUnitEn: "100g",
    servingUnitAr: "100 جم",
    servingGrams: 100,
    calories: 82,
    protein: 11,
    carbs: 3.4,
    fats: 2.3
  },
  {
    id: "skim_milk",
    nameEn: "Skim Milk",
    nameAr: "حليب خالي الدسم",
    category: "Dairy",
    servingUnitEn: "200ml",
    servingUnitAr: "200 مل",
    servingGrams: 200,
    calories: 70,
    protein: 7,
    carbs: 10,
    fats: 0.2
  },

  // HEALTHY FATS
  {
    id: "raw_almonds",
    nameEn: "Raw Almonds",
    nameAr: "لوز نيئ",
    category: "Fats",
    servingUnitEn: "28g (1 oz)",
    servingUnitAr: "28 جم (حفنة يد)",
    servingGrams: 28,
    calories: 160,
    protein: 6,
    carbs: 6,
    fats: 14
  },
  {
    id: "extra_virgin_olive_oil",
    nameEn: "Extra Virgin Olive Oil",
    nameAr: "زيت زيتون بكر ممتاز",
    category: "Fats",
    servingUnitEn: "1 tbsp (14g)",
    servingUnitAr: "ملعقة طعام (14 جم)",
    servingGrams: 14,
    calories: 120,
    protein: 0,
    carbs: 0,
    fats: 14
  },
  {
    id: "peanut_butter",
    nameEn: "Natural Peanut Butter",
    nameAr: "زبدة فول سوداني طبيعية",
    category: "Fats",
    servingUnitEn: "1 tbsp (16g)",
    servingUnitAr: "ملعقة طعام (16 جم)",
    servingGrams: 16,
    calories: 95,
    protein: 4,
    carbs: 3,
    fats: 8
  },
  {
    id: "avocado",
    nameEn: "Fresh Avocado",
    nameAr: "أفوكادو طازج",
    category: "Fats",
    servingUnitEn: "50g (1/3 avocado)",
    servingUnitAr: "50 جم (ثلث ثمرة)",
    servingGrams: 50,
    calories: 80,
    protein: 1,
    carbs: 4,
    fats: 7.3
  }
];

export function getFoodItemCalculated(foodId: string, gramsOrUnits: number) {
  const item = FOOD_DATABASE.find(f => f.id === foodId);
  if (!item) return null;
  const ratio = gramsOrUnits / item.servingGrams;
  return {
    nameEn: item.nameEn,
    nameAr: item.nameAr,
    calories: Math.round(item.calories * ratio),
    protein: Math.round((item.protein * ratio) * 10) / 10,
    carbs: Math.round((item.carbs * ratio) * 10) / 10,
    fats: Math.round((item.fats * ratio) * 10) / 10
  };
}

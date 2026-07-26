import React from "react";
import { DietMeal } from "../types";
import { Language } from "../utils/translations";
import { Apple, CheckCircle } from "lucide-react";

interface TraineeDietViewProps {
  dietMeals: DietMeal[];
  lang: Language;
}

interface ParsedFoodItem {
  name: string;
  quantity?: string;
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
}

interface ParsedMealMacros {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
}

function parseFoodItems(foodItemsText: string): ParsedFoodItem[] {
  if (!foodItemsText) return [];
  const lines = foodItemsText.split("\n").map(l => l.trim()).filter(Boolean);

  return lines.map(line => {
    // Clean bullet points
    const cleaned = line.replace(/^[•\-\*\d\.\)]+\s*/, "").trim();

    // Check standard AI format: "Food Name: 200g (260 kcal | P:4.8g, C:56.4g, F:0.6g)"
    const matchFull = cleaned.match(/^([^:]+):\s*([^(]+)(?:\(([^|]+)\|\s*P:([^,]+),\s*C:([^,]+),\s*F:([^)]+)\))?/i);
    if (matchFull) {
      return {
        name: matchFull[1].trim(),
        quantity: matchFull[2].trim(),
        calories: matchFull[3] ? matchFull[3].trim() : undefined,
        protein: matchFull[4] ? matchFull[4].trim() : undefined,
        carbs: matchFull[5] ? matchFull[5].trim() : undefined,
        fat: matchFull[6] ? matchFull[6].trim() : undefined,
      };
    }

    // Check format with parenthesis but no colon: "Oats 100g (350 kcal | P:12g, C:60g, F:6g)"
    const matchNoColon = cleaned.match(/^([^(]+)(?:\(([^|]+)\|\s*P:([^,]+),\s*C:([^,]+),\s*F:([^)]+)\))?/i);
    if (matchNoColon && matchNoColon[3]) {
      return {
        name: matchNoColon[1].trim(),
        calories: matchNoColon[2] ? matchNoColon[2].trim() : undefined,
        protein: matchNoColon[3] ? matchNoColon[3].trim() : undefined,
        carbs: matchNoColon[4] ? matchNoColon[4].trim() : undefined,
        fat: matchNoColon[5] ? matchNoColon[5].trim() : undefined,
      };
    }

    // If string has a quantity like "200g" or "2 eggs" or "200 جرام"
    const qtyMatch = cleaned.match(/^(.+?)\s*[-:]?\s*(\d+\s*(?:g|gram|grams|ml|oz|جرام|بيضات|قطع|حبة|حبات|كوب))(?:\s+(.*))?$/i);
    if (qtyMatch) {
      return {
        name: qtyMatch[1].trim(),
        quantity: qtyMatch[2].trim(),
      };
    }

    return { name: cleaned };
  });
}

function parseMealMacros(caloriesText?: string): ParsedMealMacros | null {
  if (!caloriesText) return null;
  // e.g. "2450 kcal (P: 180g, C: 250g, F: 60g)"
  const match = caloriesText.match(/^([^(]+)(?:\(P:\s*([^,]+),\s*C:\s*([^,]+),\s*F:\s*([^)]+)\))?/i);
  if (match) {
    return {
      calories: match[1]?.trim(),
      protein: match[2]?.trim(),
      carbs: match[3]?.trim(),
      fat: match[4]?.trim()
    };
  }
  return { calories: caloriesText };
}

export default function TraineeDietView({ dietMeals, lang }: TraineeDietViewProps) {
  const isAr = lang === "ar";

  if (!dietMeals || dietMeals.length === 0) {
    return (
      <div className="text-center py-16 bg-neutral-950 border border-dashed border-neutral-800 rounded-2xl text-neutral-500 text-xs">
        {isAr ? "لم يتم إسناد نظام غذائي لك بعد." : "No nutrition plan assigned yet."}
      </div>
    );
  }

  // Calculate totals across meals if numbers exist
  let grandCalories = 0;
  let grandProtein = 0;
  let grandCarbs = 0;
  let grandFat = 0;
  let hasParsedTotals = false;

  dietMeals.forEach(meal => {
    const macros = parseMealMacros(meal.calories);
    if (macros) {
      if (macros.calories) {
        const calNum = parseFloat(macros.calories.replace(/[^\d.]/g, ""));
        if (!isNaN(calNum)) { grandCalories += calNum; hasParsedTotals = true; }
      }
      if (macros.protein) {
        const pNum = parseFloat(macros.protein.replace(/[^\d.]/g, ""));
        if (!isNaN(pNum)) grandProtein += pNum;
      }
      if (macros.carbs) {
        const cNum = parseFloat(macros.carbs.replace(/[^\d.]/g, ""));
        if (!isNaN(cNum)) grandCarbs += cNum;
      }
      if (macros.fat) {
        const fNum = parseFloat(macros.fat.replace(/[^\d.]/g, ""));
        if (!isNaN(fNum)) grandFat += fNum;
      }
    }
  });

  return (
    <div className="space-y-6">
      
      {/* DAILY NUTRITION OVERVIEW BANNER */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-950 border border-emerald-800/60 text-emerald-400 rounded-2xl shadow-inner">
              <Apple className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  {isAr ? "النظام الغذائي المعتمد" : "Assigned Nutrition Plan"}
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-800/50 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {isAr ? "نشط وموثق" : "ACTIVE"}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {isAr
                  ? `جدول وجباتك اليومية المصمم خصيصاً لمستواك ومستهدفك (${dietMeals.length} وجبات)`
                  : `Your personalized daily meal plan built for your targets (${dietMeals.length} meals)`}
              </p>
            </div>
          </div>

          {hasParsedTotals && grandCalories > 0 && (
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl font-mono text-xs">
              <div className="text-right">
                <span className="text-[10px] text-neutral-500 uppercase block">{isAr ? "إجمالي اليوم" : "Daily Total"}</span>
                <span className="text-amber-400 font-extrabold text-sm">{Math.round(grandCalories)} kcal</span>
              </div>
              <div className="h-6 w-px bg-neutral-800 mx-1"></div>
              <div className="text-left text-[11px] text-neutral-300 font-semibold space-y-0.5">
                <div>P: <span className="text-emerald-400 font-bold">{Math.round(grandProtein)}g</span></div>
                <div>C: <span className="text-cyan-400 font-bold">{Math.round(grandCarbs)}g</span> | F: <span className="text-rose-400 font-bold">{Math.round(grandFat)}g</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MEALS CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {dietMeals.map((meal, mealIdx) => {
          const foods = parseFoodItems(meal.foodItems);
          const mealMacros = parseMealMacros(meal.calories);

          return (
            <div 
              key={meal.id || mealIdx} 
              className="bg-neutral-950 border border-neutral-800 hover:border-emerald-900/60 rounded-2xl p-5 space-y-4 shadow-2xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* MEAL HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-900 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-neutral-950 font-black text-sm flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
                      {mealIdx + 1}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-base leading-tight">{meal.mealName}</h4>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {foods.length} {isAr ? "مكونات غذائية" : "food items"}
                      </span>
                    </div>
                  </div>

                  {mealMacros && (
                    <div className="flex items-center gap-2 text-xs font-bold font-mono bg-neutral-900/90 border border-neutral-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                      {mealMacros.calories && <span className="text-amber-400">🔥 {mealMacros.calories}</span>}
                    </div>
                  )}
                </div>

                {/* FOODS & QUANTITIES LIST */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                    {isAr ? "مكونات الوجبة والكميات:" : "Meal Foods & Portions:"}
                  </span>

                  {foods.map((food, foodIdx) => (
                    <div 
                      key={foodIdx} 
                      className="bg-neutral-900/80 border border-neutral-850/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-neutral-750 transition-all"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                        <div>
                          <span className="text-xs font-bold text-white block leading-snug">{food.name}</span>
                          {food.quantity && (
                            <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/80 border border-emerald-800/40 px-2 py-0.5 rounded-md inline-block mt-1">
                              ⚖️ {food.quantity}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* INDIVIDUAL FOOD MACROS IF PRESENT */}
                      {(food.calories || food.protein || food.carbs || food.fat) && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 self-end sm:self-auto">
                          {food.calories && <span className="text-amber-400 font-bold">{food.calories}</span>}
                          {food.protein && <span className="text-emerald-400 font-semibold">P: {food.protein}</span>}
                          {food.carbs && <span className="text-cyan-400 font-semibold">C: {food.carbs}</span>}
                          {food.fat && <span className="text-rose-400 font-semibold">F: {food.fat}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* MEAL MACROS BREAKDOWN FOOTER */}
              {mealMacros && (mealMacros.calories || mealMacros.protein || mealMacros.carbs || mealMacros.fat) && (
                <div className="pt-3 border-t border-neutral-900 grid grid-cols-4 gap-2 text-center text-[11px]">
                  <div className="bg-neutral-900 p-2 rounded-xl border border-neutral-850">
                    <span className="text-neutral-500 block text-[9px] uppercase font-mono">{isAr ? "السعرات" : "Calories"}</span>
                    <span className="text-amber-400 font-extrabold text-xs">{mealMacros.calories || "--"}</span>
                  </div>
                  <div className="bg-neutral-900 p-2 rounded-xl border border-neutral-850">
                    <span className="text-neutral-500 block text-[9px] uppercase font-mono">{isAr ? "البروتين" : "Protein"}</span>
                    <span className="text-emerald-400 font-extrabold text-xs">{mealMacros.protein || "--"}</span>
                  </div>
                  <div className="bg-neutral-900 p-2 rounded-xl border border-neutral-850">
                    <span className="text-neutral-500 block text-[9px] uppercase font-mono">{isAr ? "الكارب" : "Carbs"}</span>
                    <span className="text-cyan-400 font-extrabold text-xs">{mealMacros.carbs || "--"}</span>
                  </div>
                  <div className="bg-neutral-900 p-2 rounded-xl border border-neutral-850">
                    <span className="text-neutral-500 block text-[9px] uppercase font-mono">{isAr ? "الدهون" : "Fat"}</span>
                    <span className="text-rose-400 font-extrabold text-xs">{mealMacros.fat || "--"}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/ai/nutrition-plan", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing" });
      }

      const {
        height,
        weight,
        age,
        gender,
        goal,
        activityLevel,
        dietaryPreferences,
        lang = "en"
      } = req.body;

      if (!height || !weight || !age || !gender || !goal || !activityLevel) {
        return res.status(400).json({
          error: "Missing required fields: height, weight, age, gender, goal, activityLevel"
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      // 1. Programmatic calculation of BMR, TDEE, and Target Macros for instant performance
      let bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + (gender.toLowerCase().includes("female") || gender === "أنثى" ? -161 : 5));

      let activityMultiplier = 1.375;
      const actLower = (activityLevel || "").toLowerCase();
      if (actLower.includes("sedentary") || actLower.includes("خامل")) activityMultiplier = 1.2;
      else if (actLower.includes("light") || actLower.includes("خفيف")) activityMultiplier = 1.375;
      else if (actLower.includes("moderate") || actLower.includes("متوسط")) activityMultiplier = 1.55;
      else if (actLower.includes("very") || actLower.includes("عالي")) activityMultiplier = 1.725;
      else if (actLower.includes("extra") || actLower.includes("شديد")) activityMultiplier = 1.9;

      const tdee = Math.round(bmr * activityMultiplier);

      let dailyCalories = tdee;
      const goalLower = (goal || "").toLowerCase();
      if (goalLower.includes("bulk") || goalLower.includes("تضخيم") || goalLower.includes("زيادة")) {
        dailyCalories = Math.round(tdee * 1.15);
      } else if (goalLower.includes("cut") || goalLower.includes("تنشيف") || goalLower.includes("خسارة") || goalLower.includes("إنقاص")) {
        dailyCalories = Math.round(tdee * 0.8);
      }

      const proteinGrams = Math.round(weight * 2.1);
      const fatsGrams = Math.round((dailyCalories * 0.25) / 9);
      const carbsGrams = Math.max(0, Math.round((dailyCalories - (proteinGrams * 4 + fatsGrams * 9)) / 4));

      const languageInstruction = lang === "ar"
        ? "Respond strictly in Arabic for all food names, meal titles, and summaries."
        : "Respond strictly in English for all food names, meal titles, and summaries.";

      const prompt = `You are an expert sports nutritionist. Generate a structured 4-meal plan (Breakfast, Lunch, Snack, Dinner) matching these exact targets:
- Daily Calories: ${dailyCalories} kcal
- Protein: ${proteinGrams}g | Carbs: ${carbsGrams}g | Fats: ${fatsGrams}g
- Goal: ${goal} | Preferences: ${dietaryPreferences || "None"}

Output Rules:
1. Provide exactly 4 meals: Breakfast, Lunch, Snack, Dinner.
2. For each meal, list 2 to 3 simple food items in 'foods' with explicit quantities (e.g., "150g rice", "3 eggs", "150g chicken breast").
3. Ensure all text values are single-line strings without linebreaks or raw double quotes.
4. Summary should be 1 short sentence.

${languageInstruction}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 3000,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              meals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    mealName: { type: Type.STRING },
                    calories: { type: Type.NUMBER },
                    protein: { type: Type.NUMBER },
                    carbs: { type: Type.NUMBER },
                    fats: { type: Type.NUMBER },
                    foods: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          quantity: { type: Type.STRING },
                          calories: { type: Type.NUMBER },
                          protein: { type: Type.NUMBER }
                        },
                        required: ["name", "quantity", "calories", "protein"]
                      }
                    }
                  },
                  required: ["mealName", "calories", "protein", "carbs", "fats", "foods"]
                }
              }
            },
            required: ["summary", "meals"]
          }
        }
      });

      const responseText = response.text || "";
      if (!responseText) {
        throw new Error("No output text received from Gemini API");
      }

      let parsedData: any = null;
      try {
        let cleaned = responseText.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        }
        const startIdx = cleaned.indexOf("{");
        const endIdx = cleaned.lastIndexOf("}");
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          cleaned = cleaned.substring(startIdx, endIdx + 1);
        }
        parsedData = JSON.parse(cleaned);
      } catch (parseErr) {
        console.warn("JSON parsing warning, attempting regex recovery or fallback:", parseErr);
        try {
          const sanitized = responseText.replace(/[\r\n]+/g, " ");
          const startIdx = sanitized.indexOf("{");
          const endIdx = sanitized.lastIndexOf("}");
          if (startIdx !== -1 && endIdx !== -1) {
            parsedData = JSON.parse(sanitized.substring(startIdx, endIdx + 1));
          }
        } catch (e2) {
          console.error("Failed to parse AI response JSON, generating fallback plan", responseText);
        }
      }

      const isAr = lang === "ar";

      // Fallback if parsing completely failed
      if (!parsedData || !Array.isArray(parsedData.meals) || parsedData.meals.length === 0) {
        const pMeal = Math.round(proteinGrams / 4);
        const cMeal = Math.round(carbsGrams / 4);
        const fMeal = Math.round(fatsGrams / 4);
        const calMeal = Math.round(dailyCalories / 4);

        parsedData = {
          summary: isAr ? `خطة تغذية مخصصة بناءً على هدف ${goal}` : `Personalized ${dailyCalories} kcal nutrition plan tailored for ${goal}.`,
          meals: [
            {
              mealName: isAr ? "الإفطار" : "Breakfast",
              calories: calMeal,
              protein: pMeal,
              carbs: cMeal,
              fats: fMeal,
              foods: [
                { name: isAr ? "بيض كامل" : "Whole Eggs", quantity: isAr ? "3 حبات" : "3 large eggs", calories: 210, protein: 18 },
                { name: isAr ? "شوفان بحليب خالي الدسم" : "Oatmeal with skim milk", quantity: isAr ? "60 جم" : "60g oats", calories: 220, protein: 8 }
              ]
            },
            {
              mealName: isAr ? "الغداء" : "Lunch",
              calories: calMeal,
              protein: pMeal,
              carbs: cMeal,
              fats: fMeal,
              foods: [
                { name: isAr ? "صدور دجاج مشوية" : "Grilled Chicken Breast", quantity: isAr ? "150 جم" : "150g chicken", calories: 240, protein: 32 },
                { name: isAr ? "أرز أبيض مطبوخ" : "Cooked White Rice", quantity: isAr ? "180 جم" : "180g rice", calories: 230, protein: 4 }
              ]
            },
            {
              mealName: isAr ? "وجبة خفيفة" : "Snack",
              calories: calMeal,
              protein: pMeal,
              carbs: cMeal,
              fats: fMeal,
              foods: [
                { name: isAr ? "زبادي يوناني" : "Greek Yogurt", quantity: isAr ? "200 جم" : "200g yogurt", calories: 150, protein: 18 },
                { name: isAr ? "لوز نيئ" : "Raw Almonds", quantity: isAr ? "25 جم" : "25g almonds", calories: 160, protein: 6 }
              ]
            },
            {
              mealName: isAr ? "العشاء" : "Dinner",
              calories: calMeal,
              protein: pMeal,
              carbs: cMeal,
              fats: fMeal,
              foods: [
                { name: isAr ? "شريحة سلمون" : "Salmon Fillet", quantity: isAr ? "150 جم" : "150g salmon", calories: 280, protein: 28 },
                { name: isAr ? "بطاطس حلوة مشوية" : "Baked Sweet Potato", quantity: isAr ? "150 جم" : "150g sweet potato", calories: 130, protein: 2 }
              ]
            }
          ]
        };
      }

      const formattedMeals = (parsedData.meals || []).map((m: any, idx: number) => {
        const foods = (m.foods || []).map((f: any, fIdx: number) => ({
          id: `f_${Date.now()}_${idx}_${fIdx}`,
          name: f.name || "Food Item",
          quantity: f.quantity || "1 serving",
          calories: Number(f.calories) || 0,
          protein: Number(f.protein) || 0,
          carbs: Number(f.carbs) || 0,
          fats: Number(f.fats) || 0
        }));

        const foodItemsStr = foods.map((f: any) => `${f.quantity} ${f.name}`).join("\n");

        return {
          id: `meal_${Date.now()}_${idx}`,
          mealName: m.mealName || `Meal ${idx + 1}`,
          calories: Number(m.calories) || 0,
          protein: Number(m.protein) || 0,
          carbs: Number(m.carbs) || 0,
          fats: Number(m.fats) || 0,
          foodItems: foodItemsStr,
          foods
        };
      });

      const resultData = {
        dailyCalories,
        proteinGrams,
        carbsGrams,
        fatsGrams,
        bmr,
        tdee,
        summary: parsedData.summary || "",
        meals: formattedMeals
      };

      return res.json({ success: true, data: resultData });
    } catch (error: any) {
      console.error("AI Nutrition Plan generation error:", error);
      return res.status(500).json({ error: error.message || "Failed to generate nutrition plan" });
    }
  });

  // Single Meal Regeneration Endpoint for instant ~1-2s response
  app.post("/api/ai/single-meal", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing" });
      }

      const {
        mealName = "Meal",
        targetCalories = 600,
        targetProtein = 40,
        targetCarbs = 60,
        targetFats = 15,
        goal = "Bulking",
        dietaryPreferences = "",
        lang = "en"
      } = req.body;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { "User-Agent": "aistudio-build" }
        }
      });

      const languageInstruction = lang === "ar"
        ? "Respond strictly in Arabic for all food names and meal title."
        : "Respond strictly in English for all food names and meal title.";

      const prompt = `You are a sports dietitian. Generate a single healthy ${mealName} matching these exact targets:
Target Calories: ${targetCalories} kcal
Target Protein: ${targetProtein}g | Carbs: ${targetCarbs}g | Fats: ${targetFats}g
Goal: ${goal} | Preferences: ${dietaryPreferences || "None"}

Rules:
1. Provide 2 to 3 healthy food items with exact gram/unit quantities (e.g. 150g cooked rice, 180g chicken breast, 10g olive oil).
2. Calculate realistic macros for each food item.

${languageInstruction}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mealName: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fats: { type: Type.NUMBER },
              foods: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.STRING },
                    calories: { type: Type.NUMBER },
                    protein: { type: Type.NUMBER },
                    carbs: { type: Type.NUMBER },
                    fats: { type: Type.NUMBER }
                  },
                  required: ["name", "quantity", "calories", "protein", "carbs", "fats"]
                }
              }
            },
            required: ["mealName", "calories", "protein", "carbs", "fats", "foods"]
          }
        }
      });

      const responseText = response.text || "";
      if (!responseText) throw new Error("No response text from Gemini API");

      let mData: any = JSON.parse(responseText);

      const foods = (mData.foods || []).map((f: any, fIdx: number) => ({
        id: `f_${Date.now()}_${fIdx}`,
        name: f.name || "Food Item",
        quantity: f.quantity || "100g",
        calories: Number(f.calories) || 0,
        protein: Number(f.protein) || 0,
        carbs: Number(f.carbs) || 0,
        fats: Number(f.fats) || 0
      }));

      const foodItemsStr = foods.map((f: any) => `${f.quantity} ${f.name}`).join("\n");

      const singleMeal = {
        id: `meal_${Date.now()}`,
        mealName: mData.mealName || mealName,
        calories: Number(mData.calories) || targetCalories,
        protein: Number(mData.protein) || targetProtein,
        carbs: Number(mData.carbs) || targetCarbs,
        fats: Number(mData.fats) || targetFats,
        foodItems: foodItemsStr,
        foods
      };

      return res.json({ success: true, meal: singleMeal });
    } catch (error: any) {
      console.error("Single meal regeneration error:", error);
      return res.status(500).json({ error: error.message || "Failed to regenerate meal" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import React, { useState } from "react";
import { WorkoutTemplate, NutritionTemplate, WorkoutDay, Exercise, DietMeal } from "../types";
import { Language } from "../utils/translations";
import { Layers, Trash2, Plus, Dumbbell, Apple, Video, FolderOpen, Upload } from "lucide-react";
import ExerciseLibrarySelector from "./ExerciseLibrarySelector";

interface TemplatesTabProps {
  lang?: Language;
  currentUserId: string;
  workoutTemplates: WorkoutTemplate[];
  nutritionTemplates: NutritionTemplate[];
  loadingTemplates: boolean;
  onCreateWorkoutTemplate: (name: string, days: WorkoutDay[]) => Promise<void>;
  onDeleteWorkoutTemplate: (id: string) => Promise<void>;
  onCreateNutritionTemplate: (name: string, meals: DietMeal[]) => Promise<void>;
  onDeleteNutritionTemplate: (id: string) => Promise<void>;
}

export default function TemplatesTab({
  lang,
  workoutTemplates,
  nutritionTemplates,
  loadingTemplates,
  onCreateWorkoutTemplate,
  onDeleteWorkoutTemplate,
  onCreateNutritionTemplate,
  onDeleteNutritionTemplate
}: TemplatesTabProps) {
  const isAr = lang === "ar";

  // Form State for Workout Template Creation
  const [workoutTplName, setWorkoutTplName] = useState("");
  const [workoutTplDays, setWorkoutTplDays] = useState<WorkoutDay[]>([]);
  const [activeTplDayId, setActiveTplDayId] = useState("");
  const [newExName, setNewExName] = useState("");
  const [newExReps, setNewExReps] = useState("10-12");
  const [newExSets, setNewExSets] = useState(3);
  const [newExNotes, setNewExNotes] = useState("");
  const [newExVideo, setNewExVideo] = useState("");
  const [exerciseSourceMode, setExerciseSourceMode] = useState<"library" | "custom">("library");

  // Form State for Nutrition Template Creation
  const [nutritionTplName, setNutritionTplName] = useState("");
  const [nutritionTplMeals, setNutritionTplMeals] = useState<DietMeal[]>([
    { id: "m1", mealName: isAr ? "الفطور" : "Breakfast", foodItems: "" },
    { id: "m2", mealName: isAr ? "وجبة خفيفة (سناك)" : "Snack", foodItems: "" },
    { id: "m3", mealName: isAr ? "الغداء" : "Lunch", foodItems: "" },
    { id: "m4", mealName: isAr ? "قبل التمرين" : "Pre-workout", foodItems: "" },
    { id: "m5", mealName: isAr ? "بعد التمرين" : "Post-workout", foodItems: "" },
    { id: "m6", mealName: isAr ? "العشاء" : "Dinner", foodItems: "" }
  ]);

  // Workout Day helpers
  const handleAddDay = (dayName: string) => {
    if (!dayName.trim()) return;
    const dayId = "day_" + Date.now();
    const newDay: WorkoutDay = {
      id: dayId,
      dayName: dayName.trim(),
      exercises: []
    };
    setWorkoutTplDays([...workoutTplDays, newDay]);
    setActiveTplDayId(dayId);
  };

  const handleDeleteDay = (dayId: string) => {
    const filtered = workoutTplDays.filter(d => d.id !== dayId);
    setWorkoutTplDays(filtered);
    if (activeTplDayId === dayId) {
      if (filtered.length > 0) {
        setActiveTplDayId(filtered[0].id);
      } else {
        setActiveTplDayId("");
      }
    }
  };

  const handleAddExercise = (dayId: string) => {
    if (!newExName.trim()) return;
    const item: Exercise = {
      name: newExName.trim(),
      sets: newExSets,
      reps: newExReps.trim(),
      notes: newExNotes.trim(),
      videoUrl: newExVideo.trim()
    };
    setWorkoutTplDays(workoutTplDays.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          exercises: [...day.exercises, item]
        };
      }
      return day;
    }));
    setNewExName("");
    setNewExReps("10-12");
    setNewExSets(3);
    setNewExNotes("");
    setNewExVideo("");
  };

  const handleDeleteExercise = (dayId: string, idx: number) => {
    setWorkoutTplDays(workoutTplDays.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          exercises: day.exercises.filter((_, i) => i !== idx)
        };
      }
      return day;
    }));
  };

  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutTplName.trim()) {
      alert(isAr ? "يرجى كتابة اسم لنموذج التمرين." : "Please provide a name for the workout template.");
      return;
    }
    if (workoutTplDays.length === 0) {
      alert(isAr ? "يرجى إضافة يوم واحد وتمرين واحد على الأقل." : "Please add at least one day and exercise.");
      return;
    }
    await onCreateWorkoutTemplate(workoutTplName.trim(), workoutTplDays);
    setWorkoutTplName("");
    setWorkoutTplDays([]);
    setActiveTplDayId("");
  };

  const handleSaveNutrition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nutritionTplName.trim()) {
      alert(isAr ? "يرجى كتابة اسم لنموذج التغذية." : "Please provide a name for the nutrition template.");
      return;
    }
    await onCreateNutritionTemplate(nutritionTplName.trim(), nutritionTplMeals);
    setNutritionTplName("");
    setNutritionTplMeals([
      { id: "m1", mealName: isAr ? "الفطور" : "Breakfast", foodItems: "" },
      { id: "m2", mealName: isAr ? "وجبة خفيفة (سناك)" : "Snack", foodItems: "" },
      { id: "m3", mealName: isAr ? "الغداء" : "Lunch", foodItems: "" },
      { id: "m4", mealName: isAr ? "قبل التمرين" : "Pre-workout", foodItems: "" },
      { id: "m5", mealName: isAr ? "بعد التمرين" : "Post-workout", foodItems: "" },
      { id: "m6", mealName: isAr ? "العشاء" : "Dinner", foodItems: "" }
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h3 className="text-md font-bold text-white flex items-center gap-2">
          <Layers className="text-emerald-400 h-5 w-5" />
          {isAr ? "نماذج البرامج القابلة لإعادة الاستخدام" : "Reusable Training Templates"}
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          {isAr
            ? "أنشئ الخطط الشاملة للتمارين والتغذية مرة واحدة، ثم قم بتعيينها بنقرة واحدة داخل ملفات المتدربين."
            : "Create master workout and nutrition plans only once, then assign them with one click inside Client profiles."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Workout Templates Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg space-y-6">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-neutral-800 pb-2">
              {isAr ? "نماذج برامج التمارين" : "Workout Plan Templates"}
            </h4>
            <p className="text-[11px] text-neutral-400 mt-1">
              {isAr ? "تصميم برامج متعددة الأيام مع استهداف تمارين مخصصة." : "Design multi-day routines with customized exercise targets."}
            </p>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {loadingTemplates ? (
              <p className="text-xs text-neutral-500 italic">{isAr ? "جاري تحميل النماذج..." : "Loading templates..."}</p>
            ) : workoutTemplates.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">{isAr ? "لم يتم إنشاء نماذج تمارين بعد." : "No workout templates built yet."}</p>
            ) : (
              workoutTemplates.map(t => (
                <div key={t.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[9px] text-neutral-500 font-mono">
                      {t.workoutDays.length} {isAr ? "أيام مجهزة" : "Days Structured"}
                    </p>
                  </div>
                  <button onClick={() => onDeleteWorkoutTemplate(t.id)} className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSaveWorkout} className="bg-neutral-950 p-4 border border-neutral-800 rounded-lg space-y-4">
            <h5 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
              {isAr ? "إنشاء نموذج تمارين جديد" : "Create Workout Template"}
            </h5>
            
            <input
              type="text"
              placeholder={isAr ? "اسم النموذج (مثال: تقسيم دفع سحب أرجل)" : "Template Name (e.g. Push Pull Legs Split)"}
              value={workoutTplName}
              onChange={(e) => setWorkoutTplName(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />

            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  id="day-tpl-in"
                  placeholder={isAr ? "مثال: اليوم 1: سحب" : "e.g. Day 1: Pull Day"}
                  className="flex-1 bg-neutral-900 border border-neutral-850 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("day-tpl-in") as HTMLInputElement;
                    if (el && el.value.trim()) {
                      handleAddDay(el.value);
                      el.value = "";
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs px-3.5 rounded transition-all cursor-pointer"
                >
                  + {isAr ? "إضافة يوم" : "Add Day"}
                </button>
              </div>

              {workoutTplDays.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 border border-neutral-800 rounded p-3 bg-neutral-900/30">
                  <div className="md:col-span-4 space-y-1 border-r border-neutral-800 pr-2 max-h-[150px] overflow-y-auto">
                    {workoutTplDays.map(d => (
                      <div
                        key={d.id}
                        className={`p-1.5 rounded text-[10px] font-bold cursor-pointer flex justify-between items-center ${
                          activeTplDayId === d.id ? "bg-emerald-950 text-emerald-400" : "text-neutral-400 hover:bg-neutral-950"
                        }`}
                        onClick={() => setActiveTplDayId(d.id)}
                      >
                        <span className="truncate max-w-[70px]">{d.dayName}</span>
                        <button type="button" onClick={() => handleDeleteDay(d.id)} className="text-neutral-600 hover:text-red-400 ml-1">×</button>
                      </div>
                    ))}
                  </div>

                  <div className="md:col-span-8 space-y-3">
                    {(() => {
                      const activeDayObj = workoutTplDays.find(d => d.id === activeTplDayId);
                      if (!activeDayObj) return <p className="text-[10px] text-neutral-500 italic">{isAr ? "اختر يوماً للتنظيم." : "Select a day to structure."}</p>;
                      return (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-neutral-300">
                            {isAr ? `تمارين ${activeDayObj.dayName}:` : `Exercises for ${activeDayObj.dayName}:`}
                          </p>
                          
                          <div className="space-y-1 max-h-[100px] overflow-y-auto">
                            {activeDayObj.exercises.map((ex, exIdx) => (
                              <div key={exIdx} className="flex justify-between items-center bg-neutral-950 p-1.5 rounded border border-neutral-900 text-[10px]">
                                <span className="truncate">{ex.name} ({ex.sets}x{ex.reps})</span>
                                <button type="button" onClick={() => handleDeleteExercise(activeDayObj.id, exIdx)} className="text-red-500 hover:text-red-400">×</button>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-2 border-t border-neutral-800 pt-3 text-[10px]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-neutral-900 pb-1.5">
                              <span className="font-bold text-neutral-300 font-mono">{isAr ? "إضافة تمرين" : "ADD EXERCISE"}</span>
                              <div className="flex bg-neutral-950 p-0.5 rounded border border-neutral-850 gap-0.5 self-start scale-90 origin-top-left sm:origin-top-right">
                                <button
                                  type="button"
                                  onClick={() => setExerciseSourceMode("library")}
                                  className={`px-2 py-0.5 text-[9px] font-bold rounded-sm transition-all cursor-pointer flex items-center gap-1 ${
                                    exerciseSourceMode === "library"
                                      ? "bg-emerald-600 text-neutral-950"
                                      : "text-neutral-400 hover:text-white"
                                  }`}
                                >
                                  <FolderOpen className="h-2.5 w-2.5" /> {isAr ? "المكتبة" : "Library"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExerciseSourceMode("custom")}
                                  className={`px-2 py-0.5 text-[9px] font-bold rounded-sm transition-all cursor-pointer flex items-center gap-1 ${
                                    exerciseSourceMode === "custom"
                                      ? "bg-emerald-600 text-neutral-950"
                                      : "text-neutral-400 hover:text-white"
                                  }`}
                                >
                                  <Upload className="h-2.5 w-2.5" /> {isAr ? "مخصص" : "Custom"}
                                </button>
                              </div>
                            </div>

                            {/* Sets / Reps targets */}
                            <div className="grid grid-cols-2 gap-1 bg-neutral-900/30 p-1.5 rounded border border-neutral-850">
                              <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-850 rounded px-1.5 py-0.5">
                                <span className="text-[9px] text-neutral-400 font-mono">{isAr ? "الجولات:" : "Sets:"}</span>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder={isAr ? "الجولات" : "Sets"}
                                  value={newExSets}
                                  onChange={(e) => setNewExSets(parseInt(e.target.value) || 3)}
                                  className="w-full bg-transparent border-none text-[10px] text-white focus:outline-none text-center"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder={isAr ? "التكرارات (10-12)" : "Reps (10-12)"}
                                value={newExReps}
                                onChange={(e) => setNewExReps(e.target.value)}
                                className="bg-neutral-950 border border-neutral-850 rounded px-2 py-0.5 text-white text-[10px]"
                              />
                            </div>

                            {exerciseSourceMode === "library" ? (
                              <div className="space-y-2">
                                <ExerciseLibrarySelector
                                  lang={lang}
                                  selectedName={newExName}
                                  selectedVideoUrl={newExVideo}
                                  onSelect={(name, videoUrl) => {
                                    setNewExName(name);
                                    setNewExVideo(videoUrl);
                                  }}
                                  onAddDirectly={(name, videoUrl) => {
                                    const item: Exercise = {
                                      name: name,
                                      sets: newExSets,
                                      reps: newExReps || "10-12",
                                      notes: newExNotes || undefined,
                                      videoUrl: videoUrl
                                    };
                                    setWorkoutTplDays(workoutTplDays.map(day => {
                                      if (day.id === activeDayObj.id) {
                                        return {
                                          ...day,
                                          exercises: [...day.exercises, item]
                                        };
                                      }
                                      return day;
                                    }));
                                    alert(isAr ? `تمت إضافة "${name}" إلى النموذج!` : `Added "${name}" to template!`);
                                  }}
                                />

                                {newExName && (
                                  <div className="bg-neutral-950 p-2 rounded border border-emerald-900/40 flex justify-between items-center text-[10px] animate-in slide-in-from-bottom-1 duration-200">
                                    <div className="truncate pr-2">
                                      <span className="text-neutral-400 text-[8px] block">{isAr ? "المحدد:" : "Selected:"}</span>
                                      <span className="text-white font-bold">{newExName}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleAddExercise(activeDayObj.id)}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold px-2.5 py-0.5 rounded cursor-pointer text-[9px] shrink-0"
                                    >
                                      + {isAr ? "إضافة" : "Add"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bg-neutral-950 p-2.5 border border-neutral-850 rounded-lg space-y-2">
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    placeholder={isAr ? "اسم التمرين المخصص" : "Custom Exercise Name"}
                                    value={newExName}
                                    onChange={(e) => setNewExName(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-white text-[10px]"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    placeholder={isAr ? "رابط فيديو توضيحي (اختياري)" : "Video Demo Link (optional)"}
                                    value={newExVideo}
                                    onChange={(e) => setNewExVideo(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-white text-[10px]"
                                  />
                                </div>
                                
                                <div className="border-t border-neutral-900 pt-1.5">
                                  <span className="text-[8px] text-neutral-500 font-mono block mb-1">
                                    {isAr ? "أو ارفع ملف فيديو:" : "Or Upload Video File:"}
                                  </span>
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const objectUrl = URL.createObjectURL(file);
                                        setNewExVideo(objectUrl);
                                        setNewExName(newExName || file.name.split(".")[0]);
                                        alert(isAr ? `تم تحميل الفيديو "${file.name}" بنجاح!` : `Private video "${file.name}" loaded successfully in template preview!`);
                                      }
                                    }}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded text-[9px] text-neutral-400 file:bg-neutral-850 file:border-none file:text-[8px] file:text-white file:px-1.5 file:py-0.5 file:rounded file:cursor-pointer hover:file:bg-neutral-700"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAddExercise(activeDayObj.id)}
                                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-[9px] py-1 rounded cursor-pointer mt-1"
                                >
                                  + {isAr ? "إضافة تمرين مخصص" : "Add Custom Exercise"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
            >
              {isAr ? "حفظ نموذج التمرين" : "Save Workout Template"}
            </button>
          </form>
        </div>

        {/* Nutrition Templates Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg space-y-6">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-neutral-800 pb-2">
              {isAr ? "نماذج البرامج الغذائية" : "Nutrition Plan Templates"}
            </h4>
            <p className="text-[11px] text-neutral-400 mt-1">
              {isAr ? "إعداد مسبق للأنظمة الغذائية مع تفاصيل الوجبات اليومية." : "Pre-configure nutrition programs with Breakfast, Snack, Lunch, Pre-workout, Post-workout, Dinner meals."}
            </p>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {loadingTemplates ? (
              <p className="text-xs text-neutral-500 italic">{isAr ? "جاري تحميل النماذج..." : "Loading templates..."}</p>
            ) : nutritionTemplates.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">{isAr ? "لم يتم إنشاء نماذج تغذية بعد." : "No nutrition templates built yet."}</p>
            ) : (
              nutritionTemplates.map(t => (
                <div key={t.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[9px] text-neutral-500 font-mono">
                      {t.dietMeals.length} {isAr ? "وجبات مجدولة" : "Scheduled Meals"}
                    </p>
                  </div>
                  <button onClick={() => onDeleteNutritionTemplate(t.id)} className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSaveNutrition} className="bg-neutral-950 p-4 border border-neutral-800 rounded-lg space-y-4">
            <h5 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
              {isAr ? "إنشاء نموذج تغذية جديد" : "Create Nutrition Template"}
            </h5>
            
            <input
              type="text"
              placeholder={isAr ? "اسم النموذج (مثال: نظام كيتو 2800 سعرة)" : "Template Name (e.g. 2800kcal Keto Split)"}
              value={nutritionTplName}
              onChange={(e) => setNutritionTplName(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />

            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
              {nutritionTplMeals.map((meal, mealIdx) => (
                <div key={meal.id} className="space-y-1">
                  <label className="block text-[10px] font-bold text-emerald-400 font-mono uppercase tracking-widest">{meal.mealName}</label>
                  <textarea
                    placeholder={isAr ? `الوجبات والأصناف لـ ${meal.mealName}...` : `Meals and portions for ${meal.mealName.toLowerCase()}...`}
                    value={meal.foodItems}
                    onChange={(e) => {
                      const updated = [...nutritionTplMeals];
                      updated[mealIdx].foodItems = e.target.value;
                      setNutritionTplMeals(updated);
                    }}
                    rows={2}
                    className="w-full bg-neutral-900 border border-neutral-850 rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
            >
              {isAr ? "حفظ نموذج التغذية" : "Save Nutrition Template"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

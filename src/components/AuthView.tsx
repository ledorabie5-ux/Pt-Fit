import React, { useState, useEffect } from "react";
import { getSupabaseClient } from "../lib/supabase";
import { createUserDoc, getUser, getStats, getUserByPhone, getLandingStats, LandingStats } from "../services/dbService";
import { UserDoc, UserRole } from "../types";
import { Dumbbell, Mail, Lock, User, Phone, Eye, EyeOff, Sparkles, ShieldCheck, Users, Activity, Video } from "lucide-react";
import { Language, getTranslation } from "../utils/translations";

interface AuthViewProps {
  onAuthSuccess: (user: UserDoc) => void;
  lang: Language;
  toggleLanguage: () => void;
  isAdminLogin: boolean;
  setIsAdminLogin: (val: boolean) => void;
}

function AnimatedNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }
    const duration = 1200; // ms
    const increment = end / (duration / 16); // ~60fps
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
}

export default function AuthView({
  onAuthSuccess,
  lang,
  toggleLanguage,
  isAdminLogin,
  setIsAdminLogin,
}: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [registrationRole, setRegistrationRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<LandingStats>({
    coaches: 0,
    trainees: 0,
    activeSubscriptions: 0,
    workoutVideos: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getLandingStats();
        setStats(data);
      } catch (err) {
        console.warn("Could not load landing stats gracefully:", err);
      }
    }
    loadStats();

    const supabase = getSupabaseClient();
    if (supabase) {
      const channel = supabase
        .channel("landing_stats_realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
          loadStats();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "exercise_videos" }, () => {
          loadStats();
        })
        .subscribe();

      const interval = setInterval(loadStats, 10000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    } else {
      const interval = setInterval(loadStats, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();

      if (isAdminLogin) {
        // Secure Admin login
        if (adminUsername.trim() === "Ramadan" && password === "Ro8995") {
          sessionStorage.setItem("admin_authenticated", "true");
          
          let authUid = "admin_ramadan_uid";
          if (supabase) {
            try {
              const { data, error } = await supabase.auth.signInWithPassword({
                email: "admin@ptfit.com",
                password: "Ro8995"
              });
              if (error) {
                const { data: signUpData } = await supabase.auth.signUp({
                  email: "admin@ptfit.com",
                  password: "Ro8995"
                });
                if (signUpData?.user) authUid = signUpData.user.id;
              } else if (data?.user) {
                authUid = data.user.id;
              }
            } catch (err) {
              console.warn("Supabase auth for admin failed, using default admin uid:", err);
            }
          }

          const adminDoc: UserDoc = {
            uid: authUid,
            name: "Ramadan",
            email: "admin@ptfit.com",
            phone: "01150000000",
            role: "admin",
            status: "approved",
            createdAt: new Date().toISOString()
          };

          await createUserDoc(adminDoc);
          localStorage.setItem("pt_fit_uid", authUid);
          onAuthSuccess(adminDoc);
        } else {
          setError(getTranslation(lang, "invalidAdminCreds"));
        }
        setLoading(false);
        return;
      }

      if (isLogin) {
        // Sign In
        if (!phone.trim() || !password) {
          setError(getTranslation(lang, "requiredFields"));
          setLoading(false);
          return;
        }
        
        const cleanPhone = phone.trim().replace(/[\s\(\)\-\[\]]/g, "");
        const syntheticEmail = `${cleanPhone}@ptfit.com`;

        try {
          // 1. Try Supabase Auth first
          if (supabase) {
            const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
              email: syntheticEmail,
              password
            });

            if (!signInErr && signInData?.user) {
              const uDoc = await getUser(signInData.user.id);
              if (uDoc) {
                localStorage.setItem("pt_fit_uid", uDoc.uid);
                onAuthSuccess(uDoc);
                setLoading(false);
                return;
              }
            }
          }

          // 2. Check Supabase DB directly by phone
          const userDoc = await getUserByPhone(cleanPhone);
          if (userDoc) {
            if (userDoc.password && userDoc.password === password) {
              localStorage.setItem("pt_fit_uid", userDoc.uid);
              onAuthSuccess(userDoc);
              setLoading(false);
              return;
            }
          }

          setError(lang === "ar" ? "رقم الهاتف أو كلمة المرور غير صحيحة." : "Invalid phone number or password.");
        } catch (err: any) {
          console.error("Auth error:", err);
          setError(lang === "ar" ? "رقم الهاتف أو كلمة المرور غير صحيحة." : "Invalid phone number or password.");
        }
      } else {
        // Registration
        if (!name.trim() || !phone.trim() || !password) {
          setError(getTranslation(lang, "requiredFields"));
          setLoading(false);
          return;
        }

        const cleanPhone = phone.trim().replace(/[\s\(\)\-\[\]]/g, "");
        const syntheticEmail = `${cleanPhone}@ptfit.com`;

        // Check if phone number is already registered in Supabase
        const existingDoc = await getUserByPhone(cleanPhone);
        if (existingDoc) {
          setError(lang === "ar" ? "رقم الهاتف هذا مسجل بالفعل." : "This phone number is already registered.");
          setLoading(false);
          return;
        }

        try {
          let newUid = `user_${cleanPhone}_${Math.random().toString(36).substring(2, 9)}`;

          if (supabase) {
            const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
              email: syntheticEmail,
              password
            });
            if (!signUpErr && signUpData?.user) {
              newUid = signUpData.user.id;
            }
          }

          const newUser: UserDoc = {
            uid: newUid,
            name: name.trim(),
            email: syntheticEmail,
            phone: cleanPhone,
            role: "pending_choice" as any,
            status: "pending",
            createdAt: new Date().toISOString(),
            password: password
          };

          await createUserDoc(newUser);
          localStorage.setItem("pt_fit_uid", newUser.uid);
          onAuthSuccess(newUser);
        } catch (authErr: any) {
          console.warn("Registration error:", authErr);
          setError(authErr.message || "Registration failed.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during authentication.");
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-neutral-950 text-white selection:bg-emerald-500 selection:text-neutral-950 relative overflow-x-hidden">
      {/* Language Switch floating at top corner */}
      <div className="absolute top-6 right-6 left-auto rtl:left-6 rtl:right-auto z-20">
        <button
          type="button"
          onClick={toggleLanguage}
          className="px-3.5 py-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-neutral-800 rounded-lg transition-all font-mono uppercase cursor-pointer"
        >
          🌐 {getTranslation(lang, "langName")}
        </button>
      </div>

      {/* Visual background ambient glow */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Grid Wrapper */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center relative z-10 my-8">
        
        {/* Left Side: Brand presentation and Animated stats counters */}
        <div className="md:col-span-6 space-y-8 flex flex-col justify-center text-center md:text-left rtl:md:text-right">
          <div className="space-y-4">
            <img
              src="https://i.postimg.cc/Hs7z2mqF/1000236763-removebg-preview.png"
              alt="PT Fit Logo"
              referrerPolicy="no-referrer"
              className="h-28 w-auto object-contain mx-auto md:mx-0 rtl:md:mx-0"
            />
            <p className="text-neutral-400 text-sm md:text-base leading-relaxed max-w-md mx-auto md:mx-0">
              {lang === "ar"
                ? "منصة التدريب الشخصي المتكاملة والمصممة لمساعدتك على تحقيق أهدافك البدنية والغذائية بالتعاون المباشر مع مدربك المحترف."
                : "The premium all-in-one personal training platform designed to achieve pro-grade athletic results with custom workouts, tailored nutrition, and live expert coaching."}
            </p>
          </div>

          {/* Animated Counters Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* Stat 1: Registered Coaches */}
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 flex flex-col items-center md:items-start rtl:md:items-end justify-between hover:border-emerald-500/30 hover:bg-neutral-900/80 transition-all group backdrop-blur-sm">
              <div className="h-9 w-9 bg-emerald-950/50 border border-emerald-800/30 rounded-lg flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="mt-4 text-center md:text-left rtl:md:text-right">
                <span className="block text-2xl font-black text-white tracking-tight">
                  <AnimatedNumber value={stats.coaches} />+
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 mt-1 block">
                  {lang === "ar" ? "المدربين المسجلين" : "Registered Coaches"}
                </span>
              </div>
            </div>

            {/* Stat 2: Registered Trainees */}
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 flex flex-col items-center md:items-start rtl:md:items-end justify-between hover:border-emerald-500/30 hover:bg-neutral-900/80 transition-all group backdrop-blur-sm">
              <div className="h-9 w-9 bg-indigo-950/50 border border-indigo-800/30 rounded-lg flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <div className="mt-4 text-center md:text-left rtl:md:text-right">
                <span className="block text-2xl font-black text-white tracking-tight">
                  <AnimatedNumber value={stats.trainees} />+
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 mt-1 block">
                  {lang === "ar" ? "المتدربين المشتركين" : "Registered Trainees"}
                </span>
              </div>
            </div>

            {/* Stat 3: Active Subscriptions */}
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 flex flex-col items-center md:items-start rtl:md:items-end justify-between hover:border-emerald-500/30 hover:bg-neutral-900/80 transition-all group backdrop-blur-sm">
              <div className="h-9 w-9 bg-teal-950/50 border border-teal-800/30 rounded-lg flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                <Activity className="h-5 w-5" />
              </div>
              <div className="mt-4 text-center md:text-left rtl:md:text-right">
                <span className="block text-2xl font-black text-white tracking-tight">
                  <AnimatedNumber value={stats.activeSubscriptions} />
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 mt-1 block">
                  {lang === "ar" ? "الاشتراكات النشطة" : "Active Subscriptions"}
                </span>
              </div>
            </div>

            {/* Stat 4: Workout Videos */}
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 flex flex-col items-center md:items-start rtl:md:items-end justify-between hover:border-emerald-500/30 hover:bg-neutral-900/80 transition-all group backdrop-blur-sm">
              <div className="h-9 w-9 bg-rose-950/50 border border-rose-800/30 rounded-lg flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <Video className="h-5 w-5" />
              </div>
              <div className="mt-4 text-center md:text-left rtl:md:text-right">
                <span className="block text-2xl font-black text-white tracking-tight">
                  <AnimatedNumber value={stats.workoutVideos} />
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 mt-1 block">
                  {lang === "ar" ? "مكتبة الفيديو" : "Workout Videos"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Container */}
        <div className="md:col-span-6 w-full max-w-md mx-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6">
            {/* Brand Header inside form card */}
            <div className="text-center space-y-4">
              <img
                src="https://i.postimg.cc/Hs7z2mqF/1000236763-removebg-preview.png"
                alt="PT Fit Logo"
                referrerPolicy="no-referrer"
                className="mx-auto h-20 w-auto object-contain block md:hidden"
              />
              <div>
                <div className="flex items-center justify-center">
                  <span className="text-[10px] font-mono tracking-widest text-emerald-400 border border-emerald-800 bg-emerald-950/40 px-2 py-0.5 rounded uppercase">
                    {getTranslation(lang, "portalBadge")}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-2 font-medium text-center">
                  {isAdminLogin 
                    ? (lang === "ar" ? "تسجيل دخول المشرف الآمن" : "Secure Administrator Access") 
                    : isLogin ? getTranslation(lang, "authSubSignIn") : getTranslation(lang, "authSubRegister")}
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-3.5 text-xs text-red-400 font-mono leading-relaxed text-center">
                {error}
              </div>
            )}

            {/* Conditional Rendering based on View State */}
            {isAdminLogin ? (
              /* Secure Admin Login Page (Username: Ramadan, Password: Ro8995) */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                    <User className="h-3 w-3" /> {lang === "ar" ? "اسم المستخدم للمشرف" : "Admin Username"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramadan"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 placeholder-neutral-500 transition-colors text-left"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                    <Lock className="h-3 w-3" /> {getTranslation(lang, "password")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 placeholder-neutral-500 transition-colors text-left"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 rtl:right-auto rtl:left-3 text-neutral-500 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-sans font-black text-xs py-3 rounded-lg shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all mt-2 cursor-pointer"
                >
                  {loading ? getTranslation(lang, "loading") : (lang === "ar" ? "دخول لوحة التحكم" : "ACCESS DASHBOARD")}
                </button>

                <div className="text-center pt-2 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminLogin(false);
                      setError(null);
                    }}
                    className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors font-medium cursor-pointer"
                  >
                    {lang === "ar" ? "← العودة لتسجيل دخول الأعضاء" : "← Back to User Login"}
                  </button>
                </div>
              </form>
            ) : isLogin ? (
              /* Normal User Login Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {getTranslation(lang, "phone")}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +201012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 placeholder-neutral-500 transition-colors text-left"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                    <Lock className="h-3 w-3" /> {getTranslation(lang, "password")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 placeholder-neutral-500 transition-colors text-left"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 rtl:right-auto rtl:left-3 text-neutral-500 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-sans font-black text-xs py-3 rounded-lg shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all mt-2 cursor-pointer"
                >
                  {loading ? getTranslation(lang, "loading") : getTranslation(lang, "signInBtn").toUpperCase()}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setRegistrationRole(null);
                      setError(null);
                    }}
                    className="text-xs text-emerald-400 hover:underline font-medium cursor-pointer"
                  >
                    {getTranslation(lang, "noAccount")} {getTranslation(lang, "switchRegister")}
                  </button>
                </div>
              </form>
            ) : (
              /* Simple Registration Form (Only requires Name, Phone, Password) */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                    <User className="h-3 w-3" /> {getTranslation(lang, "fullName")}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Captain Ali"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 placeholder-neutral-500 transition-colors"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {getTranslation(lang, "phone")}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +201012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 placeholder-neutral-500 transition-colors text-left"
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                    <Lock className="h-3 w-3" /> {getTranslation(lang, "password")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 placeholder-neutral-500 transition-colors text-left"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 rtl:right-auto rtl:left-3 text-neutral-500 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-sans font-black text-xs py-3 rounded-lg shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all mt-2 cursor-pointer"
                >
                  {loading ? getTranslation(lang, "loading") : getTranslation(lang, "registerBtn").toUpperCase()}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setError(null);
                    }}
                    className="text-xs text-emerald-400 hover:underline font-medium cursor-pointer"
                  >
                    {getTranslation(lang, "hasAccount")} {getTranslation(lang, "switchLogin")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>

      {/* About PT Fit & Our Goals Sections */}
      <div className="w-full max-w-5xl mt-12 pt-12 border-t border-neutral-900 grid grid-cols-1 md:grid-cols-12 gap-8 text-neutral-300">
        <div className="md:col-span-7 space-y-4 text-right rtl:text-right ltr:text-left">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 rtl:flex-row-reverse">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {lang === "ar" ? "حول PT Fit" : "About PT Fit"}
          </h3>
          <p className="text-sm text-neutral-400 leading-relaxed text-justify rtl:text-right">
            {lang === "ar" 
              ? "PT Fit هي منصة متكاملة للمدربين والمتدربين تساعد في تنظيم التمارين والخطط الغذائية ومتابعة التقدم في مكان واحد. تهدف المنصة إلى تسهيل التواصل بين المدرب والمتدرب، وتقديم برامج مخصصة، ومساعدة المستخدمين على تحقيق أهدافهم الرياضية من خلال المتابعة المستمرة وفيديوهات التمارين التعليمية."
              : "PT Fit is a complete platform for coaches and trainees that helps organize workouts, diet plans, and progress tracking in one place. The platform aims to make communication between coach and trainee easier, provide personalized programs, and help users achieve their fitness goals through continuous follow-up and educational exercise videos."
            }
          </p>
        </div>

        <div className="md:col-span-5 space-y-4 text-right rtl:text-right ltr:text-left">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 rtl:flex-row-reverse">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            {lang === "ar" ? "أهدافنا" : "Our Goals"}
          </h3>
          <ul className="space-y-2 text-xs md:text-sm text-neutral-400 rtl:text-right">
            {[
              {
                ar: "تنظيم خطط التدريب بشكل احترافي.",
                en: "Organize training plans professionally."
              },
              {
                ar: "تقديم برامج غذائية مخصصة.",
                en: "Provide personalized diet programs."
              },
              {
                ar: "متابعة تقدم الجسم والأداء.",
                en: "Track body progress and performance."
              },
              {
                ar: "تسهيل التواصل بين المدرب والمتدرب.",
                en: "Make communication between coach and trainee easier."
              },
              {
                ar: "مساعدة المستخدمين على الوصول لأهدافهم بشكل أسرع.",
                en: "Help users reach their fitness goals faster."
              }
            ].map((goal, idx) => (
              <li key={idx} className="flex items-start gap-2.5 rtl:flex-row-reverse">
                <span className="text-emerald-500 mt-1 flex-shrink-0">✓</span>
                <span>{lang === "ar" ? goal.ar : goal.en}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Homepage Footer with Staging Link as requested */}
      <footer className="w-full max-w-5xl mt-12 pt-6 border-t border-neutral-900 text-center text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>© PT Fit 2026. {lang === "ar" ? "جميع الحقوق محفوظة" : "All rights reserved."}</span>
        </div>
        <button
          onClick={() => setIsAdminLogin(true)}
          className="text-neutral-500 hover:text-emerald-400 font-mono text-xs transition-colors hover:underline cursor-pointer"
        >
          Staging
        </button>
      </footer>
    </div>
  );
}

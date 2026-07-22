import { useState, useEffect } from "react";
import { UserDoc } from "./types";
import { getUser } from "./services/dbService";
import { auth } from "./firebase";
import AuthView from "./components/AuthView";
import AdminDashboard from "./components/AdminDashboard";
import CoachDashboard from "./components/CoachDashboard";
import TraineeDashboard from "./components/TraineeDashboard";
import NotificationBell from "./components/NotificationBell";
import PendingApprovalView from "./components/PendingApprovalView";
import { Dumbbell, LogOut, Heart, Settings } from "lucide-react";
import { Language, getTranslation } from "./utils/translations";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserDoc | null>(null);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("pt_fit_lang");
    return (saved === "en" || saved === "ar") ? saved : "en";
  });

  useEffect(() => {
    localStorage.setItem("pt_fit_lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    async function initializeUser() {
      // 1. Check local storage first for maximum robustness (supports direct & auth accounts)
      const savedUid = localStorage.getItem("pt_fit_uid");
      if (savedUid) {
        try {
          const uDoc = await getUser(savedUid);
          if (uDoc) {
            setCurrentUser(uDoc);
            setInitializing(false);
            return;
          }
        } catch (err) {
          console.error("Local storage initialization failed:", err);
        }
      }

      // 2. Otherwise listen to Firebase Auth changes
      const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          const uDoc = await getUser(firebaseUser.uid);
          if (uDoc) {
            setCurrentUser(uDoc);
            localStorage.setItem("pt_fit_uid", firebaseUser.uid);
          }
        }
        setInitializing(false);
      });
      return unsubscribe;
    }

    let unsub: (() => void) | undefined;
    initializeUser().then(u => {
      if (typeof u === "function") unsub = u;
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch {
      // ignore
    }
    localStorage.removeItem("pt_fit_uid");
    sessionStorage.removeItem("admin_authenticated");
    setCurrentUser(null);
  };

  const handleAdminGearClick = () => {
    if (currentUser) {
      const confirmLogout = window.confirm(
        lang === "ar" 
          ? "هل ترغب في تسجيل الخروج للوصول إلى لوحة المسؤول؟" 
          : "Would you like to log out to access the Admin panel?"
      );
      if (confirmLogout) {
        handleLogout();
        setIsAdminLogin(true);
      }
    } else {
      setIsAdminLogin(true);
    }
  };

  const toggleLanguage = () => {
    setLang(prev => prev === "en" ? "ar" : "en");
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-6">
        <img
          src="https://i.postimg.cc/Hs7z2mqF/1000236763-removebg-preview.png"
          alt="PT Fit Logo"
          referrerPolicy="no-referrer"
          className="h-28 w-auto object-contain animate-bounce"
        />
        <p className="text-neutral-400 text-xs font-mono tracking-widest animate-pulse">
          LOADING PT FIT...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="relative min-h-screen bg-neutral-950">
        <AuthView
          onAuthSuccess={(user) => setCurrentUser(user)}
          lang={lang}
          toggleLanguage={toggleLanguage}
          isAdminLogin={isAdminLogin}
          setIsAdminLogin={setIsAdminLogin}
        />
      </div>
    );
  }

  if (currentUser.status !== "approved") {
    return (
      <div className="relative min-h-screen bg-neutral-950">
        <PendingApprovalView
          currentUser={currentUser}
          lang={lang}
          handleLogout={handleLogout}
          toggleLanguage={toggleLanguage}
          onUserUpdate={(updated) => setCurrentUser(updated)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-emerald-500 selection:text-neutral-950 font-sans relative">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <img
            src="https://i.postimg.cc/Hs7z2mqF/1000236763-removebg-preview.png"
            alt="PT Fit Logo"
            referrerPolicy="no-referrer"
            className="h-8 sm:h-10 md:h-12 w-auto object-contain shrink-0"
          />
          <div className="hidden sm:block border-l border-neutral-800 pl-3 md:pl-4 rtl:border-l-0 rtl:border-r rtl:pr-3 md:rtl:pr-4 rtl:pl-0 py-0.5">
            <span className="text-[9px] md:text-[10px] font-mono tracking-widest text-emerald-400 border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 rounded uppercase">
              {getTranslation(lang, "portalBadge")}
            </span>
            <p className="text-[9px] md:text-[10px] text-neutral-500 mt-1 font-medium leading-none">{getTranslation(lang, "appSubtitle")}</p>
          </div>
        </div>

        {/* Language switch, Stats & Notif Center */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 text-[10px] sm:text-xs font-bold bg-neutral-900 hover:bg-neutral-850 text-emerald-400 border border-neutral-800 rounded-lg transition-all font-mono uppercase cursor-pointer shrink-0"
          >
            🌐 {getTranslation(lang, "langName")}
          </button>

          <div className="hidden md:flex items-center gap-2.5 text-right rtl:text-left shrink-0">
            {currentUser.photoUrl && (
              <img
                src={currentUser.photoUrl}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover border border-emerald-500/50 shadow shrink-0"
              />
            )}
            <div className="flex flex-col items-end text-right rtl:items-start rtl:text-left">
              <span className="text-xs font-bold text-white">{currentUser.name}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[8px] md:text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border uppercase leading-none ${
                  currentUser.role === "admin" ? "bg-indigo-950/80 text-indigo-400 border-indigo-800/40" :
                  currentUser.role === "coach" ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/40" :
                  "bg-teal-950/80 text-teal-400 border-teal-800/40"
                }`}>
                  {getTranslation(lang, currentUser.role as any)}
                </span>
                <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>
          </div>

          <NotificationBell currentUserId={currentUser.uid} lang={lang} />

          <button
            onClick={handleLogout}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-850 rounded-lg border border-neutral-800 transition-all font-medium flex items-center justify-center cursor-pointer shrink-0"
            title={getTranslation(lang, "logout")}
          >
            <LogOut className="h-4 w-4 animate-in fade-in" />
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {currentUser.role === "admin" && (
          <AdminDashboard currentUserId={currentUser.uid} lang={lang} />
        )}
        {currentUser.role === "coach" && (
          <CoachDashboard 
            currentUserId={currentUser.uid} 
            currentUserName={currentUser.name} 
            currentUser={currentUser}
            lang={lang} 
            onUserUpdate={(updated) => setCurrentUser(updated)}
          />
        )}
        {currentUser.role === "trainee" && (
          <TraineeDashboard currentUser={currentUser} lang={lang} onUserUpdate={(updated) => setCurrentUser(updated)} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 px-6 py-6 text-center text-xs text-neutral-500 space-y-2">
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <span>{getTranslation(lang, "footerMadeWith")}</span>
          <Heart className="h-3 w-3 text-emerald-500 fill-emerald-500" />
          <span>{getTranslation(lang, "footerForAthletes")}</span>
        </div>
        <p className="font-mono text-[9px] text-neutral-600 uppercase tracking-widest">
          {getTranslation(lang, "systemStatus")}
        </p>
      </footer>
    </div>
  );
}

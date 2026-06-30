import React, { useState } from "react";
import { UserDoc } from "../types";
import { LogOut, CheckCircle2, AlertCircle, MessageCircle, Dumbbell, ShieldCheck } from "lucide-react";
import { Language } from "../utils/translations";
import { updateUserDoc } from "../services/dbService";

interface PendingApprovalViewProps {
  currentUser: UserDoc;
  lang: Language;
  handleLogout: () => void;
  toggleLanguage: () => void;
  onUserUpdate?: (user: UserDoc) => void;
}

export default function PendingApprovalView({
  currentUser,
  lang,
  handleLogout,
  toggleLanguage,
  onUserUpdate,
}: PendingApprovalViewProps) {
  const isArabic = lang === "ar";
  const [updating, setUpdating] = useState(false);

  const handleSelectRole = async (role: "coach" | "trainee") => {
    setUpdating(true);
    try {
      const updatedUser = {
        ...currentUser,
        role: role
      };
      await updateUserDoc(updatedUser);
      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }
    } catch (err) {
      console.error("Failed to select role:", err);
    } finally {
      setUpdating(false);
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === "coach") return isArabic ? "مدرب" : "Coach";
    return isArabic ? "متدرب" : "Trainee";
  };

  const getWhatsAppLink = () => {
    const roleLabel = currentUser.role === "coach" ? "Coach" : "Trainee";
    const baseMsg = isArabic
      ? `أهلاً بك، أود الاشتراك في PT Fit وتفعيل حسابي.\n\nتفاصيل التسجيل:\nالاسم: ${currentUser.name}\nالهاتف: ${currentUser.phone || "غير متوفر"}\nنوع الحساب: ${getRoleLabel(currentUser.role)}\n\nI would like to subscribe to PT Fit and activate my account.`
      : `I would like to subscribe to PT Fit and activate my account.\n\nRegistration Details:\n- Name: ${currentUser.name}\n- Phone: ${currentUser.phone || "N/A"}\n- Role: ${roleLabel}`;

    return `https://wa.me/201044186025?text=${encodeURIComponent(baseMsg)}`;
  };

  if (currentUser.role === ("pending_choice" as any)) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-neutral-950 relative font-sans">
        {/* Background Decorative Blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Floating Action Header */}
        <div className="absolute top-6 right-6 left-6 flex justify-between items-center z-20">
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-neutral-800 rounded-lg transition-all font-mono uppercase cursor-pointer"
          >
            🌐 {isArabic ? "English" : "العربية"}
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-red-400 hover:text-red-300 border border-neutral-800 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            {isArabic ? "خروج" : "Log Out"}
          </button>
        </div>

        {/* Main Card Container */}
        <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-10 shadow-2xl relative z-10 text-center space-y-6 md:space-y-8 animate-fade-in">
          <div className="space-y-3">
            <img
              src="https://i.postimg.cc/Hs7z2mqF/1000236763-removebg-preview.png"
              alt="PT Fit Logo"
              referrerPolicy="no-referrer"
              className="mx-auto h-24 w-auto object-contain"
            />
            <div className="flex justify-center items-center">
              <span className="text-xs font-bold font-mono text-emerald-400 border border-emerald-800 bg-emerald-950/40 px-2.5 py-1 rounded tracking-widest uppercase">
                {isArabic ? "نوع الحساب ● ACCOUNT TYPE" : "ACCOUNT TYPE"}
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white mt-4">
              {isArabic ? "مرحباً بك! اختر نوع الحساب" : "Welcome! Choose Your Account Type"}
            </h2>
            <p className="text-xs md:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
              {isArabic 
                ? "الرجاء تحديد ما إذا كنت مدرباً أو متدرباً لإكمال عملية إعداد الحساب." 
                : "Please select whether you are a Coach or a Trainee to complete your account setup."}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Trainee Card */}
            <button
              onClick={() => handleSelectRole("trainee")}
              disabled={updating}
              className="w-full flex items-center justify-between p-5 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 hover:border-emerald-500/50 rounded-xl transition-all cursor-pointer text-left rtl:text-right group disabled:opacity-50"
            >
              <div className="space-y-1.5 max-w-[80%]">
                <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                  {isArabic ? "متدرب ● Trainee" : "Trainee"}
                </p>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  {isArabic
                    ? "سجل لمتابعة التمارين، الخطط الغذائية، ومتابعة تقدمك والتحدث مع مدربك."
                    : "Access customized workouts, food recipes, progress graphs, and coaching messages."}
                </p>
              </div>
              <Dumbbell className="h-6 w-6 text-emerald-500 group-hover:scale-110 transition-transform flex-shrink-0" />
            </button>

            {/* Coach Card */}
            <button
              onClick={() => handleSelectRole("coach")}
              disabled={updating}
              className="w-full flex items-center justify-between p-5 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 hover:border-indigo-500/50 rounded-xl transition-all cursor-pointer text-left rtl:text-right group disabled:opacity-50"
            >
              <div className="space-y-1.5 max-w-[80%]">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-wider">
                  {isArabic ? "مدرب ● Coach" : "Coach"}
                </p>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  {isArabic
                    ? "سجل لتصميم تمارين وأنظمة غذائية وإدارة المشتركين والرياضيين."
                    : "Create client schedules, distribute meal plans, and review trainee achievements."}
                </p>
              </div>
              <ShieldCheck className="h-6 w-6 text-indigo-500 group-hover:scale-110 transition-transform flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-neutral-950 relative font-sans">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Action Header for language toggle & logout */}
      <div className="absolute top-6 right-6 left-6 flex justify-between items-center z-20">
        <button
          onClick={toggleLanguage}
          className="px-3 py-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-neutral-800 rounded-lg transition-all font-mono uppercase cursor-pointer"
        >
          🌐 {isArabic ? "English" : "العربية"}
        </button>
        <button
          onClick={handleLogout}
          className="px-3.5 py-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-red-400 hover:text-red-300 border border-neutral-800 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          {isArabic ? "خروج" : "Log Out"}
        </button>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-10 shadow-2xl relative z-10 text-center space-y-6 md:space-y-8">
        {/* Brand Logo */}
        <div className="space-y-3">
          <img
            src="https://i.postimg.cc/Hs7z2mqF/1000236763-removebg-preview.png"
            alt="PT Fit Logo"
            referrerPolicy="no-referrer"
            className="mx-auto h-28 w-auto object-contain"
          />
          <div className="flex justify-center items-center">
            <span className="text-xs font-bold font-mono text-emerald-400 border border-emerald-800 bg-emerald-950/40 px-2.5 py-1 rounded tracking-widest uppercase">
              {isArabic ? "بوابة الأعضاء ● PORTAL" : "PORTAL"}
            </span>
          </div>
        </div>

        {/* Warning Badge & Account Info */}
        <div className="space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <AlertCircle className="h-6 w-6 stroke-[2]" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">
              {isArabic ? "حسابك قيد الانتظار حالياً" : "Your Account is Currently Pending Approval"}
            </h3>
            <p className="text-xs md:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
              {isArabic
                ? "حسابك قيد الانتظار للمراجعة والموافقة. يرجى التواصل معنا عبر واتساب لتفعيل اشتراكك وبدء رحلتك الرياضية."
                : "Your account is currently pending approval. Please contact us on WhatsApp to activate your subscription."}
            </p>
          </div>
        </div>

        {/* User Details Details Card */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 text-left rtl:text-right text-xs space-y-2.5">
          <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono border-b border-neutral-900 pb-1.5">
            {isArabic ? "تفاصيل حسابك" : "Your Account Details"}
          </div>
          <div className="grid grid-cols-3 gap-2 py-0.5">
            <span className="text-neutral-500">{isArabic ? "الاسم:" : "Name:"}</span>
            <span className="col-span-2 text-white font-bold">{currentUser.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-0.5">
            <span className="text-neutral-500">{isArabic ? "رقم الهاتف:" : "Phone:"}</span>
            <span className="col-span-2 text-white font-mono">{currentUser.phone || "N/A"}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-0.5">
            <span className="text-neutral-500">{isArabic ? "البريد الإلكتروني:" : "Email:"}</span>
            <span className="col-span-2 text-neutral-400 font-mono break-all">{currentUser.email}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-0.5">
            <span className="text-neutral-500">{isArabic ? "نوع الحساب:" : "Role:"}</span>
            <span className="col-span-2 text-emerald-400 font-bold uppercase">{getRoleLabel(currentUser.role)}</span>
          </div>
        </div>

        {/* WhatsApp Button */}
        <div className="pt-2">
          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2.5 bg-green-500 hover:bg-green-400 text-neutral-950 font-sans font-black text-sm py-3.5 rounded-xl shadow-lg hover:shadow-green-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <MessageCircle className="h-5 w-5 fill-neutral-950 stroke-[1.5]" />
            <span>{isArabic ? "التواصل عبر واتساب للتفعيل" : "Contact on WhatsApp"}</span>
          </a>
          <p className="text-[10px] text-neutral-500 mt-2 font-mono uppercase tracking-wider">
            {isArabic ? "اضغط لفتح واتساب مباشرة وإرسال طلبك" : "Click to open WhatsApp directly and send activation request"}
          </p>
        </div>
      </div>
    </div>
  );
}

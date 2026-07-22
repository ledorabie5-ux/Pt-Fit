import React, { useState } from "react";
import { UserDoc } from "../types";
import { updateUserDoc } from "../services/dbService";
import { Language } from "../utils/translations";
import { 
  User, Camera, Save, CheckCircle2, MessageCircle, Instagram, 
  Youtube, Facebook, Globe, Sparkles, Phone, Award, ShieldCheck, ExternalLink, RefreshCw, Upload
} from "lucide-react";

interface CoachProfileSettingsTabProps {
  currentUser: UserDoc;
  lang?: Language;
  onUserUpdate?: (updatedUser: UserDoc) => void;
}

export default function CoachProfileSettingsTab({ currentUser, lang = "en", onUserUpdate }: CoachProfileSettingsTabProps) {
  const isArabic = lang === "ar";

  // Editable Form States
  const [name, setName] = useState(currentUser.name || "");
  const [photoUrl, setPhotoUrl] = useState(currentUser.photoUrl || "");
  const [specialization, setSpecialization] = useState(currentUser.specialization || "");
  const [yearsOfExperience, setYearsOfExperience] = useState<string>(
    currentUser.yearsOfExperience?.toString() || ""
  );
  const [bio, setBio] = useState(currentUser.bio || "");
  const [phone, setPhone] = useState(currentUser.phone || "");
  
  // WhatsApp & Socials
  const [whatsappNumber, setWhatsappNumber] = useState(
    currentUser.socialLinks?.whatsapp || currentUser.phone || ""
  );
  const [instagram, setInstagram] = useState(currentUser.socialLinks?.instagram || "");
  const [youtube, setYoutube] = useState(currentUser.socialLinks?.youtube || "");
  const [tiktok, setTiktok] = useState(currentUser.socialLinks?.tiktok || "");
  const [facebook, setFacebook] = useState(currentUser.socialLinks?.facebook || "");
  const [website, setWebsite] = useState(currentUser.socialLinks?.website || "");

  // UI Feedback states
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clean WhatsApp Number to wa.me link
  const getWhatsAppCleanDigits = (raw: string) => {
    let digits = raw.replace(/[^0-9]/g, "");
    if (digits.startsWith("0")) {
      // Default to Egypt (+20) if starts with local 0
      digits = "20" + digits.substring(1);
    }
    return digits;
  };

  // Handle direct file upload for coach photo
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(isArabic ? "حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)" : "File size is too large (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setPhotoUrl(reader.result.toString());
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(isArabic ? "يرجى إدخال الاسم الكامل" : "Full name is required");
      return;
    }

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const cleanWaDigits = getWhatsAppCleanDigits(whatsappNumber);

      const updatedUser: UserDoc = {
        ...currentUser,
        name: name.trim(),
        photoUrl: photoUrl.trim() || undefined,
        specialization: specialization.trim() || undefined,
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined,
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
        socialLinks: {
          whatsapp: cleanWaDigits || undefined,
          instagram: instagram.trim() || undefined,
          youtube: youtube.trim() || undefined,
          tiktok: tiktok.trim() || undefined,
          facebook: facebook.trim() || undefined,
          website: website.trim() || undefined,
        }
      };

      await updateUserDoc(updatedUser);

      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }

      setSuccessMsg(
        isArabic 
          ? "تم حفظ وتحديث بيانات الملف الشخصي ورقم الواتساب بنجاح!" 
          : "Profile settings and WhatsApp contact details updated successfully!"
      );

      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error("Error saving coach profile:", err);
      setErrorMsg(
        isArabic ? "حدث خطأ أثناء حفظ التغييرات، يرجى المحاولة لاحقاً" : "Failed to update profile settings. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const currentWaDigits = getWhatsAppCleanDigits(whatsappNumber);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {isArabic ? "إعدادات الملف الشخصي والواتساب" : "COACH PROFILE & WHATSAPP SETTINGS"}
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {isArabic ? "تعديل بيانات الكابتن والواتساب" : "Coach Profile & Contact Setup"}
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 leading-relaxed">
              {isArabic
                ? "قم بتحديث صورتك الشخصية، التخصص، سنوات الخبرة، والنبذة للظهور في دليل المدربين. اضف رقم الواتساب لتمكين متدربيك من التواصل المباشر معك بنقرة واحدة."
                : "Manage your public profile image, bio, specialization, and direct WhatsApp contact number. Trainees assigned to you will see your WhatsApp button for direct instant messaging."}
            </p>
          </div>

          {/* Quick Preview Badge */}
          <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl shrink-0 flex items-center gap-3">
            <img
              src={
                photoUrl ||
                currentUser.photoUrl ||
                "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&auto=format&fit=crop&q=80"
              }
              alt="Coach Avatar"
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-xl object-cover border border-neutral-700 shadow"
            />
            <div className="text-left rtl:text-right space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>{name || currentUser.name}</span>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              </div>
              <p className="text-[11px] text-emerald-400 font-medium">
                {specialization || (isArabic ? "مدرب لياقة بدنية" : "Fitness Coach")}
              </p>
              {currentWaDigits && (
                <span className="text-[10px] font-mono text-neutral-400 block flex items-center gap-1 mt-0.5">
                  <MessageCircle className="h-3 w-3 text-green-400 shrink-0" />
                  +{currentWaDigits}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 p-4 rounded-xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <p className="text-xs md:text-sm font-bold">{successMsg}</p>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="bg-red-950/90 border border-red-500 text-red-200 p-4 rounded-xl flex items-center gap-3">
          <p className="text-xs md:text-sm font-bold">{errorMsg}</p>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-8 shadow-xl">
        {/* Section 1: Basic Coach Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider border-b border-neutral-800 pb-2.5 flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-400" />
            <span>{isArabic ? "1. البيانات الأساسية والتعريفية" : "1. Basic Profile Information"}</span>
          </h3>

          {/* Direct File Upload for Profile Photo */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative shrink-0">
              <img
                src={
                  photoUrl ||
                  currentUser.photoUrl ||
                  "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&auto=format&fit=crop&q=80"
                }
                alt="Coach Photo"
                referrerPolicy="no-referrer"
                className="h-24 w-24 rounded-2xl object-cover border-2 border-emerald-500 shadow-xl"
              />
              <label
                htmlFor="coach-photo-upload-input"
                className="absolute -bottom-2 -right-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 p-2 rounded-full cursor-pointer shadow-lg transition-transform hover:scale-105"
                title={isArabic ? "رفع صورة شخصية جديدة" : "Upload new profile picture"}
              >
                <Camera className="h-4 w-4" />
              </label>
            </div>

            <div className="space-y-2 text-center sm:text-left rtl:sm:text-right flex-1">
              <label
                htmlFor="coach-photo-upload-input"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer shadow active:scale-95"
              >
                <Upload className="h-4 w-4" />
                <span>{isArabic ? "رفع صورة شخصية من الهاتف أو الكمبيوتر" : "Upload Photo from Device"}</span>
              </label>
              <input
                id="coach-photo-upload-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoFileUpload}
                className="hidden"
              />
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                {isArabic
                  ? "اختر صورة شخصية احترافية مباشرة من ملفات جهازك (PNG, JPG, WEBP). بدون الحاجة لإدخال أي روابط."
                  : "Choose a professional profile photo file directly from your device. No need to paste any links."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-neutral-300 block">
                {isArabic ? "الاسم الكامل (الكابتن)" : "Full Name"} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isArabic ? "مثال: كابتن شريف السيد" : "e.g. Captain Sherif El-Sayed"}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Specialization */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-neutral-300 block">
                {isArabic ? "التخصص التدريبي الرئيسي" : "Main Specialization"}
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder={isArabic ? "مثال: كمال أجسام وتنشيف / Bodybuilding" : "e.g. Bodybuilding & Fat Loss Recomp"}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Years of Experience */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-mono text-neutral-300 block">
                {isArabic ? "سنوات الخبرة التدريبية" : "Years of Coaching Experience"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  placeholder="e.g. 8"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-all"
                />
                <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400 rtl:right-3.5 rtl:left-auto" />
              </div>
            </div>
          </div>

          {/* Bio Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-neutral-300 block">
              {isArabic ? "نبذة عن الخبرة والأسلوب التدريبي (Bio)" : "Coach Bio & Coaching Philosophy"}
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={
                isArabic
                  ? "اكتب نبذة مختصرة عن شهاداتك المعتمدة، منهجك في التغذية والتدريب، وقصص نجاح متدربيك..."
                  : "Share your fitness background, IFBB/ACE certifications, progressive overload approach, and transformation success..."
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* Section 2: WhatsApp & Direct Client Contact */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-400" />
              <span>{isArabic ? "2. رقم الواتساب والتواصل المباشر للمتدربين" : "2. WhatsApp Number for Assigned Clients"}</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 rounded-full">
              {isArabic ? "يظهر مباشرة للمتدربين المشتركين معك" : "Visible to all trainees assigned to you"}
            </span>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* WhatsApp Number Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-emerald-400 font-bold block flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4 text-green-400" />
                  <span>{isArabic ? "رقم الواتساب الخاص بالتدريب (WhatsApp Number)" : "WhatsApp Phone Number"}</span>
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. 201044186025 or 01044186025"
                  className="w-full bg-neutral-900 border border-green-800/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-all font-mono"
                />
                <p className="text-[11px] text-neutral-400 leading-snug">
                  {isArabic
                    ? "يمكنك إدخال الرقم بكود الدولة (مثال: 201044186025) أو رقم محلي (مثال: 01044186025). سيقوم النظام بإنشاء رابط مباشر بنقرة واحدة."
                    : "Enter with country code (e.g. 201044186025) or local number. System will automatically generate one-click direct WhatsApp chat link."}
                </p>
              </div>

              {/* Direct Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-300 block flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-blue-400" />
                  <span>{isArabic ? "رقم الهاتف المباشر (Phone Call)" : "Direct Call Phone Number"}</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01000000002"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Test WhatsApp Link Preview */}
            {currentWaDigits && (
              <div className="pt-3 border-t border-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-neutral-300 flex items-center gap-2">
                  <span className="text-neutral-500 font-mono">{isArabic ? "معاينة رابط الواتساب:" : "Generated Link:"}</span>
                  <span className="text-green-400 font-mono font-bold">https://wa.me/{currentWaDigits}</span>
                </div>

                <a
                  href={`https://wa.me/${currentWaDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-950 hover:bg-green-600 hover:text-neutral-950 text-green-400 border border-green-800/60 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{isArabic ? "تجربة زر الواتساب الآن" : "Test WhatsApp Button"}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Social Links */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider border-b border-neutral-800 pb-2.5 flex items-center gap-2">
            <Globe className="h-4 w-4 text-cyan-400" />
            <span>{isArabic ? "3. وسائل التواصل الاجتماعي العامة (اختياري)" : "3. Social Media Accounts (Optional)"}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5 text-pink-400" />
                <span>Instagram URL</span>
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                <Youtube className="h-3.5 w-3.5 text-red-500" />
                <span>YouTube Channel URL</span>
              </label>
              <input
                type="text"
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/@..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>TikTok Profile URL</span>
              </label>
              <input
                type="text"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="https://tiktok.com/@..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                <Facebook className="h-3.5 w-3.5 text-blue-400" />
                <span>Facebook Page URL</span>
              </label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-emerald-400" />
                <span>Personal Website / Portfolio</span>
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions Footer */}
        <div className="pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-500">
            {isArabic
              ? "* التغييرات سيتم تحديثها فوراً وتظهر لجميع المتدربين المسجلين معك."
              : "* Updates will immediately save to your profile and reflect on client dashboards."}
          </p>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-neutral-950 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{isArabic ? "جاري الحفظ..." : "Saving Profile..."}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 stroke-[2.5]" />
                <span>{isArabic ? "حفظ التغييرات الآن" : "Save Profile Changes"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

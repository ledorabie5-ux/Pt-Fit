import React, { useState, useEffect } from "react";
import { UserDoc } from "../types";
import { getAllCoaches, assignCoachToTrainee, updateUserDoc } from "../services/dbService";
import { Language } from "../utils/translations";
import { 
  Users, Search, ShieldCheck, Award, MessageCircle, ExternalLink, 
  Check, Instagram, Youtube, Facebook, Twitter, Globe, Edit3, X, Sparkles, CheckCircle2, Phone
} from "lucide-react";

interface AllCoachesViewProps {
  currentUser: UserDoc;
  lang: Language;
  onUserUpdate?: (updatedUser: UserDoc) => void;
}

export default function AllCoachesView({ currentUser, lang, onUserUpdate }: AllCoachesViewProps) {
  const isArabic = lang === "ar";
  const [coaches, setCoaches] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoachForModal, setSelectedCoachForModal] = useState<UserDoc | null>(null);
  
  // Selection/Switching Coach State
  const [switchingCoach, setSwitchingCoach] = useState<UserDoc | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit My Coach Profile State (if current user is coach)
  const [isEditingMyProfile, setIsEditingMyProfile] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(currentUser.photoUrl || "");
  const [bio, setBio] = useState(currentUser.bio || "");
  const [specialization, setSpecialization] = useState(currentUser.specialization || "");
  const [yearsOfExperience, setYearsOfExperience] = useState<string>(currentUser.yearsOfExperience?.toString() || "");
  const [instagram, setInstagram] = useState(currentUser.socialLinks?.instagram || "");
  const [youtube, setYoutube] = useState(currentUser.socialLinks?.youtube || "");
  const [tiktok, setTiktok] = useState(currentUser.socialLinks?.tiktok || "");
  const [facebook, setFacebook] = useState(currentUser.socialLinks?.facebook || "");
  const [whatsapp, setWhatsapp] = useState(currentUser.socialLinks?.whatsapp || "");
  const [website, setWebsite] = useState(currentUser.socialLinks?.website || "");
  const [savingProfile, setSavingProfile] = useState(false);

  async function loadCoachesList() {
    setLoading(true);
    try {
      const list = await getAllCoaches();
      setCoaches(list);
    } catch (err) {
      console.error("Error loading coaches list:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoachesList();
  }, []);

  const handleConfirmSelectCoach = async () => {
    if (!switchingCoach) return;
    setAssigning(true);
    try {
      await assignCoachToTrainee(currentUser.uid, switchingCoach.uid, switchingCoach.name);
      const updatedUser: UserDoc = {
        ...currentUser,
        coachId: switchingCoach.uid,
        coachName: switchingCoach.name
      };
      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }
      setSuccessMessage(
        isArabic 
          ? `تم تغيير مدربك بنجاح إلى الكابتن ${switchingCoach.name}!` 
          : `Successfully updated your coach to Captain ${switchingCoach.name}!`
      );
      setSwitchingCoach(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error("Error assigning coach:", err);
      alert(isArabic ? "حدث خطأ أثناء تغيير المدرب" : "Error changing coach");
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updatedUser: UserDoc = {
        ...currentUser,
        photoUrl: photoUrl.trim() || undefined,
        bio: bio.trim() || undefined,
        specialization: specialization.trim() || undefined,
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined,
        socialLinks: {
          instagram: instagram.trim() || undefined,
          youtube: youtube.trim() || undefined,
          tiktok: tiktok.trim() || undefined,
          facebook: facebook.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          website: website.trim() || undefined,
        }
      };

      await updateUserDoc(updatedUser);
      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }
      setIsEditingMyProfile(false);
      await loadCoachesList();
      alert(isArabic ? "تم تحديث ملفك الشخصي بنجاح!" : "Coach profile updated successfully!");
    } catch (err) {
      console.error("Error updating coach profile:", err);
      alert(isArabic ? "حدث خطأ أثناء حفظ البيانات" : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const filteredCoaches = coaches.filter(c => {
    const q = searchQuery.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const specMatch = c.specialization?.toLowerCase().includes(q);
    const bioMatch = c.bio?.toLowerCase().includes(q);
    return nameMatch || specMatch || bioMatch;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {isArabic ? "دليل جميع المدربين ● ALL COACHES" : "ALL COACHES DIRECTORY"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {isArabic ? "فريق المدربين المحترفين" : "Elite Personal Fitness Coaches"}
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 leading-relaxed">
              {isArabic
                ? "استعرض جميع مدربي المنصة المعتمدين، واطلع على خبراتهم، تخصصاتهم، وسائل التواصل، واختر المدرب الأنسب لك في أي وقت."
                : "Browse complete public profiles for our certified fitness coaches, explore specializations and experience, and change your coach at any time with a single click."}
            </p>
          </div>

          {/* If current user is coach, give button to edit their profile */}
          {currentUser.role === "coach" && (
            <button
              onClick={() => setIsEditingMyProfile(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer shrink-0"
            >
              <Edit3 className="h-4 w-4" />
              <span>{isArabic ? "تعديل ملفي الشخصي كمدرب" : "Edit My Public Coach Profile"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast feedback banner */}
      {successMessage && (
        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 p-4 rounded-xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <p className="text-xs md:text-sm font-bold">{successMessage}</p>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 rtl:right-3.5 rtl:left-auto" />
          <input
            type="text"
            placeholder={isArabic ? "ابحث باسم المدرب أو التخصص..." : "Search coach by name or specialization..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="text-xs text-neutral-400 font-mono">
          {isArabic ? `إجمالي المدربين: ${filteredCoaches.length}` : `Total Coaches: ${filteredCoaches.length}`}
        </div>
      </div>

      {/* Coaches Cards Grid */}
      {loading ? (
        <div className="text-center py-20 space-y-3">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 font-mono">{isArabic ? "جاري تحميل قائمة المدربين..." : "Loading coach profiles..."}</p>
        </div>
      ) : filteredCoaches.length === 0 ? (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500 text-xs">
          {isArabic ? "لم يتم العثور على مدربين يطابقون خيارات البحث." : "No coaches found matching your search query."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredCoaches.map((coach) => {
            const isMyCoach = currentUser.coachId === coach.uid;
            
            return (
              <div
                key={coach.uid}
                className={`bg-neutral-900 border rounded-2xl p-6 space-y-5 transition-all relative flex flex-col justify-between ${
                  isMyCoach
                    ? "border-emerald-500/80 shadow-emerald-950/30 shadow-xl ring-1 ring-emerald-500/30"
                    : "border-neutral-800 hover:border-neutral-700"
                }`}
              >
                {/* Active Coach Badge */}
                {isMyCoach && (
                  <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto z-10">
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 font-mono">
                      <Check className="h-3 w-3 stroke-[3]" />
                      {isArabic ? "مدربك الحالي" : "YOUR CURRENT COACH"}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Photo & Identity Header */}
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={
                          coach.photoUrl ||
                          "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&auto=format&fit=crop&q=80"
                        }
                        alt={coach.name}
                        referrerPolicy="no-referrer"
                        className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover border-2 border-neutral-800 shadow-md"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-neutral-950 p-1 rounded-full border border-neutral-800">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0 pr-12 rtl:pl-12 rtl:pr-0">
                      <h3 className="text-base md:text-lg font-bold text-white truncate">{coach.name}</h3>
                      
                      {coach.specialization && (
                        <p className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2.5 py-0.5 rounded-md inline-block">
                          {coach.specialization}
                        </p>
                      )}

                      {coach.yearsOfExperience !== undefined && coach.yearsOfExperience !== null && (
                        <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-mono mt-1">
                          <Award className="h-3.5 w-3.5 text-amber-400" />
                          <span>{coach.yearsOfExperience} {isArabic ? "سنوات خبرة" : "Years Experience"}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bio Description */}
                  <p className="text-xs text-neutral-300 leading-relaxed line-clamp-3 bg-neutral-950/60 p-3 rounded-xl border border-neutral-850/80">
                    {coach.bio || (isArabic ? "مدرب لياقة بدنية محترف معتمد مصمم لتقديم خطط تدريب وتغذية مخصصة للرياضيين." : "Certified elite fitness coach dedicated to customized strength programming and high-performance nutrition.")}
                  </p>

                  {/* Social Media Contacts Bar */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                      {isArabic ? "وسائل التواصل الاجتماعي" : "Social Links & Contact"}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {coach.socialLinks?.instagram && (
                        <a
                          href={coach.socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-neutral-950 hover:bg-neutral-800 text-pink-400 border border-neutral-800 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                          title="Instagram"
                        >
                          <Instagram className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {coach.socialLinks?.youtube && (
                        <a
                          href={coach.socialLinks.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-neutral-950 hover:bg-neutral-800 text-red-500 border border-neutral-800 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                          title="YouTube"
                        >
                          <Youtube className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {coach.socialLinks?.tiktok && (
                        <a
                          href={coach.socialLinks.tiktok}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-neutral-950 hover:bg-neutral-800 text-cyan-400 border border-neutral-800 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                          title="TikTok"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {coach.socialLinks?.facebook && (
                        <a
                          href={coach.socialLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-neutral-950 hover:bg-neutral-800 text-blue-400 border border-neutral-800 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                          title="Facebook"
                        >
                          <Facebook className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {coach.phone && (
                        <a
                          href={`https://wa.me/${coach.socialLinks?.whatsapp || coach.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-green-950/60 hover:bg-green-600 hover:text-neutral-950 text-green-400 border border-green-800/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-4 border-t border-neutral-850 flex items-center justify-between gap-3 mt-4">
                  <button
                    onClick={() => setSelectedCoachForModal(coach)}
                    className="text-xs text-neutral-400 hover:text-white font-medium underline underline-offset-4 cursor-pointer"
                  >
                    {isArabic ? "عرض الملف الكامل" : "View Full Profile"}
                  </button>

                  {/* Change/Select Coach button for trainees */}
                  {currentUser.role === "trainee" && (
                    isMyCoach ? (
                      <button
                        disabled
                        className="px-4 py-2 bg-emerald-950 text-emerald-400 border border-emerald-800/40 rounded-xl text-xs font-bold cursor-default flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {isArabic ? "مدربك الحالي" : "Selected Coach"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setSwitchingCoach(coach)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isArabic ? "اختيار كمدربي الخاص" : "Select as My Coach"}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal to Switch Coach */}
      {switchingCoach && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative animate-in zoom-in-95">
            <button
              onClick={() => setSwitchingCoach(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {isArabic ? "تأكيد اختيار المدرب" : "Confirm Coach Change"}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isArabic
                  ? `هل ترغب في تغيير مدربك إلى الكابتن (${switchingCoach.name})؟ سيتم تحديث ملفك وتنبيه المدرب بطلبك.`
                  : `Are you sure you want to select Captain ${switchingCoach.name} as your head coach? Your account will be updated immediately.`}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSwitchingCoach(null)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleConfirmSelectCoach}
                disabled={assigning}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-neutral-950 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {assigning ? (
                  <span>{isArabic ? "جاري التحديث..." : "Updating..."}</span>
                ) : (
                  <>
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>{isArabic ? "تأكيد الاختيار" : "Confirm Selection"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Full Coach Modal */}
      {selectedCoachForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <button
              onClick={() => setSelectedCoachForModal(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-4 border-b border-neutral-800 pb-4">
              <img
                src={
                  selectedCoachForModal.photoUrl ||
                  "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&auto=format&fit=crop&q=80"
                }
                alt={selectedCoachForModal.name}
                referrerPolicy="no-referrer"
                className="h-20 w-20 rounded-2xl object-cover border-2 border-neutral-800"
              />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">{selectedCoachForModal.name}</h3>
                <p className="text-xs font-bold text-emerald-400">{selectedCoachForModal.specialization}</p>
                {selectedCoachForModal.yearsOfExperience && (
                  <p className="text-[11px] text-neutral-400 font-mono">
                    {selectedCoachForModal.yearsOfExperience} {isArabic ? "سنوات خبرة تدريبية" : "Years Coaching Experience"}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-neutral-300 font-mono uppercase tracking-wider mb-1.5">
                  {isArabic ? "نبذة عن المدرب والخبرات" : "About & Experience"}
                </h4>
                <p className="text-neutral-300 bg-neutral-950 p-4 rounded-xl border border-neutral-850 leading-relaxed">
                  {selectedCoachForModal.bio || (isArabic ? "لا توجد نبذة إضافية مسجلة." : "No description provided.")}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-neutral-300 font-mono uppercase tracking-wider mb-1.5">
                  {isArabic ? "بيانات التواصل المباشر" : "Direct Contact Details"}
                </h4>
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isArabic ? "الهاتف:" : "Phone:"}</span>
                    <span className="text-white font-mono">{selectedCoachForModal.phone || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isArabic ? "البريد الإلكتروني:" : "Email:"}</span>
                    <span className="text-neutral-300 font-mono">{selectedCoachForModal.email}</span>
                  </div>

                  {(() => {
                    const waNum = selectedCoachForModal.socialLinks?.whatsapp || selectedCoachForModal.phone;
                    if (!waNum) return null;
                    let digits = waNum.replace(/[^0-9]/g, "");
                    if (digits.startsWith("0")) digits = "20" + digits.substring(1);
                    if (!digits) return null;
                    return (
                      <a
                        href={`https://wa.me/${digits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-neutral-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer mt-3"
                      >
                        <MessageCircle className="h-4 w-4 fill-neutral-950" />
                        <span>{isArabic ? "تواصل عبر الواتساب الآن" : "Direct Chat on WhatsApp"}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCoachForModal(null)}
                className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit My Coach Profile Modal (For Coaches) */}
      {isEditingMyProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMyProfile}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
          >
            <button
              type="button"
              onClick={() => setIsEditingMyProfile(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-emerald-400" />
                <span>{isArabic ? "تعديل ملفك الشخصي كمدرب" : "Edit Public Coach Profile"}</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {isArabic
                  ? "قم بتحديث معلوماتك الظاهرة لجميع المتدربين في دليل المدربين."
                  : "Update your profile image, bio, specialization, and social contacts visible to trainees."}
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-neutral-400 font-mono">
                  {isArabic ? "رابط الصورة الشخصية (Photo URL)" : "Profile Photo URL"}
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-neutral-400 font-mono">
                    {isArabic ? "التخصص التدريبي" : "Specialization"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bodybuilding & Fat Loss"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-neutral-400 font-mono">
                    {isArabic ? "سنوات الخبرة" : "Years of Experience"}
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 7"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-400 font-mono">
                  {isArabic ? "نبذة تعريفية (Bio)" : "Bio / Description"}
                </label>
                <textarea
                  rows={3}
                  placeholder={isArabic ? "اكتب نبذة عن خبراتك وأسلوبك التدريبي..." : "Describe your coaching philosophy and expertise..."}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-neutral-800">
                <h4 className="font-bold text-neutral-300 font-mono uppercase tracking-wider">
                  {isArabic ? "روابط وسائل التواصل الاجتماعي" : "Social Media Links (Optional)"}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-mono mb-1">Instagram URL</label>
                    <input
                      type="text"
                      placeholder="https://instagram.com/..."
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-mono mb-1">YouTube URL</label>
                    <input
                      type="text"
                      placeholder="https://youtube.com/..."
                      value={youtube}
                      onChange={(e) => setYoutube(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-mono mb-1">TikTok URL</label>
                    <input
                      type="text"
                      placeholder="https://tiktok.com/..."
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-mono mb-1">Facebook URL</label>
                    <input
                      type="text"
                      placeholder="https://facebook.com/..."
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-mono mb-1">WhatsApp Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 201044186025"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditingMyProfile(false)}
                className="px-4 py-2 bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-neutral-950 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                {savingProfile ? (isArabic ? "جاري الحفظ..." : "Saving...") : (isArabic ? "حفظ التغييرات" : "Save Profile")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

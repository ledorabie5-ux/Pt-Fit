import React, { useState, useEffect } from "react";
import { AppNotification } from "../types";
import { 
  subscribeToNotifications, 
  markNotificationRead, 
  deleteNotification, 
  deleteAllNotifications 
} from "../services/dbService";
import { Bell, Check, Info, Trash2 } from "lucide-react";
import { Language } from "../utils/translations";

interface NotificationBellProps {
  currentUserId: string;
  lang?: Language;
}

export default function NotificationBell({ currentUserId, lang = "en" }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications(currentUserId, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [currentUserId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleDeleteAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmClear = window.confirm(
      isRtl 
        ? "هل أنت متأكد من رغبتك في حذف جميع الإشعارات؟" 
        : "Are you sure you want to delete all notifications?"
    );
    if (!confirmClear) return;
    try {
      await deleteAllNotifications(currentUserId);
    } catch (err) {
      console.error("Failed to delete all notifications:", err);
    }
  };

  const isRtl = lang === "ar";

  // Localized texts
  const tTitle = isRtl ? "الإشعارات" : "Notifications";
  const tNew = isRtl ? "جديد" : "new";
  const tEmpty = isRtl ? "لا توجد إشعارات بعد." : "No notifications yet.";
  const tMarkRead = isRtl ? "تحديد كمقروء" : "Mark as read";
  const tDelete = isRtl ? "حذف" : "Delete";
  const tDeleteAll = isRtl ? "حذف الكل" : "Delete All";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 text-neutral-400 hover:text-emerald-400 bg-neutral-900 rounded-xl hover:bg-neutral-850 transition-all border border-neutral-800 focus:outline-none cursor-pointer flex items-center justify-center"
        id="notification-bell"
        title={tTitle}
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-emerald-500 text-neutral-950 font-bold text-[10px] rounded-full flex items-center justify-center animate-bounce shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop overlay to close when clicking outside */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div 
            className={`absolute ${
              isRtl ? "left-0 origin-top-left" : "right-0 origin-top-right"
            } mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50`}
          >
            {/* Header section with title and Delete All */}
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/60 border-b border-neutral-800 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Bell className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-white tracking-wide truncate">{tTitle}</span>
                {unreadCount > 0 && (
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full font-bold font-mono shrink-0">
                    {unreadCount} {tNew}
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition-all flex items-center gap-1 px-2 py-1 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-950/40 rounded-md cursor-pointer shrink-0"
                  title={tDeleteAll}
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{tDeleteAll}</span>
                </button>
              )}
            </div>

            {/* List area */}
            <div className="max-h-80 overflow-y-auto divide-y divide-neutral-900">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-xs flex flex-col items-center justify-center gap-2">
                  <Info className="h-5 w-5 text-neutral-600" />
                  <p>{tEmpty}</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 transition-colors hover:bg-neutral-900/50 relative flex gap-3 ${
                      notif.read ? "opacity-65 bg-transparent" : "bg-emerald-950/10 border-l-2 rtl:border-l-0 rtl:border-r-2 border-emerald-500"
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <h5 className="text-xs font-bold text-white leading-normal break-words whitespace-normal text-left rtl:text-right flex-1">
                          {notif.title}
                        </h5>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!notif.read && (
                            <button
                              onClick={(e) => handleMarkAsRead(notif.id, e)}
                              className="text-emerald-400 hover:text-emerald-300 p-1 bg-emerald-950/80 hover:bg-emerald-900 rounded border border-emerald-800/50 transition-all flex items-center justify-center cursor-pointer shrink-0"
                              title={tMarkRead}
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(notif.id, e)}
                            className="text-rose-400 hover:text-rose-300 p-1 bg-rose-950/80 hover:bg-rose-900 rounded border border-rose-800/50 transition-all flex items-center justify-center cursor-pointer shrink-0"
                            title={tDelete}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-300 mt-1 leading-relaxed break-words whitespace-normal text-left rtl:text-right">
                        {notif.body}
                      </p>
                      <span className="block text-[9px] text-neutral-500 mt-2 font-mono text-left rtl:text-right">
                        {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

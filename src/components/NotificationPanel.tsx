"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Info,
  Loader2,
  RefreshCw,
  ShieldAlert,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type:
    | "new_data"
    | "validation_request"
    | "alert"
    | "system"
    | "reminder";
  entity_id: string | null;
  entity_type: string | null;
  read: boolean;
  action_url: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
}

const TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  new_data: {
    icon: <Info size={14} />,
    color: "var(--gm-info)",
    label: "Nouvelles données",
  },
  validation_request: {
    icon: <Check size={14} />,
    color: "var(--gm-accent)",
    label: "Validation",
  },
  alert: {
    icon: <AlertTriangle size={14} />,
    color: "var(--gm-warning)",
    label: "Alerte",
  },
  system: {
    icon: <Zap size={14} />,
    color: "var(--gm-danger)",
    label: "Système",
  },
  reminder: {
    icon: <Bell size={14} />,
    color: "var(--gm-success)",
    label: "Rappel",
  },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "var(--gm-text-muted)",
  normal: "var(--gm-info)",
  high: "var(--gm-warning)",
  urgent: "var(--gm-danger)",
};

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
  onUnreadCountChange,
}: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const panelRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      const notifs = (data || []) as Notification[];
      setNotifications(notifs);
      onUnreadCountChange(notifs.filter((n) => !n.read).length);
    } catch {
      console.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial load + Realtime subscription
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("god-mode:notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          onUnreadCountChange(
            [newNotif, ...notifications].filter((n) => !n.read).length,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    onUnreadCountChange(
      notifications.filter((n) => !n.read && n.id !== id).length,
    );
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    onUnreadCountChange(0);
  };

  // Format relative time
  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days}j`;
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  if (!isOpen) return null;

  const displayed =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-[420px] max-h-[520px] rounded-2xl border shadow-2xl overflow-hidden z-[90] flex flex-col"
      style={{
        backgroundColor: "var(--gm-surface)",
        borderColor: "var(--gm-border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: "var(--gm-border)" }}
      >
        <div className="flex items-center gap-2">
          <Bell size={16} style={{ color: "var(--gm-accent)" }} />
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--gm-text)" }}
          >
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: "rgba(239,68,68,0.15)",
                color: "var(--gm-danger)",
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={markAllAsRead}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--gm-text-muted)" }}
            title="Tout marquer comme lu"
          >
            <CheckCheck size={14} />
          </button>
          <button
            onClick={fetchNotifications}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--gm-text-muted)" }}
            title="Rafraîchir"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--gm-text-muted)" }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-1 px-4 py-2 border-b shrink-0"
        style={{ borderColor: "var(--gm-border)" }}
      >
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                filter === f ? "var(--gm-accent)" : "transparent",
              color: filter === f ? "white" : "var(--gm-text-muted)",
            }}
          >
            {f === "all" ? "Toutes" : `Non lues (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2
              size={20}
              className="animate-spin"
              style={{ color: "var(--gm-accent)" }}
            />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <BellOff size={24} style={{ color: "var(--gm-text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
              {filter === "unread"
                ? "Aucune notification non lue"
                : "Aucune notification"}
            </p>
          </div>
        ) : (
          displayed.map((notif) => {
            const typeConf =
              TYPE_CONFIG[notif.notification_type] || TYPE_CONFIG.system;
            return (
              <button
                key={notif.id}
                onClick={() => {
                  if (!notif.read) markAsRead(notif.id);
                  if (notif.action_url) {
                    onClose();
                    window.location.href = notif.action_url;
                  }
                }}
                className="flex gap-3 w-full px-4 py-3 text-left transition-colors hover:bg-white/5 border-b"
                style={{
                  borderColor: "var(--gm-border)",
                  backgroundColor: notif.read
                    ? "transparent"
                    : "rgba(99,102,241,0.03)",
                }}
              >
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${typeConf.color} 15%, transparent)`,
                  }}
                >
                  <span style={{ color: typeConf.color }}>{typeConf.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm truncate ${!notif.read ? "font-semibold" : "font-medium"}`}
                      style={{ color: "var(--gm-text)" }}
                    >
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: "var(--gm-accent)" }}
                      />
                    )}
                  </div>
                  <p
                    className="text-xs mt-0.5 line-clamp-2"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${typeConf.color} 12%, transparent)`,
                        color: typeConf.color,
                      }}
                    >
                      {typeConf.label}
                    </span>
                    {notif.priority !== "normal" && (
                      <span className="flex items-center gap-1">
                        <ShieldAlert
                          size={10}
                          style={{
                            color: PRIORITY_COLORS[notif.priority],
                          }}
                        />
                        <span
                          className="text-[10px]"
                          style={{
                            color: PRIORITY_COLORS[notif.priority],
                          }}
                        >
                          {notif.priority}
                        </span>
                      </span>
                    )}
                    <span
                      className="text-[10px] ml-auto"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      {formatTime(notif.created_at)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 border-t text-center shrink-0"
        style={{
          borderColor: "var(--gm-border)",
          backgroundColor: "var(--gm-bg)",
        }}
      >
        <span className="text-[10px]" style={{ color: "var(--gm-text-muted)" }}>
          {notifications.length} notification
          {notifications.length !== 1 ? "s" : ""} · Realtime activé
        </span>
      </div>
    </div>
  );
}

"use client";

import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import NotificationPanel from "./NotificationPanel";
import { useRole } from "./RoleProvider";
import SearchModal from "./SearchModal";

export default function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();
  const { userName, gmRole, accessLevel } = useRole();

  const displayName = userName || "Admin";

  const accessLabels: Record<number, string> = {
    0: "Super Admin",
    1: "Admin",
    2: "Manager",
    3: "Opérateur",
    4: "Lecture seule",
  };
  const displayRole =
    accessLabels[accessLevel] || gmRole?.replace("god_", "") || "Staff";

  // Global ⌘K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        setNotifOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-6 border-b"
        style={{
          backgroundColor: "var(--gm-surface)",
          borderColor: "var(--gm-border)",
        }}
      >
        {/* Search trigger */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            onClick={() => {
              setSearchOpen(true);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-left transition-colors hover:bg-white/5"
            style={{ backgroundColor: "var(--gm-bg)" }}
          >
            <Search size={16} style={{ color: "var(--gm-text-muted)" }} />
            <span
              className="text-sm flex-1"
              style={{ color: "var(--gm-text-muted)" }}
            >
              Rechercher...
            </span>
            <kbd
              className="text-[10px] px-1.5 py-0.5 rounded border"
              style={{
                color: "var(--gm-text-muted)",
                borderColor: "var(--gm-border)",
              }}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setSearchOpen(false);
              }}
              className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: "var(--gm-text-muted)" }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                  style={{ backgroundColor: "var(--gm-danger)" }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <NotificationPanel
              isOpen={notifOpen}
              onClose={() => setNotifOpen(false)}
              onUnreadCountChange={setUnreadCount}
            />
          </div>

          {/* User */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setUserMenuOpen((prev) => !prev);
                setNotifOpen(false);
              }}
              className="flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors hover:bg-white/5 cursor-pointer"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: "var(--gm-accent)" }}
              >
                {displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="hidden sm:block text-left">
                <p
                  className="text-sm font-medium leading-tight"
                  style={{ color: "var(--gm-text)" }}
                >
                  {displayName}
                </p>
                <p
                  className="text-[10px] leading-tight"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  {displayRole}
                </p>
              </div>
              <ChevronDown
                size={14}
                className="hidden sm:block"
                style={{ color: "var(--gm-text-muted)" }}
              />
            </button>

            {/* User dropdown */}
            {userMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-xl z-50 overflow-hidden"
                style={{
                  backgroundColor: "var(--gm-surface)",
                  borderColor: "var(--gm-border)",
                }}
              >
                <div
                  className="px-4 py-3 border-b"
                  style={{ borderColor: "var(--gm-border)" }}
                >
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--gm-text)" }}
                  >
                    {displayName}
                  </p>
                  <p
                    className="text-[10px] truncate"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    {displayRole}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    href="/god-mode/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                    style={{ color: "var(--gm-text)" }}
                  >
                    <User size={15} style={{ color: "var(--gm-text-muted)" }} />
                    Mon profil
                  </Link>
                  <Link
                    href="/god-mode/system"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                    style={{ color: "var(--gm-text)" }}
                  >
                    <Settings
                      size={15}
                      style={{ color: "var(--gm-text-muted)" }}
                    />
                    Paramètres
                  </Link>
                </div>
                <div
                  className="py-1 border-t"
                  style={{ borderColor: "var(--gm-border)" }}
                >
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm w-full text-left transition-colors hover:bg-white/5"
                    style={{ color: "var(--gm-danger)" }}
                  >
                    <LogOut size={15} />
                    {loggingOut ? "Déconnexion..." : "Se déconnecter"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

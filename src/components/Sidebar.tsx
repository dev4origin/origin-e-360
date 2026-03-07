"use client";

import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  DollarSign,
  HeadphonesIcon,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useRole } from "./RoleProvider";

interface NavSection {
  label: string;
  pillar: string;
  icon: React.ReactNode;
  href: string;
  children?: { label: string; href: string }[];
}

const navigation: NavSection[] = [
  {
    label: "Vue d'ensemble",
    pillar: "overview",
    icon: <LayoutDashboard size={20} />,
    href: "/god-mode/dashboard",
  },
  {
    label: "Finance",
    pillar: "finance",
    icon: <DollarSign size={20} />,
    href: "/god-mode/finance",
    children: [
      { label: "Revenus & MRR", href: "/god-mode/finance" },
      { label: "Paiements", href: "/god-mode/finance/payments" },
      { label: "Abonnements", href: "/god-mode/finance/subscriptions" },
    ],
  },
  {
    label: "Opérations",
    pillar: "operations",
    icon: <Activity size={20} />,
    href: "/god-mode/operations",
    children: [
      { label: "Traçabilité", href: "/god-mode/operations" },
      { label: "Campagnes", href: "/god-mode/operations/campaigns" },
      { label: "Livraisons", href: "/god-mode/operations/deliveries" },
    ],
  },
  {
    label: "Audit",
    pillar: "audit",
    icon: <ClipboardCheck size={20} />,
    href: "/god-mode/audit",
    children: [
      { label: "File de validation", href: "/god-mode/audit" },
      { label: "Auditeurs", href: "/god-mode/audit/auditors" },
      { label: "Performance", href: "/god-mode/audit/performance" },
      { label: "Alertes", href: "/god-mode/audit/alerts" },
    ],
  },
  {
    label: "SAV",
    pillar: "sav",
    icon: <HeadphonesIcon size={20} />,
    href: "/god-mode/sav",
    children: [
      { label: "Tickets", href: "/god-mode/sav" },
      { label: "SLA", href: "/god-mode/sav/sla" },
      { label: "Stats agents", href: "/god-mode/sav/agents" },
    ],
  },
  {
    label: "Produits",
    pillar: "product",
    icon: <Package size={20} />,
    href: "/god-mode/products",
    children: [
      { label: "Catalogue", href: "/god-mode/products" },
      { label: "Avis clients", href: "/god-mode/products/reviews" },
    ],
  },
  {
    label: "CRM",
    pillar: "crm",
    icon: <Users size={20} />,
    href: "/god-mode/crm",
    children: [
      { label: "Organisations", href: "/god-mode/crm" },
      { label: "Pipeline", href: "/god-mode/crm/pipeline" },
      { label: "Client 360°", href: "/god-mode/crm/organizations" },
    ],
  },
  {
    label: "Conformité",
    pillar: "compliance",
    icon: <ShieldCheck size={20} />,
    href: "/god-mode/compliance",
    children: [
      { label: "KYC / Documents", href: "/god-mode/compliance" },
      { label: "EUDR", href: "/god-mode/compliance/eudr" },
    ],
  },
  {
    label: "Système",
    pillar: "system",
    icon: <Settings size={20} />,
    href: "/god-mode/system",
    children: [
      { label: "Équipe GM", href: "/god-mode/system" },
      { label: "Permissions", href: "/god-mode/system/permissions" },
      { label: "Journal d'audit", href: "/god-mode/system/logs" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { allowedPillars, userName, loading: roleLoading } = useRole();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();

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

  // Filter navigation by allowed pillars
  const filteredNav = roleLoading
    ? []
    : navigation.filter((section) => allowedPillars.includes(section.pillar));

  const toggleSection = (pillar: string) => {
    setExpandedSections((prev) =>
      prev.includes(pillar)
        ? prev.filter((p) => p !== pillar)
        : [...prev, pillar],
    );
  };

  const isActive = (href: string) => pathname === href;
  const isSectionActive = (section: NavSection) =>
    pathname.startsWith(section.href);

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-50 flex flex-col transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[260px]"
      }`}
      style={{ backgroundColor: "var(--gm-surface)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
          style={{ backgroundColor: "var(--gm-accent)" }}
        >
          G
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm">Origin.e</span>
            <span
              className="text-[10px]"
              style={{ color: "var(--gm-text-muted)" }}
            >
              360° Control Center
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredNav.map((section) => {
          const active = isSectionActive(section);
          const expanded = expandedSections.includes(section.pillar) || active;

          return (
            <div key={section.pillar}>
              {/* Main Link */}
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group ${
                  active
                    ? "text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
                style={
                  active
                    ? { backgroundColor: "rgba(99, 102, 241, 0.12)" }
                    : undefined
                }
                onClick={() => {
                  if (section.children && !collapsed) {
                    toggleSection(section.pillar);
                  }
                }}
              >
                <span
                  style={active ? { color: "var(--gm-accent)" } : undefined}
                >
                  {section.icon}
                </span>
                {!collapsed && (
                  <>
                    <Link
                      href={section.href}
                      className="flex-1 text-sm font-medium"
                    >
                      {section.label}
                    </Link>
                    {section.children && (
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                        style={{ color: "var(--gm-text-muted)" }}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Sub-items */}
              {!collapsed && expanded && section.children && (
                <div className="ml-8 mt-1 space-y-0.5">
                  {section.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block px-3 py-1.5 rounded-md text-xs transition-colors ${
                        isActive(child.href)
                          ? "text-white font-medium"
                          : "hover:text-white/70"
                      }`}
                      style={{
                        color: isActive(child.href)
                          ? "var(--gm-accent)"
                          : "var(--gm-text-muted)",
                      }}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-white/5 p-3 space-y-1">
        {/* Profile link */}
        <Link
          href="/god-mode/profile"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors hover:bg-white/5 ${
            pathname === "/god-mode/profile" ? "text-white" : ""
          }`}
          style={
            pathname === "/god-mode/profile"
              ? {
                  backgroundColor: "rgba(99, 102, 241, 0.12)",
                  color: "var(--gm-accent)",
                }
              : { color: "var(--gm-text-muted)" }
          }
        >
          <User size={18} />
          {!collapsed && (
            <span className="text-xs">{userName || "Mon profil"}</span>
          )}
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors hover:bg-red-500/10"
          style={{ color: "var(--gm-danger)" }}
        >
          <LogOut size={18} />
          {!collapsed && (
            <span className="text-xs">
              {loggingOut ? "Déconnexion..." : "Déconnexion"}
            </span>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors hover:bg-white/5"
          style={{ color: "var(--gm-text-muted)" }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="text-xs">Réduire</span>}
        </button>
      </div>
    </aside>
  );
}

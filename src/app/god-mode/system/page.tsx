"use client";

import { createClient } from "@/lib/supabase/client";
import type { GmRole, GodModePermission, GodModeStaff } from "@/lib/types";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const ROLE_LABELS: Record<GmRole, { label: string; color: string }> = {
  god_admin: { label: "Super Admin", color: "#ef4444" },
  coo: { label: "COO", color: "#8b5cf6" },
  cfo: { label: "CFO", color: "#6366f1" },
  cto: { label: "CTO", color: "#3b82f6" },
  head_audit: { label: "Head Audit", color: "#f59e0b" },
  head_sav: { label: "Head SAV", color: "#22c55e" },
  head_sales: { label: "Head Sales", color: "#ec4899" },
  auditor_internal: { label: "Auditeur interne", color: "#14b8a6" },
  sav_agent: { label: "Agent SAV", color: "#06b6d4" },
  sales_rep: { label: "Commercial", color: "#a855f7" },
};

const PILLARS = [
  "finance",
  "operations",
  "audit",
  "sav",
  "product",
  "crm",
  "compliance",
  "system",
];

const ACTIONS = [
  { key: "can_read", label: "Lire" },
  { key: "can_write", label: "Écrire" },
  { key: "can_delete", label: "Supprimer" },
  { key: "can_export", label: "Exporter" },
  { key: "can_approve", label: "Approuver" },
];

export default function SystemPage() {
  const [staff, setStaff] = useState<
    (GodModeStaff & { email?: string; full_name?: string })[]
  >([]);
  const [permissions, setPermissions] = useState<GodModePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"team" | "permissions">("team");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createResult, setCreateResult] = useState<{
    success?: boolean;
    error?: string;
    email?: string;
  } | null>(null);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    telephone: "",
    departement: "",
    village: "",
    role: "agent" as string,
    gm_role: "" as string,
  });
  const [newMember, setNewMember] = useState({
    email: "",
    gm_role: "sav_agent" as GmRole,
    department: "",
  });
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffRes, permsRes] = await Promise.all([
        supabase
          .from("god_mode_staff")
          .select("*, user_profile:user_id(full_name, email)")
          .order("access_level", { ascending: true }),
        supabase
          .from("god_mode_permissions")
          .select("*")
          .order("gm_role", { ascending: true }),
      ]);

      if (staffRes.error) throw staffRes.error;
      if (permsRes.error) throw permsRes.error;

      const enrichedStaff = (staffRes.data || []).map(
        (s: Record<string, unknown>) => {
          const profile = s.user_profile as {
            full_name?: string;
            email?: string;
          } | null;
          return {
            ...s,
            full_name: profile?.full_name || "Utilisateur inconnu",
            email: profile?.email || "",
          };
        },
      ) as (GodModeStaff & { email?: string; full_name?: string })[];

      setStaff(enrichedStaff);
      setPermissions(permsRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const toggleStaffActive = async (staffId: string, currentActive: boolean) => {
    const { error: updateError } = await supabase
      .from("god_mode_staff")
      .update({
        is_active: !currentActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId);

    if (!updateError) {
      setStaff((prev) =>
        prev.map((s) =>
          s.id === staffId ? { ...s, is_active: !currentActive } : s,
        ),
      );
    }
  };

  const togglePermission = async (
    permId: string,
    field: string,
    currentValue: boolean,
  ) => {
    const { error: updateError } = await supabase
      .from("god_mode_permissions")
      .update({ [field]: !currentValue })
      .eq("id", permId);

    if (!updateError) {
      setPermissions((prev) =>
        prev.map((p) =>
          p.id === permId ? { ...p, [field]: !currentValue } : p,
        ),
      );
    }
  };

  const addStaffMember = async () => {
    if (!newMember.email) return;

    // Find user by email in user_profile
    const { data: profileData } = await supabase
      .from("user_profile")
      .select("id")
      .eq("email", newMember.email)
      .single();

    if (!profileData) {
      alert("Utilisateur non trouvé avec cet email");
      return;
    }

    const { error: insertError } = await supabase
      .from("god_mode_staff")
      .insert({
        user_id: profileData.id,
        gm_role: newMember.gm_role,
        department: newMember.department || null,
        access_level: getAccessLevel(newMember.gm_role),
        is_active: true,
      });

    if (insertError) {
      alert(`Erreur: ${insertError.message}`);
      return;
    }

    setShowAddModal(false);
    setNewMember({ email: "", gm_role: "sav_agent", department: "" });
    fetchData();
  };

  const PLATFORM_ROLES = [
    { value: "admin", label: "Administrateur" },
    { value: "auditor", label: "Auditeur" },
    { value: "agent", label: "Agent" },
    { value: "cooperative", label: "Coopérative" },
    { value: "exportateur", label: "Exportateur" },
    { value: "producteur", label: "Producteur" },
  ];

  const createAccount = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) return;
    setCreating(true);
    setCreateResult(null);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          telephone: newUser.telephone || undefined,
          departement: newUser.departement || undefined,
          village: newUser.village || undefined,
          role: newUser.role || "agent",
          gm_role: newUser.gm_role || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateResult({ error: data.error || "Erreur inconnue" });
      } else {
        setCreateResult({ success: true, email: data.email });
        setNewUser({
          email: "",
          password: "",
          full_name: "",
          telephone: "",
          departement: "",
          village: "",
          role: "agent",
          gm_role: "",
        });
        fetchData();
      }
    } catch (err: unknown) {
      setCreateResult({
        error: err instanceof Error ? err.message : "Erreur réseau",
      });
    } finally {
      setCreating(false);
    }
  };

  const getAccessLevel = (role: GmRole): number => {
    const levels: Record<GmRole, number> = {
      god_admin: 0,
      coo: 1,
      cfo: 1,
      cto: 1,
      head_audit: 2,
      head_sav: 2,
      head_sales: 2,
      auditor_internal: 3,
      sav_agent: 3,
      sales_rep: 3,
    };
    return levels[role] ?? 4;
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "var(--gm-accent)" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle size={40} style={{ color: "var(--gm-danger)" }} />
        <p style={{ color: "var(--gm-text)" }}>{error}</p>
        <button onClick={fetchData} className="btn btn-primary">
          Réessayer
        </button>
      </div>
    );
  }

  const filteredStaff = staff.filter(
    (s) =>
      !searchQuery ||
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.gm_role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group permissions by role
  const permsByRole = PILLARS.reduce(
    (acc, _) => acc,
    {} as Record<string, GodModePermission[]>,
  );
  const uniqueRoles = [...new Set(permissions.map((p) => p.gm_role))];
  uniqueRoles.forEach((role) => {
    permsByRole[role] = permissions.filter((p) => p.gm_role === role);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Système & Administration
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Gestion de l&apos;équipe Origin.e et matrice des permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "team" && (
            <>
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setCreateResult(null);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: "var(--gm-success)" }}
              >
                <UserPlus size={14} />
                Créer un compte
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border"
                style={{
                  borderColor: "var(--gm-border)",
                  color: "var(--gm-text)",
                }}
              >
                <Plus size={14} />
                Ajouter existant
              </button>
            </>
          )}
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border hover:bg-white/5 transition-colors"
            style={{
              color: "var(--gm-text-muted)",
              borderColor: "var(--gm-border)",
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-xs mb-1"
                style={{ color: "var(--gm-text-muted)" }}
              >
                Membres actifs
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {staff.filter((s) => s.is_active).length}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: "rgba(99, 102, 241, 0.12)",
                color: "var(--gm-accent)",
              }}
            >
              <Users size={20} />
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-xs mb-1"
                style={{ color: "var(--gm-text-muted)" }}
              >
                Rôles distincts
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {new Set(staff.map((s) => s.gm_role)).size}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: "rgba(139, 92, 246, 0.12)",
                color: "#8b5cf6",
              }}
            >
              <Shield size={20} />
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-xs mb-1"
                style={{ color: "var(--gm-text-muted)" }}
              >
                Règles permissions
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {permissions.length}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: "rgba(34, 197, 94, 0.12)",
                color: "#22c55e",
              }}
            >
              <Check size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div
          className="flex gap-1 rounded-lg p-1"
          style={{ backgroundColor: "var(--gm-surface)" }}
        >
          <button
            onClick={() => setActiveTab("team")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === "team" ? "var(--gm-accent)" : "transparent",
              color: activeTab === "team" ? "white" : "var(--gm-text-muted)",
            }}
          >
            <Users size={14} />
            Équipe GM
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === "permissions"
                  ? "var(--gm-accent)"
                  : "transparent",
              color:
                activeTab === "permissions" ? "white" : "var(--gm-text-muted)",
            }}
          >
            <Shield size={14} />
            Permissions
          </button>
        </div>

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg text-sm border bg-transparent outline-none"
            style={{
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
              width: "260px",
            }}
          />
        </div>
      </div>

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStaff.length === 0 ? (
            <div
              className="col-span-full text-center py-16"
              style={{ color: "var(--gm-text-muted)" }}
            >
              Aucun membre trouvé
            </div>
          ) : (
            filteredStaff.map((member) => {
              const roleConfig = ROLE_LABELS[member.gm_role] || {
                label: member.gm_role,
                color: "var(--gm-text-muted)",
              };
              return (
                <div
                  key={member.id}
                  className="rounded-xl p-5 border transition-all hover:border-indigo-500/30"
                  style={{
                    backgroundColor: "var(--gm-surface)",
                    borderColor: member.is_active
                      ? "var(--gm-border)"
                      : "var(--gm-danger)",
                    opacity: member.is_active ? 1 : 0.6,
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: roleConfig.color }}
                      >
                        {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <h3
                          className="font-medium text-sm"
                          style={{ color: "var(--gm-text)" }}
                        >
                          {member.full_name}
                        </h3>
                        <p
                          className="text-xs"
                          style={{ color: "var(--gm-text-muted)" }}
                        >
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`status-dot ${member.is_active ? "up" : "down"}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: "var(--gm-text-muted)" }}>
                        Rôle
                      </span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${roleConfig.color}15`,
                          color: roleConfig.color,
                        }}
                      >
                        {roleConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: "var(--gm-text-muted)" }}>
                        Niveau
                      </span>
                      <span style={{ color: "var(--gm-text)" }}>
                        L{member.access_level}
                      </span>
                    </div>
                    {member.department && (
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: "var(--gm-text-muted)" }}>
                          Département
                        </span>
                        <span style={{ color: "var(--gm-text)" }}>
                          {member.department}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: "var(--gm-text-muted)" }}>
                        Embauché le
                      </span>
                      <span style={{ color: "var(--gm-text)" }}>
                        {new Date(member.hired_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      toggleStaffActive(member.id, member.is_active)
                    }
                    className="w-full py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: member.is_active
                        ? "rgba(239, 68, 68, 0.08)"
                        : "rgba(34, 197, 94, 0.08)",
                      color: member.is_active
                        ? "var(--gm-danger)"
                        : "var(--gm-success)",
                    }}
                  >
                    {member.is_active ? "Désactiver" : "Réactiver"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === "permissions" && (
        <div className="space-y-3">
          {uniqueRoles.map((role) => {
            const roleConfig = ROLE_LABELS[role] || {
              label: role,
              color: "var(--gm-text-muted)",
            };
            const rolePerms = permsByRole[role] || [];
            const isExpanded = expandedRole === role;

            return (
              <div
                key={role}
                className="rounded-xl border overflow-hidden"
                style={{
                  backgroundColor: "var(--gm-surface)",
                  borderColor: "var(--gm-border)",
                }}
              >
                <button
                  onClick={() => setExpandedRole(isExpanded ? null : role)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${roleConfig.color}15`,
                        color: roleConfig.color,
                      }}
                    >
                      {roleConfig.label}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      {rolePerms.length} règle
                      {rolePerms.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown
                      size={16}
                      style={{ color: "var(--gm-text-muted)" }}
                    />
                  ) : (
                    <ChevronRight
                      size={16}
                      style={{ color: "var(--gm-text-muted)" }}
                    />
                  )}
                </button>

                {isExpanded && (
                  <div
                    className="border-t"
                    style={{ borderColor: "var(--gm-border)" }}
                  >
                    <table className="gm-table">
                      <thead>
                        <tr>
                          <th>Pilier</th>
                          <th>Ressource</th>
                          {ACTIONS.map((a) => (
                            <th key={a.key} className="text-center">
                              {a.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rolePerms.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="text-center py-6"
                              style={{ color: "var(--gm-text-muted)" }}
                            >
                              Aucune permission définie pour ce rôle
                            </td>
                          </tr>
                        ) : (
                          rolePerms.map((perm) => (
                            <tr key={perm.id}>
                              <td>
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: "var(--gm-accent)" }}
                                >
                                  {perm.pillar}
                                </span>
                              </td>
                              <td style={{ color: "var(--gm-text)" }}>
                                {perm.resource}
                              </td>
                              {ACTIONS.map((action) => {
                                const val = perm[
                                  action.key as keyof GodModePermission
                                ] as boolean;
                                return (
                                  <td key={action.key} className="text-center">
                                    <button
                                      onClick={() =>
                                        togglePermission(
                                          perm.id,
                                          action.key,
                                          val,
                                        )
                                      }
                                      className="w-7 h-7 rounded-md flex items-center justify-center mx-auto transition-colors"
                                      style={{
                                        backgroundColor: val
                                          ? "rgba(34, 197, 94, 0.12)"
                                          : "rgba(239, 68, 68, 0.06)",
                                      }}
                                    >
                                      {val ? (
                                        <Check
                                          size={14}
                                          style={{ color: "var(--gm-success)" }}
                                        />
                                      ) : (
                                        <X
                                          size={14}
                                          style={{ color: "var(--gm-danger)" }}
                                        />
                                      )}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowCreateModal(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-2xl p-6 border max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.12)",
                    color: "var(--gm-success)",
                  }}
                >
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--gm-text)" }}
                  >
                    Créer un compte
                  </h2>
                  <p
                    className="text-xs"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Création Supabase Auth + profil
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ color: "var(--gm-text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            {createResult?.success && (
              <div
                className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  color: "var(--gm-success)",
                }}
              >
                <Check size={16} />
                Compte créé pour <strong>{createResult.email}</strong>
              </div>
            )}

            {createResult?.error && (
              <div
                className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "var(--gm-danger)",
                }}
              >
                <AlertTriangle size={16} />
                {createResult.error}
              </div>
            )}

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label
                  className="block text-xs mb-1.5 font-medium"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Nom complet *
                </label>
                <div className="relative">
                  <User
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--gm-text-muted)" }}
                  />
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, full_name: e.target.value })
                    }
                    placeholder="Jean Dupont"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border bg-transparent outline-none"
                    style={{
                      borderColor: "var(--gm-border)",
                      color: "var(--gm-text)",
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  className="block text-xs mb-1.5 font-medium"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Email *
                </label>
                <div className="relative">
                  <Mail
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--gm-text-muted)" }}
                  />
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="jean@example.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border bg-transparent outline-none"
                    style={{
                      borderColor: "var(--gm-border)",
                      color: "var(--gm-text)",
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-xs mb-1.5 font-medium"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Mot de passe *
                </label>
                <div className="relative">
                  <Key
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--gm-text-muted)" }}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    placeholder="Min. 6 caractères"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm border bg-transparent outline-none"
                    style={{
                      borderColor: "var(--gm-border)",
                      color: "var(--gm-text)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Telephone + Departement row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs mb-1.5 font-medium"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Téléphone
                  </label>
                  <div className="relative">
                    <Phone
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--gm-text-muted)" }}
                    />
                    <input
                      type="tel"
                      value={newUser.telephone}
                      onChange={(e) =>
                        setNewUser({ ...newUser, telephone: e.target.value })
                      }
                      placeholder="+225 07..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border bg-transparent outline-none"
                      style={{
                        borderColor: "var(--gm-border)",
                        color: "var(--gm-text)",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-xs mb-1.5 font-medium"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Département
                  </label>
                  <input
                    type="text"
                    value={newUser.departement}
                    onChange={(e) =>
                      setNewUser({ ...newUser, departement: e.target.value })
                    }
                    placeholder="Ex: Abidjan"
                    className="w-full px-3 py-2.5 rounded-lg text-sm border bg-transparent outline-none"
                    style={{
                      borderColor: "var(--gm-border)",
                      color: "var(--gm-text)",
                    }}
                  />
                </div>
              </div>

              {/* Village */}
              <div>
                <label
                  className="block text-xs mb-1.5 font-medium"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Village / Localité
                </label>
                <div className="relative">
                  <MapPin
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--gm-text-muted)" }}
                  />
                  <input
                    type="text"
                    value={newUser.village}
                    onChange={(e) =>
                      setNewUser({ ...newUser, village: e.target.value })
                    }
                    placeholder="Optionnel"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border bg-transparent outline-none"
                    style={{
                      borderColor: "var(--gm-border)",
                      color: "var(--gm-text)",
                    }}
                  />
                </div>
              </div>

              {/* Platform Role + GM Role row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs mb-1.5 font-medium"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Rôle plateforme *
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-lg text-sm border bg-transparent outline-none"
                    style={{
                      borderColor: "var(--gm-border)",
                      color: "var(--gm-text)",
                      backgroundColor: "var(--gm-surface)",
                    }}
                  >
                    {PLATFORM_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-xs mb-1.5 font-medium"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Rôle Origin.e
                  </label>
                  <select
                    value={newUser.gm_role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, gm_role: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-lg text-sm border bg-transparent outline-none"
                    style={{
                      borderColor: "var(--gm-border)",
                      color: "var(--gm-text)",
                      backgroundColor: "var(--gm-surface)",
                    }}
                  >
                    <option value="">Aucun (utilisateur standard)</option>
                    {Object.entries(ROLE_LABELS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className="rounded-lg p-3 text-xs space-y-1"
                style={{
                  backgroundColor: "var(--gm-bg)",
                  color: "var(--gm-text-muted)",
                }}
              >
                <p
                  className="font-semibold"
                  style={{ color: "var(--gm-text)" }}
                >
                  Ce qui sera créé :
                </p>
                <p>• Compte Supabase Auth (email confirmé automatiquement)</p>
                <p>• Profil user_profile (rôle : {newUser.role || "agent"})</p>
                {newUser.gm_role && (
                  <p>• Entrée god_mode_staff (rôle GM : {newUser.gm_role})</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm border"
                  style={{
                    borderColor: "var(--gm-border)",
                    color: "var(--gm-text-muted)",
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={createAccount}
                  disabled={
                    creating ||
                    !newUser.email ||
                    !newUser.password ||
                    !newUser.full_name ||
                    newUser.password.length < 6
                  }
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                  style={{ backgroundColor: "var(--gm-success)" }}
                >
                  {creating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <UserPlus size={14} />
                  )}
                  {creating ? "Création..." : "Créer le compte"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowAddModal(false)}
          />
          <div
            className="relative w-full max-w-md rounded-2xl p-6 border"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--gm-text)" }}
              >
                Ajouter un membre
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ color: "var(--gm-text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-xs mb-1.5"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Email de l&apos;utilisateur
                </label>
                <div className="relative">
                  <User
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--gm-text-muted)" }}
                  />
                  <input
                    type="email"
                    value={newMember.email}
                    onChange={(e) =>
                      setNewMember({ ...newMember, email: e.target.value })
                    }
                    placeholder="email@example.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border bg-transparent outline-none"
                    style={{
                      borderColor: "var(--gm-border)",
                      color: "var(--gm-text)",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-xs mb-1.5"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Rôle Origin.e
                </label>
                <select
                  value={newMember.gm_role}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      gm_role: e.target.value as GmRole,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-lg text-sm border bg-transparent outline-none"
                  style={{
                    borderColor: "var(--gm-border)",
                    color: "var(--gm-text)",
                    backgroundColor: "var(--gm-surface)",
                  }}
                >
                  {Object.entries(ROLE_LABELS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="block text-xs mb-1.5"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Département (optionnel)
                </label>
                <input
                  type="text"
                  value={newMember.department}
                  onChange={(e) =>
                    setNewMember({ ...newMember, department: e.target.value })
                  }
                  placeholder="Ex: Finance, Opérations..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm border bg-transparent outline-none"
                  style={{
                    borderColor: "var(--gm-border)",
                    color: "var(--gm-text)",
                  }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-ghost flex-1"
                >
                  Annuler
                </button>
                <button
                  onClick={addStaffMember}
                  className="btn btn-primary flex-1"
                  disabled={!newMember.email}
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

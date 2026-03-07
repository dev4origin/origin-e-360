"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Check,
  Key,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Shield,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Permission {
  id: string;
  gm_role: string;
  pillar: string;
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_approve: boolean;
}

interface StaffMember {
  id: string;
  user_id: string;
  gm_role: string;
  department: string | null;
  is_active: boolean;
  full_name: string;
}

const PILLARS = [
  "finance",
  "operations",
  "audit",
  "sav",
  "products",
  "crm",
  "compliance",
  "system",
];

const PILLAR_LABELS: Record<string, string> = {
  finance: "Finance",
  operations: "Opérations",
  audit: "Audit",
  sav: "SAV",
  products: "Produits",
  crm: "CRM",
  compliance: "Conformité",
  system: "Système",
};

const PILLAR_COLORS: Record<string, string> = {
  finance: "#22c55e",
  operations: "#f59e0b",
  audit: "#3b82f6",
  sav: "#f97316",
  products: "#8b5cf6",
  crm: "#6366f1",
  compliance: "#ec4899",
  system: "#ef4444",
};

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [permRes, staffRes] = await Promise.all([
        supabase
          .from("god_mode_permissions")
          .select("*")
          .order("pillar", { ascending: true }),
        supabase
          .from("god_mode_staff")
          .select(
            "id, user_id, gm_role, department, is_active, user_profile:user_id(full_name)",
          ),
      ]);

      if (permRes.error) throw permRes.error;
      if (staffRes.error) throw staffRes.error;

      const mappedStaff: StaffMember[] = (staffRes.data || []).map(
        (s: Record<string, unknown>) => ({
          id: s.id as string,
          user_id: s.user_id as string,
          gm_role: s.gm_role as string,
          department: s.department as string | null,
          is_active: s.is_active as boolean,
          full_name:
            (s.user_profile as { full_name?: string } | null)?.full_name ||
            "Inconnu",
        }),
      );

      setStaff(mappedStaff);
      setPermissions(permRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (
    permId: string,
    field: string,
    currentValue: boolean,
  ) => {
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from("god_mode_permissions")
        .update({ [field]: !currentValue })
        .eq("id", permId);
      if (err) throw err;
      setPermissions((prev) =>
        prev.map((p) =>
          p.id === permId ? { ...p, [field]: !currentValue } : p,
        ),
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
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

  const filtered = permissions.filter((p) => {
    const matchesStaff = selectedStaff === "all" || p.gm_role === selectedStaff;
    const matchesSearch =
      !searchQuery ||
      p.gm_role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pillar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.resource?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStaff && matchesSearch;
  });

  // Group by gm_role
  const byRole = new Map<
    string,
    { members: StaffMember[]; perms: Permission[] }
  >();
  filtered.forEach((p) => {
    const existing = byRole.get(p.gm_role);
    if (existing) {
      existing.perms.push(p);
    } else {
      byRole.set(p.gm_role, {
        members: staff.filter((s) => s.gm_role === p.gm_role),
        perms: [p],
      });
    }
  });

  function PermToggle({
    enabled,
    onClick,
    disabled,
  }: {
    enabled: boolean;
    onClick: () => void;
    disabled: boolean;
  }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-6 h-6 rounded flex items-center justify-center transition-colors"
        style={{
          backgroundColor: enabled
            ? "rgba(34,197,94,0.15)"
            : "rgba(136,136,164,0.08)",
          cursor: disabled ? "wait" : "pointer",
        }}
      >
        {enabled ? (
          <Check size={12} style={{ color: "#22c55e" }} />
        ) : (
          <X size={12} style={{ color: "var(--gm-text-muted)" }} />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Matrice de Permissions
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Gestion fine des accès par pilier
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border hover:bg-white/5 transition-colors"
          style={{
            color: "var(--gm-text-muted)",
            borderColor: "var(--gm-border)",
          }}
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-xs mb-1"
                style={{ color: "var(--gm-text-muted)" }}
              >
                Membres staff
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {staff.length}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#6366f115", color: "#6366f1" }}
            >
              <User size={20} />
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
                Permissions configurées
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
              style={{ backgroundColor: "#22c55e15", color: "#22c55e" }}
            >
              <Key size={20} />
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
                Piliers couverts
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {new Set(permissions.map((p) => p.pillar)).size}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#3b82f615", color: "#3b82f6" }}
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
                Droits accordés
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {
                  permissions.filter(
                    (p) =>
                      p.can_read || p.can_write || p.can_delete || p.can_export,
                  ).length
                }
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#f59e0b15", color: "#f59e0b" }}
            >
              <Lock size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <select
          value={selectedStaff}
          onChange={(e) => setSelectedStaff(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border bg-transparent outline-none"
          style={{
            borderColor: "var(--gm-border)",
            color: "var(--gm-text)",
            backgroundColor: "var(--gm-surface)",
          }}
        >
          <option value="all">Tous les rôles</option>
          {[...new Set(staff.map((s) => s.gm_role))].map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
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

      {/* Permissions by Staff */}
      {permissions.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <Shield
            size={40}
            className="mx-auto mb-4"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Aucune permission configurée.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--gm-text-muted)" }}>
            Ajoutez des permissions via la fonction RPC ou directement dans
            Supabase.
          </p>
        </div>
      ) : (
        Array.from(byRole.entries()).map(([role, roleData]) => (
          <div
            key={role}
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
            }}
          >
            <div
              className="px-5 py-3 flex items-center gap-3 border-b"
              style={{
                borderColor: "var(--gm-border)",
                backgroundColor: "var(--gm-surface-2)",
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: "var(--gm-accent)", color: "#fff" }}
              >
                {role.charAt(0).toUpperCase()}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="font-medium text-sm"
                  style={{ color: "var(--gm-text)" }}
                >
                  {role}
                </span>
                {roleData.members.length > 0 && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    ({roleData.members.map((m) => m.full_name).join(", ")})
                  </span>
                )}
              </div>
            </div>

            <table className="gm-table">
              <thead>
                <tr>
                  <th>Pilier</th>
                  <th>Ressource</th>
                  <th className="text-center">Lecture</th>
                  <th className="text-center">Écriture</th>
                  <th className="text-center">Suppression</th>
                  <th className="text-center">Export</th>
                </tr>
              </thead>
              <tbody>
                {roleData.perms.map((perm) => {
                  const pillarColor = PILLAR_COLORS[perm.pillar] || "#6366f1";
                  return (
                    <tr key={perm.id}>
                      <td>
                        <span
                          className="badge text-[10px]"
                          style={{
                            backgroundColor: `${pillarColor}15`,
                            color: pillarColor,
                          }}
                        >
                          {PILLAR_LABELS[perm.pillar] || perm.pillar}
                        </span>
                      </td>
                      <td style={{ color: "var(--gm-text)" }}>
                        {perm.resource || "*"}
                      </td>
                      <td className="text-center">
                        <div className="flex justify-center">
                          <PermToggle
                            enabled={perm.can_read}
                            onClick={() =>
                              togglePermission(
                                perm.id,
                                "can_read",
                                perm.can_read,
                              )
                            }
                            disabled={saving}
                          />
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex justify-center">
                          <PermToggle
                            enabled={perm.can_write}
                            onClick={() =>
                              togglePermission(
                                perm.id,
                                "can_write",
                                perm.can_write,
                              )
                            }
                            disabled={saving}
                          />
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex justify-center">
                          <PermToggle
                            enabled={perm.can_delete}
                            onClick={() =>
                              togglePermission(
                                perm.id,
                                "can_delete",
                                perm.can_delete,
                              )
                            }
                            disabled={saving}
                          />
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex justify-center">
                          <PermToggle
                            enabled={perm.can_export}
                            onClick={() =>
                              togglePermission(
                                perm.id,
                                "can_export",
                                perm.can_export,
                              )
                            }
                            disabled={saving}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

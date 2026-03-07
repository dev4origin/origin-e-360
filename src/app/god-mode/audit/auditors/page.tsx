"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Edit2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Auditor {
  id: string;
  full_name: string | null;
  email: string | null;
  telephone: string | null;
  departement: string | null;
  village: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  statut_connexion: boolean;
  // Performance stats (joined)
  total_validated?: number;
  total_rejected?: number;
  accuracy_score?: number;
}

interface AuditorForm {
  full_name: string;
  email: string;
  telephone: string;
  departement: string;
  village: string;
}

const EMPTY_FORM: AuditorForm = {
  full_name: "",
  email: "",
  telephone: "",
  departement: "",
  village: "",
};

export default function AuditorsPage() {
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AuditorForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const supabase = createClient();

  const fetchAuditors = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch auditors from user_profile
      const { data: users, error: usersErr } = await supabase
        .from("user_profile")
        .select(
          "id, full_name, email, telephone, departement, village, role, avatar_url, created_at, last_sign_in_at, statut_connexion",
        )
        .eq("role", "auditor")
        .order("full_name", { ascending: true });

      if (usersErr) throw usersErr;

      // Fetch performance metrics for all auditors
      const auditorIds = (users || []).map((u) => u.id);
      let metricsMap: Record<
        string,
        { validated: number; rejected: number; accuracy: number | null }
      > = {};

      if (auditorIds.length > 0) {
        const { data: metrics } = await supabase
          .from("performance_metrics")
          .select(
            "auditor_id, entities_validated, entities_rejected, accuracy_score",
          )
          .in("auditor_id", auditorIds);

        if (metrics) {
          // Aggregate metrics per auditor
          for (const m of metrics) {
            if (!metricsMap[m.auditor_id]) {
              metricsMap[m.auditor_id] = {
                validated: 0,
                rejected: 0,
                accuracy: null,
              };
            }
            metricsMap[m.auditor_id].validated += m.entities_validated || 0;
            metricsMap[m.auditor_id].rejected += m.entities_rejected || 0;
            if (m.accuracy_score != null) {
              metricsMap[m.auditor_id].accuracy = m.accuracy_score;
            }
          }
        }
      }

      // Also count from validation_actions
      if (auditorIds.length > 0) {
        const { data: actions } = await supabase
          .from("validation_actions")
          .select("auditor_id, new_status")
          .in("auditor_id", auditorIds);

        if (actions) {
          for (const a of actions) {
            if (!metricsMap[a.auditor_id]) {
              metricsMap[a.auditor_id] = {
                validated: 0,
                rejected: 0,
                accuracy: null,
              };
            }
            if (a.new_status === "validated") {
              metricsMap[a.auditor_id].validated += 1;
            } else if (a.new_status === "rejected") {
              metricsMap[a.auditor_id].rejected += 1;
            }
          }
        }
      }

      const enriched: Auditor[] = (users || []).map((u) => ({
        ...u,
        total_validated: metricsMap[u.id]?.validated || 0,
        total_rejected: metricsMap[u.id]?.rejected || 0,
        accuracy_score: metricsMap[u.id]?.accuracy ?? undefined,
      }));

      setAuditors(enriched);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter
  const filtered = auditors.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      (a.full_name || "").toLowerCase().includes(q) ||
      (a.email || "").toLowerCase().includes(q) ||
      (a.telephone || "").includes(q) ||
      (a.departement || "").toLowerCase().includes(q)
    );
  });

  // Open create modal
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  // Open edit modal
  const openEdit = (auditor: Auditor) => {
    setForm({
      full_name: auditor.full_name || "",
      email: auditor.email || "",
      telephone: auditor.telephone || "",
      departement: auditor.departement || "",
      village: auditor.village || "",
    });
    setEditingId(auditor.id);
    setShowModal(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        // Update existing auditor
        const { error: err } = await supabase
          .from("user_profile")
          .update({
            full_name: form.full_name.trim(),
            email: form.email.trim() || null,
            telephone: form.telephone.trim() || null,
            departement: form.departement.trim() || null,
            village: form.village.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);
        if (err) throw err;
      } else {
        // Create via Supabase Auth (invite user), then update profile
        // For now, we insert directly into user_profile if the user already exists
        // or show an error message
        const { error: err } = await supabase.from("user_profile").insert({
          id: crypto.randomUUID(),
          full_name: form.full_name.trim(),
          email: form.email.trim() || null,
          telephone: form.telephone.trim() || null,
          departement: form.departement.trim() || null,
          village: form.village.trim() || null,
          role: "auditor",
        });
        if (err) throw err;
      }

      setShowModal(false);
      fetchAuditors();
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Erreur lors de la sauvegarde",
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete auditor (set role to 'agent' to revoke auditor access)
  const handleDelete = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from("user_profile")
        .update({ role: "agent", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (err) throw err;
      setDeleteConfirm(null);
      fetchAuditors();
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Erreur lors de la suppression",
      );
    }
  };

  // Stats
  const stats = {
    total: auditors.length,
    online: auditors.filter((a) => a.statut_connexion).length,
    totalValidated: auditors.reduce((s, a) => s + (a.total_validated || 0), 0),
    totalRejected: auditors.reduce((s, a) => s + (a.total_rejected || 0), 0),
  };

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
        <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
          {error}
        </p>
        <button onClick={fetchAuditors} className="btn btn-primary">
          <RefreshCw size={14} /> Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Gestion des Auditeurs
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Comptes, performances et accès des auditeurs de la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAuditors}
            className="btn btn-ghost"
            title="Rafraîchir"
          >
            <RefreshCw size={14} />
          </button>
          <button onClick={openCreate} className="btn btn-primary">
            <Plus size={14} /> Nouvel Auditeur
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Auditeurs",
            value: stats.total,
            color: "var(--gm-accent)",
            icon: <Shield size={18} />,
          },
          {
            label: "En ligne",
            value: stats.online,
            color: "var(--gm-success)",
            icon: <UserCheck size={18} />,
          },
          {
            label: "Entités validées",
            value: stats.totalValidated,
            color: "var(--gm-info)",
            icon: <Check size={18} />,
          },
          {
            label: "Entités rejetées",
            value: stats.totalRejected,
            color: "var(--gm-warning)",
            icon: <X size={18} />,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4 border"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
                {s.label}
              </p>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg max-w-sm"
        style={{ backgroundColor: "var(--gm-surface)" }}
      >
        <Search size={16} style={{ color: "var(--gm-text-muted)" }} />
        <input
          type="text"
          placeholder="Rechercher un auditeur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-sm outline-none w-full"
          style={{ color: "var(--gm-text)" }}
        />
      </div>

      {/* Auditors Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <UserX
            size={32}
            className="mx-auto mb-2"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <p style={{ color: "var(--gm-text-muted)" }}>Aucun auditeur trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((auditor) => (
            <div
              key={auditor.id}
              className="rounded-xl border p-5 transition-all hover:border-[var(--gm-accent)]"
              style={{
                backgroundColor: "var(--gm-surface)",
                borderColor: "var(--gm-border)",
              }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: "rgba(99,102,241,0.15)",
                        color: "var(--gm-accent)",
                      }}
                    >
                      {(auditor.full_name || "A")
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    {/* Online indicator */}
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                      style={{
                        backgroundColor: auditor.statut_connexion
                          ? "var(--gm-success)"
                          : "var(--gm-text-muted)",
                        borderColor: "var(--gm-surface)",
                      }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--gm-text)" }}
                    >
                      {auditor.full_name || "Sans nom"}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      {auditor.statut_connexion ? "En ligne" : "Hors ligne"}
                    </p>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(auditor)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: "var(--gm-text-muted)" }}
                    title="Modifier"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(auditor.id)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: "var(--gm-danger)" }}
                    title="Révoquer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-1.5 mb-4">
                {auditor.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={12} style={{ color: "var(--gm-text-muted)" }} />
                    <span
                      className="text-xs truncate"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      {auditor.email}
                    </span>
                  </div>
                )}
                {auditor.telephone && (
                  <div className="flex items-center gap-2">
                    <Phone
                      size={12}
                      style={{ color: "var(--gm-text-muted)" }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      {auditor.telephone}
                    </span>
                  </div>
                )}
                {auditor.departement && (
                  <div className="flex items-center gap-2">
                    <MapPin
                      size={12}
                      style={{ color: "var(--gm-text-muted)" }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      {auditor.departement}
                      {auditor.village ? ` · ${auditor.village}` : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Performance bars */}
              <div
                className="rounded-lg p-3 space-y-2"
                style={{ backgroundColor: "var(--gm-bg)" }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Performance
                  </span>
                  {auditor.accuracy_score != null && (
                    <span
                      className="text-xs font-bold"
                      style={{
                        color:
                          auditor.accuracy_score >= 80
                            ? "var(--gm-success)"
                            : auditor.accuracy_score >= 60
                              ? "var(--gm-warning)"
                              : "var(--gm-danger)",
                      }}
                    >
                      {auditor.accuracy_score.toFixed(0)}% précision
                    </span>
                  )}
                </div>
                {/* Validated */}
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Validées
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--gm-success)" }}
                    >
                      {auditor.total_validated || 0}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--gm-surface-2)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(((auditor.total_validated || 0) / Math.max(stats.totalValidated, 1)) * 100, 100)}%`,
                        backgroundColor: "var(--gm-success)",
                      }}
                    />
                  </div>
                </div>
                {/* Rejected */}
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Rejetées
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--gm-warning)" }}
                    >
                      {auditor.total_rejected || 0}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--gm-surface-2)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(((auditor.total_rejected || 0) / Math.max(stats.totalRejected, 1)) * 100, 100)}%`,
                        backgroundColor: "var(--gm-warning)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between mt-3 pt-3 border-t"
                style={{ borderColor: "var(--gm-border)" }}
              >
                <span
                  className="text-[10px]"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Créé le{" "}
                  {new Date(auditor.created_at).toLocaleDateString("fr-FR")}
                </span>
                {auditor.last_sign_in_at && (
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Vu{" "}
                    {new Date(auditor.last_sign_in_at).toLocaleDateString(
                      "fr-FR",
                    )}
                  </span>
                )}
              </div>

              {/* Delete confirm */}
              {deleteConfirm === auditor.id && (
                <div
                  className="mt-3 p-3 rounded-lg border flex items-center justify-between"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.08)",
                    borderColor: "rgba(239,68,68,0.3)",
                  }}
                >
                  <span
                    className="text-xs"
                    style={{ color: "var(--gm-danger)" }}
                  >
                    Révoquer cet auditeur ?
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(auditor.id)}
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: "var(--gm-danger)" }}
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2 py-1 rounded text-xs"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div
            className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-[480px] rounded-2xl border shadow-2xl overflow-hidden"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
            }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--gm-border)" }}
            >
              <div className="flex items-center gap-2">
                <ClipboardCheck
                  size={18}
                  style={{ color: "var(--gm-accent)" }}
                />
                <h2
                  className="text-sm font-semibold"
                  style={{ color: "var(--gm-text)" }}
                >
                  {editingId ? "Modifier l'auditeur" : "Nouvel Auditeur"}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-white/5"
                style={{ color: "var(--gm-text-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Full name */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  placeholder="Nom Prénom"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-colors focus:border-[var(--gm-accent)]"
                  style={{
                    backgroundColor: "var(--gm-bg)",
                    borderColor: "var(--gm-border)",
                    color: "var(--gm-text)",
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="auditeur@origin-e.com"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-colors focus:border-[var(--gm-accent)]"
                  style={{
                    backgroundColor: "var(--gm-bg)",
                    borderColor: "var(--gm-border)",
                    color: "var(--gm-text)",
                  }}
                />
              </div>

              {/* Phone */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) =>
                    setForm({ ...form, telephone: e.target.value })
                  }
                  placeholder="+225 XX XX XX XX XX"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-colors focus:border-[var(--gm-accent)]"
                  style={{
                    backgroundColor: "var(--gm-bg)",
                    borderColor: "var(--gm-border)",
                    color: "var(--gm-text)",
                  }}
                />
              </div>

              {/* Department + Village */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Département
                  </label>
                  <input
                    type="text"
                    value={form.departement}
                    onChange={(e) =>
                      setForm({ ...form, departement: e.target.value })
                    }
                    placeholder="Aboisso"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-colors focus:border-[var(--gm-accent)]"
                    style={{
                      backgroundColor: "var(--gm-bg)",
                      borderColor: "var(--gm-border)",
                      color: "var(--gm-text)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Village
                  </label>
                  <input
                    type="text"
                    value={form.village}
                    onChange={(e) =>
                      setForm({ ...form, village: e.target.value })
                    }
                    placeholder="Village"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-colors focus:border-[var(--gm-accent)]"
                    style={{
                      backgroundColor: "var(--gm-bg)",
                      borderColor: "var(--gm-border)",
                      color: "var(--gm-text)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="flex items-center justify-end gap-2 px-5 py-3 border-t"
              style={{
                borderColor: "var(--gm-border)",
                backgroundColor: "var(--gm-bg)",
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-ghost text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.full_name.trim()}
                className="btn btn-primary text-sm disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {editingId ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

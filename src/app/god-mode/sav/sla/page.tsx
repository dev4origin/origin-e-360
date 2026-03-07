"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Clock,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface SlaConfig {
  id: string;
  priority: string;
  category: string;
  first_response_hours: number;
  resolution_hours: number;
  escalation_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#3b82f6",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critique",
  high: "Haute",
  medium: "Moyenne",
  low: "Basse",
};

export default function SlaPage() {
  const [configs, setConfigs] = useState<SlaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SlaConfig>>({});
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("sav_sla_config")
        .select("*")
        .order("priority", { ascending: true });
      if (err) throw err;
      setConfigs(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (config: SlaConfig) => {
    setEditing(config.id);
    setEditForm({
      first_response_hours: config.first_response_hours,
      resolution_hours: config.resolution_hours,
      escalation_hours: config.escalation_hours,
      is_active: config.is_active,
    });
  };

  const cancelEditing = () => {
    setEditing(null);
    setEditForm({});
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from("sav_sla_config")
        .update({
          first_response_hours: editForm.first_response_hours,
          resolution_hours: editForm.resolution_hours,
          escalation_hours: editForm.escalation_hours,
          is_active: editForm.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (err) throw err;
      setConfigs((prev) =>
        prev.map((c) =>
          c.id === id
            ? ({
                ...c,
                ...editForm,
                updated_at: new Date().toISOString(),
              } as SlaConfig)
            : c,
        ),
      );
      setEditing(null);
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

  // Group by priority
  const byPriority = new Map<string, SlaConfig[]>();
  configs.forEach((c) => {
    const existing = byPriority.get(c.priority) || [];
    existing.push(c);
    byPriority.set(c.priority, existing);
  });

  const priorities = ["critical", "high", "medium", "low"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Configuration SLA
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Accords de niveau de service SAV
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

      {/* SLA Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {priorities.map((p) => {
          const items = byPriority.get(p) || [];
          const avgResponse =
            items.length > 0
              ? Math.round(
                  items.reduce((s, i) => s + (i.first_response_hours || 0), 0) /
                    items.length,
                )
              : 0;
          return (
            <div key={p} className="kpi-card">
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="text-xs mb-1"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    {PRIORITY_LABELS[p] || p}
                  </p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--gm-text)" }}
                  >
                    {avgResponse}h
                  </p>
                  <p
                    className="text-[11px] mt-1"
                    style={{ color: PRIORITY_COLORS[p] }}
                  >
                    Réponse initiale
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${PRIORITY_COLORS[p]}15`,
                    color: PRIORITY_COLORS[p],
                  }}
                >
                  <Timer size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SLA Configs */}
      {configs.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <Settings
            size={40}
            className="mx-auto mb-4"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Aucune configuration SLA définie.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--gm-text-muted)" }}>
            Les configurations seront créées automatiquement lors de
            l&apos;exécution de la migration SQL.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map((config) => {
            const color = PRIORITY_COLORS[config.priority] || "#6366f1";
            const isEditing = editing === config.id;

            return (
              <div
                key={config.id}
                className="rounded-xl border p-5 space-y-4"
                style={{
                  backgroundColor: "var(--gm-surface)",
                  borderColor: isEditing
                    ? "var(--gm-accent)"
                    : "var(--gm-border)",
                  opacity: config.is_active ? 1 : 0.6,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="badge"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      {PRIORITY_LABELS[config.priority] || config.priority}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      {config.category || "Général"}
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => saveEdit(config.id)}
                        disabled={saving}
                        className="w-7 h-7 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: "rgba(34, 197, 94, 0.12)" }}
                      >
                        <Save
                          size={14}
                          style={{ color: "var(--gm-success)" }}
                        />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="w-7 h-7 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: "rgba(239, 68, 68, 0.06)" }}
                      >
                        <X size={14} style={{ color: "var(--gm-danger)" }} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(config)}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/5"
                    >
                      <Edit3
                        size={14}
                        style={{ color: "var(--gm-text-muted)" }}
                      />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <p
                      className="text-[11px] flex items-center gap-1"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      <Clock size={10} /> 1ère réponse
                    </p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.first_response_hours || 0}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            first_response_hours: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-1 rounded text-sm border bg-transparent outline-none"
                        style={{
                          borderColor: "var(--gm-border)",
                          color: "var(--gm-text)",
                        }}
                      />
                    ) : (
                      <p
                        className="text-lg font-bold"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {config.first_response_hours}h
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p
                      className="text-[11px] flex items-center gap-1"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      <Zap size={10} /> Résolution
                    </p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.resolution_hours || 0}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            resolution_hours: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-1 rounded text-sm border bg-transparent outline-none"
                        style={{
                          borderColor: "var(--gm-border)",
                          color: "var(--gm-text)",
                        }}
                      />
                    ) : (
                      <p
                        className="text-lg font-bold"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {config.resolution_hours}h
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p
                      className="text-[11px] flex items-center gap-1"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      <Plus size={10} /> Escalade
                    </p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.escalation_hours || 0}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            escalation_hours: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-1 rounded text-sm border bg-transparent outline-none"
                        style={{
                          borderColor: "var(--gm-border)",
                          color: "var(--gm-text)",
                        }}
                      />
                    ) : (
                      <p
                        className="text-lg font-bold"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {config.escalation_hours}h
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-center justify-between pt-2 border-t"
                  style={{ borderColor: "var(--gm-border)" }}
                >
                  <span
                    className="text-[11px]"
                    style={{
                      color: config.is_active
                        ? "var(--gm-success)"
                        : "var(--gm-text-muted)",
                    }}
                  >
                    {config.is_active ? "● Actif" : "○ Inactif"}
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    MàJ:{" "}
                    {new Date(
                      config.updated_at || config.created_at,
                    ).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

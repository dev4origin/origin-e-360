"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  Check,
  CheckCircle,
  Clock,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ValidationAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  entity_type: string;
  entity_id: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
}

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  critical: {
    label: "Critique",
    color: "#ef4444",
    icon: <AlertOctagon size={14} />,
  },
  high: { label: "Haute", color: "#f97316", icon: <AlertTriangle size={14} /> },
  medium: { label: "Moyenne", color: "#f59e0b", icon: <Bell size={14} /> },
  low: { label: "Basse", color: "#3b82f6", icon: <Info size={14} /> },
};

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--gm-text-muted)" }}>
            {label}
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--gm-text)" }}>
            {value}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<ValidationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [resolving, setResolving] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("validation_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (err) throw err;
      setAlerts(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    setResolving(alertId);
    try {
      const { error: err } = await supabase
        .from("validation_alerts")
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", alertId);
      if (err) throw err;
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, resolved: true, resolved_at: new Date().toISOString() }
            : a,
        ),
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setResolving(null);
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

  const filtered = alerts.filter((a) => {
    const matchesSev =
      severityFilter === "all" || a.severity === severityFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "open" && !a.resolved) ||
      (statusFilter === "resolved" && a.resolved);
    const matchesSearch =
      !searchQuery ||
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.entity_type?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesStatus && matchesSearch;
  });

  const openCount = alerts.filter((a) => !a.resolved).length;
  const criticalOpen = alerts.filter(
    (a) => !a.resolved && a.severity === "critical",
  ).length;
  const resolvedCount = alerts.filter((a) => a.resolved).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Alertes de Validation
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Centre de gestion des alertes
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
        <KpiCard
          label="Alertes ouvertes"
          value={openCount}
          icon={<Bell size={20} />}
          color="#f59e0b"
        />
        <KpiCard
          label="Critiques non résolues"
          value={criticalOpen}
          icon={<AlertOctagon size={20} />}
          color="#ef4444"
        />
        <KpiCard
          label="Résolues"
          value={resolvedCount}
          icon={<CheckCircle size={20} />}
          color="#22c55e"
        />
        <KpiCard
          label="Total alertes"
          value={alerts.length}
          icon={<Shield size={20} />}
          color="#6366f1"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border bg-transparent outline-none"
            style={{
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
              backgroundColor: "var(--gm-surface)",
            }}
          >
            <option value="all">Toutes sévérités</option>
            <option value="critical">Critique</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border bg-transparent outline-none"
            style={{
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
              backgroundColor: "var(--gm-surface)",
            }}
          >
            <option value="all">Tous</option>
            <option value="open">Ouvertes</option>
            <option value="resolved">Résolues</option>
          </select>
        </div>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Rechercher une alerte..."
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

      {/* Alerts List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl border"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
              color: "var(--gm-text-muted)",
            }}
          >
            Aucune alerte trouvée
          </div>
        ) : (
          filtered.map((alert) => {
            const sevCfg =
              SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
            return (
              <div
                key={alert.id}
                className="rounded-xl border p-4 flex items-start gap-4 transition-colors"
                style={{
                  backgroundColor: "var(--gm-surface)",
                  borderColor: alert.resolved
                    ? "var(--gm-border)"
                    : `${sevCfg.color}30`,
                  opacity: alert.resolved ? 0.7 : 1,
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: `${sevCfg.color}15`,
                    color: sevCfg.color,
                  }}
                >
                  {sevCfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3
                        className="font-medium text-sm"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {alert.title || alert.alert_type || "Alerte"}
                      </h3>
                      <p
                        className="text-xs mt-0.5 line-clamp-2"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        {alert.description || "Aucune description"}
                      </p>
                    </div>
                    <span
                      className="badge flex-shrink-0"
                      style={{
                        backgroundColor: `${sevCfg.color}15`,
                        color: sevCfg.color,
                      }}
                    >
                      {sevCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span
                      className="text-[11px] flex items-center gap-1"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      <Clock size={10} />
                      {new Date(alert.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    {alert.entity_type && (
                      <span
                        className="text-[11px]"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        {alert.entity_type}
                      </span>
                    )}
                    {alert.resolved ? (
                      <span
                        className="text-[11px] flex items-center gap-1"
                        style={{ color: "var(--gm-success)" }}
                      >
                        <Check size={10} /> Résolu
                      </span>
                    ) : (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        disabled={resolving === alert.id}
                        className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
                        style={{ color: "var(--gm-success)" }}
                      >
                        <CheckCircle size={10} />
                        {resolving === alert.id ? "..." : "Résoudre"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

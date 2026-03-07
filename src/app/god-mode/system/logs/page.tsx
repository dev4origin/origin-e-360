"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ActivityLogEntry {
  id: string;
  staff_id: string;
  action: string;
  pillar: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  staff_name?: string;
  staff_role?: string;
}

const PILLAR_COLORS: Record<string, string> = {
  finance: "#6366f1",
  operations: "#22c55e",
  audit: "#f59e0b",
  sav: "#3b82f6",
  product: "#8b5cf6",
  crm: "#ec4899",
  compliance: "#14b8a6",
  system: "#ef4444",
};

const ACTION_LABELS: Record<string, string> = {
  assign_ticket: "Assignation ticket",
  resolve_ticket: "Résolution ticket",
  create_ticket: "Création ticket",
  approve_kyc: "Approbation KYC",
  reject_kyc: "Rejet KYC",
  update_permission: "Modification permission",
  add_staff: "Ajout membre",
  deactivate_staff: "Désactivation membre",
  export_data: "Export données",
  approve_payment: "Approbation paiement",
  reject_payment: "Rejet paiement",
  validate_entity: "Validation entité",
  reject_entity: "Rejet entité",
  moderate_review: "Modération avis",
  snapshot_kpis: "Snapshot KPIs",
  login: "Connexion",
  view_dashboard: "Consultation dashboard",
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pillarFilter, setPillarFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("7d");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const supabase = createClient();

  const PAGE_SIZE = 50;

  const getDateRange = (filter: string): string => {
    const now = new Date();
    switch (filter) {
      case "1d":
        return new Date(now.getTime() - 86400000).toISOString();
      case "7d":
        return new Date(now.getTime() - 7 * 86400000).toISOString();
      case "30d":
        return new Date(now.getTime() - 30 * 86400000).toISOString();
      case "90d":
        return new Date(now.getTime() - 90 * 86400000).toISOString();
      default:
        return new Date(now.getTime() - 7 * 86400000).toISOString();
    }
  };

  const fetchLogs = async (resetPage = false) => {
    setLoading(true);
    setError(null);
    const currentPage = resetPage ? 0 : page;
    if (resetPage) setPage(0);

    try {
      let query = supabase
        .from("god_mode_activity_log")
        .select(
          "*, god_mode_staff:staff_id(gm_role, user_profile:user_id(full_name))",
        )
        .gte("created_at", getDateRange(dateFilter))
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (pillarFilter !== "all") {
        query = query.eq("pillar", pillarFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const enriched = (data || []).map((log: Record<string, unknown>) => {
        const staff = log.god_mode_staff as {
          gm_role?: string;
          user_profile?: { full_name?: string };
        } | null;
        return {
          ...log,
          staff_name: staff?.user_profile?.full_name || "Système",
          staff_role: staff?.gm_role || "unknown",
        };
      }) as ActivityLogEntry[];

      if (resetPage) {
        setLogs(enriched);
      } else {
        setLogs((prev) => [...prev, ...enriched]);
      }
      setHasMore(enriched.length === PAGE_SIZE);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pillarFilter, dateFilter]);

  const loadMore = () => {
    setPage((p) => p + 1);
    fetchLogs();
  };

  const filteredLogs = logs.filter(
    (log) =>
      !searchQuery ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.pillar.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const exportCSV = () => {
    const headers = [
      "Date",
      "Heure",
      "Acteur",
      "Rôle",
      "Action",
      "Pilier",
      "Ressource",
      "ID Ressource",
    ];
    const rows = filteredLogs.map((log) => {
      const dt = new Date(log.created_at);
      return [
        dt.toLocaleDateString("fr-FR"),
        dt.toLocaleTimeString("fr-FR"),
        log.staff_name || "",
        log.staff_role || "",
        log.action,
        log.pillar,
        log.resource_type || "",
        log.resource_id || "",
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `god_mode_audit_log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  };

  if (loading && logs.length === 0) {
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

  if (error && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle size={40} style={{ color: "var(--gm-danger)" }} />
        <p style={{ color: "var(--gm-text)" }}>{error}</p>
        <button onClick={() => fetchLogs(true)} className="btn btn-primary">
          Réessayer
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
            Journal d&apos;audit
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Historique complet des actions Origin.e 360°
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border hover:bg-white/5 transition-colors"
            style={{
              color: "var(--gm-text-muted)",
              borderColor: "var(--gm-border)",
            }}
          >
            <Download size={14} />
            Exporter CSV
          </button>
          <button
            onClick={() => fetchLogs(true)}
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

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Rechercher une action, un acteur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border bg-transparent outline-none"
            style={{ borderColor: "var(--gm-border)", color: "var(--gm-text)" }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter size={14} style={{ color: "var(--gm-text-muted)" }} />
          <select
            value={pillarFilter}
            onChange={(e) => setPillarFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border bg-transparent outline-none"
            style={{
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
              backgroundColor: "var(--gm-surface)",
            }}
          >
            <option value="all">Tous les piliers</option>
            {Object.keys(PILLAR_COLORS).map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar size={14} style={{ color: "var(--gm-text-muted)" }} />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border bg-transparent outline-none"
            style={{
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
              backgroundColor: "var(--gm-surface)",
            }}
          >
            <option value="1d">Dernières 24h</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
          </select>
        </div>

        <span className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
          {filteredLogs.length} entrée{filteredLogs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl border"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
              color: "var(--gm-text-muted)",
            }}
          >
            Aucune activité trouvée pour cette période
          </div>
        ) : (
          filteredLogs.map((log) => {
            const pillarColor =
              PILLAR_COLORS[log.pillar] || "var(--gm-text-muted)";
            const actionLabel = ACTION_LABELS[log.action] || log.action;

            return (
              <div
                key={log.id}
                className="flex items-start gap-4 px-5 py-4 rounded-xl border transition-all hover:border-indigo-500/20"
                style={{
                  backgroundColor: "var(--gm-surface)",
                  borderColor: "var(--gm-border)",
                }}
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center pt-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: pillarColor }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--gm-text)" }}
                    >
                      {actionLabel}
                    </span>
                    <span
                      className="badge text-[10px]"
                      style={{
                        backgroundColor: `${pillarColor}15`,
                        color: pillarColor,
                      }}
                    >
                      {log.pillar}
                    </span>
                    {log.resource_type && (
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        → {log.resource_type}
                        {log.resource_id && ` (${log.resource_id.slice(0, 8)})`}
                      </span>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-3 text-xs"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    <span className="flex items-center gap-1">
                      <User size={11} />
                      {log.staff_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {formatTimeAgo(log.created_at)}
                    </span>
                    <span>
                      {new Date(log.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {log.ip_address && (
                      <span className="font-mono">{log.ip_address}</span>
                    )}
                  </div>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <div
                      className="mt-2 px-3 py-2 rounded-md text-[11px] font-mono"
                      style={{
                        backgroundColor: "var(--gm-bg)",
                        color: "var(--gm-text-muted)",
                      }}
                    >
                      {JSON.stringify(log.details, null, 0).slice(0, 200)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More */}
      {hasMore && filteredLogs.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn btn-ghost"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Charger plus"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Clock,
  Headphones,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Star,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Agent {
  id: string;
  user_id: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  ticket_stats?: {
    total: number;
    open: number;
    resolved: number;
    avgResolutionHours: number;
  };
}

function ProgressBar({
  value,
  max = 100,
  color,
}: {
  value: number;
  max?: number;
  color: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className="w-full h-1.5 rounded-full"
      style={{ backgroundColor: "var(--gm-border)" }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get god_mode_staff with SAV-related roles
      const { data: staff, error: staffErr } = await supabase
        .from("god_mode_staff")
        .select("*")
        .order("created_at", { ascending: false });
      if (staffErr) throw staffErr;

      // Get all SAV tickets to compute stats
      const { data: tickets } = await supabase
        .from("sav_tickets")
        .select("id, assigned_to, status, created_at, resolved_at")
        .limit(5000);

      // Compute per-agent stats
      const agentData = (staff || []).map(
        (s: {
          id: string;
          user_id: string;
          display_name: string;
          role: string;
          is_active: boolean;
          created_at: string;
        }) => {
          const agentTickets = (tickets || []).filter(
            (t: { assigned_to: string }) => t.assigned_to === s.user_id,
          );
          const resolved = agentTickets.filter(
            (t: { status: string }) =>
              t.status === "resolved" || t.status === "closed",
          );
          const openCount = agentTickets.filter(
            (t: { status: string }) =>
              t.status === "open" || t.status === "in_progress",
          );

          // Avg resolution time
          const resolutionTimes = resolved
            .filter(
              (t: { resolved_at: string | null; created_at: string }) =>
                t.resolved_at,
            )
            .map(
              (t: { resolved_at: string; created_at: string }) =>
                (new Date(t.resolved_at).getTime() -
                  new Date(t.created_at).getTime()) /
                3600000,
            );
          const avgResolution =
            resolutionTimes.length > 0
              ? Math.round(
                  resolutionTimes.reduce((a: number, b: number) => a + b, 0) /
                    resolutionTimes.length,
                )
              : 0;

          return {
            ...s,
            ticket_stats: {
              total: agentTickets.length,
              open: openCount.length,
              resolved: resolved.length,
              avgResolutionHours: avgResolution,
            },
          };
        },
      );

      setAgents(agentData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
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

  const filtered = agents.filter(
    (a) =>
      !searchQuery ||
      a.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalTickets = agents.reduce(
    (s, a) => s + (a.ticket_stats?.total || 0),
    0,
  );
  const activeAgents = agents.filter((a) => a.is_active).length;
  const avgResolution =
    agents.length > 0
      ? Math.round(
          agents.reduce(
            (s, a) => s + (a.ticket_stats?.avgResolutionHours || 0),
            0,
          ) /
            Math.max(
              1,
              agents.filter((a) => (a.ticket_stats?.total || 0) > 0).length,
            ),
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Agents SAV
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Performance et charge des agents
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
                Agents actifs
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {activeAgents}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#6366f115", color: "#6366f1" }}
            >
              <Headphones size={20} />
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
                Tickets traités
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {totalTickets}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#22c55e15", color: "#22c55e" }}
            >
              <MessageSquare size={20} />
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
                Résolution moyenne
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {avgResolution}h
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#f59e0b15", color: "#f59e0b" }}
            >
              <Clock size={20} />
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
                Total agents
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {agents.length}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#3b82f615", color: "#3b82f6" }}
            >
              <User size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-end">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Rechercher un agent..."
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

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div
            className="col-span-full text-center py-12"
            style={{ color: "var(--gm-text-muted)" }}
          >
            Aucun agent trouvé
          </div>
        ) : (
          filtered
            .sort(
              (a, b) =>
                (b.ticket_stats?.total || 0) - (a.ticket_stats?.total || 0),
            )
            .map((agent) => {
              const stats = agent.ticket_stats || {
                total: 0,
                open: 0,
                resolved: 0,
                avgResolutionHours: 0,
              };
              const resolutionRate =
                stats.total > 0
                  ? Math.round((stats.resolved / stats.total) * 100)
                  : 0;

              return (
                <div
                  key={agent.id}
                  className="rounded-xl border p-5 space-y-4"
                  style={{
                    backgroundColor: "var(--gm-surface)",
                    borderColor: "var(--gm-border)",
                    opacity: agent.is_active ? 1 : 0.6,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: "var(--gm-accent)",
                        color: "#fff",
                      }}
                    >
                      {agent.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3
                        className="font-semibold text-sm"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {agent.display_name}
                      </h3>
                      <p
                        className="text-[11px]"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        {agent.role}
                      </p>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: agent.is_active
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(136,136,164,0.12)",
                        color: agent.is_active
                          ? "var(--gm-success)"
                          : "var(--gm-text-muted)",
                      }}
                    >
                      {agent.is_active ? "Actif" : "Inactif"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p
                        className="text-lg font-bold"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {stats.total}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        Total
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-lg font-bold"
                        style={{ color: "var(--gm-success)" }}
                      >
                        {stats.resolved}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        Résolus
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-lg font-bold"
                        style={{ color: "var(--gm-warning)" }}
                      >
                        {stats.open}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        Ouverts
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-[11px] flex items-center gap-1"
                          style={{ color: "var(--gm-text-muted)" }}
                        >
                          <Star size={10} /> Taux résolution
                        </span>
                        <span
                          className="text-xs font-medium"
                          style={{
                            color:
                              resolutionRate >= 70
                                ? "var(--gm-success)"
                                : "var(--gm-warning)",
                          }}
                        >
                          {resolutionRate}%
                        </span>
                      </div>
                      <ProgressBar
                        value={resolutionRate}
                        color={resolutionRate >= 70 ? "#22c55e" : "#f59e0b"}
                      />
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between pt-2 border-t"
                    style={{ borderColor: "var(--gm-border)" }}
                  >
                    <span
                      className="text-[11px] flex items-center gap-1"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      <Clock size={10} /> Résolution moy.
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--gm-text)" }}
                    >
                      {stats.avgResolutionHours}h
                    </span>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

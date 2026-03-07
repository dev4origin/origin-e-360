"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Crown,
  Loader2,
  Medal,
  RefreshCw,
  Search,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AuditorAgg {
  id: string;
  name: string;
  email: string;
  departement: string;
  online: boolean;
  pm_validated: number;
  pm_rejected: number;
  pm_assigned: number;
  pm_completed: number;
  avgAccuracy: number;
  avgEfficiency: number;
  metricDays: number;
  va_validated: number;
  va_rejected: number;
  va_correction: number;
  va_total: number;
  recentActions: { date: string; status: string; entity_type: string }[];
  sessions: number;
  sessionEntities: number;
  total: number;
  score: number;
  rank: number;
}

interface DailyActivity {
  date: string;
  rawDate: string;
  validated: number;
  rejected: number;
}

interface EntityBreakdown {
  name: string;
  value: number;
}

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#cd7f32"];
const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6"];

function scoreColor(score: number) {
  if (score >= 80) return "var(--gm-success)";
  if (score >= 60) return "var(--gm-warning)";
  return "var(--gm-danger)";
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={16} />;
  if (rank === 2) return <Medal size={16} />;
  if (rank === 3) return <Award size={16} />;
  return null;
}

export default function AuditPerformancePage() {
  const [auditors, setAuditors] = useState<AuditorAgg[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [entityBreakdown, setEntityBreakdown] = useState<EntityBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("30d");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: profiles, error: pErr } = await supabase
        .from("user_profile")
        .select("id, full_name, email, departement, statut_connexion")
        .eq("role", "auditor");
      if (pErr) throw pErr;

      const now = new Date();
      const since =
        period === "7d"
          ? new Date(now.getTime() - 7 * 86400000).toISOString()
          : period === "30d"
            ? new Date(now.getTime() - 30 * 86400000).toISOString()
            : "2020-01-01T00:00:00Z";

      const { data: pm } = await supabase
        .from("performance_metrics")
        .select(
          "auditor_id, metric_date, entities_assigned, entities_completed, entities_validated, entities_rejected, accuracy_score, efficiency_score",
        )
        .gte("metric_date", since.slice(0, 10));

      const { data: va } = await supabase
        .from("validation_actions")
        .select("auditor_id, entity_type, new_status, created_at")
        .gte("created_at", since);

      const { data: vs } = await supabase
        .from("validation_sessions")
        .select(
          "auditor_id, entities_processed, entities_validated, entities_rejected, start_time",
        )
        .gte("start_time", since);

      const auditorIds = new Set((profiles || []).map((p: any) => p.id));

      // Aggregate performance_metrics
      const pmMap = new Map<
        string,
        {
          validated: number;
          rejected: number;
          assigned: number;
          completed: number;
          accSum: number;
          effSum: number;
          count: number;
        }
      >();
      for (const m of pm || []) {
        if (!auditorIds.has(m.auditor_id)) continue;
        const e = pmMap.get(m.auditor_id) || {
          validated: 0,
          rejected: 0,
          assigned: 0,
          completed: 0,
          accSum: 0,
          effSum: 0,
          count: 0,
        };
        e.validated += m.entities_validated || 0;
        e.rejected += m.entities_rejected || 0;
        e.assigned += m.entities_assigned || 0;
        e.completed += m.entities_completed || 0;
        if (m.accuracy_score != null) {
          e.accSum += Number(m.accuracy_score);
          e.count += 1;
        }
        if (m.efficiency_score != null) {
          e.effSum += Number(m.efficiency_score);
        }
        pmMap.set(m.auditor_id, e);
      }

      // Aggregate validation_actions
      const vaMap = new Map<
        string,
        {
          validated: number;
          rejected: number;
          correction: number;
          total: number;
          recent: { date: string; status: string; entity_type: string }[];
        }
      >();
      const dailyMap = new Map<
        string,
        { validated: number; rejected: number }
      >();
      const entityMap = new Map<string, number>();

      for (const a of va || []) {
        if (!auditorIds.has(a.auditor_id)) continue;
        const e = vaMap.get(a.auditor_id) || {
          validated: 0,
          rejected: 0,
          correction: 0,
          total: 0,
          recent: [],
        };
        e.total += 1;
        if (a.new_status === "validated") e.validated += 1;
        else if (a.new_status === "rejected") e.rejected += 1;
        else if (a.new_status === "correction_requested") e.correction += 1;
        e.recent.push({
          date: a.created_at,
          status: a.new_status,
          entity_type: a.entity_type,
        });
        vaMap.set(a.auditor_id, e);

        const day = a.created_at?.slice(0, 10) || "";
        if (day) {
          const d = dailyMap.get(day) || { validated: 0, rejected: 0 };
          if (a.new_status === "validated") d.validated += 1;
          else if (a.new_status === "rejected") d.rejected += 1;
          dailyMap.set(day, d);
        }
        if (a.entity_type)
          entityMap.set(a.entity_type, (entityMap.get(a.entity_type) || 0) + 1);
      }

      // Aggregate validation_sessions
      const vsMap = new Map<string, { sessions: number; entities: number }>();
      for (const s of vs || []) {
        if (!auditorIds.has(s.auditor_id)) continue;
        const e = vsMap.get(s.auditor_id) || { sessions: 0, entities: 0 };
        e.sessions += 1;
        e.entities += s.entities_processed || 0;
        vsMap.set(s.auditor_id, e);
      }

      // Combine all data per auditor
      const combined: AuditorAgg[] = (profiles || []).map((p: any) => {
        const pmData = pmMap.get(p.id);
        const vaData = vaMap.get(p.id);
        const vsData = vsMap.get(p.id);
        const totalValidated =
          (pmData?.validated || 0) + (vaData?.validated || 0);
        const totalRejected = (pmData?.rejected || 0) + (vaData?.rejected || 0);
        const total =
          totalValidated + totalRejected + (vaData?.correction || 0);
        const avgAcc =
          pmData && pmData.count > 0
            ? Math.round(pmData.accSum / pmData.count)
            : 0;
        const avgEff =
          pmData && pmData.count > 0
            ? Math.round(pmData.effSum / pmData.count)
            : 0;
        const volScore = Math.min(total / 50, 1) * 100;
        const score = Math.round(avgAcc * 0.4 + avgEff * 0.3 + volScore * 0.3);
        return {
          id: p.id,
          name: p.full_name || "Auditeur",
          email: p.email || "",
          departement: p.departement || "",
          online: p.statut_connexion || false,
          pm_validated: pmData?.validated || 0,
          pm_rejected: pmData?.rejected || 0,
          pm_assigned: pmData?.assigned || 0,
          pm_completed: pmData?.completed || 0,
          avgAccuracy: avgAcc,
          avgEfficiency: avgEff,
          metricDays: pmData?.count || 0,
          va_validated: vaData?.validated || 0,
          va_rejected: vaData?.rejected || 0,
          va_correction: vaData?.correction || 0,
          va_total: vaData?.total || 0,
          recentActions: (vaData?.recent || [])
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            )
            .slice(0, 5),
          sessions: vsData?.sessions || 0,
          sessionEntities: vsData?.entities || 0,
          total,
          score,
          rank: 0,
        };
      });

      combined.sort((a, b) => b.score - a.score);
      combined.forEach((a, i) => (a.rank = i + 1));
      setAuditors(combined);

      // Daily activity chart data
      const dailyArr = Array.from(dailyMap.entries())
        .map(([date, d]) => ({
          rawDate: date,
          date: new Date(date).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
          }),
          validated: d.validated,
          rejected: d.rejected,
        }))
        .sort((a, b) => a.rawDate.localeCompare(b.rawDate));
      setDailyActivity(dailyArr.slice(-14));

      // Entity breakdown
      const labelMap: Record<string, string> = {
        producteur: "Producteurs",
        parcelle: "Parcelles",
        culture: "Cultures",
        livraison: "Livraisons",
        membre_menage: "Membres",
      };
      setEntityBreakdown(
        Array.from(entityMap.entries()).map(([name, value]) => ({
          name: labelMap[name] || name,
          value,
        })),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const filtered = auditors.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.departement.toLowerCase().includes(q)
    );
  });

  const totalActions = auditors.reduce((s, a) => s + a.va_total, 0);
  const totalValidated = auditors.reduce(
    (s, a) => s + a.pm_validated + a.va_validated,
    0,
  );
  const totalRejected = auditors.reduce(
    (s, a) => s + a.pm_rejected + a.va_rejected,
    0,
  );
  const avgScore =
    auditors.length > 0
      ? Math.round(auditors.reduce((s, a) => s + a.score, 0) / auditors.length)
      : 0;
  const totalSessions = auditors.reduce((s, a) => s + a.sessions, 0);

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
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm"
          style={{ backgroundColor: "var(--gm-accent)" }}
        >
          <RefreshCw size={14} /> R\u00e9essayer
        </button>
      </div>
    );
  }

  const leaderboardData = [...auditors]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((a) => ({
      name: a.name.split(" ")[0] || "?",
      score: a.score,
      validated: a.pm_validated + a.va_validated,
      rejected: a.pm_rejected + a.va_rejected,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Performance Auditeurs
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Analyse, classement et tendances
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["7d", "30d", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor:
                  period === p ? "var(--gm-accent)" : "var(--gm-surface)",
                color: period === p ? "white" : "var(--gm-text-muted)",
              }}
            >
              {p === "7d" ? "7 jours" : p === "30d" ? "30 jours" : "Tout"}
            </button>
          ))}
          <button onClick={fetchData} title="Actualiser">
            <RefreshCw size={14} style={{ color: "var(--gm-text-muted)" }} />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          {
            label: "Auditeurs",
            value: auditors.length,
            icon: <User size={16} />,
            color: "var(--gm-accent)",
          },
          {
            label: "Score moyen",
            value: avgScore + "%",
            icon: <Target size={16} />,
            color: scoreColor(avgScore),
          },
          {
            label: "Valid\u00e9es",
            value: totalValidated,
            icon: <CheckCircle size={16} />,
            color: "var(--gm-success)",
          },
          {
            label: "Rejet\u00e9es",
            value: totalRejected,
            icon: <XCircle size={16} />,
            color: "var(--gm-danger)",
          },
          {
            label: "Actions",
            value: totalActions,
            icon: <Zap size={16} />,
            color: "var(--gm-warning)",
          },
          {
            label: "Sessions",
            value: totalSessions,
            icon: <Clock size={16} />,
            color: "var(--gm-info)",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl p-4 border"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: "var(--gm-text-muted)" }}
              >
                {kpi.label}
              </span>
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leaderboard Bar Chart */}
        <div
          className="lg:col-span-2 rounded-xl border p-5"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <h3
            className="text-sm font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--gm-text)" }}
          >
            <BarChart3 size={14} style={{ color: "var(--gm-accent)" }} />{" "}
            Classement - Top 10
          </h3>
          {leaderboardData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={leaderboardData} barGap={4}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--gm-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--gm-text-muted)",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--gm-text-muted)",
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--gm-surface-2)",
                    border: "1px solid var(--gm-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--gm-text)",
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                    color: "var(--gm-text-muted)",
                  }}
                />
                <Bar
                  dataKey="validated"
                  name="Valid\u00e9es"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="rejected"
                  name="Rejet\u00e9es"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p
              className="text-sm text-center py-12"
              style={{ color: "var(--gm-text-muted)" }}
            >
              Aucune donn\u00e9e
            </p>
          )}
        </div>

        {/* Entity Breakdown Pie Chart */}
        <div
          className="rounded-xl border p-5"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <h3
            className="text-sm font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--gm-text)" }}
          >
            <Target size={14} style={{ color: "var(--gm-accent)" }} />{" "}
            Entit\u00e9s audit\u00e9es
          </h3>
          {entityBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={entityBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {entityBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--gm-surface-2)",
                      border: "1px solid var(--gm-border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--gm-text)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {entityBreakdown.map((e, i) => (
                  <div
                    key={e.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <span
                        className="text-xs"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        {e.name}
                      </span>
                    </div>
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--gm-text)" }}
                    >
                      {e.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p
              className="text-sm text-center py-12"
              style={{ color: "var(--gm-text-muted)" }}
            >
              Aucune donn\u00e9e
            </p>
          )}
        </div>
      </div>

      {/* Daily Activity Chart */}
      {dailyActivity.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <h3
            className="text-sm font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--gm-text)" }}
          >
            <Calendar size={14} style={{ color: "var(--gm-accent)" }} />{" "}
            Activit\u00e9 journali\u00e8re
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyActivity} barGap={2}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--gm-border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--gm-text-muted)", fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--gm-text-muted)", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--gm-surface-2)",
                  border: "1px solid var(--gm-border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--gm-text)",
                }}
              />
              <Bar
                dataKey="validated"
                name="Valid\u00e9es"
                fill="#22c55e"
                radius={[3, 3, 0, 0]}
                stackId="a"
              />
              <Bar
                dataKey="rejected"
                name="Rejet\u00e9es"
                fill="#ef4444"
                radius={[3, 3, 0, 0]}
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 max-w-sm"
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
        <span className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
          {filtered.length} auditeur{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Auditor Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <User
            size={32}
            className="mx-auto mb-2"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <p style={{ color: "var(--gm-text-muted)" }}>Aucun auditeur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered
            .sort((a, b) => a.rank - b.rank)
            .map((auditor) => (
              <div
                key={auditor.id}
                className="rounded-xl border p-5 space-y-4 transition-all hover:border-[var(--gm-accent)]"
                style={{
                  backgroundColor: "var(--gm-surface)",
                  borderColor: "var(--gm-border)",
                }}
              >
                {/* Avatar + Name + Rank */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{
                          backgroundColor: "rgba(99,102,241,0.15)",
                          color: "var(--gm-accent)",
                        }}
                      >
                        {auditor.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{
                          backgroundColor: auditor.online
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
                        {auditor.name}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        {auditor.departement || auditor.email || "-"}
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-lg"
                    style={{
                      backgroundColor:
                        auditor.rank <= 3
                          ? RANK_COLORS[auditor.rank - 1] + "18"
                          : "var(--gm-bg)",
                    }}
                  >
                    {auditor.rank <= 3 ? (
                      <span
                        style={{
                          color: RANK_COLORS[auditor.rank - 1],
                        }}
                      >
                        <RankIcon rank={auditor.rank} />
                      </span>
                    ) : (
                      <span
                        className="text-xs font-bold"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        #{auditor.rank}
                      </span>
                    )}
                  </div>
                </div>

                {/* Composite Score */}
                <div
                  className="rounded-lg p-3"
                  style={{ backgroundColor: "var(--gm-bg)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Score composite
                    </span>
                    <span
                      className="text-lg font-black"
                      style={{ color: scoreColor(auditor.score) }}
                    >
                      {auditor.score}
                    </span>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--gm-surface-2)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: auditor.score + "%",
                        backgroundColor: scoreColor(auditor.score),
                      }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Valid\u00e9es",
                      value: auditor.pm_validated + auditor.va_validated,
                      icon: <CheckCircle size={10} />,
                      color: "var(--gm-success)",
                    },
                    {
                      label: "Rejet\u00e9es",
                      value: auditor.pm_rejected + auditor.va_rejected,
                      icon: <XCircle size={10} />,
                      color: "var(--gm-danger)",
                    },
                    {
                      label: "Corrections",
                      value: auditor.va_correction,
                      icon: <TrendingDown size={10} />,
                      color: "var(--gm-warning)",
                    },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div
                        className="flex items-center justify-center gap-1 mb-0.5"
                        style={{ color: s.color }}
                      >
                        {s.icon}
                      </div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: s.color }}
                      >
                        {s.value}
                      </p>
                      <p
                        className="text-[9px]"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Accuracy + Efficiency bars */}
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[10px] flex items-center gap-1"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        <Star size={9} /> Pr\u00e9cision
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: scoreColor(auditor.avgAccuracy),
                        }}
                      >
                        {auditor.avgAccuracy}%
                      </span>
                    </div>
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{
                        backgroundColor: "var(--gm-surface-2)",
                      }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: auditor.avgAccuracy + "%",
                          backgroundColor: scoreColor(auditor.avgAccuracy),
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[10px] flex items-center gap-1"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        <TrendingUp size={9} /> Efficacit\u00e9
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: scoreColor(auditor.avgEfficiency),
                        }}
                      >
                        {auditor.avgEfficiency}%
                      </span>
                    </div>
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{
                        backgroundColor: "var(--gm-surface-2)",
                      }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: auditor.avgEfficiency + "%",
                          backgroundColor: scoreColor(auditor.avgEfficiency),
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Recent Actions */}
                {auditor.recentActions.length > 0 && (
                  <div
                    className="pt-3 border-t space-y-1"
                    style={{ borderColor: "var(--gm-border)" }}
                  >
                    <p
                      className="text-[10px] uppercase tracking-wider font-semibold mb-1"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Derni\u00e8res actions
                    </p>
                    {auditor.recentActions.slice(0, 3).map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5">
                          {a.status === "validated" ? (
                            <CheckCircle
                              size={10}
                              style={{
                                color: "var(--gm-success)",
                              }}
                            />
                          ) : a.status === "rejected" ? (
                            <XCircle
                              size={10}
                              style={{
                                color: "var(--gm-danger)",
                              }}
                            />
                          ) : (
                            <TrendingDown
                              size={10}
                              style={{
                                color: "var(--gm-warning)",
                              }}
                            />
                          )}
                          <span
                            className="text-[10px]"
                            style={{ color: "var(--gm-text)" }}
                          >
                            {a.entity_type}
                          </span>
                        </div>
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--gm-text-muted)" }}
                        >
                          {new Date(a.date).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div
                  className="pt-2 border-t flex items-center justify-between"
                  style={{ borderColor: "var(--gm-border)" }}
                >
                  <span
                    className="text-[10px] flex items-center gap-1"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    <Clock size={9} /> {auditor.sessions} session
                    {auditor.sessions !== 1 ? "s" : ""}
                  </span>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: "var(--gm-text)" }}
                  >
                    {auditor.total} entit\u00e9s trait\u00e9es
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

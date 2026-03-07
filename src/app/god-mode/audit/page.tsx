"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AuditDashboard {
  pending_validations: number;
  validated_today: number;
  rejected_today: number;
  avg_validation_time_hours: number;
  auditors: Array<{
    user_id: string;
    full_name: string;
    validated_count: number;
    rejected_count: number;
    avg_time_hours: number;
  }>;
  by_type: Array<{
    type: string;
    pending: number;
    validated: number;
    rejected: number;
  }>;
  recent_validations: Array<{
    id: string;
    type: string;
    org_name: string;
    status: string;
    auditor_name: string | null;
    created_at: string;
    validated_at: string | null;
  }>;
}

export default function AuditPage() {
  const [data, setData] = useState<AuditDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: audit, error: rpcError } = await supabase.rpc(
        "get_god_mode_audit_dashboard",
      );
      if (rpcError) throw rpcError;
      setData(audit as unknown as AuditDashboard);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
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

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle size={40} style={{ color: "var(--gm-danger)" }} />
        <p style={{ color: "var(--gm-text)" }}>{error}</p>
        <button onClick={fetchData} className="btn-primary text-sm px-4 py-2">
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
            Audit & Validation
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-muted)" }}>
            File de validation, performance des auditeurs et alertes
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border hover:bg-white/5"
          style={{ color: "var(--gm-muted)", borderColor: "var(--gm-border)" }}
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "En attente",
            value: data.pending_validations,
            icon: <Clock size={20} />,
            color: "#f59e0b",
          },
          {
            label: "Validées aujourd'hui",
            value: data.validated_today,
            icon: <CheckCircle size={20} />,
            color: "#22c55e",
          },
          {
            label: "Rejetées aujourd'hui",
            value: data.rejected_today,
            icon: <XCircle size={20} />,
            color: "#ef4444",
          },
          {
            label: "Temps moyen (h)",
            value: data.avg_validation_time_hours?.toFixed(1) ?? "—",
            icon: <ClipboardCheck size={20} />,
            color: "#6366f1",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-start justify-between">
              <div>
                <p
                  className="text-xs mb-1"
                  style={{ color: "var(--gm-muted)" }}
                >
                  {kpi.label}
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--gm-text)" }}
                >
                  {kpi.value}
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}
              >
                {kpi.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Validation by Type Chart */}
        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--gm-text)" }}
          >
            Validations par type
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_type}>
                <XAxis
                  dataKey="type"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="pending"
                  fill="#f59e0b"
                  name="En attente"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="validated"
                  fill="#22c55e"
                  name="Validées"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="rejected"
                  fill="#ef4444"
                  name="Rejetées"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Auditor Performance */}
        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--gm-text)" }}
          >
            Performance des auditeurs
          </h2>
          <div className="space-y-3">
            {data.auditors && data.auditors.length > 0 ? (
              data.auditors.map((a) => (
                <div
                  key={a.user_id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg"
                  style={{ backgroundColor: "var(--gm-bg)" }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: "var(--gm-accent)" }}
                  >
                    {a.full_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--gm-text)" }}
                    >
                      {a.full_name}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--gm-muted)" }}
                    >
                      Temps moy: {a.avg_time_hours?.toFixed(1)}h
                    </p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span style={{ color: "#22c55e" }}>
                      ✓ {a.validated_count}
                    </span>
                    <span style={{ color: "#ef4444" }}>
                      ✗ {a.rejected_count}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Users size={16} style={{ color: "var(--gm-muted)" }} />
                <span style={{ color: "var(--gm-muted)" }} className="text-sm">
                  Aucun auditeur actif
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Validations */}
      <div
        className="rounded-xl p-5 border"
        style={{
          backgroundColor: "var(--gm-surface)",
          borderColor: "var(--gm-border)",
        }}
      >
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--gm-text)" }}
        >
          Validations récentes
        </h2>
        {data.recent_validations && data.recent_validations.length > 0 ? (
          <table className="gm-table w-full">
            <thead>
              <tr>
                <th>Type</th>
                <th>Organisation</th>
                <th>Statut</th>
                <th>Auditeur</th>
                <th>Soumis le</th>
                <th>Validé le</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_validations.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <MapPin size={12} style={{ color: "var(--gm-accent)" }} />
                      <span style={{ color: "var(--gm-text)" }}>{v.type}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--gm-text)" }}>{v.org_name}</td>
                  <td>
                    <span
                      className={
                        v.status === "validated"
                          ? "badge-success"
                          : v.status === "rejected"
                            ? "badge-danger"
                            : "badge-warning"
                      }
                    >
                      {v.status}
                    </span>
                  </td>
                  <td style={{ color: "var(--gm-muted)" }}>
                    {v.auditor_name || "—"}
                  </td>
                  <td style={{ color: "var(--gm-muted)" }}>
                    {new Date(v.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td style={{ color: "var(--gm-muted)" }}>
                    {v.validated_at
                      ? new Date(v.validated_at).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm py-4" style={{ color: "var(--gm-muted)" }}>
            Aucune validation récente
          </p>
        )}
      </div>
    </div>
  );
}

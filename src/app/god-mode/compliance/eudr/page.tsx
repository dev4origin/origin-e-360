"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  CheckCircle,
  Globe,
  Leaf,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  TreePine,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface EudrAnalysis {
  id: string;
  fournisseur_id: string;
  parcelle_id: string;
  compliance_status: string;
  status: string;
  deforestation_risk: number;
  analysis_date: string;
  created_at: string;
  metadata?: Record<string, unknown>;
  org_name?: string;
}

const COMPLIANCE_CONFIG: Record<string, { label: string; color: string }> = {
  compliant: { label: "Conforme", color: "#22c55e" },
  non_compliant: { label: "Non conforme", color: "#ef4444" },
  pending: { label: "En attente", color: "#f59e0b" },
  under_review: { label: "En révision", color: "#3b82f6" },
  COMPLIANT: { label: "Conforme", color: "#22c55e" },
  NON_COMPLIANT: { label: "Non conforme", color: "#ef4444" },
  PENDING: { label: "En attente", color: "#f59e0b" },
};

function KpiCard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
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
          {subtitle && (
            <p className="text-[11px] mt-1" style={{ color }}>
              {subtitle}
            </p>
          )}
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

function RiskGauge({ risk }: { risk: number }) {
  const color = risk <= 0.3 ? "#22c55e" : risk <= 0.6 ? "#f59e0b" : "#ef4444";
  const pct = Math.min(100, Math.max(0, risk * 100));
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-16 h-1.5 rounded-full"
        style={{ backgroundColor: "var(--gm-border)" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium" style={{ color }}>
        {(risk * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export default function EudrPage() {
  const [analyses, setAnalyses] = useState<EudrAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("gee_deforestation_analysis")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (err) throw err;

      // Fetch org names
      const orgIds = [
        ...new Set(
          (data || [])
            .map((a: EudrAnalysis) => a.fournisseur_id)
            .filter(Boolean),
        ),
      ];
      let orgMap = new Map<string, string>();
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("fournisseurs")
          .select("id, nom")
          .in("id", orgIds.slice(0, 100));
        orgMap = new Map(
          (orgs || []).map((o: { id: string; nom: string }) => [o.id, o.nom]),
        );
      }

      setAnalyses(
        (data || []).map((a: EudrAnalysis) => ({
          ...a,
          org_name:
            orgMap.get(a.fournisseur_id) ||
            a.fournisseur_id?.slice(0, 8) ||
            "—",
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

  const filtered = analyses.filter((a) => {
    const status = a.compliance_status?.toLowerCase() || "";
    const matchesCompliance =
      complianceFilter === "all" || status === complianceFilter;
    const matchesSearch =
      !searchQuery ||
      a.org_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.parcelle_id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCompliance && matchesSearch;
  });

  const compliantCount = analyses.filter(
    (a) => (a.compliance_status || "").toLowerCase() === "compliant",
  ).length;
  const nonCompliantCount = analyses.filter(
    (a) => (a.compliance_status || "").toLowerCase() === "non_compliant",
  ).length;
  const avgRisk =
    analyses.length > 0
      ? analyses.reduce((s, a) => s + (a.deforestation_risk || 0), 0) /
        analyses.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            EUDR Déforestation
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Analyses de conformité EU Deforestation Regulation
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
          label="Total analyses"
          value={analyses.length}
          icon={<Globe size={20} />}
          color="#6366f1"
        />
        <KpiCard
          label="Conformes"
          value={compliantCount}
          icon={<CheckCircle size={20} />}
          color="#22c55e"
          subtitle={`${analyses.length > 0 ? Math.round((compliantCount / analyses.length) * 100) : 0}%`}
        />
        <KpiCard
          label="Non conformes"
          value={nonCompliantCount}
          icon={<XCircle size={20} />}
          color="#ef4444"
        />
        <KpiCard
          label="Risque moyen"
          value={`${(avgRisk * 100).toFixed(1)}%`}
          icon={<TreePine size={20} />}
          color={avgRisk <= 0.3 ? "#22c55e" : "#f59e0b"}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <select
          value={complianceFilter}
          onChange={(e) => setComplianceFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border bg-transparent outline-none"
          style={{
            borderColor: "var(--gm-border)",
            color: "var(--gm-text)",
            backgroundColor: "var(--gm-surface)",
          }}
        >
          <option value="all">Tous les statuts</option>
          <option value="compliant">Conforme</option>
          <option value="non_compliant">Non conforme</option>
          <option value="pending">En attente</option>
          <option value="under_review">En révision</option>
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

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: "var(--gm-surface)",
          borderColor: "var(--gm-border)",
        }}
      >
        <table className="gm-table">
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Parcelle</th>
              <th>Risque déforestation</th>
              <th>Conformité</th>
              <th>Date analyse</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-8"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Aucune analyse trouvée
                </td>
              </tr>
            ) : (
              filtered.slice(0, 100).map((analysis) => {
                const compCfg = COMPLIANCE_CONFIG[
                  (analysis.compliance_status || "").toLowerCase()
                ] || {
                  label: analysis.compliance_status || "—",
                  color: "#8888a4",
                };
                return (
                  <tr key={analysis.id}>
                    <td>
                      <span
                        className="font-medium text-sm"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {analysis.org_name}
                      </span>
                    </td>
                    <td>
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        <MapPin size={12} />
                        {analysis.parcelle_id?.slice(0, 12) || "—"}
                      </span>
                    </td>
                    <td>
                      <RiskGauge risk={analysis.deforestation_risk || 0} />
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${compCfg.color}15`,
                          color: compCfg.color,
                        }}
                      >
                        {compCfg.label}
                      </span>
                    </td>
                    <td style={{ color: "var(--gm-text-muted)" }}>
                      {analysis.analysis_date
                        ? new Date(analysis.analysis_date).toLocaleDateString(
                            "fr-FR",
                          )
                        : new Date(analysis.created_at).toLocaleDateString(
                            "fr-FR",
                          )}
                    </td>
                    <td>
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{
                          color:
                            analysis.status === "completed"
                              ? "var(--gm-success)"
                              : "var(--gm-text-muted)",
                        }}
                      >
                        {analysis.status === "completed" ? (
                          <CheckCircle size={12} />
                        ) : (
                          <Leaf size={12} />
                        )}
                        {analysis.status || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

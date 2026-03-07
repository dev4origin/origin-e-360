"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Globe,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ComplianceData {
  kyc_stats: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  documents: {
    id: string;
    title: string;
    status: string;
    expiration_date: string | null;
    is_legal_document: boolean;
    category: string;
    cooperative_nom?: string;
    created_at: string;
  }[];
  eudr: {
    total_analyses: number;
    compliant: number;
    non_compliant: number;
    pending: number;
    compliance_rate: number;
  };
  deforestation_analyses: {
    id: string;
    parcelle_id: string;
    compliance_status: string;
    analysis_date: string;
    status: string;
    deforestation_detected: boolean;
    risk_score: number | null;
  }[];
  organizations_kyc: {
    id: string;
    nom: string;
    type_fournisseur: string;
    statut_kyc: string;
    subscription_status: string;
    created_at: string;
  }[];
}

const KYC_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  approved: {
    label: "Approuvé",
    color: "var(--gm-success)",
    icon: <CheckCircle size={14} />,
  },
  pending: {
    label: "En attente",
    color: "var(--gm-warning)",
    icon: <Clock size={14} />,
  },
  pending_review: {
    label: "En révision",
    color: "var(--gm-warning)",
    icon: <Clock size={14} />,
  },
  rejected: {
    label: "Rejeté",
    color: "var(--gm-danger)",
    icon: <XCircle size={14} />,
  },
  not_submitted: {
    label: "Non soumis",
    color: "var(--gm-text-muted)",
    icon: <FileText size={14} />,
  },
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

export default function CompliancePage() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"kyc" | "eudr">("kyc");
  const [searchQuery, setSearchQuery] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgsRes, docsRes, eudrRes] = await Promise.all([
        supabase
          .from("fournisseurs")
          .select(
            "id, nom, type_fournisseur, statut_kyc, subscription_status, created_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("verification_documents")
          .select(
            "id, title, status, expiration_date, is_legal_document, category, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("gee_deforestation_analysis")
          .select(
            "id, parcelle_id, compliance_status, analysis_date, status, deforestation_detected, risk_score",
          )
          .order("analysis_date", { ascending: false })
          .limit(200),
      ]);

      const orgs = orgsRes.data || [];
      const docs = docsRes.data || [];
      const analyses = eudrRes.data || [];

      const completedAnalyses = analyses.filter(
        (a) => a.status === "completed",
      );
      const compliantCount = completedAnalyses.filter(
        (a) => a.compliance_status === "conforme",
      ).length;
      const nonCompliantCount = completedAnalyses.filter(
        (a) => a.compliance_status !== "conforme",
      ).length;
      const pendingAnalyses = analyses.filter(
        (a) => a.status === "pending" || a.status === "processing",
      ).length;

      setData({
        kyc_stats: {
          total: orgs.length,
          approved: orgs.filter((o) => o.statut_kyc === "approved").length,
          pending: orgs.filter(
            (o) =>
              o.statut_kyc === "pending" || o.statut_kyc === "pending_review",
          ).length,
          rejected: orgs.filter((o) => o.statut_kyc === "rejected").length,
        },
        documents: docs,
        eudr: {
          total_analyses: analyses.length,
          compliant: compliantCount,
          non_compliant: nonCompliantCount,
          pending: pendingAnalyses,
          compliance_rate:
            completedAnalyses.length > 0
              ? (compliantCount / completedAnalyses.length) * 100
              : 0,
        },
        deforestation_analyses: analyses,
        organizations_kyc: orgs,
      });
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

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle size={40} style={{ color: "var(--gm-danger)" }} />
        <p style={{ color: "var(--gm-text)" }}>{error || "Aucune donnée"}</p>
        <button onClick={fetchData} className="btn btn-primary">
          Réessayer
        </button>
      </div>
    );
  }

  const filteredOrgs = data.organizations_kyc.filter((o) => {
    const matchesSearch =
      !searchQuery || o.nom.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKyc = kycFilter === "all" || o.statut_kyc === kycFilter;
    return matchesSearch && matchesKyc;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Conformité & EUDR
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Vérification KYC, documents légaux et analyse déforestation
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Organisations KYC"
          value={data.kyc_stats.total}
          icon={<ShieldCheck size={20} />}
          color="#6366f1"
          subtitle={`${data.kyc_stats.approved} approuvées`}
        />
        <KpiCard
          label="KYC en attente"
          value={data.kyc_stats.pending}
          icon={<Clock size={20} />}
          color="#f59e0b"
        />
        <KpiCard
          label="Conformité EUDR"
          value={`${data.eudr.compliance_rate.toFixed(1)}%`}
          icon={<Globe size={20} />}
          color={data.eudr.compliance_rate >= 80 ? "#22c55e" : "#ef4444"}
          subtitle={`${data.eudr.compliant} / ${data.eudr.compliant + data.eudr.non_compliant} conformes`}
        />
        <KpiCard
          label="Non-conformes"
          value={data.eudr.non_compliant}
          icon={<ShieldAlert size={20} />}
          color="#ef4444"
          subtitle={`${data.eudr.pending} en analyse`}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div
          className="flex gap-1 rounded-lg p-1"
          style={{ backgroundColor: "var(--gm-surface)" }}
        >
          <button
            onClick={() => setActiveTab("kyc")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === "kyc" ? "var(--gm-accent)" : "transparent",
              color: activeTab === "kyc" ? "white" : "var(--gm-text-muted)",
            }}
          >
            <FileText size={14} />
            KYC / Organisations
          </button>
          <button
            onClick={() => setActiveTab("eudr")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === "eudr" ? "var(--gm-accent)" : "transparent",
              color: activeTab === "eudr" ? "white" : "var(--gm-text-muted)",
            }}
          >
            <Globe size={14} />
            EUDR Déforestation
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "kyc" && (
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border bg-transparent outline-none"
              style={{
                borderColor: "var(--gm-border)",
                color: "var(--gm-text)",
                backgroundColor: "var(--gm-surface)",
              }}
            >
              <option value="all">Tous statuts KYC</option>
              <option value="approved">Approuvé</option>
              <option value="pending">En attente</option>
              <option value="pending_review">En révision</option>
              <option value="rejected">Rejeté</option>
              <option value="not_submitted">Non soumis</option>
            </select>
          )}
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
                width: "240px",
              }}
            />
          </div>
        </div>
      </div>

      {/* KYC Tab */}
      {activeTab === "kyc" && (
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
                <th>Type</th>
                <th>Statut KYC</th>
                <th>Abonnement</th>
                <th>Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Aucune organisation trouvée
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const kyc = KYC_CONFIG[org.statut_kyc] || {
                    label: org.statut_kyc || "—",
                    color: "var(--gm-text-muted)",
                    icon: <FileText size={14} />,
                  };
                  return (
                    <tr key={org.id}>
                      <td>
                        <span
                          className="font-medium"
                          style={{ color: "var(--gm-text)" }}
                        >
                          {org.nom}
                        </span>
                      </td>
                      <td>
                        <span
                          className="text-xs"
                          style={{ color: "var(--gm-text-muted)" }}
                        >
                          {org.type_fournisseur || "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge flex items-center gap-1 w-fit"
                          style={{
                            backgroundColor: `${kyc.color}15`,
                            color: kyc.color,
                          }}
                        >
                          {kyc.icon}
                          {kyc.label}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              org.subscription_status === "active"
                                ? "rgba(34, 197, 94, 0.12)"
                                : "rgba(136, 136, 164, 0.12)",
                            color:
                              org.subscription_status === "active"
                                ? "var(--gm-success)"
                                : "var(--gm-text-muted)",
                          }}
                        >
                          {org.subscription_status || "—"}
                        </span>
                      </td>
                      <td style={{ color: "var(--gm-text-muted)" }}>
                        {new Date(org.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* EUDR Tab */}
      {activeTab === "eudr" && (
        <div className="space-y-4">
          {/* Compliance Summary Bar */}
          <div
            className="rounded-xl p-5 border"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
            }}
          >
            <h3
              className="text-sm font-semibold mb-3"
              style={{ color: "var(--gm-text)" }}
            >
              Résumé conformité EUDR
            </h3>
            <div
              className="w-full h-4 rounded-full overflow-hidden flex"
              style={{ backgroundColor: "var(--gm-border)" }}
            >
              {data.eudr.compliant + data.eudr.non_compliant > 0 && (
                <>
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(data.eudr.compliant / (data.eudr.compliant + data.eudr.non_compliant)) * 100}%`,
                      backgroundColor: "var(--gm-success)",
                    }}
                  />
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(data.eudr.non_compliant / (data.eudr.compliant + data.eudr.non_compliant)) * 100}%`,
                      backgroundColor: "var(--gm-danger)",
                    }}
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-6 mt-3 text-xs">
              <span
                className="flex items-center gap-1.5"
                style={{ color: "var(--gm-success)" }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--gm-success)" }}
                />
                Conformes: {data.eudr.compliant}
              </span>
              <span
                className="flex items-center gap-1.5"
                style={{ color: "var(--gm-danger)" }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--gm-danger)" }}
                />
                Non-conformes: {data.eudr.non_compliant}
              </span>
              <span
                className="flex items-center gap-1.5"
                style={{ color: "var(--gm-warning)" }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--gm-warning)" }}
                />
                En analyse: {data.eudr.pending}
              </span>
            </div>
          </div>

          {/* Analyses Table */}
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
                  <th>Parcelle</th>
                  <th>Statut conformité</th>
                  <th>Déforestation</th>
                  <th>Score risque</th>
                  <th>Date analyse</th>
                  <th>État</th>
                </tr>
              </thead>
              <tbody>
                {data.deforestation_analyses.length === 0 ? (
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
                  data.deforestation_analyses.slice(0, 50).map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span
                          className="flex items-center gap-1.5 font-mono text-xs"
                          style={{ color: "var(--gm-accent)" }}
                        >
                          <MapPin size={12} />
                          {a.parcelle_id?.slice(0, 8) || "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              a.compliance_status === "conforme"
                                ? "rgba(34, 197, 94, 0.12)"
                                : a.compliance_status === "non_conforme"
                                  ? "rgba(239, 68, 68, 0.12)"
                                  : "rgba(136, 136, 164, 0.12)",
                            color:
                              a.compliance_status === "conforme"
                                ? "var(--gm-success)"
                                : a.compliance_status === "non_conforme"
                                  ? "var(--gm-danger)"
                                  : "var(--gm-text-muted)",
                          }}
                        >
                          {a.compliance_status || "—"}
                        </span>
                      </td>
                      <td>
                        {a.deforestation_detected ? (
                          <span
                            className="flex items-center gap-1 text-xs"
                            style={{ color: "var(--gm-danger)" }}
                          >
                            <ShieldAlert size={12} />
                            Détectée
                          </span>
                        ) : (
                          <span
                            className="flex items-center gap-1 text-xs"
                            style={{ color: "var(--gm-success)" }}
                          >
                            <CheckCircle size={12} />
                            Non
                          </span>
                        )}
                      </td>
                      <td>
                        {a.risk_score != null ? (
                          <span
                            className="text-sm font-medium"
                            style={{
                              color:
                                a.risk_score > 0.7
                                  ? "var(--gm-danger)"
                                  : a.risk_score > 0.4
                                    ? "var(--gm-warning)"
                                    : "var(--gm-success)",
                            }}
                          >
                            {(a.risk_score * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span style={{ color: "var(--gm-text-muted)" }}>
                            —
                          </span>
                        )}
                      </td>
                      <td style={{ color: "var(--gm-text-muted)" }}>
                        {a.analysis_date
                          ? new Date(a.analysis_date).toLocaleDateString(
                              "fr-FR",
                            )
                          : "—"}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              a.status === "completed"
                                ? "rgba(34, 197, 94, 0.12)"
                                : "rgba(245, 158, 11, 0.12)",
                            color:
                              a.status === "completed"
                                ? "var(--gm-success)"
                                : "var(--gm-warning)",
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

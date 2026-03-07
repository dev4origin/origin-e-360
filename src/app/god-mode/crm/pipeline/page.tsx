"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Building2,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface PipelineOrg {
  id: string;
  nom: string;
  type: string;
  subscription_status: string;
  departement: string;
  region: string;
  created_at: string;
  email_professionnel?: string;
}

const PIPELINE_STAGES = [
  { key: "trial", label: "Trial", color: "#3b82f6" },
  { key: "active", label: "Actif", color: "#22c55e" },
  { key: "expired", label: "Expiré", color: "#f59e0b" },
  { key: "cancelled", label: "Annulé", color: "#ef4444" },
];

export default function PipelinePage() {
  const [orgs, setOrgs] = useState<PipelineOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("fournisseurs")
        .select(
          "id, nom, type, subscription_status, departement, region, created_at, email_professionnel",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (err) throw err;
      setOrgs(data || []);
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

  const types = [...new Set(orgs.map((o) => o.type).filter(Boolean))];

  const filteredOrgs = orgs.filter((o) => {
    const matchesType = typeFilter === "all" || o.type === typeFilter;
    const matchesSearch =
      !searchQuery ||
      o.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.departement?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.region?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Group by pipeline stage
  const stageGroups = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    orgs: filteredOrgs.filter((o) => o.subscription_status === stage.key),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Pipeline Commercial
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Vue Kanban du cycle de vie client
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
                Total organisations
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {orgs.length}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#6366f115", color: "#6366f1" }}
            >
              <Building2 size={20} />
            </div>
          </div>
        </div>
        {PIPELINE_STAGES.slice(0, 3).map((stage) => (
          <div key={stage.key} className="kpi-card">
            <div className="flex items-start justify-between">
              <div>
                <p
                  className="text-xs mb-1"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  {stage.label}
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--gm-text)" }}
                >
                  {
                    orgs.filter((o) => o.subscription_status === stage.key)
                      .length
                  }
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: `${stage.color}15`,
                  color: stage.color,
                }}
              >
                <TrendingUp size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border bg-transparent outline-none"
          style={{
            borderColor: "var(--gm-border)",
            color: "var(--gm-text)",
            backgroundColor: "var(--gm-surface)",
          }}
        >
          <option value="all">Tous les types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
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
            placeholder="Rechercher une organisation..."
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

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stageGroups.map((stage) => (
          <div key={stage.key} className="space-y-3">
            {/* Stage Header */}
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ backgroundColor: `${stage.color}10` }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: stage.color }}
                >
                  {stage.label}
                </span>
              </div>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${stage.color}20`,
                  color: stage.color,
                }}
              >
                {stage.orgs.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[200px]">
              {stage.orgs.length === 0 ? (
                <div
                  className="text-center py-8 rounded-lg border border-dashed text-xs"
                  style={{
                    borderColor: "var(--gm-border)",
                    color: "var(--gm-text-muted)",
                  }}
                >
                  Aucune organisation
                </div>
              ) : (
                stage.orgs.slice(0, 20).map((org) => (
                  <div
                    key={org.id}
                    className="rounded-lg border p-3 space-y-2 hover:border-[var(--gm-accent)] transition-colors cursor-pointer"
                    style={{
                      backgroundColor: "var(--gm-surface)",
                      borderColor: "var(--gm-border)",
                    }}
                  >
                    <div>
                      <h4
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {org.nom}
                      </h4>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: "var(--gm-surface-2)",
                          color: "var(--gm-text-muted)",
                        }}
                      >
                        {org.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[11px] truncate"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        {org.departement || org.region || "—"}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        {new Date(org.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {stage.orgs.length > 20 && (
                <div
                  className="text-center text-[11px] py-2"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  +{stage.orgs.length - 20} autres
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

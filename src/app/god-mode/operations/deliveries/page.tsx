"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  Clock,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Delivery {
  id: string;
  producteur_id: string;
  culture_type: string;
  poids_kg: number;
  date_livraison: string;
  statut_livraison: string;
  validation_status: string;
  campagne_id: string;
  created_at: string;
  producteur_nom?: string;
}

const STATUT_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "#f59e0b" },
  EN_COURS: { label: "En cours", color: "#3b82f6" },
  LIVRE: { label: "Livré", color: "#22c55e" },
  VALIDATED: { label: "Validé", color: "#22c55e" },
  REJECTED: { label: "Rejeté", color: "#ef4444" },
  ANNULE: { label: "Annulé", color: "#ef4444" },
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

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cultureFilter, setCultureFilter] = useState("all");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("livraisons")
        .select("*")
        .order("date_livraison", { ascending: false })
        .limit(500);
      if (err) throw err;

      // Fetch producer names
      const producerIds = [
        ...new Set(
          (data || []).map((d: Delivery) => d.producteur_id).filter(Boolean),
        ),
      ];
      let producerMap = new Map<string, string>();
      if (producerIds.length > 0) {
        const { data: producers } = await supabase
          .from("producteurs")
          .select("id, nom, prenom")
          .in("id", producerIds.slice(0, 100));
        producerMap = new Map(
          (producers || []).map(
            (p: { id: string; nom: string; prenom: string }) => [
              p.id,
              `${p.prenom || ""} ${p.nom || ""}`.trim(),
            ],
          ),
        );
      }

      setDeliveries(
        (data || []).map((d: Delivery) => ({
          ...d,
          producteur_nom:
            producerMap.get(d.producteur_id) || d.producteur_id?.slice(0, 8),
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

  const cultures = [
    ...new Set(deliveries.map((d) => d.culture_type).filter(Boolean)),
  ];

  const filtered = deliveries.filter((d) => {
    const matchesStatus =
      statusFilter === "all" ||
      d.statut_livraison === statusFilter ||
      d.validation_status === statusFilter;
    const matchesCulture =
      cultureFilter === "all" || d.culture_type === cultureFilter;
    const matchesSearch =
      !searchQuery ||
      d.producteur_nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.culture_type?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCulture && matchesSearch;
  });

  const totalWeight = deliveries.reduce((sum, d) => sum + (d.poids_kg || 0), 0);
  const validatedCount = deliveries.filter(
    (d) =>
      d.validation_status === "VALIDATED" || d.statut_livraison === "LIVRE",
  ).length;
  const pendingCount = deliveries.filter(
    (d) =>
      d.statut_livraison === "PENDING" || d.validation_status === "PENDING",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Livraisons
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Suivi des livraisons producteurs
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
          label="Total livraisons"
          value={deliveries.length}
          icon={<Truck size={20} />}
          color="#6366f1"
        />
        <KpiCard
          label="Poids total"
          value={`${(totalWeight / 1000).toFixed(1)}t`}
          icon={<Package size={20} />}
          color="#22c55e"
          subtitle={`${totalWeight.toLocaleString("fr-FR")} kg`}
        />
        <KpiCard
          label="Validées"
          value={validatedCount}
          icon={<CheckCircle size={20} />}
          color="#3b82f6"
        />
        <KpiCard
          label="En attente"
          value={pendingCount}
          icon={<Clock size={20} />}
          color="#f59e0b"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
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
            <option value="all">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="LIVRE">Livré</option>
            <option value="VALIDATED">Validé</option>
            <option value="REJECTED">Rejeté</option>
          </select>
          <select
            value={cultureFilter}
            onChange={(e) => setCultureFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border bg-transparent outline-none"
            style={{
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
              backgroundColor: "var(--gm-surface)",
            }}
          >
            <option value="all">Toutes cultures</option>
            {cultures.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
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
              <th>Producteur</th>
              <th>Culture</th>
              <th>
                <div className="flex items-center gap-1">
                  Poids (kg) <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Date livraison</th>
              <th>Statut</th>
              <th>Validation</th>
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
                  Aucune livraison trouvée
                </td>
              </tr>
            ) : (
              filtered.slice(0, 100).map((d) => {
                const statCfg = STATUT_MAP[d.statut_livraison] || {
                  label: d.statut_livraison,
                  color: "#8888a4",
                };
                const valCfg = STATUT_MAP[d.validation_status] || {
                  label: d.validation_status || "—",
                  color: "#8888a4",
                };
                return (
                  <tr key={d.id}>
                    <td>
                      <span
                        className="font-medium text-sm"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {d.producteur_nom}
                      </span>
                    </td>
                    <td style={{ color: "var(--gm-text)" }}>
                      {d.culture_type || "—"}
                    </td>
                    <td>
                      <span
                        className="font-semibold"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {(d.poids_kg || 0).toLocaleString("fr-FR")}
                      </span>
                    </td>
                    <td style={{ color: "var(--gm-text-muted)" }}>
                      {d.date_livraison
                        ? new Date(d.date_livraison).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${statCfg.color}15`,
                          color: statCfg.color,
                        }}
                      >
                        {statCfg.label}
                      </span>
                    </td>
                    <td>
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: valCfg.color }}
                      >
                        {d.validation_status === "VALIDATED" ? (
                          <CheckCircle size={12} />
                        ) : d.validation_status === "REJECTED" ? (
                          <XCircle size={12} />
                        ) : (
                          <Clock size={12} />
                        )}
                        {valCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <div
            className="text-center py-3 text-xs"
            style={{ color: "var(--gm-text-muted)" }}
          >
            Affichage de 100 / {filtered.length} résultats
          </div>
        )}
      </div>
    </div>
  );
}
